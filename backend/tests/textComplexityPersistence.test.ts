import { beforeEach, describe, expect, it, vi } from 'vitest'
import { uploadText } from '../supabase/database/texts/uploadText'
import { updateText } from '../supabase/database/texts/updateText'

const { insert, update } = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => {
      const query = {
        insert: (values: unknown) => {
          insert(values)
          return query
        },
        update: (values: unknown) => {
          update(values)
          return query
        },
        eq: () => query,
        select: () => query,
        single: async () => ({ data: { id: 'text-1' }, error: null }),
      }
      return query
    },
  },
}))
vi.mock('../supabase/database/logger', () => ({ logDbQuery: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('persisted text complexity', () => {
  it('keeps sectional difficulty stable when the same content is saved again', async () => {
    const section_content = [
      {
        title: 'Simple',
        content: 'The cat sat on the mat. It was a nice day.',
      },
      {
        title: 'Complex',
        content:
          'The epistemological ramifications of quantum mechanics fundamentally challenge our presuppositions.',
      },
    ]
    const data = {
      sectional: true,
      section_content,
      content: section_content.map((s) => s.content).join('\n\n---\n\n'),
    }

    await uploadText('user-1', data)
    await updateText('text-1', data)

    expect(insert.mock.calls[0][0][0]).toMatchObject({
      content: data.content,
      complexity: 11,
    })
    expect(update.mock.calls[0][0]).toMatchObject({
      content: data.content,
      complexity: 11,
    })
  })
})
