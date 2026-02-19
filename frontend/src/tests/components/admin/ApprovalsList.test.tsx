import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApprovalsList } from '../../../components/admin/textApproval/ApprovalsList'
import { createMockAdminText } from '../../helpers/adminMockFactory'

const flaggedText = createMockAdminText({
  id: 'flagged-1',
  title: 'Flagged Text',
  rejection_stage: 'process_text',
})

const passedText = createMockAdminText({
  id: 'passed-1',
  title: 'Passed Text',
  processing_status: 'completed',
  quiz_valid: true,
  rejection_stage: null,
})

const defaultHandlers = {
  processing: null,
  onView: vi.fn(),
  onViewQuiz: vi.fn(),
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onRegenerate: vi.fn(),
}

describe('ApprovalsList', () => {
  describe('default tab', () => {
    it('should default to the flagged tab', () => {
      render(
        <ApprovalsList
          approvals={[flaggedText, passedText]}
          {...defaultHandlers}
        />
      )
      expect(screen.getByText('Flagged Text')).toBeInTheDocument()
      expect(screen.queryByText('Passed Text')).not.toBeInTheDocument()
    })
  })

  describe('tab switching', () => {
    it('should show passed texts when clicking passed tab', async () => {
      const user = userEvent.setup()
      render(
        <ApprovalsList
          approvals={[flaggedText, passedText]}
          {...defaultHandlers}
        />
      )

      await user.click(screen.getByRole('button', { name: /passed/i }))

      expect(screen.getByText('Passed Text')).toBeInTheDocument()
      expect(screen.queryByText('Flagged Text')).not.toBeInTheDocument()
    })

    it('should switch back to flagged tab', async () => {
      const user = userEvent.setup()
      render(
        <ApprovalsList
          approvals={[flaggedText, passedText]}
          {...defaultHandlers}
        />
      )

      await user.click(screen.getByRole('button', { name: /passed/i }))
      await user.click(screen.getByRole('button', { name: /flagged/i }))

      expect(screen.getByText('Flagged Text')).toBeInTheDocument()
      expect(screen.queryByText('Passed Text')).not.toBeInTheDocument()
    })
  })

  describe('count badges', () => {
    it('should show correct counts for each tab', () => {
      render(
        <ApprovalsList
          approvals={[flaggedText, passedText]}
          {...defaultHandlers}
        />
      )

      const flaggedButton = screen.getByRole('button', {
        name: /flagged/i,
      })
      const passedButton = screen.getByRole('button', {
        name: /passed/i,
      })

      expect(flaggedButton).toHaveTextContent('1')
      expect(passedButton).toHaveTextContent('1')
    })

    it('should show total pending count in header', () => {
      render(
        <ApprovalsList
          approvals={[flaggedText, passedText]}
          {...defaultHandlers}
        />
      )
      expect(screen.getByText('2 Pending')).toBeInTheDocument()
    })
  })

  describe('empty states', () => {
    it('should show flagged empty state when all texts are passed', () => {
      render(<ApprovalsList approvals={[passedText]} {...defaultHandlers} />)
      expect(screen.getByText('No flagged texts')).toBeInTheDocument()
      expect(
        screen.getByText('All pending texts passed automated checks.')
      ).toBeInTheDocument()
    })

    it('should show passed empty state when all texts are flagged', async () => {
      const user = userEvent.setup()
      render(<ApprovalsList approvals={[flaggedText]} {...defaultHandlers} />)

      await user.click(screen.getByRole('button', { name: /passed/i }))

      expect(screen.getByText('No passed texts')).toBeInTheDocument()
      expect(
        screen.getByText('All pending texts have been flagged for review.')
      ).toBeInTheDocument()
    })
  })

  describe('filtering correctness', () => {
    it('should partition multiple texts correctly', async () => {
      const user = userEvent.setup()
      const secondFlagged = createMockAdminText({
        id: 'flagged-2',
        title: 'Second Flagged',
        rejection_stage: 'validate_quiz',
      })
      const secondPassed = createMockAdminText({
        id: 'passed-2',
        title: 'Second Passed',
        processing_status: 'completed',
        quiz_valid: null,
        rejection_stage: null,
      })

      render(
        <ApprovalsList
          approvals={[flaggedText, passedText, secondFlagged, secondPassed]}
          {...defaultHandlers}
        />
      )

      // Flagged tab should show both flagged texts
      expect(screen.getByText('Flagged Text')).toBeInTheDocument()
      expect(screen.getByText('Second Flagged')).toBeInTheDocument()
      expect(screen.queryByText('Passed Text')).not.toBeInTheDocument()
      expect(screen.queryByText('Second Passed')).not.toBeInTheDocument()

      // Switch to passed tab
      await user.click(screen.getByRole('button', { name: /passed/i }))

      expect(screen.getByText('Passed Text')).toBeInTheDocument()
      expect(screen.getByText('Second Passed')).toBeInTheDocument()
      expect(screen.queryByText('Flagged Text')).not.toBeInTheDocument()
      expect(screen.queryByText('Second Flagged')).not.toBeInTheDocument()
    })
  })
})
