import { useNavigate } from 'react-router-dom'
import { useLoginForm } from '../hooks/useLoginForm'
import { useDefaultReadingRoute } from '../hooks/useDefaultReadingRoute'
import { LoginFooter } from '../components/login/LoginFooter'
import { LoginForm } from '../components/login/LoginForm'
import { LoginHeader } from '../components/login/LoginHeader'
import { LoginGoogleButton } from '../components/login/LoginGoogleButton'

export function Login() {
  const navigate = useNavigate()
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

        <LoginGoogleButton
          loading={loading}
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
          loading={loading}
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
