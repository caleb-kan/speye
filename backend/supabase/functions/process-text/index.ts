import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.37.0'

// Must match frontend/src/constants/textUpload.ts MAX_CONTENT_CHARACTERS
const MAX_CONTENT_LENGTH = 8_000

// Retries for model outputs that are not valid JSON or don't match the expected
// response shape. A value of 2 means: initial attempt + 2 retries = 3 attempts.
const INVALID_OUTPUT_RETRIES = 2
const LOG_PREVIEW_LENGTH = 500

const RATE_LIMIT = {
  MAX_REQUESTS: 20,
  WINDOW_MS: 60 * 1000,
  STORE_CLEANUP_THRESHOLD: 100,
}

// In-memory rate limit store (per edge function instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(clientIp: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const record = rateLimitStore.get(clientIp)

  if (record && now > record.resetTime) {
    rateLimitStore.delete(clientIp)
  }

  if (rateLimitStore.size > RATE_LIMIT.STORE_CLEANUP_THRESHOLD) {
    for (const [ip, data] of rateLimitStore) {
      if (now > data.resetTime) {
        rateLimitStore.delete(ip)
      }
    }
  }

  const currentRecord = rateLimitStore.get(clientIp)

  if (!currentRecord) {
    const resetTime = now + RATE_LIMIT.WINDOW_MS
    rateLimitStore.set(clientIp, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS - 1, resetTime }
  }

  if (currentRecord.count >= RATE_LIMIT.MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: currentRecord.resetTime }
  }

  currentRecord.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT.MAX_REQUESTS - currentRecord.count,
    resetTime: currentRecord.resetTime,
  }
}

// JSON schemas for Groq structured output (strict: true).
// Strict mode requires root type: "object", so fullSchema uses a flat
// object with nullable fields instead of root-level anyOf.
// Array length constraints (minItems/maxItems) are not supported in
// strict mode, so cardinality is enforced by prompt + runtime validation.
// Keep in sync with the TypeScript interfaces below.

/** Wraps a JSON schema type as nullable via anyOf. */
function nullable(schema: Record<string, unknown>): {
  anyOf: [Record<string, unknown>, { type: 'null' }]
} {
  return { anyOf: [schema, { type: 'null' }] }
}

const questionSchema = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: {
      type: 'array',
      items: { type: 'string' },
    },
    correctAnswer: { type: 'integer' },
  },
  required: ['question', 'options', 'correctAnswer'],
  additionalProperties: false,
} as const

const questionSetSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: questionSchema,
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const

// Used when skipContentCheck is true (admin-approved, no error variant needed)
const successSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['success'] },
    title: nullable({ type: 'string' }),
    questionSets: {
      type: 'array',
      items: questionSetSchema,
    },
    fiction: { type: 'boolean' },
    summary: nullable({ type: 'string' }),
  },
  required: ['status', 'title', 'questionSets', 'fiction', 'summary'],
  additionalProperties: false,
} as const

// Sectional variant: summary is always null, enforced at the schema level so
// the model cannot generate one even for non-fiction sectional texts.
const successSectionalSchema = {
  type: 'object',
  properties: {
    status: successSchema.properties.status,
    title: successSchema.properties.title,
    questionSets: successSchema.properties.questionSets,
    fiction: successSchema.properties.fiction,
    summary: { type: 'null' },
  },
  required: successSchema.required,
  additionalProperties: false,
} as const

// Used when TOS check is active: flat object with all fields.
// On error: status="error", error/violation_type populated, others null.
// On success: status="success", title/questionSets/fiction/summary populated,
// error/violation_type null. Discriminated by isErrorResponse/isValidResponse.
const fullSchema = {
  type: 'object',
  properties: {
    ...successSchema.properties,
    status: { type: 'string', enum: ['success', 'error'] },
    questionSets: nullable({ type: 'array', items: questionSetSchema }),
    fiction: nullable({ type: 'boolean' }),
    error: nullable({ type: 'string' }),
    violation_type: nullable({ type: 'string' }),
  },
  required: [...successSchema.required, 'error', 'violation_type'],
  additionalProperties: false,
} as const

// Sectional variant of fullSchema: summary is always null.
const fullSectionalSchema = {
  type: 'object',
  properties: {
    status: fullSchema.properties.status,
    title: fullSchema.properties.title,
    questionSets: fullSchema.properties.questionSets,
    fiction: fullSchema.properties.fiction,
    summary: { type: 'null' },
    error: fullSchema.properties.error,
    violation_type: fullSchema.properties.violation_type,
  },
  required: fullSchema.required,
  additionalProperties: false,
} as const

