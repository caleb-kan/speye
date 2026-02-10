export type LoginFooterProps = {
  isSignUp: boolean
  onToggleMode: () => void
  onContinueWithoutAccount: () => void
}

export function LoginFooter({
  isSignUp,
  onToggleMode,
  onContinueWithoutAccount,
}: LoginFooterProps) {
  return (
    <>
      <p className="text-center text-sm text-text-secondary mt-4">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-primary font-medium hover:underline transition-colors"
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </button>
      </p>

      <p className="text-center text-xs text-text-secondary mt-3">
        <button
          type="button"
          onClick={onContinueWithoutAccount}
          className="hover:text-text transition-colors"
        >
          Continue without an account
        </button>
      </p>
    </>
  )
}
