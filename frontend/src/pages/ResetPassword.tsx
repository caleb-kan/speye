import { useResetPasswordForm } from '../hooks/useResetPasswordForm'
import { ResetPasswordForm } from '../components/login/ResetPasswordForm'
import { LoginHeader } from '../components/login/LoginHeader'
import { BackToLoginLink } from '../components/login/BackToLoginLink'

export function ResetPassword() {
  const {
    password,
    confirmPassword,
    error,
    message,
    loading,
    isValidToken,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleSubmit,
  } = useResetPasswordForm()

  if (!isValidToken) {
    return null
  }

  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <div className="w-full max-w-xs bg-bg-secondary rounded-xl shadow-lg px-6 py-6">
        <LoginHeader
          isSignUp={false}
          title="Reset Password"
          subtitle="Enter your new password"
        />

        <ResetPasswordForm
          password={password}
          confirmPassword={confirmPassword}
          error={error}
          message={message}
          loading={loading}
          onPasswordChange={handlePasswordChange}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          onSubmit={handleSubmit}
        />

        <BackToLoginLink />
      </div>
    </div>
  )
}
