import { useState, useEffect } from 'react';

interface Source {
  id: string;
  title: string;
  type: string;
  selected: boolean;
  content: string;
  createdAt: string;
  videoUrl?: string;
  loading?: boolean;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

// データ取得関数
async function fetchData(endpoint: string) {
  const response = await fetch(`/api${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
}

// データ作成関数
async function createData(endpoint: string, data: unknown) {
  const response = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create ${endpoint}`);
  }
  return response.json();
}

// データ更新関数
async function updateData(endpoint: string, data: unknown) {
  const response = await fetch(`/api${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update ${endpoint}`);
  }
  return response.json();
}

// データ削除関数
async function deleteData(endpoint: string, id?: string) {
  const url = id ? `/api${endpoint}?id=${id}` : `/api${endpoint}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete ${endpoint}`);
  }
  return response.json();
}

// Supabaseデータ管理フック
export function useSupabaseData() {
  const [sources, setSources] = useState<Source[]>([]);
  const [styles, setStyles] = useState<Source[]>([]);
  const [scenarios, setScenarios] = useState<Source[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 初期データのロード
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [sourcesData, stylesData, scenariosData, messagesData] = await Promise.all([
          fetchData('/sources'),
          fetchData('/styles'),
          fetchData('/scenarios'),
          fetchData('/chat-messages'),
        ]);
        setSources(sourcesData);
        setStyles(stylesData);
        setScenarios(scenariosData);
        setChatMessages(messagesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    loadData();
  }, []);

  // スタイルの作成
  const createStyle = async (style: Omit<Source, 'id'>) => {
    const newStyle = await createData('/styles', style);
    setStyles((prev) => [...prev, newStyle]);
    return newStyle;
  };

  // スタイルの更新
  const updateStyle = async (id: string, data: Partial<Source>) => {
    const updated = await updateData('/styles', { id, ...data });
    setStyles((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  // スタイルの削除
  const deleteStyle = async (id: string) => {
    await deleteData('/styles', id);
    setStyles((prev) => prev.filter((s) => s.id !== id));
  };

  // ソースの作成
  const createSource = async (source: Omit<Source, 'id'>) => {
    const newSource = await createData('/sources', source);
    setSources((prev) => [...prev, newSource]);
    return newSource;
  };

  // ソースの更新
  const updateSource = async (id: string, data: Partial<Source>) => {
    const updated = await updateData('/sources', { id, ...data });
    setSources((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  // ソースの削除
  const deleteSource = async (id: string) => {
    await deleteData('/sources', id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  // シナリオの作成
  const createScenario = async (scenario: Omit<Source, 'id'>) => {
    const newScenario = await createData('/scenarios', scenario);
    setScenarios((prev) => [...prev, newScenario]);
    return newScenario;
  };

  // シナリオの更新
  const updateScenario = async (id: string, data: Partial<Source>) => {
    const updated = await updateData('/scenarios', { id, ...data });
    setScenarios((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  // シナリオの削除
  const deleteScenario = async (id: string) => {
    await deleteData('/scenarios', id);
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  // チャットメッセージの追加
  const addChatMessage = async (message: Omit<ChatMessage, 'id'>) => {
    const newMessage = await createData('/chat-messages', message);
    setChatMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  // チャットメッセージのクリア
  const clearChatMessages = async () => {
    await deleteData('/chat-messages');
    setChatMessages([]);
  };

  return {
    sources,
    styles,
    scenarios,
    chatMessages,
    mounted,
    loading,
    createStyle,
    updateStyle,
    deleteStyle,
    createSource,
    updateSource,
    deleteSource,
    createScenario,
    updateScenario,
    deleteScenario,
    addChatMessage,
    clearChatMessages,
    setSources,
    setStyles,
    setScenarios,
    setChatMessages,
  };
}
