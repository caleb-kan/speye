import { useNavigate } from 'react-router-dom'

export function BackToLoginLink() {
  const navigate = useNavigate()

  return (
    <p className="text-center text-xs text-text-secondary mt-4">
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="hover:text-text transition-colors"
      >
        Back to login
      </button>
    </p>
  )
}
