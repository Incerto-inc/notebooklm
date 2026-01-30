"use client";

import { useState, useEffect } from "react";
import { uid } from "uid";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { FileUploadZone } from "@/components/FileUploadZone";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useJobPolling } from "@/hooks/useJobPolling";

interface Source {
  id: string;
  title: string; // タイトル
  type: string;
  selected: boolean;
  content: string;
  createdAt: string;
  videoUrl?: string; // YouTube動画URL（オプション）
  loading?: boolean; // 読み込み中かどうか
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

export default function NotebookLMPage() {
  // Supabaseデータ管理フックを使用
  const {
    sources,
    styles,
    scenarios,
    chatMessages,
    mounted,
    loading: dataLoading,
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
    clearChatMessages,
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
  const [activeJobs, setActiveJobs] = useState<Map<string, { itemId: string; targetTab: 'style' | 'sources' | 'scenario'; loadingItem: Source }>>(new Map());

  // editingSourceが変更されたらtempNameをリセット
  useEffect(() => {
    setTempName("");
  }, [editingSource]);

  // ジョブのポーリング処理
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const jobEntries = Array.from(activeJobs.entries());
      if (jobEntries.length === 0) return;

      const jobsToRemove: string[] = [];
      const jobsToUpdate: Map<string, Source> = new Map();

      for (const [jobId, jobInfo] of jobEntries) {
        try {
          const response = await fetch(`/api/jobs/${jobId}`);
          if (!response.ok) {
            jobsToRemove.push(jobId);
            continue;
          }

          const job = await response.json();

          if (job.status === 'COMPLETED') {
            const { itemId, targetTab, loadingItem } = jobInfo;
            const updatedItem: Source = {
              ...loadingItem,
              content: (targetTab === 'scenario' ? job.result.scenario : job.result.content) || loadingItem.content,
              loading: false,
            };

            // データベースに保存
            const { loading: _, ...itemToSave } = updatedItem;
            if (targetTab === 'style') {
              await createStyle(itemToSave);
              setStyles(prev => prev.map(s => s.id === itemId ? updatedItem : s));
            } else if (targetTab === 'scenario') {
              await createScenario(itemToSave);
              setScenarios(prev => [...prev, updatedItem]);
              setEditingSource(updatedItem);
              setLoading(false);
            } else {
              await createSource(itemToSave);
              setSources(prev => prev.map(s => s.id === itemId ? updatedItem : s));
            }

            if (editingSource?.id === itemId) {
              setEditingSource(updatedItem);
            }

            jobsToRemove.push(jobId);
          } else if (job.status === 'FAILED') {
            const { itemId, targetTab, loadingItem } = jobInfo;
            const errorItem: Source = {
              ...loadingItem,
              content: `# エラー\n\n${job.error || '不明なエラーが発生しました'}`,
              loading: false,
            };

            if (targetTab === 'style') {
              setStyles(prev => prev.map(s => s.id === itemId ? errorItem : s));
            } else if (targetTab === 'scenario') {
              // シナリオのエラーは何もしない（まだ追加されていないため）
            } else {
              setSources(prev => prev.map(s => s.id === itemId ? errorItem : s));
            }

            if (editingSource?.id === itemId) {
              setEditingSource(errorItem);
            }

            jobsToRemove.push(jobId);
          }
        } catch (error) {
          console.error(`Polling error for job ${jobId}:`, error);
          jobsToRemove.push(jobId);
        }
      }

      // 完了したジョブを削除
      if (jobsToRemove.length > 0) {
        setActiveJobs(prev => {
          const updated = new Map(prev);
          for (const jobId of jobsToRemove) {
            updated.delete(jobId);
          }
          return updated;
        });
      }
    }, 2000); // 2秒間隔でポーリング

