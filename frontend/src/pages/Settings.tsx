import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Upload, X } from 'lucide-react'
import { Header } from '../components/Header'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'

export function Settings() {
  const { theme, setTheme, themes } = useTheme()
  const { user, signOut } = useAuth()
  const { profile, updateAvatar } = useProfile()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/home')
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be less than 2MB')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase storage
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // Update profile
      const { error: updateErr } = await updateAvatar(publicUrl)
      if (updateErr) throw new Error(updateErr)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload avatar'
      setUploadError(message)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    const { error } = await updateAvatar(null)
    if (error) {
      setUploadError(error)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center px-8 pt-44 pb-16">
        <div className="w-full max-w-xl">
          {/* Page Title */}
          <h1 className="text-2xl font-semibold text-text mb-10 text-center">
            settings
          </h1>

          {/* Profile Section - Only show when logged in */}
          {user && (
            <section className="mb-10">
              <h2 className="text-sm text-text-secondary mb-3 text-center">
                profile
              </h2>
              <div className="bg-bg-secondary rounded-lg p-5">
                <div className="flex flex-col items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploading}
                      className="w-24 h-24 rounded-full overflow-hidden border-2 border-text-secondary/30 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50"
                      aria-label="Change profile picture"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <DefaultAvatarLarge email={user.email} />
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-bg/80 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                    {profile?.avatar_url && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-error rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                        aria-label="Remove profile picture"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Upload profile picture"
                  />

                  <button
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {uploading ? 'Uploading...' : 'Upload photo'}
                  </button>

                  {uploadError && (
                    <p className="text-sm text-error">{uploadError}</p>
                  )}

                  {/* Email display */}
                  <p className="text-sm text-text-secondary">{user.email}</p>
                </div>
              </div>
            </section>
          )}

          {/* Theme Section */}
          <section className="mb-10">
            <h2 className="text-sm text-text-secondary mb-3 text-center">
              theme
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative p-4 rounded-lg border-2 transition-all ${
                    theme.id === t.id
                      ? 'border-primary'
                      : 'border-transparent hover:border-text-secondary/30'
                  }`}
                  style={{ backgroundColor: t.colors.bgSecondary }}
                  aria-label={`Select ${t.name} theme${theme.id === t.id ? ' (currently selected)' : ''}`}
                >
                  {/* Theme Preview */}
                  <div className="flex gap-1.5 mb-3 justify-center">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.colors.text }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.colors.textSecondary }}
                    />
                  </div>
                  <span
                    className="text-sm font-medium block text-center"
                    style={{ color: t.colors.text }}
                  >
                    {t.name}
                  </span>

                  {/* Active Indicator */}
                  {theme.id === t.id && (
                    <div className="absolute top-2 right-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={t.colors.primary}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="mb-10">
            <h2 className="text-sm text-text-secondary mb-3 text-center">
              keyboard shortcuts
            </h2>
            <div className="bg-bg-secondary rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-text">Start / Pause reading</span>
                <kbd className="px-3 py-1.5 bg-bg rounded text-sm text-text-secondary font-mono">
                  Space
                </kbd>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="mb-10">
            <h2 className="text-sm text-text-secondary mb-3 text-center">
              about
            </h2>
            <div className="bg-bg-secondary rounded-lg p-5">
              <p className="text-text mb-5 text-center">
                sp(eye) is an adaptive speed reading platform that helps you
                read faster while maintaining comprehension.
              </p>
              <div className="text-sm text-text-secondary space-y-3">
                <div className="flex gap-3">
                  <span className="text-primary font-medium shrink-0">
                    standard
                  </span>
                  <span>Fixed WPM speed reading with word highlighting</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-text-secondary/50 font-medium shrink-0">
                    adaptive
                  </span>
                  <span className="text-text-secondary/50">
                    Eye-tracking based adaptive speed (coming soon)
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="text-text-secondary/50 font-medium shrink-0">
                    summarized
                  </span>
                  <span className="text-text-secondary/50">
                    AI-powered summarization for non-fiction (coming soon)
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Account Section - Only show when logged in */}
          {user && (
            <section>
              <h2 className="text-sm text-text-secondary mb-3 text-center">
                account
              </h2>
              <div className="bg-bg-secondary rounded-lg p-5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-error hover:bg-error/10 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Log out</span>
                </button>
              </div>
            </section>
          )}

          {/* Login Prompt - Only show when not logged in */}
          {!user && (
            <section>
              <h2 className="text-sm text-text-secondary mb-3 text-center">
                account
              </h2>
              <div className="bg-bg-secondary rounded-lg p-5 text-center">
                <p className="text-text-secondary mb-4">
                  Log in to save your preferences and track your reading
                  progress.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-opacity"
                >
                  Log in
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function DefaultAvatarLarge({ email }: { email?: string }) {
  const getColorFromEmail = (email?: string) => {
    if (!email) return 'hsl(220, 70%, 50%)'
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, 65%, 45%)`
  }

  const initial = email?.charAt(0).toUpperCase() || '?'
  const bgColor = getColorFromEmail(email)

  return (
    <div
      className="w-full h-full flex items-center justify-center text-white font-bold text-3xl"
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  )
}
