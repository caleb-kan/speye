import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ReadingPreferencesProvider } from './context/ReadingPreferencesProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { getRuntimeBase } from './utils/getRuntimeBase'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Library } from './pages/Library'
import { Activity } from './pages/Activity'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Adaptive } from './pages/Adaptive'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { Notifications } from './pages/Notifications'
import { RootLayout } from './layouts/RootLayout'
import { ReadingLayout } from './layouts/ReadingLayout'
import { AdaptiveLayout } from './layouts/AdaptiveLayout'
import { WindowSizeProvider } from './components/WindowSizeProvider'
import { NotificationsProvider } from './context/NotificationsProvider'

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
                    <Route index element={<Navigate to="/home" replace />} />

                    {/* Pages with OptionsBar */}
                    <Route
                      element={
                        <WindowSizeProvider>
                          <ReadingLayout />
                        </WindowSizeProvider>
                      }
                    >
                      <Route path="home" element={<Home />} />
                    </Route>

                    {/* Adaptive reading mode */}
                    <Route
                      element={
                        <WindowSizeProvider>
                          <AdaptiveLayout />
                        </WindowSizeProvider>
                      }
                    >
                      <Route path="adaptive" element={<Adaptive />} />
                    </Route>

                    {/* Pages without OptionsBar */}
                    <Route path="library" element={<Library />} />
                    <Route path="activity" element={<Activity />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="login" element={<Login />} />
                    <Route
                      path="forgot-password"
                      element={<ForgotPassword />}
                    />
                    <Route path="reset-password" element={<ResetPassword />} />
                    <Route path="privacy" element={<Privacy />} />
                    <Route path="terms" element={<Terms />} />
                    <Route path="notifications" element={<Notifications />} />

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
