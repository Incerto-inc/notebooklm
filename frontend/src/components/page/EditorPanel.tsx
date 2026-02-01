import type { Source } from "@/lib/types";

interface EditorPanelProps {
  editingSource: Source;
  tempName: string;
  onSetTempName: (name: string) => void;
  onUpdateSourceName: (id: string, title: string) => void;
  onUpdateSourceContent: (id: string, content: string) => void;
  onCloseEditor: () => void;
  onMoveSource: (id: string, targetType: 'style' | 'source') => void;
  onExportAsMarkdown: () => void;
  onDelete: (id: string) => void;
}

export function EditorPanel({
  editingSource,
  tempName,
  onSetTempName,
  onUpdateSourceName,
  onUpdateSourceContent,
  onCloseEditor,
  onMoveSource,
  onExportAsMarkdown,
  onDelete,
}: EditorPanelProps) {
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

  return (
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
              onChange={(e) => onSetTempName(e.target.value)}
              onFocus={() => onSetTempName(editingSource.title)}
              className="flex-1 min-w-0 text-sm font-medium text-text-primary bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-terracotta-300 rounded px-2 py-1 -mx-2"
            />
            {tempName && tempName !== editingSource.title && (
              <button
                onClick={() => {
                  onUpdateSourceName(editingSource.id, tempName);
                  onSetTempName("");
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
                  onClick={() => onMoveSource(editingSource.id, 'source')}
                  className="rounded-xl p-2 text-text-secondary hover:bg-warm-100 hover:text-text-primary transition-all duration-200"
                  title="ソースに移動"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => onMoveSource(editingSource.id, 'style')}
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
            onClick={onExportAsMarkdown}
            className="rounded-xl p-2 text-text-secondary hover:bg-warm-100 hover:text-text-primary transition-all duration-200"
            title="Markdownとしてエクスポート"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          {/* 削除ボタン */}
          <button
            onClick={() => onDelete(editingSource.id)}
            className="rounded-xl p-2 text-text-secondary hover:bg-red-100 hover:text-red-600 transition-all duration-200"
            title="削除"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onCloseEditor}
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
        onChange={(e) => onUpdateSourceContent(editingSource.id, e.target.value)}
        className="flex-1 p-5 resize-none focus:outline-none text-sm leading-relaxed text-text-primary bg-white"
        placeholder="ここにMarkdown形式でテキストを入力..."
      />
      <div className="p-3 border-t border-warm-200 bg-warm-50/80 text-xs text-text-tertiary flex justify-between">
        <span>{(editingSource.content || '').length.toLocaleString()} 文字</span>
        <span className="text-text-tertiary">{editingSource.title}</span>
      </div>
    </div>
  );
}
