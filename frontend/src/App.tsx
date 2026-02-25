import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { useDefaultReadingRoute } from './hooks/useDefaultReadingRoute'
import { useIsMobile } from './hooks/useIsMobile'
import { ROUTES } from './utils/routes'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ReadingPreferencesProvider } from './context/ReadingPreferencesProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { getRuntimeBase } from './utils/getRuntimeBase'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Library } from './pages/Library'
import { Activity } from './pages/Activity'
import { Admin } from './pages/Admin'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { CompleteProfile } from './pages/CompleteProfile'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Adaptive } from './pages/Adaptive'
import { Rsvp } from './pages/Rsvp'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { Notifications } from './pages/Notifications'
import { License } from './pages/License'
import { RootLayout } from './layouts/RootLayout'
import { ReadingLayout } from './layouts/ReadingLayout'
import { AdaptiveLayout } from './layouts/AdaptiveLayout'
import { RsvpLayout } from './layouts/RsvpLayout'
import { WindowSizeProvider } from './components/WindowSizeProvider'
import { NotificationsProvider } from './context/NotificationsProvider'
import { RequireUsername } from './components/auth/RequireUsername'

function DefaultRedirect() {
  const defaultRoute = useDefaultReadingRoute()
  return <Navigate to={defaultRoute} replace />
}

/** Redirects mobile users from /home (and /adaptive) to /rsvp, preserving location state. */
function MobileReadingGuard({ children }: { children: React.ReactElement }) {
  const isMobile = useIsMobile()
  const location = useLocation()

  if (isMobile) {
    return <Navigate to={ROUTES.RSVP} state={location.state} replace />
  }

  return children
}

function App() {
  const runtimeBase = getRuntimeBase()
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <ReadingPreferencesProvider>
              <BrowserRouter basename={runtimeBase}>
                <Routes>
                  <Route path="/" element={<RootLayout />}>
                    <Route index element={<DefaultRedirect />} />

                    <Route element={<RequireUsername />}>
                      {/* Pages with OptionsBar */}
                      <Route
                        element={
                          <WindowSizeProvider>
                            <ReadingLayout />
                          </WindowSizeProvider>
                        }
                      >
                        <Route
                          path="home"
                          element={
                            <MobileReadingGuard>
                              <Home />
                            </MobileReadingGuard>
                          }
                        />
                      </Route>

                      {/* Adaptive reading mode */}
                      <Route
                        element={
                          <WindowSizeProvider>
                            <AdaptiveLayout />
                          </WindowSizeProvider>
                        }
                      >
                        <Route
                          path="adaptive"
                          element={
                            <MobileReadingGuard>
                              <Adaptive />
                            </MobileReadingGuard>
                          }
                        />
                      </Route>

                      {/* RSVP reading mode */}
                      <Route
                        element={
                          <WindowSizeProvider>
                            <RsvpLayout />
                          </WindowSizeProvider>
                        }
                      >
                        <Route path="rsvp" element={<Rsvp />} />
                      </Route>

                      {/* Pages without OptionsBar */}
                      <Route path="library" element={<Library />} />
                      <Route path="activity" element={<Activity />} />
                      <Route path="admin" element={<Admin />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="notifications" element={<Notifications />} />
                    </Route>

                    <Route
                      path="complete-profile"
                      element={<CompleteProfile />}
                    />
                    <Route path="login" element={<Login />} />
                    <Route
                      path="forgot-password"
                      element={<ForgotPassword />}
                    />
                    <Route path="reset-password" element={<ResetPassword />} />
                    <Route path="privacy" element={<Privacy />} />
                    <Route path="terms" element={<Terms />} />
                    <Route path="license" element={<License />} />

                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ReadingPreferencesProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
