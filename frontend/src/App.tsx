import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ReadingPreferencesProvider } from './context/ReadingPreferencesProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Library } from './pages/Library'
import { Quiz } from './pages/Quiz'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { Adaptive } from './pages/Adaptive'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { RootLayout } from './layouts/RootLayout'
import { ReadingLayout } from './layouts/ReadingLayout'
import { AdaptiveLayout } from './layouts/AdaptiveLayout'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ReadingPreferencesProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <Routes>
                <Route path="/" element={<RootLayout />}>
                  <Route index element={<Navigate to="/home" replace />} />

                  {/* Pages with OptionsBar */}
                  <Route element={<ReadingLayout />}>
                    <Route path="home" element={<Home />} />
                  </Route>

                  {/* Adaptive reading mode */}
                  <Route element={<AdaptiveLayout />}>
                    <Route path="adaptive" element={<Adaptive />} />
                  </Route>

                  {/* Pages without OptionsBar */}
                  <Route path="library" element={<Library />} />
                  <Route path="quiz" element={<Quiz />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="login" element={<Login />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="terms" element={<Terms />} />

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ReadingPreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
