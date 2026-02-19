import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconTabs } from '../../components/ui/IconTabs'
import { Bell, Check, Lock } from 'lucide-react'

describe('IconTabs', () => {
  const mockOnTabChange = vi.fn()

  const mockTabs = [
    { id: 'tab1' as const, label: 'Tab 1', icon: Bell, badge: 5 },
    { id: 'tab2' as const, label: 'Tab 2', icon: Check, badge: 3 },
    { id: 'tab3' as const, label: 'Tab 3', icon: Lock },
  ]

  type TabId = (typeof mockTabs)[number]['id']

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all tabs with icons', () => {
    const { container } = render(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={mockOnTabChange}
      />
    )

    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Tab 3')).toBeInTheDocument()

    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBe(3)
  })

  it('should render badge counts for tabs with badges', () => {
    render(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={mockOnTabChange}
      />
    )

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should not render badge when count is 0', () => {
    const tabsWithZeroBadge = [
      { id: 'a' as const, label: 'Tab A', icon: Bell, badge: 0 },
      { id: 'b' as const, label: 'Tab B', icon: Check, badge: 5 },
    ]

    render(
      <IconTabs tabs={tabsWithZeroBadge} activeTab="a" onTabChange={vi.fn()} />
    )

    const tab = screen.getByRole('button', { name: /Tab A/ })
    expect(tab.textContent).toBe('Tab A')
  })

  it('should not render badge when badge is undefined', () => {
    render(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={mockOnTabChange}
      />
    )

    const tab = screen.getByRole('button', { name: /Tab 3/ })
    expect(tab.textContent).toBe('Tab 3')
  })

  it('should apply active styles to the active tab', () => {
    render(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={mockOnTabChange}
      />
    )

    const activeTab = screen.getByRole('button', { name: /Tab 1/ })
    expect(activeTab).toHaveClass('text-primary')
    expect(activeTab).toHaveClass('border-primary')
  })

  it('should apply inactive styles to non-active tabs', () => {
    render(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={mockOnTabChange}
      />
    )

    const inactiveTab = screen.getByRole('button', { name: /Tab 2/ })
    expect(inactiveTab).toHaveClass('text-text-secondary')
  })

  it('should call onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup()
    render(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={mockOnTabChange}
      />
    )

    await user.click(screen.getByText('Tab 2'))

    expect(mockOnTabChange).toHaveBeenCalledWith('tab2')
  })

  it('should style badges differently for active and inactive tabs', () => {
    const { rerender } = render(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={mockOnTabChange}
      />
    )

    const activeBadge = screen.getByText('5')
    expect(activeBadge).toHaveClass('bg-primary/10')
    expect(activeBadge).toHaveClass('text-primary')

    rerender(
      <IconTabs<TabId>
        tabs={mockTabs}
        activeTab="tab2"
        onTabChange={mockOnTabChange}
      />
    )

    const inactiveBadge = screen.getByText('5')
    expect(inactiveBadge).toHaveClass('bg-bg-secondary')
    expect(inactiveBadge).toHaveClass('text-text-secondary')
  })
})
