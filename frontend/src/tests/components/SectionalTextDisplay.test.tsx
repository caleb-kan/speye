import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SectionalTextDisplay } from '../../components/SectionalTextDisplay'
import type { SectionData } from '../../types/database'

// ── helpers ────────────────────────────────────────────────────────────────────

// Section 0: words 0-2 ("alpha beta gamma")
// Section 1: words 3-4 ("delta epsilon")
const mockSections: SectionData[] = [
  { title: 'Section One', content: 'alpha beta gamma' },
  { title: 'Section Two', content: 'delta epsilon' },
]

const baseProps = {
  onWordIndexChange: vi.fn(),
  onSectionComplete: vi.fn(),
  onSectionIndexChange: vi.fn(),
}

// Children render prop that exposes section text for assertions
const renderChildren = ({
  sectionText,
}: {
  sectionText: string
  sectionWordIndex: number
}) => <div data-testid="text-display">{sectionText}</div>

const renderAt = (
  wordIndex: number,
  overrides: Partial<Parameters<typeof SectionalTextDisplay>[0]> = {}
) =>
  render(
    <SectionalTextDisplay
      sections={mockSections}
      currentWordIndex={wordIndex}
      {...baseProps}
      {...overrides}
    >
      {overrides.children ?? renderChildren}
    </SectionalTextDisplay>
  )

// ── tests ──────────────────────────────────────────────────────────────────────

