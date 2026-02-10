import { useForgotPasswordForm } from '../hooks/useForgotPasswordForm'
import { ForgotPasswordForm } from '../components/login/ForgotPasswordForm'
import { LoginHeader } from '../components/login/LoginHeader'
import { BackToLoginLink } from '../components/login/BackToLoginLink'

export function ForgotPassword() {
  const { email, error, message, loading, handleEmailChange, handleSubmit } =
    useForgotPasswordForm()

  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <div className="w-full max-w-xs bg-bg-secondary rounded-xl shadow-lg px-6 py-6">
        <LoginHeader
          isSignUp={false}
          title="Reset Password"
          subtitle="Enter your email to receive reset instructions"
        />

        <ForgotPasswordForm
          email={email}
          error={error}
          message={message}
          loading={loading}
          onEmailChange={handleEmailChange}
          onSubmit={handleSubmit}
        />

        <BackToLoginLink />
      </div>
    </div>
  )
}
