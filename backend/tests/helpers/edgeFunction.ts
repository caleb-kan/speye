import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

type EdgeHandler = (request: Request) => Response | Promise<Response>

/** Execute the checked-in handler with every external service replaced. */
export function loadEdgeFunction(
  name: string,
  options: {
    modules?: Record<string, unknown>
    env?: Record<string, string | undefined>
    fetch?: typeof fetch
  } = {}
): EdgeHandler {
  const filename = new URL(
    `../../supabase/functions/${name}/index.ts`,
    import.meta.url
  )
  const source = readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename.pathname,
  })
  let handler: EdgeHandler | undefined
  const env = {
    SUPABASE_URL: 'http://supabase.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    GROQ_API_KEY: 'test-groq-key',
    ...options.env,
  }
  runInNewContext(
    outputText,
    {
      exports: {},
      require: (specifier: string) => {
        if (specifier === 'jsr:@supabase/functions-js/edge-runtime.d.ts') {
          return {}
        }
        if (options.modules && specifier in options.modules) {
          return options.modules[specifier]
        }
        throw new Error(`Unmocked edge-function import: ${specifier}`)
      },
      Deno: {
        env: { get: (key: keyof typeof env) => env[key] },
        serve: (callback: EdgeHandler) => {
          handler = callback
        },
      },
      Request,
      Response,
      Headers,
      URL,
      console: { log() {}, warn() {}, error() {} },
      fetch:
        options.fetch ??
        (() => {
          throw new Error('Unexpected external request in edge-function test')
        }),
    },
    { filename: filename.pathname }
  )
  if (!handler) throw new Error(`${name} did not register a handler`)
  return handler
}