describe('SectionalTextDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Header rendering ──────────────────────────────────────────────────────

  describe('Header rendering', () => {
    it('renders the current section title', () => {
      renderAt(0)
      expect(screen.getByText('Section One')).toBeInTheDocument()
    })

    it('renders the next section title when in section 1', () => {
      renderAt(3) // word 3 → section 1
      expect(screen.getByText('Section Two')).toBeInTheDocument()
    })

    it('falls back to "Section N" when section has no title', () => {
      renderAt(0, {
        sections: [
          { title: '', content: 'alpha beta gamma' },
          { title: '', content: 'delta epsilon' },
        ],
      })
      expect(screen.getByText('Section 1')).toBeInTheDocument()
    })

    it('shows the correct section counter', () => {
      renderAt(0)
      expect(screen.getByText('1 of 2')).toBeInTheDocument()
    })

    it('updates the section counter when navigating to section 2', () => {
      renderAt(3)
      expect(screen.getByText('2 of 2')).toBeInTheDocument()
    })

    it('passes the current section content to children', () => {
      renderAt(0)
      expect(screen.getByText('alpha beta gamma')).toBeInTheDocument()
    })

    it('passes the next section content to children when in section 1', () => {
      renderAt(3)
      expect(screen.getByText('delta epsilon')).toBeInTheDocument()
    })
  })

  // ── Children render prop ──────────────────────────────────────────────────

  describe('children render prop', () => {
    it('passes sectionWordIndex relative to the current section', () => {
      const children = vi.fn().mockReturnValue(<div />)
      renderAt(3, { children })
      // word 3 is the first word of section 1 → sectionWordIndex should be 0
      expect(children).toHaveBeenCalledWith(
        expect.objectContaining({ sectionWordIndex: 0 })
      )
    })

    it('passes sectionWordIndex of 2 when at the last word of section 0', () => {
      const children = vi.fn().mockReturnValue(<div />)
      renderAt(2, { children })
      expect(children).toHaveBeenCalledWith(
        expect.objectContaining({ sectionWordIndex: 2 })
      )
    })
  })

  // ── Navigation buttons ────────────────────────────────────────────────────

  describe('Navigation button states', () => {
    it('disables Previous button on the first section', () => {
      renderAt(0)
      expect(
        screen.getByRole('button', { name: /previous section/i })
      ).toBeDisabled()
    })

    it('enables Previous button on non-first sections', () => {
      renderAt(3) // section 1
      expect(
        screen.getByRole('button', { name: /previous section/i })
      ).not.toBeDisabled()
    })

    it('disables the Next button on the last section', () => {
      renderAt(3) // section 1 = last
      const next = screen
        .getAllByRole('button')
        .find(
          (b) => b !== screen.getByRole('button', { name: /previous section/i })
        )
      expect(next).toBeDisabled()
    })

    it('enables the Next button on non-last sections', () => {
      renderAt(0)
      const prev = screen.getByRole('button', { name: /previous section/i })
      const buttons = screen.getAllByRole('button')
      const next = buttons.find((b) => b !== prev)
      expect(next).not.toBeDisabled()
    })

    it('clicking Next calls onWordIndexChange with the next section start offset', async () => {
      const onWordIndexChange = vi.fn()
      const user = userEvent.setup()
      renderAt(0, { onWordIndexChange })
      const prev = screen.getByRole('button', { name: /previous section/i })
      const buttons = screen.getAllByRole('button')
      const next = buttons.find((b) => b !== prev)!
      await user.click(next)
      // Section 1 starts at word offset 3
      expect(onWordIndexChange).toHaveBeenCalledWith(3)
    })

    it('clicking Previous calls onWordIndexChange with the previous section start offset', async () => {
      const onWordIndexChange = vi.fn()
      const user = userEvent.setup()
      renderAt(3, { onWordIndexChange }) // section 1
      await user.click(
        screen.getByRole('button', { name: /previous section/i })
      )
      // Section 0 starts at word offset 0
      expect(onWordIndexChange).toHaveBeenCalledWith(0)
    })
  })

  // ── Next button labels ────────────────────────────────────────────────────

  describe('Next button labels', () => {
    it('shows "Skip Section" when not on the last section and quiz not done', () => {
      renderAt(0)
      expect(screen.getByText('Skip Section')).toBeInTheDocument()
    })

    it('shows "Continue" when not on the last section and current section quiz is done', () => {
      renderAt(0, {
        quizzedSections: new Set([0]),
        totalSectionQuizCount: 2,
      })
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('shows "Last Section" when on the last section and no quizzes exist', () => {
      renderAt(3, {
        totalSectionQuizCount: 0,
      })
      expect(screen.getByText('Last Section')).toBeInTheDocument()
    })

    it('shows "Last Section" when on the last section and totalSectionQuizCount is undefined', () => {
      renderAt(3)
      expect(screen.getByText('Last Section')).toBeInTheDocument()
    })

    it('shows "2 quizzes left" when on the last section with 2 quizzes remaining', () => {
      renderAt(3, {
        quizzedSections: new Set<number>(),
        totalSectionQuizCount: 2,
      })
      expect(screen.getByText('2 quizzes left')).toBeInTheDocument()
    })

    it('shows "1 quiz left" (singular) when on the last section with 1 quiz remaining', () => {
      renderAt(3, {
        quizzedSections: new Set([0]), // section 0 done
        totalSectionQuizCount: 2, // 2 total → 1 remaining
      })
      expect(screen.getByText('1 quiz left')).toBeInTheDocument()
    })

    it('shows "All quizzes done!" when on the last section and all quizzes are complete', () => {
      renderAt(3, {
        quizzedSections: new Set([0, 1]),
        totalSectionQuizCount: 2,
      })
      expect(screen.getByText('All quizzes done!')).toBeInTheDocument()
    })

    it('does not show a ChevronRight icon on the last section', () => {
      renderAt(3, { totalSectionQuizCount: 0 })
      const prev = screen.getByRole('button', { name: /previous section/i })
      const buttons = screen.getAllByRole('button')
      const next = buttons.find((b) => b !== prev)!
      const svgs = next.querySelectorAll('svg')
      expect(svgs.length).toBe(0)
    })
  })

  // ── Next button styling ───────────────────────────────────────────────────

  describe('Next button styling', () => {
    it('"All quizzes done!" button has success colour classes', () => {
      renderAt(3, {
        quizzedSections: new Set([0, 1]),
        totalSectionQuizCount: 2,
      })
      const prev = screen.getByRole('button', { name: /previous section/i })
      const buttons = screen.getAllByRole('button')
      const next = buttons.find((b) => b !== prev)!
      expect(next.className).toContain('text-success')
      expect(next.className).toContain('border-success')
    })

    it('"Continue" button has primary colour classes', () => {
      renderAt(0, {
        quizzedSections: new Set([0]),
        totalSectionQuizCount: 2,
      })
      const prev = screen.getByRole('button', { name: /previous section/i })
      const buttons = screen.getAllByRole('button')
      const next = buttons.find((b) => b !== prev)!
      expect(next.className).toContain('bg-primary')
    })

    it('"Skip Section" button does not have primary or success colour classes', () => {
      renderAt(0)
      const prev = screen.getByRole('button', { name: /previous section/i })
      const buttons = screen.getAllByRole('button')
      const next = buttons.find((b) => b !== prev)!
      expect(next.className).not.toContain('bg-primary')
      expect(next.className).not.toContain('text-success')
    })
  })

  // ── Quiz completion dots ──────────────────────────────────────────────────

  describe('Quiz completion dots', () => {
    it('does not render quiz dots when quizzedSections is undefined', () => {
      const { container } = renderAt(0)
      const dots = container.querySelectorAll(
        '.w-2.h-2.rounded-full.flex-shrink-0'
      )
      expect(dots.length).toBe(0)
    })

    it('renders one dot per section when quizzedSections is provided', () => {
      const { container } = renderAt(0, {
        quizzedSections: new Set<number>(),
        totalSectionQuizCount: 2,
      })
      const dots = container.querySelectorAll(
        '.w-2.h-2.rounded-full.flex-shrink-0'
      )
      expect(dots.length).toBe(2) // one per section
    })

    it('completed section dot has success colour', () => {
      const { container } = renderAt(0, {
        quizzedSections: new Set([0]),
        totalSectionQuizCount: 2,
      })
      const dots = container.querySelectorAll(
        '.w-2.h-2.rounded-full.flex-shrink-0'
      )
      expect(dots[0].className).toContain('bg-success')
    })

    it('incomplete section dot has muted colour', () => {
      const { container } = renderAt(0, {
        quizzedSections: new Set([0]),
        totalSectionQuizCount: 2,
      })
      const dots = container.querySelectorAll(
        '.w-2.h-2.rounded-full.flex-shrink-0'
      )
      expect(dots[1].className).toContain('bg-text-secondary')
    })

    it('all dots have success colour when all quizzes completed', () => {
      const { container } = renderAt(3, {
        quizzedSections: new Set([0, 1]),
        totalSectionQuizCount: 2,
      })
      const dots = container.querySelectorAll(
        '.w-2.h-2.rounded-full.flex-shrink-0'
      )
      dots.forEach((dot) => {
        expect(dot.className).toContain('bg-success')
      })
    })
  })

  // ── Callbacks ─────────────────────────────────────────────────────────────

  describe('onSectionIndexChange callback', () => {
    it('calls onSectionIndexChange with 0 on initial render', async () => {
      const onSectionIndexChange = vi.fn()
      renderAt(0, { onSectionIndexChange })
      await waitFor(() => {
        expect(onSectionIndexChange).toHaveBeenCalledWith(0)
      })
    })

    it('calls onSectionIndexChange with 1 when currentWordIndex enters section 1', async () => {
      const onSectionIndexChange = vi.fn()
      renderAt(3, { onSectionIndexChange })
      await waitFor(() => {
        expect(onSectionIndexChange).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('onSectionComplete callback', () => {
    it('does not fire when not at the end of a section', async () => {
      const onSectionComplete = vi.fn()
      // Word 0 of section 0 (3 words) — not at end
      renderAt(0, { onSectionComplete })
      await waitFor(() => {
        expect(onSectionComplete).not.toHaveBeenCalled()
      })
    })

    it('fires with the correct section index when reader reaches the last word of section 0', async () => {
      const onSectionComplete = vi.fn()
      // Word 2 = last word of section 0 (words 0-2)
      renderAt(2, { onSectionComplete })
      await waitFor(() => {
        expect(onSectionComplete).toHaveBeenCalledWith(0)
      })
    })

    it('fires with the correct section index when reader reaches the last word of section 1', async () => {
      const onSectionComplete = vi.fn()
      // Word 4 = last word of section 1 (words 3-4)
      renderAt(4, { onSectionComplete })
      await waitFor(() => {
        expect(onSectionComplete).toHaveBeenCalledWith(1)
      })
    })

    it('does not fire when reader is mid-way through a section', async () => {
      const onSectionComplete = vi.fn()
      // Word 1 is the middle of section 0 (3 words)
      renderAt(1, { onSectionComplete })
      await waitFor(() => {
        expect(onSectionComplete).not.toHaveBeenCalled()
      })
    })
  })

  // ── Section index calculation (last section boundary) ─────────────────────

  describe('Section index boundary: reading past last section', () => {
    it('stays on the last section when currentWordIndex exceeds all section boundaries', () => {
      // Word 99 is beyond all sections; component should stay on section 1 (last)
      renderAt(99)
      expect(screen.getByText('Section Two')).toBeInTheDocument()
      expect(screen.getByText('2 of 2')).toBeInTheDocument()
    })
  })
})
