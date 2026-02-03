import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CalibrationPoint } from '../../../components/adaptive/CalibrationPoint'
import userEvent from '@testing-library/user-event'

describe('CalibrationPoint', () => {
  const defaultProps = {
    x: 100,
    y: 200,
    clicksRemaining: 5,
    isActive: false,
    isComplete: false,
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders as a button', () => {
    render(<CalibrationPoint {...defaultProps} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('positions the button at the specified x and y coordinates', () => {
    render(<CalibrationPoint {...defaultProps} x={150} y={250} />)
    const button = screen.getByRole('button')
    expect(button).toHaveStyle('left: 150px')
    expect(button).toHaveStyle('top: 250px')
  })

  it('calls onClick when clicked and point is active', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <CalibrationPoint {...defaultProps} onClick={onClick} isActive={true} />
    )
    const button = screen.getByRole('button')
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disables the button when point is complete', () => {
    render(<CalibrationPoint {...defaultProps} isComplete={true} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('disables the button when point is not active', () => {
    render(<CalibrationPoint {...defaultProps} isActive={false} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('enables the button when point is active and not complete', () => {
    render(
      <CalibrationPoint {...defaultProps} isActive={true} isComplete={false} />
    )
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('renders inner circle when active and not complete', () => {
    render(
      <CalibrationPoint {...defaultProps} isActive={true} isComplete={false} />
    )
    const button = screen.getByRole('button')
    expect(button.querySelector('.bg-bg')).toBeInTheDocument()
  })

  it('renders checkmark when complete', () => {
    const { container } = render(
      <CalibrationPoint {...defaultProps} isComplete={true} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('has correct aria-label when active', () => {
    render(
      <CalibrationPoint {...defaultProps} isActive={true} clicksRemaining={3} />
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName(/Click calibration point/)
  })

  it('has correct aria-label when complete', () => {
    render(<CalibrationPoint {...defaultProps} isComplete={true} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName(/Calibration point complete/)
  })

  it('has correct aria-label when upcoming', () => {
    render(<CalibrationPoint {...defaultProps} isActive={false} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName(/Upcoming calibration point/)
  })

  it('applies pulse animation when active and not complete', () => {
    render(
      <CalibrationPoint {...defaultProps} isActive={true} isComplete={false} />
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('animate-pulse')
  })

  it('does not apply pulse animation when not active', () => {
    render(<CalibrationPoint {...defaultProps} isActive={false} />)
    const button = screen.getByRole('button')
    expect(button.className).not.toContain('animate-pulse')
  })

  it('updates size and opacity based on clicks remaining', () => {
    const { rerender } = render(
      <CalibrationPoint {...defaultProps} isActive={true} clicksRemaining={5} />
    )
    let button = screen.getByRole('button')
    const style1 = button.getAttribute('style')

    rerender(
      <CalibrationPoint {...defaultProps} isActive={true} clicksRemaining={1} />
    )
    button = screen.getByRole('button')
    const style2 = button.getAttribute('style')

    expect(style1).not.toEqual(style2)
  })

  it('has focus ring styling', () => {
    render(<CalibrationPoint {...defaultProps} />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('focus:ring-2')
    expect(button.className).toContain('focus:ring-primary')
  })
})