// Prompt sections and schemas split for skipContentCheck handling.
// When true: TOS prompt/suffix excluded, successSchema used.
// When false: full TOS prompt included, fullSchema (error | success) used.
const TOS_CHECK_SYSTEM_SUFFIX =
  ' You also check if content violates terms of service.'

const TOS_CHECK_PROMPT = `FIRST, evaluate if the text violates any of these content policies:
- Unlawful content or promotion of unlawful activities
- Sexually obscene content
- Libelous, defamatory, or fraudulent content
- Discriminatory or abusive content toward any individual or group
- Hate speech, threatening, or pornographic content
- Content degrading others based on gender, race, class, ethnicity, national origin, religion, sexual preference, orientation, identity, disability, or other classification
- Content that incites violence or contains nudity or graphic/gratuitous violence
- Content that violates privacy or publicity rights
- Content that solicits or collects personal information without consent
- Malware or exploit-related content
- Content that infringes on proprietary rights (patent, trademark, copyright, etc.)

If the text violates ANY of these policies, set status to "error", provide a description in the "error" field and a brief category in the "violation_type" field, and set title, questionSets, fiction, and summary to null.

If the text does NOT violate policies, set status to "success", set error and violation_type to null, and process it by generating a title, quiz question sets, and summary (if non-fiction):

`

const PROCESSING_PROMPT = `{text_content}

---

TITLE REQUIREMENTS (only if generating title):
1. Length: 2-8 words (concise but descriptive)
2. Capture the central theme, argument, or narrative of the text
3. Be engaging and informative
4. Match the tone of the text (formal for academic, evocative for fiction)
5. Avoid generic titles like "An Interesting Story" or "Important Information"

---

QUIZ REQUIREMENTS:
1. Generate up to 5 question sets, each with 5 to 7 multiple-choice questions. Decide the number of sets and questions per set based on the text's length, complexity, and number of key concepts. Shorter/simpler texts may need fewer sets.
2. Each set should more or less cover the whole text
3. Questions must be answerable solely from the text provided
4. Cover different sections of the text, not just the beginning
5. Test comprehension of key concepts, not trivial details
6. All 4 options must be plausible - no obviously wrong answers
7. Options should be similar in length and grammatical structure
8. Randomize correct answer positions across questions (use 0, 1, 2, and 3)
9. Avoid "all of the above", "none of the above", or negative phrasing
10. Ensure questions across sets are unique and not repetitive
11. IMPORTANT: For non-fiction texts, every question must be answerable from BOTH the full text AND the generated summary. Focus on key concepts and main findings, not minor details.

---

SUMMARY REQUIREMENTS (non-fiction only, set to null for fiction):
1. Length: approximately 20-30% of the original text length, minimum 200 words
2. Preserve all key arguments, findings, and conclusions
3. Maintain the logical structure and flow of the original
4. Use clear, readable prose (not bullet points)
5. Retain specific facts, names, dates, and data central to the text
6. Must contain enough information to answer all quiz questions above
7. Do not add information not in the original text

---

CONFIGURATION:
generateTitle: {generate_title}

Output valid JSON only:`

const SECTIONAL_PROCESSING_PROMPT = `SECTIONAL TEXT PROCESSING
This is a sectional text with multiple parts. Each section will be processed separately for quiz generation.

{sections_text}

---

TITLE REQUIREMENTS (only if generating title):
1. Length: 2-8 words (concise but descriptive)
2. Capture the central theme of the entire sectional text
3. Be engaging and informative
4. Match the tone of the text (formal for academic, evocative for fiction)
5. Avoid generic titles like "An Interesting Story" or "Important Information"

---

QUIZ REQUIREMENTS:
1. Generate 1 question set for each section, each with 3 to 7 multiple-choice questions. Decide the number of questions per set based on the sections's length, complexity, and number of key concepts. 
2. Questions in one question set should only cover content from the specific section of the text
3. Questions must be answerable solely from the section content provided
4. Test comprehension of key concepts from each section, not trivial details
5. All 4 options must be plausible - no obviously wrong answers
6. Options should be similar in length and grammatical structure
7. Randomize correct answer positions across questions (use 0, 1, 2, and 3)
8. Avoid "all of the above", "none of the above", or negative phrasing
9. Ensure questions across sets are unique and not repetitive
10. For non-fiction texts, focus on key concepts and main findings from each section

---

SUMMARY REQUIREMENTS:
For sectional texts, ALWAYS set summary to null regardless of fiction/non-fiction status.

---

CONFIGURATION:
generateTitle: {generate_title}

Output valid JSON only:`

