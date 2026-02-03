import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Home } from '../../pages/Home.tsx'
import { ReadingLayout } from '../../layouts/ReadingLayout.tsx'
import { ReadingPreferencesProvider } from '../../context/ReadingPreferencesProvider.tsx'
import '@testing-library/jest-dom'

export const renderWithReadingLayout = () => {
  return render(
    <ReadingPreferencesProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ReadingLayout />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ReadingPreferencesProvider>
  )
}
