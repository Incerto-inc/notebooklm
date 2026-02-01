"use client";

import { useState, useEffect, useRef } from "react";
import { uid } from "uid";
import type { Source, ChatMessage } from "@/lib/types";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { FileUploadZone } from "@/components/FileUploadZone";
import {
  PageHeader,
  LeftSidebar,
  EditorPanel,
  ChatInterface,
  RightSidebar,
} from "@/components/page";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useMultiJobPolling } from "@/hooks/useJobPolling";
import { useJobRestore } from "@/hooks/useJobRestore";

export default function NotebookLMPage() {
  // Supabaseデータ管理フックを使用
  const {
    sources,
    styles,
    scenarios,
    chatMessages,
    createSource,
    updateSource,
    deleteSource,
    createStyle,
    updateStyle,
    deleteStyle,
    createScenario,
    updateScenario,
    deleteScenario,
    addChatMessage,
    setSources,
    setStyles,
    setScenarios,
    setChatMessages,
  } = useSupabaseData();

  const [inputValue, setInputValue] = useState("");
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [activeTab, setActiveTab] = useState<"style" | "sources">("sources");
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempName, setTempName] = useState("");

  // chatMessagesのRef（ストリーミング中の更新用）
  const chatMessagesRef = useRef<ChatMessage[]>([]);

  // editingSourceが変更されたらtempNameをリセット
  useEffect(() => {
    setTempName("");
  }, [editingSource]);

  // chatMessagesRefを同期
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // ジョブ復元フック
  const { isRestoring, restoreResult } = useJobRestore();

  // タイムスタンプを生成: yyyy年mm月dd日ss.mmm（createdAt用）
  const generateTimestamp = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}年${month}月${day}日${seconds}.${milliseconds}`;
  };

  // 初期タイトルを生成: yyyymmddhhmmssmmm
  const generateInitialTitle = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
  };

  // ジョブのポーリング処理
  const { addJob } = useMultiJobPolling({
    onJobComplete: async (jobId, jobInfo, result) => {
      const { itemId, targetTab, loadingItem } = jobInfo;
      const updatedItem: Source = {
        ...loadingItem,
        content: (targetTab === 'scenario' ? ((result as Record<string, unknown>).scenario as string) : ((result as Record<string, unknown>).content as string)) || loadingItem.content,
        loading: false,
      };

      if (targetTab === 'style') {
        await updateStyle(itemId, { loading: false, content: updatedItem.content });
        setStyles(styles.map(s => s.id === itemId ? updatedItem : s));
      } else if (targetTab === 'scenario') {
        await updateScenario(itemId, { loading: false, content: updatedItem.content });
        setScenarios([...scenarios, updatedItem]);
        setEditingSource(updatedItem);
        setLoading(false);
      } else {
        await updateSource(itemId, { loading: false, content: updatedItem.content });
        setSources(sources.map(s => s.id === itemId ? updatedItem : s));
      }

      if (editingSource?.id === itemId) {
        setEditingSource(updatedItem);
      }
    },
    onJobError: async (jobId, jobInfo, error) => {
      const { itemId, targetTab, loadingItem } = jobInfo;
      const errorItem: Source = {
        ...loadingItem,
        content: `# エラー\n\n${error}`,
        loading: false,
      };

      if (targetTab === 'style') {
        await updateStyle(itemId, { loading: false, content: errorItem.content });
        setStyles(styles.map(s => s.id === itemId ? errorItem : s));
      } else if (targetTab === 'scenario') {
        await updateScenario(itemId, { loading: false, content: errorItem.content });
        setScenarios([...scenarios, errorItem]);
        setLoading(false);
      } else {
        await updateSource(itemId, { loading: false, content: errorItem.content });
        setSources(sources.map(s => s.id === itemId ? errorItem : s));
      }

      if (editingSource?.id === itemId) {
        setEditingSource(errorItem);
      }
    },
    onPendingJobsFound: (jobs) => {
      const jobTypes = jobs.map(j => {
        switch (j.type) {
          case 'ANALYZE_VIDEO': return '動画分析';
          case 'ANALYZE_FILE': return 'ファイル分析';
          case 'GENERATE_SCENARIO': return 'シナリオ生成';
          default: return j.type;
        }
      });

      const message = `ページリロード前に進行中だった処理があります:\n\n${jobTypes.join('\n')}\n\nこれらの処理はバックグラウンドで継続されています。\n完了するとデータベースに保存されます。`;

      setTimeout(() => {
        alert(message);
      }, 1000);
    },
  });

  // 復元されたローディングアイテムを既存データにマージ
  useEffect(() => {
    if (isRestoring) return;

    const { loadingItems, activeJobs } = restoreResult;

    if (loadingItems.length > 0) {
      const existingIds = new Set([...styles, ...sources, ...scenarios].map(s => s.id));

      const newStyles = [...styles];
      const newSources = [...sources];
      const newScenarios = [...scenarios];

      for (const item of loadingItems) {
        if (!existingIds.has(item.id)) {
          if (item.type?.includes('Style')) {
            newStyles.push(item);
          } else if (item.type?.includes('Source') || item.type === 'Markdown') {
            newSources.push(item);
          } else if (item.type === 'Scenario') {
            newScenarios.push(item);
          }
        }
      }

      setStyles(newStyles);
      setSources(newSources);
      setScenarios(newScenarios);
    }

    for (const [jobId, jobInfo] of activeJobs.entries()) {
      addJob(jobId, jobInfo);
    }
  }, [isRestoring, restoreResult, addJob, styles, sources, scenarios]);

  const suggestedPrompts = sources.length > 0 ? [
    "このドキュメントの主なポイントを要約してください",
    "最も重要な洞察を教えてください",
    "詳しく説明してください"
  ] : [];

  // ソースを選択
  const selectSource = (source: Source) => {
    setEditingSource(source);
  };

  // ソースのコンテンツを更新
  const updateSourceContent = async (id: string, content: string) => {
    const source = sources.find(s => s.id === id);
    const style = styles.find(s => s.id === id);
    const scenario = scenarios.find(s => s.id === id);

    if (source) {
      await updateSource(id, { content });
    } else if (style) {
      await updateStyle(id, { content });
    } else if (scenario) {
      await updateScenario(id, { content });
    }

    setSources(sources.map(s => s.id === id ? { ...s, content } : s));
    setStyles(styles.map(s => s.id === id ? { ...s, content } : s));
    setScenarios(scenarios.map(s => s.id === id ? { ...s, content } : s));
    if (editingSource?.id === id) {
      setEditingSource({ ...editingSource, content });
    }
  };

  // ソースの名前を更新
  const updateSourceName = async (id: string, title: string) => {
    const source = sources.find(s => s.id === id);
    const style = styles.find(s => s.id === id);
    const scenario = scenarios.find(s => s.id === id);

    if (source) {
      await updateSource(id, { title });
    } else if (style) {
      await updateStyle(id, { title });
    } else if (scenario) {
      await updateScenario(id, { title });
    }

    setSources(sources.map(s => s.id === id ? { ...s, title } : s));
    setStyles(styles.map(s => s.id === id ? { ...s, title } : s));
    setScenarios(scenarios.map(s => s.id === id ? { ...s, title } : s));
    if (editingSource?.id === id) {
      setEditingSource({ ...editingSource, title });
    }
  };

  // エディタを閉じる
  const closeEditor = () => {
    setEditingSource(null);
  };

  // エクスポート機能（Markdownファイルとしてダウンロード）
  const exportAsMarkdown = () => {
    if (!editingSource) return;

    const blob = new Blob([editingSource.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editingSource.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 動画URLを送信してAI分析（非同期化）
  const handleVideoSubmit = async (url: string) => {
    const timestamp = generateTimestamp();
    const newItemId = uid();

    const loadingItem: Source = {
      id: newItemId,
      title: generateInitialTitle(),
      type: activeTab === "style" ? "YouTube Style" : "YouTube Source",
      selected: true,
      content: `# YouTube動画のAI分析\n\n動画URL: ${url}\n\nAIで分析中...`,
      createdAt: timestamp,
      videoUrl: url,
      loading: true,
    };

    const savedItem = await (activeTab === "style" ? createStyle(loadingItem) : createSource(loadingItem));

    if (activeTab === "style") {
      setStyles([...styles, savedItem]);
    } else {
      setSources([...sources, savedItem]);
    }
    setEditingSource(savedItem);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ANALYZE_VIDEO',
          input: {
            url,
            mode: activeTab,
            _metadata: { itemId: newItemId, targetTab: activeTab },
          },
        }),
      });

      const { jobId } = await response.json();
      addJob(jobId, { itemId: newItemId, targetTab: activeTab, loadingItem: savedItem });
    } catch (error: unknown) {
      console.error('Job creation error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      const errorItem: Source = {
        ...savedItem,
        content: `# エラー\n\n${errorMessage}`,
        loading: false,
      };
      if (activeTab === "style") {
        await updateStyle(newItemId, { loading: false, content: errorItem.content });
        setStyles(styles.map(s => s.id === newItemId ? errorItem : s));
      } else {
        await updateSource(newItemId, { loading: false, content: errorItem.content });
        setSources(sources.map(s => s.id === newItemId ? errorItem : s));
      }
      setEditingSource(errorItem);
    }
  };

  // ファイルアップロード後の処理（非同期化）
  const handleFileSelect = async (file: File) => {
    const timestamp = generateTimestamp();
    const newItemId = uid();
    const fileType = file.type;

    const loadingItem: Source = {
      id: newItemId,
      title: generateInitialTitle(),
      type: activeTab === "style" ? "Style" : "Markdown",
      selected: true,
      content: `# ファイルのAI分析\n\nファイル名: ${file.name}\n\nAIで分析中...`,
      createdAt: timestamp,
      loading: true,
    };

    const savedItem = await (activeTab === "style" ? createStyle(loadingItem) : createSource(loadingItem));

    if (activeTab === "style") {
      setStyles([...styles, savedItem]);
    } else {
      setSources([...sources, savedItem]);
    }
    setEditingSource(savedItem);
    setShowFileUpload(false);

    try {
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const inputData: Record<string, unknown> = {
            filename: file.name,
            fileType: fileType,
            mode: activeTab,
            _metadata: { itemId: newItemId, targetTab: activeTab },
          };

          if (fileType === 'application/pdf') {
            inputData.fileData = reader.result as string;
          } else {
            inputData.content = reader.result as string;
          }

          const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'ANALYZE_FILE',
              input: inputData,
            }),
          });

          const { jobId } = await response.json();
          addJob(jobId, { itemId: newItemId, targetTab: activeTab, loadingItem: savedItem });
        } catch (error: unknown) {
          console.error('Job creation error:', error);
          const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
          const errorItem: Source = {
            ...savedItem,
            content: `# エラー\n\n${errorMessage}`,
            loading: false,
          };
          if (activeTab === "style") {
            await updateStyle(newItemId, { loading: false, content: errorItem.content });
            setStyles(styles.map(s => s.id === newItemId ? errorItem : s));
          } else {
            await updateSource(newItemId, { loading: false, content: errorItem.content });
            setSources(sources.map(s => s.id === newItemId ? errorItem : s));
          }
          setEditingSource(errorItem);
        }
      };

      if (fileType === 'application/pdf') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error: unknown) {
      console.error('File analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      const errorItem: Source = {
        ...savedItem,
        content: `# エラー\n\n${errorMessage}`,
        loading: false,
      };
      if (activeTab === "style") {
        await updateStyle(newItemId, { loading: false, content: errorItem.content });
        setStyles(styles.map(s => s.id === newItemId ? errorItem : s));
      } else {
        await updateSource(newItemId, { loading: false, content: errorItem.content });
        setSources(sources.map(s => s.id === newItemId ? errorItem : s));
      }
      setEditingSource(errorItem);
    }
  };

  // 新規ファイル作成の処理
  const handleNewFile = async (content: string) => {
    const timestamp = generateTimestamp();
    const newItem: Source = {
      id: uid(),
      title: generateInitialTitle(),
      type: activeTab === "style" ? "Style" : "Markdown",
      selected: true,
      content,
      createdAt: timestamp,
    };

    if (activeTab === "style") {
      await createStyle(newItem);
      setStyles([...styles, newItem]);
    } else {
      await createSource(newItem);
      setSources([...sources, newItem]);
    }
    setEditingSource(newItem);
  };

  // ファイルをスタイル↔ソースに移動
  const moveSource = (sourceId: string, targetType: 'style' | 'source') => {
    const source = sources.find(s => s.id === sourceId) || styles.find(s => s.id === sourceId);
    if (!source) return;

    const movedSource = {
      ...source,
      type: targetType === 'style' ?
        (source.type.includes('Style') ? source.type : source.type.replace('Source', 'Style').replace('Markdown', 'Style')) :
        (source.type.includes('Source') ? source.type : source.type.replace('Style', 'Source').replace('Markdown', 'Source')),
    };

    const newSources = sources.filter(s => s.id !== sourceId);
    const newStyles = styles.filter(s => s.id !== sourceId);

    if (targetType === 'style') {
      setStyles([...newStyles, movedSource]);
      setSources(newSources);
    } else {
      setSources([...newSources, movedSource]);
      setStyles(newStyles);
    }

    setEditingSource(movedSource);
  };

  // スタイルを削除
  const handleDeleteStyle = async (styleId: string) => {
    await deleteStyle(styleId);
    if (editingSource?.id === styleId) {
      setEditingSource(null);
    }
  };

  // ソースを削除
  const handleDeleteSource = async (sourceId: string) => {
    await deleteSource(sourceId);
    if (editingSource?.id === sourceId) {
      setEditingSource(null);
    }
  };

  // シナリオを削除
  const handleDeleteScenario = async (scenarioId: string) => {
    await deleteScenario(scenarioId);
    if (editingSource?.id === scenarioId) {
      setEditingSource(null);
    }
  };

  // チャットメッセージ送信（ストリーミング対応）
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: uid(),
      role: 'user' as const,
      content: inputValue,
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setInputValue('');
    setLoading(true);

    await addChatMessage(userMessage);

    const assistantMessage: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setChatMessages([...chatMessages, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          sources: [...styles, ...sources],
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantContent += parsed.content;
                  // リアルタイム更新
                  const currentMessages = chatMessagesRef.current;
                  const updated = [...currentMessages];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantContent };
                  setChatMessages(updated);
                }
              } catch {
                // JSONパースエラーを無視
              }
            }
          }
        }
      }

      await addChatMessage({
        ...assistantMessage,
        content: assistantContent,
      });
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(chatMessagesRef.current.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // シナリオ生成（非同期化）
  const handleGenerateScenario = async () => {
    const timestamp = generateTimestamp();
    const newItemId = uid();

    const loadingItem: Source = {
      id: newItemId,
      title: generateInitialTitle(),
      type: 'Scenario',
      selected: true,
      content: `# シナリオ生成中\n\nAIでシナリオを生成中...`,
      createdAt: timestamp,
      loading: true,
    };

    const savedItem = await createScenario(loadingItem);

    setLoading(true);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GENERATE_SCENARIO',
          input: {
            styles,
            sources,
            chatHistory: chatMessages,
            _metadata: { itemId: newItemId, targetTab: 'scenario' },
          },
        }),
      });

      const { jobId } = await response.json();
      addJob(jobId, { itemId: newItemId, targetTab: 'scenario', loadingItem: savedItem });
    } catch (error: unknown) {
      console.error('Scenario generation error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      await updateScenario(newItemId, { loading: false, content: `# エラー\n\n${errorMessage}` });
      setLoading(false);
    }
  };

  // LeftSidebar 用コールバック
  const handleToggleStyleSelected = (id: string, selected: boolean) => {
    setStyles(styles.map(s => s.id === id ? { ...s, selected } : s));
  };

  const handleToggleSourceSelected = (id: string, selected: boolean) => {
    setSources(sources.map(s => s.id === id ? { ...s, selected } : s));
  };

  // EditorPanel 用削除ハンドラー
  const handleEditorDelete = (id: string) => {
    if (editingSource?.type.includes('Scenario')) {
      handleDeleteScenario(id);
    } else {
      handleDeleteSource(id);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-cream-50 texture-overlay">
      <PageHeader />

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          activeTab={activeTab}
          styles={styles}
          sources={sources}
          editingSource={editingSource}
          onAddSource={() => setShowVideoDialog(true)}
          onAddFile={() => setShowFileUpload(true)}
          onSetActiveTab={setActiveTab}
          onSelectSource={selectSource}
          onToggleStyleSelected={handleToggleStyleSelected}
          onToggleSourceSelected={handleToggleSourceSelected}
          onDeleteStyle={handleDeleteStyle}
          onDeleteSource={handleDeleteSource}
        />

        {/* 中央エリア: エディタまたはチャット */}
        <main className="flex-1 flex flex-col overflow-hidden bg-cream-50/30">
          {editingSource ? (
            <EditorPanel
              editingSource={editingSource}
              tempName={tempName}
              onSetTempName={setTempName}
              onUpdateSourceName={updateSourceName}
              onUpdateSourceContent={updateSourceContent}
              onCloseEditor={closeEditor}
              onMoveSource={moveSource}
              onExportAsMarkdown={exportAsMarkdown}
              onDelete={handleEditorDelete}
            />
          ) : (
            <ChatInterface
              chatMessages={chatMessages}
              sources={sources}
              inputValue={inputValue}
              loading={loading}
              suggestedPrompts={suggestedPrompts}
              onInputChange={setInputValue}
              onSendMessage={handleSendMessage}
            />
          )}
        </main>

        <RightSidebar
          scenarios={scenarios}
          loading={loading}
          styles={styles}
          sources={sources}
          editingSource={editingSource}
          onGenerateScenario={handleGenerateScenario}
          onSelectSource={selectSource}
          onDeleteScenario={handleDeleteScenario}
        />
      </div>

      {/* モーダル */}
      {showVideoDialog && (
        <VideoUploadDialog
          onClose={() => setShowVideoDialog(false)}
          onSubmit={handleVideoSubmit}
          mode={activeTab}
        />
      )}

      {showFileUpload && (
        <FileUploadZone
          onFileUpload={handleFileSelect}
          onNewFile={handleNewFile}
          onClose={() => setShowFileUpload(false)}
          mode={activeTab}
        />
      )}
    </div>
  );
}