// Per-request reservation is prompt_tokens + max_tokens, and the Groq
// on_demand tier caps gpt-oss-120b at 8000 TPM. Keep this small enough
// that even a max-length text (~2000 prompt tokens) plus a ~700-token
// prompt skeleton still leaves ~5000 tokens for the model to respond.
const LLM_MAX_TOKENS = 5_000

const config = {
  model: 'openai/gpt-oss-120b',
  temperature: 0.3,
  max_tokens: LLM_MAX_TOKENS,
  top_p: 1,
  // "Respond with valid JSON" retained as belt-and-suspenders alongside
  // json_schema: the model has been observed ignoring the schema directive.
  system_message: `You are an expert educational content processor. You analyze text and generate a title, comprehension quiz questions, classify if the text is fiction or non-fiction, and generate a summary for non-fiction texts.${TOS_CHECK_SYSTEM_SUFFIX} You respond with valid JSON only - no markdown code blocks, no explanations, no text before or after the JSON object.`,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  })
}

// Three representations of quiz structure must stay in sync:
// 1. Canonical types: backend/supabase/database/texts/types.ts
// 2. JSON schemas: questionSchema, questionSetSchema (above)
// 3. Local interfaces: QuizQuestion, QuestionSet (below)
interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface QuestionSet {
  questions: QuizQuestion[]
}

interface ErrorResponse {
  status: 'error'
  error: string
  violation_type: string
}

interface ProcessTextResponse {
  status: 'success'
  title: string | null
  questionSets: QuestionSet[]
  fiction: boolean
  summary: string | null
}

// Duplicated from lib/quizConstants.ts because Deno edge functions cannot
// import from lib/. Keep values in sync.
const MIN_QUESTION_SETS = 1
const MAX_QUESTION_SETS = 5
const MIN_QUESTIONS = 5
const MAX_QUESTIONS = 7
const MIN_QUESTIONS_SECTIONAL = 3
const MAX_QUESTIONS_SECTIONAL = 7
const NUM_OPTIONS_PER_QUESTION = 4
// Must match frontend/src/constants/textUpload.ts MAX_SECTIONS
const MAX_SECTIONS = 50

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as ErrorResponse

  return (
    response.status === 'error' &&
    typeof response.error === 'string' &&
    typeof response.violation_type === 'string'
  )
}

function isValidQuestion(q: QuizQuestion): boolean {
  return (
    typeof q.question === 'string' &&
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length === NUM_OPTIONS_PER_QUESTION &&
    q.options.every(
      (opt: unknown) =>
        typeof opt === 'string' && (opt as string).trim().length > 0
    ) &&
    Number.isInteger(q.correctAnswer) &&
    q.correctAnswer >= 0 &&
    q.correctAnswer <= NUM_OPTIONS_PER_QUESTION - 1
  )
}

