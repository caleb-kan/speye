import Groq from 'groq-sdk'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: resolve(__dirname, '../../.env') })

const apiKey = process.env.GROQ_API_KEY

if (!apiKey) {
  throw new Error('Missing GROQ_API_KEY environment variable')
}

export const groqClient = new Groq({ apiKey })
