import googleIcon from '../../assets/GoogleIcon.svg'

export type LoginGoogleButtonProps = {
  loading: boolean
  onGoogleSignIn: () => Promise<void>
}

export function LoginGoogleButton({
  loading,
  onGoogleSignIn,
}: LoginGoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onGoogleSignIn}
      disabled={loading}
      className="w-full py-2.5 flex items-center justify-center gap-2 border border-text-secondary/30 rounded-lg bg-bg text-text text-sm font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      <img src={googleIcon} alt="" className="w-4 h-4" />
      Continue with Google
    </button>
  )
}
