import { useNavigate } from 'react-router-dom'
import { useLoginForm } from '../hooks/useLoginForm'
import { useDefaultReadingRoute } from '../hooks/useDefaultReadingRoute'
import { LoginFooter } from '../components/login/LoginFooter'
import { LoginForm } from '../components/login/LoginForm'
import { LoginHeader } from '../components/login/LoginHeader'
import { LoginGoogleButton } from '../components/login/LoginGoogleButton'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { CloudOff } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const { isOnline } = useNetworkStatus()
  const defaultRoute = useDefaultReadingRoute()
  const {
    email,
    password,
    username,
    error,
    usernameError,
    message,
    loading,
    isSignUp,
    handleEmailChange,
    handlePasswordChange,
    handleUsernameChange,
    handleGoogleSignIn,
    handleSubmit,
    toggleMode,
  } = useLoginForm()

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
      <div className="w-full max-w-xs bg-bg-secondary rounded-xl shadow-lg px-6 py-6">
        <LoginHeader isSignUp={isSignUp} />

        {!isOnline && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-text-secondary/10 text-text-secondary text-xs">
            <CloudOff size={14} className="shrink-0" />
            <span>Sign in requires an internet connection</span>
          </div>
        )}

        <LoginGoogleButton
          loading={loading || !isOnline}
          onGoogleSignIn={handleGoogleSignIn}
        />

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-text-secondary/20" />
          <span className="px-3 text-xs text-text-secondary">or</span>
          <div className="flex-1 h-px bg-text-secondary/20" />
        </div>

        <LoginForm
          email={email}
          password={password}
          username={username}
          error={error}
          usernameError={usernameError}
          message={message}
          loading={loading || !isOnline}
          isSignUp={isSignUp}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          onUsernameChange={handleUsernameChange}
          onSubmit={handleSubmit}
        />

        <LoginFooter
          isSignUp={isSignUp}
          onToggleMode={toggleMode}
          onContinueWithoutAccount={() => navigate(defaultRoute)}
        />
      </div>
    </div>
  )
}
