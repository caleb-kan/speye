import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Library } from './pages/Library'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { RootLayout } from './layout/RootLayout'
import { ReadingLayout } from './layout/ReadingLayout'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<RootLayout />}>
                <Route index element={<Navigate to="/home" />} />

                {/* Pages with OptionsBar */}
                <Route element={<ReadingLayout />}>
                  <Route path="home" element={<Home />} />
                </Route>

                {/* Pages without OptionsBar */}
                <Route path="library" element={<Library />} />
                <Route path="settings" element={<Settings />} />
                <Route path="login" element={<Login />} />

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
