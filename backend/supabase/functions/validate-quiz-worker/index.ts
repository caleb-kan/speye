import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Main client for database operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Queue client for pgmq operations
const queue = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'pgmq_public' },
})

interface QueueMessage {
  msg_id: number
  message: { text_id: string }
}

interface ValidateQuizResponse {
  isValid: boolean
}

/**
 * Helper to safely delete a queue message, logging any errors
 */
async function deleteQueueMessage(msgId: number): Promise<void> {
  try {
    await queue.rpc('delete', {
      queue_name: 'validate_quiz',
      message_id: msgId,
    })
  } catch (err) {
    console.error('Failed to delete queue message:', err)
  }
}

const QUIZ_QUALITY_REJECTION_REASON = 'Quiz quality insufficient'

Deno.serve(async () => {
  // Note: This worker is called by pg_cron. Security is handled by:
  // 1. verify_jwt = false in config.toml (Supabase doesn't enforce JWT)
  // 2. The URL is not publicly documented
  // 3. The worker only processes jobs from the internal queue

  let job: QueueMessage | null = null

  try {
    // 1. Read one message from the validate_quiz queue
    // Visibility timeout of 300 seconds (5 min) - message hidden from other workers while processing
    // Longer timeout prevents duplicate processing if LLM calls are slow
    const { data: messages, error: readError } = await queue.rpc('read', {
      queue_name: 'validate_quiz',
      sleep_seconds: 300,
      n: 1,
    })

    if (readError) {
      console.error('Error reading from queue:', readError)
      return new Response(JSON.stringify({ error: readError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending jobs' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    job = messages[0] as QueueMessage
    const textId = job.message.text_id

    console.log(`Validating quiz for text: ${textId}`)

    // 2. Fetch the text content and quiz from the database
    const { data: text, error: fetchError } = await supabase
      .from('texts')
      .select(
        'content, quiz, processing_status, summary, fiction, admin_decision, sectional, section_content'
      )
      .eq('id', textId)
      .single()

    if (fetchError || !text) {
      console.error('Error fetching text:', fetchError)
      // Delete the message since the text doesn't exist
      await deleteQueueMessage(job.msg_id)
      return new Response(JSON.stringify({ error: 'Text not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Skip validation if text is no longer in completed status (being reprocessed)
    if (text.processing_status !== 'completed') {
      console.log(
        `Text ${textId} is not in completed status, skipping validation`
      )
      await deleteQueueMessage(job.msg_id)
      return new Response(
        JSON.stringify({ message: 'Text status changed, skipping validation' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!text.quiz) {
      console.error('Text has no quiz to validate')
      await deleteQueueMessage(job.msg_id)
      return new Response(JSON.stringify({ error: 'No quiz to validate' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Build full content for validation.
    // For sectional texts, combine all section contents so the LLM can
    // validate quiz questions against the complete text.
    let validationContent = text.content
    if (
      text.sectional &&
      Array.isArray(text.section_content) &&
      text.section_content.length > 0
    ) {
      validationContent = text.section_content
        .map(
          (s: { title: string; content: string }) =>
            `## ${s.title}\n\n${s.content}`
        )
        .join('\n\n')
    }

    // 4. Call the validate-quiz edge function
    const validateResponse = await fetch(
      `${supabaseUrl}/functions/v1/validate-quiz`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          content: validationContent,
          quiz: text.quiz,
          summary: text.fiction === false ? text.summary : undefined,
        }),
      }
    )

    if (!validateResponse.ok) {
      const errorText = await validateResponse.text()
      console.error('Error from validate-quiz:', errorText)

      // Update quiz_valid to false to indicate validation failed (shows retry button)
      // Only update if text is still in 'completed' status (not being reprocessed)
      await supabase
        .from('texts')
        .update({ quiz_valid: false }, { count: 'exact' })
        .eq('id', textId)
        .eq('processing_status', 'completed')

      // Delete message - validation failure won't benefit from retry
      await deleteQueueMessage(job.msg_id)

      return new Response(JSON.stringify({ error: 'Validation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result: ValidateQuizResponse = await validateResponse.json()

    // 4. Update the database with validation result
    // Only update if text is still in 'completed' status (not being reprocessed)
    // IMPORTANT: Must specify count: 'exact' to enable count-based idempotency checks
    const { error: updateError, count } = await supabase
      .from('texts')
      .update({ quiz_valid: result.isValid }, { count: 'exact' })
      .eq('id', textId)
      .eq('processing_status', 'completed')

    if (updateError) {
      console.error('Error updating text:', updateError)
      // Still delete the message to prevent retry loops
      await deleteQueueMessage(job.msg_id)
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if update was actually applied (text was still in completed status)
    if (count === 0) {
      console.log(
        `Text ${textId} status changed during validation, skipping update`
      )
      await deleteQueueMessage(job.msg_id)
      return new Response(
        JSON.stringify({ message: 'Text status changed, validation skipped' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 5. If quiz is invalid, update text for admin review
    // Do NOT overwrite llm_decision/llm_violation_type - those reflect
    // content moderation, not quiz quality
    // Do NOT overwrite admin_decision if admin already approved this text
    if (!result.isValid && text.admin_decision !== 'approved') {
      const { error: rejectionError } = await supabase
        .from('texts')
        .update({
          admin_decision: 'pending',
          rejection_reason: QUIZ_QUALITY_REJECTION_REASON,
          rejection_stage: 'validate_quiz',
        })
        .eq('id', textId)
        .eq('processing_status', 'completed')
        .neq('admin_decision', 'approved')

      if (rejectionError) {
        console.error('Error updating rejection metadata:', rejectionError)
      } else {
        // Note: admin notification is handled by the notify_admins_review_trigger
        // on the texts table, which fires when admin_decision becomes 'pending'
        console.log(`Updated text for quiz validation failure: ${textId}`)
      }
    }

    // 6. Delete the processed message from queue
    await deleteQueueMessage(job.msg_id)

    console.log(
      `Quiz validation complete for text ${textId}: ${result.isValid ? 'valid' : 'invalid'}`
    )

    return new Response(
      JSON.stringify({
        success: true,
        textId,
        isValid: result.isValid,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    // Always try to delete the message on unexpected errors to prevent infinite retry loops
    if (job) {
      await deleteQueueMessage(job.msg_id)
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
