export type LoginHeaderProps = {
  isSignUp: boolean
}

export function LoginHeader({ isSignUp }: LoginHeaderProps) {
  return (
    <div className="text-center mb-5">
      <h1 className="text-xl font-bold text-text">
        {isSignUp ? 'Create Account' : 'Welcome Back'}
      </h1>
      <p className="text-sm text-text-secondary mt-1">
        {isSignUp
          ? 'Sign up to save your progress'
          : 'Sign in to continue reading'}
      </p>
    </div>
  )
}
