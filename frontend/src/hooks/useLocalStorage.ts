import { useEffect } from 'react';

interface Source {
  id: string;
  name: string;
  type: string;
  selected: boolean;
  content: string;
  createdAt: string;
  videoUrl?: string;
  loading?: boolean;
}

const STORAGE_KEYS = {
  sources: 'notebooklm_sources',
  styles: 'notebooklm_styles',
  scenarios: 'notebooklm_scenarios',
  chatMessages: 'notebooklm_chat_messages',
};

export function saveToLocalStorage(sources: Source[], styles: Source[], scenarios: Source[], chatMessages: Array<{ role: string; content: string }>) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.sources, JSON.stringify(sources));
    localStorage.setItem(STORAGE_KEYS.styles, JSON.stringify(styles));
    localStorage.setItem(STORAGE_KEYS.scenarios, JSON.stringify(scenarios));
    localStorage.setItem(STORAGE_KEYS.chatMessages, JSON.stringify(chatMessages));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage() {
  if (typeof window === 'undefined') {
    return { sources: [], styles: [], scenarios: [], chatMessages: [] };
  }

  try {
    const sources = JSON.parse(localStorage.getItem(STORAGE_KEYS.sources) || '[]');
    const styles = JSON.parse(localStorage.getItem(STORAGE_KEYS.styles) || '[]');
    const scenarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.scenarios) || '[]');
    const chatMessages = JSON.parse(localStorage.getItem(STORAGE_KEYS.chatMessages) || '[]');

    return { sources, styles, scenarios, chatMessages };
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return { sources: [], styles: [], scenarios: [], chatMessages: [] };
  }
}

export function clearLocalStorage() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.sources);
    localStorage.removeItem(STORAGE_KEYS.styles);
    localStorage.removeItem(STORAGE_KEYS.scenarios);
    localStorage.removeItem(STORAGE_KEYS.chatMessages);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

export function useLocalStorageSync(
  sources: Source[],
  styles: Source[],
  scenarios: Source[],
  chatMessages: Array<{ role: string; content: string }>
) {
  useEffect(() => {
    saveToLocalStorage(sources, styles, scenarios, chatMessages);
  }, [sources, styles, scenarios, chatMessages]);
}
