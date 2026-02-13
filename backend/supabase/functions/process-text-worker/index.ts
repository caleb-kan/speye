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

// Canonical type definition: backend/supabase/database/texts/types.ts
interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionSet {
  questions: QuizQuestion[]
}

interface ProcessTextResponse {
  title: string | null
  questionSets: QuestionSet[]
  fiction: boolean
  summary: string | null
}

/**
 * Helper to safely delete a queue message, logging any errors
 */
async function deleteQueueMessage(msgId: number): Promise<void> {
  try {
    await queue.rpc('delete', {
      queue_name: 'process_text',
      message_id: msgId,
    })
  } catch (err) {
    console.error('Failed to delete queue message:', err)
  }
}

Deno.serve(async () => {
  // Note: This worker is called by pg_cron. Security is handled by:
  // 1. verify_jwt = false in config.toml (Supabase doesn't enforce JWT)
  // 2. The URL is not publicly documented
  // 3. The worker only processes jobs from the internal queue

  let job: QueueMessage | null = null

  try {
    // 1. Read one message from the process_text queue
    // Visibility timeout of 300 seconds (5 min) - message hidden from other workers while processing
    // Longer timeout prevents duplicate processing if LLM calls are slow
    const { data: messages, error: readError } = await queue.rpc('read', {
      queue_name: 'process_text',
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

    console.log(`Processing text: ${textId}`)

    // 2. Fetch the text content from the database
    // Include fiction to preserve user's explicit setting when editing
    const { data: text, error: fetchError } = await supabase
      .from('texts')
      .select('content, title, fiction, admin_decision')
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

    // 3. Call the process-text edge function
    const processResponse = await fetch(
      `${supabaseUrl}/functions/v1/process-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          content: text.content,
          generateTitle: text.title === null,
          skipContentCheck: text.admin_decision === 'approved',
        }),
      }
    )

    if (!processResponse.ok) {
      const errorData = await processResponse.json().catch(() => ({}))
      console.error('Error from process-text:', errorData)

      // If this is a TOS violation (400 with violation_type), set both failed status and violation fields
      if (processResponse.status === 400 && errorData.violation_type) {
        const { error: tosError } = await supabase
          .from('texts')
          .update({
            processing_status: 'failed',
            llm_decision: 'rejected',
            llm_violation_type: errorData.violation_type,
            admin_decision: 'pending',
            rejection_reason: errorData.violation_type,
            rejection_stage: 'process_text',
          })
          .eq('id', textId)
          .neq('admin_decision', 'approved')

        if (tosError) {
          console.error('Error updating TOS violation:', tosError)
        } else {
          console.log(`Updated text for TOS violation: ${textId}`)
        }
      } else {
        // Non-TOS failure - just mark as failed
        const { error: failError } = await supabase
          .from('texts')
          .update({ processing_status: 'failed' })
          .eq('id', textId)

        if (failError) {
          console.error('Error marking text as failed:', failError)
        }
      }

      // Delete message - user can manually retry via the retry button
      await deleteQueueMessage(job.msg_id)

      return new Response(JSON.stringify({ error: 'Processing failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result: ProcessTextResponse = await processResponse.json()

    // 4. Update the database with results
    // Use idempotent update - only update if still in pending status
    // IMPORTANT: Must specify count: 'exact' to get affected row count
    // Only set fiction from LLM if not already set (preserves user's explicit setting when editing)
    const { error: updateError, count } = await supabase
      .from('texts')
      .update(
        {
          title: result.title ?? text.title,
          quiz: { questionSets: result.questionSets },
          fiction: text.fiction ?? result.fiction,
          summary: result.summary,
          processing_status: 'completed',
          llm_decision: 'approved',
          admin_decision:
            text.admin_decision === 'approved' ? 'approved' : 'pending',
        },
        { count: 'exact' }
      )
      .eq('id', textId)
      .eq('processing_status', 'pending')

    if (updateError) {
      console.error('Error updating text:', updateError)
      // Still delete the message to prevent retry loops
      // User can manually retry via the retry button
      await supabase
        .from('texts')
        .update({ processing_status: 'failed' }, { count: 'exact' })
        .eq('id', textId)
      await deleteQueueMessage(job.msg_id)
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if update was actually applied (row was in pending status)
    if (count === 0) {
      console.log(`Text ${textId} was not in pending status, skipping`)
      await deleteQueueMessage(job.msg_id)
      return new Response(
        JSON.stringify({ message: 'Text already processed or status changed' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Note: admin notification is handled by the notify_admins_review_trigger
    // on the texts table, which fires when admin_decision becomes 'pending'

    // 5. Queue validation job
    const { error: queueError } = await queue.rpc('send', {
      queue_name: 'validate_quiz',
      message: { text_id: textId },
    })

    if (queueError) {
      console.error('Error queuing validation job:', queueError)
      // Set quiz_valid to false so retry button appears in UI
      // (retry will reprocess and re-queue validation)
      await supabase
        .from('texts')
        .update({ quiz_valid: false }, { count: 'exact' })
        .eq('id', textId)
    }

    // 6. Delete the processed message from queue
    await deleteQueueMessage(job.msg_id)

    console.log(`Successfully processed text: ${textId}`)

    return new Response(JSON.stringify({ success: true, textId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
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
