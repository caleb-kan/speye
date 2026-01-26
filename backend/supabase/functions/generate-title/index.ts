import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Groq from 'npm:groq-sdk@0.5.0'

// Rate limiting: 20 requests per minute per IP
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 1000,
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

  // Clean expired entry for this IP if it exists
  if (record && now > record.resetTime) {
    rateLimitStore.delete(clientIp)
  }

  // Periodic cleanup: remove all expired entries when store grows large
  if (rateLimitStore.size > 100) {
    for (const [ip, data] of rateLimitStore) {
      if (now > data.resetTime) {
        rateLimitStore.delete(ip)
      }
    }
  }

  const currentRecord = rateLimitStore.get(clientIp)

  if (!currentRecord) {
    const resetTime = now + RATE_LIMIT.windowMs
    rateLimitStore.set(clientIp, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetTime }
  }

  if (currentRecord.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: currentRecord.resetTime }
  }

  currentRecord.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - currentRecord.count,
    resetTime: currentRecord.resetTime,
  }
}

const config = {
  model: 'llama-3.1-8b-instant',
  temperature: 0.7,
  max_tokens: 50,
  top_p: 1,
  system_message:
    'You are an expert title generator for reading materials. You respond with a single title only - no quotes, no punctuation wrapping the title, no explanations, no preamble.',
  user_message: `Generate a title for this text:

{text_content}

---

TITLE REQUIREMENTS:
1. Length: 2-8 words (concise but descriptive)
2. Capture the central theme, argument, or narrative of the text
3. Be engaging and informative - make readers want to read more
4. Match the tone of the text (formal for academic, evocative for fiction)
5. Avoid generic titles like: "An Interesting Story" or "Important Information"
6. Do not wrap the title in quotes or any punctuation

---

EXAMPLES OF GOOD TITLES:
- For a science article about black holes: The Hidden Giants of the Universe
- For a story about a lost dog finding home: Journey Back to Maple Street
- For an essay on climate change: Rising Tides and Shifting Futures
- For a technical guide on databases: Mastering SQL Query Optimization
- For a historical piece on ancient Rome: The Rise and Fall of an Empire

---

Output the title only (no quotes, no explanation):`,
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Check rate limit
  const clientIp = getClientIp(req)
  const rateLimit = checkRateLimit(clientIp)

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          ...corsHeaders,
        },
      }
    )
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not set')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    let body: { content?: unknown }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return jsonResponse(
        { error: 'Content is required and must be a non-empty string' },
        400
      )
    }

    const groqClient = new Groq({ apiKey: groqApiKey })
    const truncatedContent = content.trim().slice(0, 2000)
    const userMessage = config.user_message.replace(
      '{text_content}',
      truncatedContent
    )

    const response = await groqClient.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.system_message },
        { role: 'user', content: userMessage },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
    })

    const title = response.choices[0]?.message?.content?.trim()

    if (!title) {
      throw new Error('No title generated')
    }

    return jsonResponse({ title }, 200, {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    })
  } catch (error) {
    console.error('Error generating title:', error)
    return jsonResponse({ error: 'Failed to generate title' }, 500, {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    })
  }
})