function isValidResponse(
  data: unknown,
  sectional = false,
  sectionCount = 0
): data is ProcessTextResponse {
  if (!data || typeof data !== 'object') return false
  const response = data as ProcessTextResponse

  if (response.status !== 'success') return false

  if (response.title !== null && typeof response.title !== 'string')
    return false

  if (!Array.isArray(response.questionSets)) return false

  if (sectional) {
    // Sectional texts must have exactly one question set per section
    if (response.questionSets.length !== sectionCount) return false
  } else {
    if (
      response.questionSets.length < MIN_QUESTION_SETS ||
      response.questionSets.length > MAX_QUESTION_SETS
    )
      return false
  }

  if (typeof response.fiction !== 'boolean') return false

  // Validate summary: non-fiction non-sectional texts must have a non-empty string summary.
  // Sectional texts always have null summary (enforced at the schema level).
  // Fiction summary is accepted here and nulled out in the response handler
  // to avoid rejecting an otherwise valid response due to LLM inconsistency.
  if (!response.fiction && !sectional) {
    if (typeof response.summary !== 'string' || !response.summary.trim())
      return false
  }

  const minQuestions = sectional ? MIN_QUESTIONS_SECTIONAL : MIN_QUESTIONS
  const maxQuestions = sectional ? MAX_QUESTIONS_SECTIONAL : MAX_QUESTIONS
  return response.questionSets.every(
    (set: QuestionSet) =>
      set &&
      Array.isArray(set.questions) &&
      set.questions.length >= minQuestions &&
      set.questions.length <= maxQuestions &&
      set.questions.every(isValidQuestion)
  )
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const clientIp = getClientIp(req)
  const rateLimit = checkRateLimit(clientIp)

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    return jsonResponse(
      { error: 'Too many requests. Please try again later.' },
      429,
      { 'Retry-After': String(retryAfter) }
    )
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not set')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    let body: {
      content?: unknown
      generateTitle?: unknown
      skipContentCheck?: unknown
      sectional?: unknown
      section_content?: unknown
    }
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const {
      content,
      generateTitle = true,
      sectional = false,
      section_content,
    } = body

    // skipContentCheck can only be used by the worker (service role key)
    // to prevent external callers from bypassing content moderation
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('Authorization')
    const isServiceRole =
      !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`
    const skipContentCheck = body.skipContentCheck === true && isServiceRole

    // Validate sectional data if provided
    const sectionalArray =
      sectional && Array.isArray(section_content)
        ? (section_content as Array<{ title: string; content: string }>)
        : null

    if (sectional && !sectionalArray) {
      return jsonResponse(
        { error: 'Sectional texts must provide section_content array' },
        400
      )
    }

    if (sectional && sectionalArray!.length === 0) {
      return jsonResponse(
        { error: 'Sectional texts must have at least one section' },
        400
      )
    }

    if (sectional && sectionalArray!.length > MAX_SECTIONS) {
      return jsonResponse(
        { error: 'Sectional texts cannot have more than 50 sections' },
        400
      )
    }

    // For sectional texts, validate each section and the total content budget.
    // The frontend caps the sum of section content at MAX_CONTENT_CHARACTERS, but
    // the backend must enforce the same budget so non-browser callers (and
    // worker-reprocessing of legacy rows) cannot push an oversized prompt at
    // the LLM and trip Groq's TPM cap.
    if (sectional && sectionalArray) {
      let totalSectionContent = 0
      for (const section of sectionalArray) {
        if (!section.title || typeof section.title !== 'string') {
          return jsonResponse(
            { error: 'Each section must have a valid title' },
            400
          )
        }
        if (!section.content || typeof section.content !== 'string') {
          return jsonResponse(
            { error: 'Each section must have valid content' },
            400
          )
        }
        totalSectionContent += section.content.length
      }

      if (totalSectionContent > MAX_CONTENT_LENGTH) {
        return jsonResponse(
          {
            error: `Sectional content cannot exceed ${MAX_CONTENT_LENGTH} characters in total`,
          },
          400
        )
      }
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return jsonResponse(
        { error: 'Content is required and must be a non-empty string' },
        400
      )
    }

    const groqClient = new Groq({ apiKey: groqApiKey })
    const truncatedContent = content.trim().slice(0, MAX_CONTENT_LENGTH)

    let systemMessage: string
    let userMessage: string

    const sectionsText =
      sectional && sectionalArray
        ? sectionalArray
            .map(
              (section, index) =>
                `SECTION ${index + 1}: ${section.title}\n\n${section.content}`
            )
            .join('\n\n---\n\n')
        : null

    if (skipContentCheck) {
      systemMessage = config.system_message.replace(TOS_CHECK_SYSTEM_SUFFIX, '')
      if (sectional && sectionsText) {
        userMessage = (
          'This sectional text has been reviewed and approved by an administrator. ' +
          'Do NOT perform any content policy checks. ' +
          'Process it by generating a title and quiz question sets:\n\n' +
          SECTIONAL_PROCESSING_PROMPT
        )
          .replace('{generate_title}', String(generateTitle))
          .replace('{sections_text}', sectionsText)
      } else {
        userMessage = (
          'This text has been reviewed and approved by an administrator. ' +
          'Do NOT perform any content policy checks. ' +
          'Process it by generating a title, quiz question sets, and summary (if non-fiction):\n\n' +
          PROCESSING_PROMPT
        )
          .replace('{generate_title}', String(generateTitle))
          .replace('{text_content}', truncatedContent)
      }
    } else {
      systemMessage = config.system_message
      if (sectional && sectionsText) {
        userMessage = (TOS_CHECK_PROMPT + SECTIONAL_PROCESSING_PROMPT)
          .replace('{generate_title}', String(generateTitle))
          .replace('{sections_text}', sectionsText)
      } else {
        userMessage = (TOS_CHECK_PROMPT + PROCESSING_PROMPT)
          .replace('{generate_title}', String(generateTitle))
          .replace('{text_content}', truncatedContent)
      }
    }

    let lastInvalidOutputError: Error | null = null

    for (let attempt = 0; attempt <= INVALID_OUTPUT_RETRIES; attempt += 1) {
      const response = await groqClient.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: skipContentCheck
              ? sectional
                ? 'process_text_success_sectional'
                : 'process_text_success'
              : sectional
                ? 'process_text_response_sectional'
                : 'process_text_response',
            strict: true,
            schema: skipContentCheck
              ? sectional
                ? successSectionalSchema
                : successSchema
              : sectional
                ? fullSectionalSchema
                : fullSchema,
          },
        },
      })

      const choice = response.choices[0]
      if (!choice) {
        throw new Error('No choices in API response')
      }

      if (choice.finish_reason === 'length') {
        throw new Error(
          'Model response truncated due to token limit ' +
            `(max_tokens: ${config.max_tokens})`
        )
      }

      const responseContent = choice.message?.content?.trim()
      if (!responseContent) {
        throw new Error(
          `No content in response (finish_reason: ${choice.finish_reason})`
        )
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(responseContent)
      } catch (parseError) {
        lastInvalidOutputError = new Error(
          `Structured output returned invalid JSON: ${(parseError as Error).message}`
        )
        console.error(
          `Attempt ${attempt + 1}/${INVALID_OUTPUT_RETRIES + 1} - ${lastInvalidOutputError.message}. ` +
            'Raw (first 500 chars):',
          responseContent.slice(0, LOG_PREVIEW_LENGTH)
        )

        if (attempt < INVALID_OUTPUT_RETRIES) {
          continue
        }

        return jsonResponse(
          {
            error: 'Failed to process text',
            code: 'invalid_llm_json',
            reason: lastInvalidOutputError.message,
          },
          502,
          {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        )
      }

      // When skipContentCheck is true, successSchema prevents error responses
      // at the schema level. This guard is kept as defense-in-depth.
      if (!skipContentCheck && isErrorResponse(parsed)) {
        return jsonResponse(
          {
            error: parsed.error,
            violation_type: parsed.violation_type,
          },
          400,
          {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        )
      }

      // Catch malformed error responses where the LLM set status "error" but
      // left error/violation_type as null (passes schema, fails isErrorResponse).
      // Treat as invalid output and retry; if retries are exhausted, return an
      // "unknown" violation type.
      if (
        !skipContentCheck &&
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed as Record<string, unknown>).status === 'error'
      ) {
        lastInvalidOutputError = new Error(
          'LLM returned error status with incomplete fields'
        )
        console.error(
          `Attempt ${attempt + 1}/${INVALID_OUTPUT_RETRIES + 1} - ${lastInvalidOutputError.message}. ` +
            'Parsed (first 500 chars):',
          JSON.stringify(parsed).slice(0, LOG_PREVIEW_LENGTH)
        )

        if (attempt < INVALID_OUTPUT_RETRIES) {
          continue
        }

        return jsonResponse(
          {
            error: 'Content flagged but details unavailable',
            violation_type: 'unknown',
          },
          400,
          {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        )
      }

      if (
        !isValidResponse(
          parsed,
          sectional === true,
          sectionalArray?.length ?? 0
        )
      ) {
        lastInvalidOutputError = new Error(
          'Response does not match expected format'
        )
        console.error(
          `Attempt ${attempt + 1}/${INVALID_OUTPUT_RETRIES + 1} - ${lastInvalidOutputError.message}. ` +
            'Parsed (first 500 chars):',
          JSON.stringify(parsed).slice(0, LOG_PREVIEW_LENGTH)
        )

        if (attempt < INVALID_OUTPUT_RETRIES) {
          continue
        }

        return jsonResponse(
          {
            error: 'Failed to process text',
            code: 'invalid_llm_output',
            reason: lastInvalidOutputError.message,
          },
          502,
          {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        )
      }

      return jsonResponse(
        {
          title: parsed.title,
          questionSets: parsed.questionSets,
          fiction: parsed.fiction,
          summary:
            sectional || parsed.fiction ? null : (parsed.summary ?? null),
        },
        200,
        {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      )
    }

    // Should be unreachable because the loop either returns or throws.
    throw lastInvalidOutputError ?? new Error('Unknown processing error')
  } catch (error) {
    console.error('Error processing text:', error)
    return jsonResponse({ error: 'Failed to process text' }, 500, {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    })
  }
})
