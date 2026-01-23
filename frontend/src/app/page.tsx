"use client";

import { useState, useEffect } from "react";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { FileUploadZone } from "@/components/FileUploadZone";
import { loadFromLocalStorage, saveToLocalStorage } from "@/hooks/useLocalStorage";

interface Source {
  id: string;
  name: string;
  type: string;
  selected: boolean;
  content: string;
  createdAt: string;
  videoUrl?: string; // YouTube動画URL（オプション）
  loading?: boolean; // 読み込み中かどうか
}

export default function NotebookLMPage() {
  // 最初は空の状態で初期化（Hydrationエラー回避）
  const [sources, setSources] = useState<Array<Source>>([]);
  const [styles, setStyles] = useState<Array<Source>>([]);
  const [scenarios, setScenarios] = useState<Array<Source>>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [activeTab, setActiveTab] = useState<"style" | "sources">("sources");
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [loading, setLoading] = useState(false);

  // クライアントサイドでのみローカルストレージから読み込み
  useEffect(() => {
    setMounted(true);
    const data = loadFromLocalStorage();
    if (data.sources.length > 0) setSources(data.sources);
    if (data.styles.length > 0) setStyles(data.styles);
    if (data.scenarios.length > 0) setScenarios(data.scenarios);
    if (data.chatMessages.length > 0) setChatMessages(data.chatMessages);
  }, []);

  // ローカルストレージへの自動保存（マウント後のみ）
  useEffect(() => {
    if (mounted) {
      saveToLocalStorage(sources, styles, scenarios, chatMessages);
    }
  }, [sources, styles, scenarios, chatMessages, mounted]);

  const suggestedPrompts = sources.length > 0 ? [
    "このドキュメントの主なポイントを要約してください",
    "最も重要な洞察を教えてください",
    "詳しく説明してください"
  ] : [];

  // タイムスタンプを生成: yyyy年mm月dd日ss.mmm
  const generateTimestamp = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}年${month}月${day}日${seconds}.${milliseconds}`;
  };

  // YouTube動画IDを抽出
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // 直接IDが入力された場合
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // ファイルを追加（ファイルアップロードダイアログを表示）
  const addFile = () => {
    setShowFileUpload(true);
  };

  // ソースを追加（動画URL入力ダイアログを表示）
  const addSource = () => {
    setShowVideoDialog(true);
  };

  // ソースを選択
  const selectSource = (source: Source) => {
    setEditingSource(source);
  };

  // ソースのコンテンツを更新
  const updateSourceContent = (id: string, content: string) => {
    setSources(sources.map(s => s.id === id ? { ...s, content } : s));
    if (editingSource?.id === id) {
      setEditingSource({ ...editingSource, content });
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
    a.download = editingSource.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 動画URLを送信してAI分析
  const handleVideoSubmit = async (url: string) => {
    const timestamp = generateTimestamp();
    const newItemId = Date.now().toString();

    // まずローディング状態のソースを追加
    const loadingItem: Source = {
      id: newItemId,
      name: `${timestamp}.md`,
      type: activeTab === "style" ? "YouTube Style" : "YouTube Source",
      selected: true,
      content: `# YouTube動画のAI分析\n\n動画URL: ${url}\n\nAIで分析中...`,
      createdAt: timestamp,
      videoUrl: url,
      loading: true,
    };

    // ソースを追加（ローディング状態）
    if (activeTab === "style") {
      setStyles([...styles, loadingItem]);
    } else {
      setSources([...sources, loadingItem]);
    }
    setEditingSource(loadingItem);

    // バックグラウンドでAPI呼び出し
    try {
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: activeTab }),
      });

      const data = await response.json();

      // 完了したらソースの内容を更新
      const updatedItem: Source = {
        ...loadingItem,
        content: data.content || `# YouTube動画のAI分析\n\n動画URL: ${url}\n\n要約:\n\nポイント:\n`,
        loading: false,
      };

      if (activeTab === "style") {
        setStyles(prev => prev.map(s => s.id === newItemId ? updatedItem : s));
      } else {
        setSources(prev => prev.map(s => s.id === newItemId ? updatedItem : s));
      }
      setEditingSource(updatedItem);
    } catch (error) {
      console.error('Video analysis error:', error);
      // エラー時もローディング状態を解除
      const errorItem: Source = {
        ...loadingItem,
        content: `# YouTube動画のAI分析\n\n動画URL: ${url}\n\nエラーが発生しました。\n\n${error}`,
        loading: false,
      };

      if (activeTab === "style") {
        setStyles(prev => prev.map(s => s.id === newItemId ? errorItem : s));
      } else {
        setSources(prev => prev.map(s => s.id === newItemId ? errorItem : s));
      }
      setEditingSource(errorItem);
    }
  };

  // ファイルアップロード後の処理
  const handleFileSelect = async (file: File) => {
    const timestamp = generateTimestamp();
    const newItemId = Date.now().toString();
    const fileType = file.type;

    // まずローディング状態のソースを追加
    const loadingItem: Source = {
      id: newItemId,
      name: `${timestamp}.md`,
      type: activeTab === "style" ? "Style" : "Markdown",
      selected: true,
      content: `# ファイルのAI分析\n\nファイル名: ${file.name}\n\nAIで分析中...`,
      createdAt: timestamp,
      loading: true,
    };

    // ソースを追加（ローディング状態）
    if (activeTab === "style") {
      setStyles([...styles, loadingItem]);
    } else {
      setSources([...sources, loadingItem]);
    }
    setEditingSource(loadingItem);
    setShowFileUpload(false);

    // バックグラウンドでAPI呼び出し
    try {
      // ファイルをbase64エンコード
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        const response = await fetch('/api/analyze-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            filename: file.name,
            fileType: fileType,
            mode: activeTab,
          }),
        });

        const data = await response.json();

        // 完了したらソースの内容を更新
        const updatedItem: Source = {
          ...loadingItem,
          content: data.content || `# ファイルのAI分析\n\nファイル名: ${file.name}\n\n要約:\n\nポイント:\n`,
          loading: false,
        };

        if (activeTab === "style") {
          setStyles(prev => prev.map(s => s.id === newItemId ? updatedItem : s));
        } else {
          setSources(prev => prev.map(s => s.id === newItemId ? updatedItem : s));
        }
        setEditingSource(updatedItem);
      };

      if (fileType === 'application/pdf') {
        // PDFファイルはbase64エンコード
        reader.readAsDataURL(file);
      } else {
        // テキストファイルはテキストとして読み込み
        reader.onloadend = async () => {
          const textContent = reader.result as string;

          const response = await fetch('/api/analyze-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: textContent,
              filename: file.name,
              mode: activeTab,
            }),
          });

          const data = await response.json();

          const updatedItem: Source = {
            ...loadingItem,
            content: data.content || `# ファイルのAI分析\n\nファイル名: ${file.name}\n\n内容:\n\n${textContent}`,
            loading: false,
          };

          if (activeTab === "style") {
            setStyles(prev => prev.map(s => s.id === newItemId ? updatedItem : s));
          } else {
            setSources(prev => prev.map(s => s.id === newItemId ? updatedItem : s));
          }
          setEditingSource(updatedItem);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('File analysis error:', error);
      // エラー時もローディング状態を解除
      const errorItem: Source = {
        ...loadingItem,
        content: `# ファイルのAI分析\n\nファイル名: ${file.name}\n\nエラーが発生しました。\n\n${error}`,
        loading: false,
      };

      if (activeTab === "style") {
        setStyles(prev => prev.map(s => s.id === newItemId ? errorItem : s));
      } else {
        setSources(prev => prev.map(s => s.id === newItemId ? errorItem : s));
      }
      setEditingSource(errorItem);
    }
  };

  // 新規ファイル作成の処理
  const handleNewFile = (content: string) => {
    const timestamp = generateTimestamp();
    const newItem: Source = {
      id: Date.now().toString(),
      name: `${timestamp}.md`,
      type: activeTab === "style" ? "Style" : "Markdown",
      selected: true,
      content,
      createdAt: timestamp,
    };

    if (activeTab === "style") {
      setStyles([...styles, newItem]);
    } else {
      setSources([...sources, newItem]);
    }
    setEditingSource(newItem);
  };

  // ファイルをスタイル↔ソースに移動
  const moveSource = (sourceId: string, targetType: 'style' | 'source') => {
    // 現在のソース/スタイルから探す
    const source = sources.find(s => s.id === sourceId) || styles.find(s => s.id === sourceId);
    if (!source) return;

    // 移動元から削除
    if (sources.find(s => s.id === sourceId)) {
      setSources(sources.filter(s => s.id !== sourceId));
    }
    if (styles.find(s => s.id === sourceId)) {
      setStyles(styles.filter(s => s.id === sourceId));
    }

    // 移動先に追加（タイプを更新）
    const movedSource = {
      ...source,
      type: targetType === 'style' ?
        (source.type.includes('Style') ? source.type : source.type.replace('Source', 'Style').replace('Markdown', 'Style')) :
        (source.type.includes('Source') ? source.type : source.type.replace('Style', 'Source').replace('Markdown', 'Source')),
    };

    if (targetType === 'style') {
      setStyles([...styles, movedSource]);
    } else {
      setSources([...sources, movedSource]);
    }

    setEditingSource(movedSource);
  };

  // チャットメッセージ送信（ストリーミング対応）
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setInputValue('');
    setLoading(true);

    // アシスタントの空メッセージを追加
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          sources: [...styles, ...sources],
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

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
                  assistantMessage += parsed.content;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                    return updated;
                  });
                }
              } catch {
                // JSONパースエラーを無視
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // エラー時はメッセージを削除
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // シナリオ生成
  const handleGenerateScenario = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styles,
          sources,
          chatHistory: chatMessages,
        }),
      });

      const data = await response.json();

      const timestamp = generateTimestamp();
      const newScenario: Source = {
        id: Date.now().toString(),
        name: `${timestamp}.md`,
        type: 'Scenario',
        selected: true,
        content: data.scenario,
        createdAt: timestamp,
      };

      setScenarios([...scenarios, newScenario]);
      setEditingSource(newScenario);
    } catch (error) {
      console.error('Scenario generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* ヘッダー */}
      <header className="flex h-14 items-center border-b border-gray-200 px-4">
        <div className="flex items-center gap-4">
          {editingSource && (
            <button
              onClick={closeEditor}
              className="rounded p-1 text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-base font-normal text-gray-800">
            {editingSource ? editingSource.name : "Untitled notebook"}
          </h1>
        </div>
      </header>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー: ソース */}
        <aside className="w-80 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <button
              onClick={addSource}
              className="w-full rounded-full bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors mb-3"
            >
              + ソースを追加
            </button>
            <button
              onClick={addFile}
              className="w-full rounded-full border-2 border-blue-500 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              ファイルを追加
            </button>

            {/* タブ */}
            <div className="mt-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("style")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === "style"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  スタイル ({styles.length})
                </button>
                <button
                  onClick={() => setActiveTab("sources")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === "sources"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  ソース ({sources.length})
                </button>
              </div>

              {/* スタイルタブのコンテンツ */}
              {activeTab === "style" && (
                <div className="py-4">
                  {styles.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <p className="text-sm text-gray-500">
                        YouTuber動画のコツや雰囲気をここにメモ
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        動画の構成、話し方、編集テクニックなどを記録
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {styles.map((style) => (
                        <div
                          key={style.id}
                          onClick={() => selectSource(style)}
                          className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
                            editingSource?.id === style.id ? 'bg-blue-50 border-2 border-blue-500' :
                            style.selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={style.selected}
                            onChange={(e) => {
                              const newSelected = e.target.checked;
                              setStyles(styles.map(s => s.id === style.id ? { ...s, selected: newSelected } : s));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{style.name}</p>
                              {style.loading && (
                                <svg className="animate-spin h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{style.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ソースタブのコンテンツ */}
              {activeTab === "sources" && (
                <div className="py-4">
                  {sources.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">
                        保存したソースがここに表示されます。
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        PDF、ウェブサイト、テキスト、動画、音声ファイルを追加するには、上の［ソースを追加］をクリックします。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sources.map((source) => (
                        <div
                          key={source.id}
                          onClick={() => selectSource(source)}
                          className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
                            editingSource?.id === source.id ? 'bg-blue-50 border-2 border-blue-500' :
                            source.selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={source.selected}
                            onChange={(e) => {
                              const newSelected = e.target.checked;
                              setSources(sources.map(s => s.id === source.id ? { ...s, selected: newSelected } : s));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{source.name}</p>
                              {source.loading && (
                                <svg className="animate-spin h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{source.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* エディタ（編集時のみ表示） */}
        {editingSource && (
          <aside className="w-96 border-r border-gray-200 flex flex-col overflow-hidden bg-white">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{editingSource.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {/* 移動ボタン */}
                {!editingSource.loading && (
                  <>
                    {editingSource.type.includes('Style') ? (
                      <button
                        onClick={() => moveSource(editingSource.id, 'source')}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        title="ソースに移動"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => moveSource(editingSource.id, 'style')}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        title="スタイルに移動"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
                {/* エクスポートボタン */}
                <button
                  onClick={exportAsMarkdown}
                  className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                  title="Markdownとしてエクスポート"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={closeEditor}
                  className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* YouTube動画プレビュー */}
            {editingSource.videoUrl && (
              <div className="border-b border-gray-200">
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(editingSource.videoUrl)}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <textarea
              value={editingSource.content}
              onChange={(e) => updateSourceContent(editingSource.id, e.target.value)}
              className="flex-1 p-4 resize-none focus:outline-none text-sm font-mono leading-relaxed"
              placeholder="ここにMarkdown形式でテキストを入力..."
            />
            <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between">
              <span>{editingSource.content.length} 文字</span>
              <span className="text-gray-400">{editingSource.name}</span>
            </div>
          </aside>
        )}

        {/* 中央エリア: チャット */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="mb-6">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">ソースを追加して始める</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    ドキュメント、ウェブサイト、その他の情報を追加して、AIがあなたのノートブックのコンテキストを理解できるようにします。
                  </p>
                  <button className="rounded-full border-2 border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors">
                    ソースをアップロード
                  </button>

                  {/* 提案されたプロンプト */}
                  {suggestedPrompts.length > 0 && (
                    <div className="mt-8 space-y-2">
                      <p className="text-xs font-medium text-gray-500 mb-3">おすすめの質問:</p>
                      {suggestedPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 入力エリア */}
          <div className="border-t border-gray-200 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={sources.length === 0 ? "開始するにはソースをアップロードしてください" : "質問を入力..."}
                  disabled={sources.length === 0}
                  className="flex-1 rounded-full border border-gray-300 px-4 py-3 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <div className="absolute right-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                    {sources.filter(s => s.selected).length} 個のソース
                  </span>
                  <button
                    onClick={handleSendMessage}
                    className={`rounded-full p-2 ${
                      sources.length === 0 || loading
                        ? "bg-gray-200 text-gray-400"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    disabled={sources.length === 0 || loading}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">
                NotebookLM は不正確な場合があります。回答は再確認してください。
              </p>
            </div>
          </div>
        </main>

        {/* 右サイドバー: 動画シナリオ作成 */}
        <aside className="w-80 border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">動画シナリオ作成</h2>

            <button
              onClick={handleGenerateScenario}
              disabled={loading || styles.length === 0 && sources.length === 0}
              className="w-full rounded-full bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors mb-4 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? '生成中...' : 'シナリオを生成 ✅'}
            </button>

            <p className="text-xs text-gray-600 mb-4">
              スタイル、ソースと真ん中のディスカッションを元に動画シナリオを作成します。
            </p>

            {/* シナリオリスト */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">保存されたシナリオ ({scenarios.length})</h3>
              {scenarios.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">
                    シナリオはここに保存されます。
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    作成ボタンをクリックして新しいシナリオを作成してください。
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      onClick={() => selectSource(scenario)}
                      className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
                        editingSource?.id === scenario.id ? 'bg-blue-50 border-2 border-blue-500' :
                        'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{scenario.name}</p>
                        <p className="text-xs text-gray-500">{scenario.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* 右下の浮遊ボタン: メモを追加 */}
      <button className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-800 transition-colors">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

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
