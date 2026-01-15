import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Library } from './pages/Library'
import { NotFound } from './pages/NotFound'
import { Layout } from './layout/Layout'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Nested routes render into Layout's <Outlet> */}
              <Route index element={<Navigate to="/home" />} />

              <Route path="home" element={<Home />} />
              <Route path="library" element={<Library />} />
              <Route path="settings" element={<Settings />} />

              {/* Catch-all for 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
