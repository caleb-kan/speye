import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Text } from '../../types/database'
import type { LocationState, ReadingContext } from '../../types'
const state = vi.hoisted(() => ({
  text: { id: 'text-a', content: 'word '.repeat(200), owner_id: null },
  history: vi.fn(),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'reader-a' } }),
}))
vi.mock('../../hooks/useReadingPreferences', () => ({
  useReadingPreferences: () => ({
    preferences: { wpm: 300, mode: 'standard' },
    setMode: vi.fn(),
  }),
}))
vi.mock('../../hooks/useTextNavigation', () => ({
  useTextNavigation: () => ({
    currentText: state.text,
    loading: false,
    error: null,
    handleNewText: vi.fn(),
    refetch: vi.fn(),
  }),
}))
vi.mock('../../services/readingHistory', () => ({
  getLastReadingPosition: state.history,
}))
vi.mock('../../services/logUserActivity', () => ({ logUserActivity: vi.fn() }))
vi.mock('../../components/OptionsBar', () => ({ OptionsBar: () => null }))
vi.mock('../../components/home/HomeContent', () => ({
  HomeContent: ({
    context,
    loading,
  }: {
    context: ReadingContext
    loading: boolean
  }) => (
    <div>{loading ? 'restoring' : `position:${context.readingPosition}`}</div>
  ),
}))
import { Home } from '../../pages/Home'
import { ReadingLayout } from '../../layouts/ReadingLayout'
function App({ navigation }: { navigation: LocationState }) {
  return (
    <MemoryRouter initialEntries={[{ pathname: '/home', state: navigation }]}>
      <Routes>
        <Route element={<ReadingLayout />}>
          <Route path="/home" element={<Home />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  state.text = { id: 'text-a', content: 'word '.repeat(200), owner_id: null }
  state.history.mockResolvedValue(40)
})
it.each([122, 0])(
  'preserves explicit navigation position %s over older saved progress',
  async (position) => {
    render(
      <App
        navigation={{
          preservedText: state.text as Text,
          readingPosition: position,
          _ts: 1,
        }}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(`position:${position}`)).toBeVisible()
    )
    expect(state.history).not.toHaveBeenCalled()
  }
)
it('still restores history when opening a library text without a supplied position', async () => {
  render(<App navigation={{ libraryText: state.text as Text }} />)
  await waitFor(() => expect(screen.getByText('position:40')).toBeVisible())
  expect(state.history).toHaveBeenCalledWith('text-a')
})
it('restores history for a later text even while the old navigation state remains', async () => {
  const navigation = {
    preservedText: state.text as Text,
    readingPosition: 122,
    _ts: 1,
  }
  const app = render(<App navigation={navigation} />)
  await waitFor(() => expect(screen.getByText('position:122')).toBeVisible())
  state.text = { ...state.text, id: 'text-b' }
  app.rerender(<App navigation={navigation} />)
  await waitFor(() => expect(screen.getByText('position:40')).toBeVisible())
  expect(state.history).toHaveBeenCalledWith('text-b')
})
