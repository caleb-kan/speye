import type { Theme } from '../types/theme'

export type { Theme }

export const themes: Theme[] = [
  {
    name: 'Midnight',
    id: 'midnight',
    colors: {
      bg: '#1a1a2e',
      bgSecondary: '#16213e',
      text: '#edf2f4',
      textSecondary: '#8d99ae',
      primary: '#e94560',
      error: '#ff6b6b',
      success: '#4ecdc4',
    },
  },
  {
    name: 'Light',
    id: 'light',
    colors: {
      bg: '#fafafa',
      bgSecondary: '#f0f0f0',
      text: '#2d3436',
      textSecondary: '#636e72',
      primary: '#6c5ce7',
      error: '#d63031',
      success: '#00b894',
    },
  },
  {
    name: 'Nord',
    id: 'nord',
    colors: {
      bg: '#2e3440',
      bgSecondary: '#3b4252',
      text: '#eceff4',
      textSecondary: '#4c566a',
      primary: '#88c0d0',
      error: '#bf616a',
      success: '#a3be8c',
    },
  },
  {
    name: 'Dracula',
    id: 'dracula',
    colors: {
      bg: '#282a36',
      bgSecondary: '#44475a',
      text: '#f8f8f2',
      textSecondary: '#6272a4',
      primary: '#bd93f9',
      error: '#ff5555',
      success: '#50fa7b',
    },
  },
  {
    name: 'Monokai',
    id: 'monokai',
    colors: {
      bg: '#272822',
      bgSecondary: '#3e3d32',
      text: '#f8f8f2',
      textSecondary: '#75715e',
      primary: '#f92672',
      error: '#f92672',
      success: '#a6e22e',
    },
  },
  {
    name: 'Gruvbox Dark',
    id: 'gruvbox-dark',
    colors: {
      bg: '#282828',
      bgSecondary: '#3c3836',
      text: '#ebdbb2',
      textSecondary: '#665c54',
      primary: '#fabd2f',
      error: '#fb4934',
      success: '#b8bb26',
    },
  },
  {
    name: 'Solarized Dark',
    id: 'solarized-dark',
    colors: {
      bg: '#002b36',
      bgSecondary: '#073642',
      text: '#839496',
      textSecondary: '#586e75',
      primary: '#b58900',
      error: '#dc322f',
      success: '#859900',
    },
  },
  {
    name: 'Tokyo Night',
    id: 'tokyo-night',
    colors: {
      bg: '#1a1b26',
      bgSecondary: '#24283b',
      text: '#a9b1d6',
      textSecondary: '#565f89',
      primary: '#7aa2f7',
      error: '#f7768e',
      success: '#9ece6a',
    },
  },
  {
    name: 'One Dark',
    id: 'one-dark',
    colors: {
      bg: '#282c34',
      bgSecondary: '#21252b',
      text: '#abb2bf',
      textSecondary: '#5c6370',
      primary: '#61afef',
      error: '#e06c75',
      success: '#98c379',
    },
  },
  {
    name: 'Catppuccin Mocha',
    id: 'catppuccin-mocha',
    colors: {
      bg: '#1e1e2e',
      bgSecondary: '#313244',
      text: '#cdd6f4',
      textSecondary: '#6c7086',
      primary: '#cba6f7',
      error: '#f38ba8',
      success: '#a6e3a1',
    },
  },
  {
    name: 'Ocean',
    id: 'ocean',
    colors: {
      bg: '#1b2b34',
      bgSecondary: '#343d46',
      text: '#cdd3de',
      textSecondary: '#65737e',
      primary: '#6699cc',
      error: '#ec5f67',
      success: '#99c794',
    },
  },
]

export const getThemeById = (id: string): Theme => {
  return themes.find((t) => t.id === id) || themes[0]
}
