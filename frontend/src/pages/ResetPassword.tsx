import { useResetPasswordForm } from '../hooks/useResetPasswordForm'
import { ResetPasswordForm } from '../components/login/ResetPasswordForm'
import { LoginHeader } from '../components/login/LoginHeader'
import { BackToLoginLink } from '../components/login/BackToLoginLink'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { CloudOff } from 'lucide-react'

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
  const { isOnline } = useNetworkStatus()

  if (!isValidToken) {
    return null
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
      <div className="w-full max-w-xs bg-bg-secondary rounded-xl shadow-lg px-6 py-6">
        <LoginHeader
          isSignUp={false}
          title="Reset Password"
          subtitle="Enter your new password"
        />

        {!isOnline && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-text-secondary/10 text-text-secondary text-xs">
            <CloudOff size={14} className="shrink-0" />
            <span>Password reset requires an internet connection</span>
          </div>
        )}

        <ResetPasswordForm
          password={password}
          confirmPassword={confirmPassword}
          error={error}
          message={message}
          loading={loading || !isOnline}
          onPasswordChange={handlePasswordChange}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          onSubmit={handleSubmit}
        />

        <BackToLoginLink />
      </div>
    </div>
  )
}
