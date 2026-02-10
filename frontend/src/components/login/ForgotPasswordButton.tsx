import { useNavigate } from 'react-router-dom'

export type ForgotPasswordButtonProps = {
  isSignUp: boolean
}

export function ForgotPasswordButton({ isSignUp }: ForgotPasswordButtonProps) {
  const navigate = useNavigate()

  if (isSignUp) return null

  return (
    <div className="text-right mt-1">
      <button
        type="button"
        onClick={() => navigate('/forgot-password')}
        className="text-xs text-primary hover:underline transition-colors"
      >
        Forgot password?
      </button>
    </div>
  )
}
