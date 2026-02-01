import { useState, useEffect } from 'react';
import type { Source, ChatMessage } from '@/lib/types';
import { useCrud, loadInitialData } from '@/hooks/useCrud';

export function useSupabaseData() {
  // ジェネリックCRUDフックを使用
  const styles = useCrud<Source>('/styles');
  const sources = useCrud<Source>('/sources');
  const scenarios = useCrud<Source>('/scenarios');
  const chatMessagesCrud = useCrud<ChatMessage>('/chat-messages');

  // マウント状態とローディング状態
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 初期データのロード
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await loadInitialData<{
          sources: Source[];
          styles: Source[];
          scenarios: Source[];
          messages: ChatMessage[];
        }>({
          sources: '/sources',
          styles: '/styles',
          scenarios: '/scenarios',
          messages: '/chat-messages',
        });

        styles.setItems(data.styles);
        sources.setItems(data.sources);
        scenarios.setItems(data.scenarios);
        chatMessagesCrud.setItems(data.messages);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // チャットメッセージのクリア
  const clearChatMessages = async () => {
    await chatMessagesCrud.deleteAll();
  };

  return {
    sources: sources.items,
    styles: styles.items,
    scenarios: scenarios.items,
    chatMessages: chatMessagesCrud.items,
    mounted,
    loading,
    createStyle: styles.create,
    updateStyle: styles.update,
    deleteStyle: styles.delete,
    createSource: sources.create,
    updateSource: sources.update,
    deleteSource: sources.delete,
    createScenario: scenarios.create,
    updateScenario: scenarios.update,
    deleteScenario: scenarios.delete,
    addChatMessage: chatMessagesCrud.create,
    clearChatMessages,
    setSources: sources.setItems,
    setStyles: styles.setItems,
    setScenarios: scenarios.setItems,
    setChatMessages: chatMessagesCrud.setItems,
  };
}