    return () => clearInterval(intervalId);
  }, [activeJobs, styles, sources, scenarios, editingSource, createStyle, createSource, createScenario, setScenarios]);

  const suggestedPrompts = sources.length > 0 ? [
    "このドキュメントの主なポイントを要約してください",
    "最も重要な洞察を教えてください",
    "詳しく説明してください"
  ] : [];

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
  const updateSourceContent = async (id: string, content: string) => {
    // まず該当するアイテムを見つける
    const source = sources.find(s => s.id === id);
    const style = styles.find(s => s.id === id);
    const scenario = scenarios.find(s => s.id === id);

    // データベースを更新
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
    // まず該当するアイテムを見つける
    const source = sources.find(s => s.id === id);
    const style = styles.find(s => s.id === id);
    const scenario = scenarios.find(s => s.id === id);

    // データベースを更新
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

    // まずローディング状態のソースを追加
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

    // ソースを追加（ローディング状態）
    if (activeTab === "style") {
      setStyles([...styles, loadingItem]);
    } else {
      setSources([...sources, loadingItem]);
    }
    setEditingSource(loadingItem);

    // ジョブ作成リクエスト
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ANALYZE_VIDEO',
          input: { url, mode: activeTab },
        }),
      });

      const { jobId } = await response.json();

      // ジョブ情報を保存
      setActiveJobs(prev => new Map(prev).set(jobId, { itemId: newItemId, targetTab: activeTab, loadingItem }));
    } catch (error: any) {
      console.error('Job creation error:', error);
      const errorItem: Source = {
        ...loadingItem,
        content: `# エラー\n\n${error.message}`,
        loading: false,
      };
      const targetArray = activeTab === "style" ? styles : sources;
      const setTargetArray = activeTab === "style" ? setStyles : setSources;
      setTargetArray(prev => prev.map(s => s.id === newItemId ? errorItem : s));
      setEditingSource(errorItem);
    }
  };

  // ファイルアップロード後の処理（非同期化）
  const handleFileSelect = async (file: File) => {
    const timestamp = generateTimestamp();
    const newItemId = uid();
    const fileType = file.type;

    // まずローディング状態のソースを追加
    const loadingItem: Source = {
      id: newItemId,
      title: generateInitialTitle(),
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

    // ジョブ作成リクエスト
    try {
      // ファイルをbase64エンコードまたはテキストとして読み込み
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          let inputData: any = {
            filename: file.name,
            fileType: fileType,
            mode: activeTab,
          };

          if (fileType === 'application/pdf') {
            // PDFファイルはbase64エンコード
            inputData.fileData = reader.result as string;
          } else {
            // テキストファイル
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

          // ジョブ情報を保存
          setActiveJobs(prev => new Map(prev).set(jobId, { itemId: newItemId, targetTab: activeTab, loadingItem }));
        } catch (error: any) {
          console.error('Job creation error:', error);
          const errorItem: Source = {
            ...loadingItem,
            content: `# エラー\n\n${error.message}`,
            loading: false,
          };
          const targetArray = activeTab === "style" ? styles : sources;
          const setTargetArray = activeTab === "style" ? setStyles : setSources;
          setTargetArray(prev => prev.map(s => s.id === newItemId ? errorItem : s));
          setEditingSource(errorItem);
        }
      };

      if (fileType === 'application/pdf') {
        // PDFファイルはbase64エンコード
        reader.readAsDataURL(file);
      } else {
        // テキストファイルはテキストとして読み込み
        reader.readAsText(file);
      }
    } catch (error: any) {
      console.error('File analysis error:', error);
      const errorItem: Source = {
        ...loadingItem,
        content: `# エラー\n\n${error.message}`,
        loading: false,
      };
      const targetArray = activeTab === "style" ? styles : sources;
      const setTargetArray = activeTab === "style" ? setStyles : setSources;
      setTargetArray(prev => prev.map(s => s.id === newItemId ? errorItem : s));
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

    // データベースに保存
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
    // 現在のソース/スタイルから探す
    const source = sources.find(s => s.id === sourceId) || styles.find(s => s.id === sourceId);
    if (!source) return;

    // 移動先に追加（タイプを更新）
    const movedSource = {
      ...source,
      type: targetType === 'style' ?
        (source.type.includes('Style') ? source.type : source.type.replace('Source', 'Style').replace('Markdown', 'Style')) :
        (source.type.includes('Source') ? source.type : source.type.replace('Style', 'Source').replace('Markdown', 'Source')),
    };

    // 移動元から削除して移動先に追加
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

    // ユーザーメッセージをデータベースに保存
    await addChatMessage(userMessage);

    // アシスタントの空メッセージを追加
    const assistantMessage: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, assistantMessage]);

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
                  setChatMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantContent };
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

      // アシスタントメッセージをデータベースに保存
      await addChatMessage({
        ...assistantMessage,
        content: assistantContent,
      });
    } catch (error) {
      console.error('Chat error:', error);
      // エラー時はメッセージを削除
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // シナリオ生成（非同期化）
  const handleGenerateScenario = async () => {
    const timestamp = generateTimestamp();
    const newItemId = uid();

    // ローディング状態のダミーアイテム
    const loadingItem: Source = {
      id: newItemId,
      title: generateInitialTitle(),
      type: 'Scenario',
      selected: true,
      content: `# シナリオ生成中\n\nAIでシナリオを生成中...`,
      createdAt: timestamp,
      loading: true,
    };

    setLoading(true);

    // ジョブ作成リクエスト
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
          },
        }),
      });

      const { jobId } = await response.json();

      // ジョブ情報を保存
      setActiveJobs(prev => new Map(prev).set(jobId, { itemId: newItemId, targetTab: 'scenario', loadingItem }));
    } catch (error: any) {
      console.error('Scenario generation error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-cream-50 texture-overlay">
      {/* ヘッダー */}
      <header className="flex h-16 items-center border-b border-warm-200 px-6 bg-cream-50/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-terracotta-300 to-coral-300 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-medium text-text-primary">動画制作ノート</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー: ソース */}
        <aside className="w-96 border-r border-warm-200 overflow-y-auto bg-warm-50/50">
          <div className="p-5">
            <button
              onClick={addSource}
              className="w-full rounded-2xl bg-gradient-to-r from-terracotta-500 to-terracotta-400 px-5 py-3 text-sm font-medium text-white hover:from-terracotta-600 hover:to-terracotta-500 transition-all duration-200 mb-3 soft-shadow hover:medium-shadow hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                ソースを追加
              </span>
            </button>
            <button
              onClick={addFile}
              className="w-full rounded-2xl border-2 border-terracotta-300 bg-terracotta-50 px-5 py-3 text-sm font-medium text-terracotta-600 hover:bg-terracotta-100 transition-all duration-200 flex items-center justify-center gap-2 soft-shadow hover:medium-shadow hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ファイルを追加
            </button>

            {/* タブ */}
            <div className="mt-6">
              <div className="flex bg-warm-100/50 rounded-2xl p-1">
                <button
                  onClick={() => setActiveTab("style")}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === "style"
                      ? "bg-white text-terracotta-600 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-warm-200/50"
                  }`}
                >
                  🎨 スタイル ({styles.length})
                </button>
                <button
                  onClick={() => setActiveTab("sources")}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === "sources"
                      ? "bg-white text-terracotta-600 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-warm-200/50"
                  }`}
                >
                  📚 ソース ({sources.length})
                </button>
              </div>

              {/* スタイルタブのコンテンツ */}
              {activeTab === "style" && (
                <div className="py-4">
                  {styles.length === 0 ? (
                    <div className="text-center py-10 animate-fade-in">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-terracotta-100 to-coral-100 flex items-center justify-center">
                        <svg className="h-10 w-10 text-terracotta-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-text-primary mb-1">
                        YouTuber動画のコツや雰囲気を記録
                      </p>
                      <p className="text-xs text-text-tertiary">
                        動画の構成、話し方、編集テクニックなど
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {styles.map((style, index) => (
                        <div
                          key={style.id}
                          onClick={() => selectSource(style)}
                          className={`group flex items-center gap-3 rounded-2xl p-4 cursor-pointer transition-all duration-200 animate-fade-in-up ${
                            editingSource?.id === style.id
                              ? 'bg-terracotta-50 border-2 border-terracotta-300 shadow-md'
                              : style.selected
                              ? 'bg-warm-100 border border-warm-200 soft-shadow'
                              : 'bg-white border border-warm-200 hover:border-terracotta-200 hover:shadow-md'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <input
                            type="checkbox"
                            checked={style.selected}
                            onChange={(e) => {
                              const newSelected = e.target.checked;
                              setStyles(styles.map(s => s.id === style.id ? { ...s, selected: newSelected } : s));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 rounded-lg border-warm-300 text-terracotta-500 focus:ring-terracotta-400 focus:ring-offset-0 transition-all"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-text-primary truncate">{style.title}</p>
                              {style.loading && (
                                <svg className="animate-spin h-4 w-4 text-terracotta-400" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-text-tertiary mt-0.5">{style.type}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStyle(style.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                            aria-label="削除"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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
                    <div className="text-center py-10 animate-fade-in">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center">
                        <svg className="h-10 w-10 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-text-primary mb-1">
                        保存したソースがここに表示されます
                      </p>
                      <p className="text-xs text-text-tertiary">
                        PDF、ウェブサイト、テキスト、動画などを追加
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sources.map((source, index) => (
                        <div
                          key={source.id}
                          onClick={() => selectSource(source)}
                          className={`group flex items-center gap-3 rounded-2xl p-4 cursor-pointer transition-all duration-200 animate-fade-in-up ${
                            editingSource?.id === source.id
                              ? 'bg-terracotta-50 border-2 border-terracotta-300 shadow-md'
                              : source.selected
                              ? 'bg-warm-100 border border-warm-200 soft-shadow'
                              : 'bg-white border border-warm-200 hover:border-terracotta-200 hover:shadow-md'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <input
                            type="checkbox"
                            checked={source.selected}
                            onChange={(e) => {
                              const newSelected = e.target.checked;
                              setSources(sources.map(s => s.id === source.id ? { ...s, selected: newSelected } : s));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 rounded-lg border-warm-300 text-terracotta-500 focus:ring-terracotta-400 focus:ring-offset-0 transition-all"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-text-primary truncate">{source.title}</p>
                              {source.loading && (
                                <svg className="animate-spin h-4 w-4 text-terracotta-400" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-text-tertiary mt-0.5">{source.type}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSource(source.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                            aria-label="削除"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* 中央エリア: エディタまたはチャット */}
        <main className="flex-1 flex flex-col overflow-hidden bg-cream-50/30">
          {editingSource ? (
            // エディタ（編集時のみ表示）
            <div className="flex flex-col h-full animate-scale-in">
              <div className="p-4 border-b border-warm-200 bg-warm-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-terracotta-200 to-coral-200 flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-terracotta-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                      type="text"
                      value={tempName || editingSource.title}
                      onChange={(e) => setTempName(e.target.value)}
                      onFocus={() => setTempName(editingSource.title)}
                      className="flex-1 min-w-0 text-sm font-medium text-text-primary bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-terracotta-300 rounded px-2 py-1 -mx-2"
                    />
                    {tempName && tempName !== editingSource.title && (
                      <button
                        onClick={() => {
                          updateSourceName(editingSource.id, tempName);
                          setTempName("");
                        }}
                        className="flex-shrink-0 rounded-lg p-1 text-text-secondary hover:bg-green-100 hover:text-green-600 transition-all duration-200"
                        title="保存"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 移動ボタン */}
                  {!editingSource.loading && (
                    <>
                      {editingSource.type.includes('Style') ? (
                        <button
                          onClick={() => moveSource(editingSource.id, 'source')}
                          className="rounded-xl p-2 text-text-secondary hover:bg-warm-100 hover:text-text-primary transition-all duration-200"
                          title="ソースに移動"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => moveSource(editingSource.id, 'style')}
                          className="rounded-xl p-2 text-text-secondary hover:bg-warm-100 hover:text-text-primary transition-all duration-200"
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
                    className="rounded-xl p-2 text-text-secondary hover:bg-warm-100 hover:text-text-primary transition-all duration-200"
                    title="Markdownとしてエクスポート"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {/* 削除ボタン */}
                  <button
                    onClick={() => {
                      if (editingSource.type.includes('Scenario')) {
                        handleDeleteScenario(editingSource.id);
                      } else {
                        handleDeleteSource(editingSource.id);
                      }
                    }}
                    className="rounded-xl p-2 text-text-secondary hover:bg-red-100 hover:text-red-600 transition-all duration-200"
                    title="削除"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={closeEditor}
                    className="rounded-xl p-2 text-text-secondary hover:bg-terracotta-100 hover:text-terracotta-600 transition-all duration-200"
                    aria-label="エディタを閉じる"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* YouTube動画プレビュー */}
              {editingSource.videoUrl && (
                <div className="border-b border-warm-200 bg-warm-50/50">
                  <div className="aspect-video w-full">
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
                value={editingSource.content || ''}
                onChange={(e) => updateSourceContent(editingSource.id, e.target.value)}
                className="flex-1 p-5 resize-none focus:outline-none text-sm leading-relaxed text-text-primary bg-white"
                placeholder="ここにMarkdown形式でテキストを入力..."
              />
              <div className="p-3 border-t border-warm-200 bg-warm-50/80 text-xs text-text-tertiary flex justify-between">
                <span>{(editingSource.content || '').length.toLocaleString()} 文字</span>
                <span className="text-text-tertiary">{editingSource.title}</span>
              </div>
            </div>
          ) : (
            // チャットインターフェース
            <>
              <div className="flex-1 overflow-y-auto">
                {chatMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-lg px-6 animate-fade-in-up">
                  <div className="mb-8">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-terracotta-100 via-coral-100 to-terracotta-50 flex items-center justify-center medium-shadow">
                      <svg className="h-12 w-12 text-terracotta-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold text-text-primary mb-3">AIと対話を始めましょう</h2>
                  <p className="text-sm text-text-secondary mb-8 leading-relaxed">
                    スタイルやソースを追加して、AIがあなたのノートブックのコンテキストを理解できるようにします。
                  </p>
                  <button className="rounded-2xl border-2 border-warm-300 bg-white px-8 py-3 text-sm font-medium text-text-primary hover:bg-warm-50 hover:border-terracotta-300 transition-all duration-200 soft-shadow hover:medium-shadow">
                    ソースを追加する
                  </button>

                  {/* 提案されたプロンプト */}
                  {suggestedPrompts.length > 0 && (
                    <div className="mt-10 space-y-3">
                      <p className="text-xs font-medium text-text-tertiary mb-4 uppercase tracking-wide">おすすめの質問</p>
                      {suggestedPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          className="w-full text-left rounded-2xl border border-warm-200 bg-white px-5 py-4 text-sm text-text-secondary hover:border-terracotta-200 hover:bg-terracotta-50/50 hover:text-text-primary transition-all duration-200 soft-shadow hover:medium-shadow group"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <span className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-warm-100 flex items-center justify-center text-xs font-medium text-terracotta-600 group-hover:bg-terracotta-200 transition-colors">
                              {index + 1}
                            </span>
                            {prompt}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-terracotta-500 to-terracotta-400 text-white shadow-md"
                          : "bg-white text-text-primary border border-warm-200 soft-shadow"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 入力エリア */}
          <div className="border-t border-warm-200 p-5 bg-white/50 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-center bg-white rounded-2xl border-2 border-warm-200 focus-within:border-terracotta-300 transition-colors duration-200 medium-shadow">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={sources.length === 0 ? "開始するにはソースを追加してください..." : "AIに質問する..."}
                  disabled={sources.length === 0}
                  className="flex-1 bg-transparent px-5 py-4 pr-32 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:bg-transparent disabled:text-text-tertiary rounded-2xl"
                />
                <div className="absolute right-2 flex items-center gap-2">
                  <span className="text-xs text-text-secondary bg-warm-100 rounded-full px-3 py-1.5 font-medium">
                    {sources.filter(s => s.selected).length} 個のソース
                  </span>
                  <button
                    onClick={handleSendMessage}
                    disabled={sources.length === 0 || loading}
                    className={`rounded-xl p-2.5 transition-all duration-200 ${
                      sources.length === 0 || loading
                        ? "bg-warm-200 text-text-tertiary cursor-not-allowed"
                        : "bg-gradient-to-r from-terracotta-500 to-terracotta-400 text-white hover:from-terracotta-600 hover:to-terracotta-500 shadow-md hover:shadow-lg"
                    }`}
                    aria-label="送信"
                  >
                    {loading ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-text-tertiary">
                AIの回答は正確性を保証しない場合があります。重要な情報は必ず確認してください。
              </p>
            </div>
          </div>
            </>
          )}
        </main>

        {/* 右サイドバー: シナリオ作成 */}
        <aside className="w-96 border-l border-warm-200 overflow-y-auto bg-warm-50/50">
          <div className="p-5">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-text-primary mb-1">🎬 動画シナリオ作成</h2>
              <p className="text-xs text-text-tertiary">AIが自動でシナリオを生成します</p>
            </div>

            <button
              onClick={handleGenerateScenario}
              disabled={loading || styles.length === 0 && sources.length === 0}
              className="w-full rounded-2xl bg-gradient-to-r from-terracotta-500 to-coral-400 px-5 py-3.5 text-sm font-medium text-white hover:from-terracotta-600 hover:to-coral-500 transition-all duration-200 mb-4 disabled:from-warm-300 disabled:to-warm-200 disabled:text-text-tertiary disabled:cursor-not-allowed flex items-center justify-center gap-2 soft-shadow hover:medium-shadow hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  シナリオを生成
                </>
              )}
            </button>

            <div className="bg-terracotta-50 rounded-xl p-4 mb-6 border border-terracotta-100">
              <p className="text-xs text-text-secondary leading-relaxed">
                スタイル、ソース、ディスカッションを統合して、動画のシナリオを自動生成します。
              </p>
            </div>

            {/* シナリオリスト */}
            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wide">
                保存されたシナリオ ({scenarios.length})
              </h3>
              {scenarios.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-warm-100 flex items-center justify-center">
                    <svg className="h-8 w-8 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-secondary mb-1">
                    シナリオはここに保存されます
                  </p>
                  <p className="text-xs text-text-tertiary">
                    上のボタンから新しいシナリオを作成
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scenarios.map((scenario, index) => (
                    <div
                      key={scenario.id}
                      onClick={() => selectSource(scenario)}
                      className={`group flex items-center gap-3 rounded-2xl p-4 cursor-pointer transition-all duration-200 animate-fade-in-up ${
                        editingSource?.id === scenario.id
                          ? 'bg-terracotta-50 border-2 border-terracotta-300 shadow-md'
                          : 'bg-white border border-warm-200 hover:border-terracotta-200 hover:shadow-md'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary truncate">{scenario.title}</p>
                        </div>
                        <p className="text-xs text-text-tertiary mt-0.5">{scenario.type}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScenario(scenario.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                        aria-label="削除"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
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
