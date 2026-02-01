import type { Source } from "@/lib/types";

interface LeftSidebarProps {
  activeTab: 'style' | 'sources';
  styles: Source[];
  sources: Source[];
  editingSource: Source | null;
  onAddSource: () => void;
  onAddFile: () => void;
  onSetActiveTab: (tab: 'style' | 'sources') => void;
  onSelectSource: (source: Source) => void;
  onToggleStyleSelected: (id: string, selected: boolean) => void;
  onToggleSourceSelected: (id: string, selected: boolean) => void;
  onDeleteStyle: (id: string) => void;
  onDeleteSource: (id: string) => void;
}

export function LeftSidebar({
  activeTab,
  styles,
  sources,
  editingSource,
  onAddSource,
  onAddFile,
  onSetActiveTab,
  onSelectSource,
  onToggleStyleSelected,
  onToggleSourceSelected,
  onDeleteStyle,
  onDeleteSource,
}: LeftSidebarProps) {
  return (
    <aside className="w-96 border-r border-warm-200 overflow-y-auto bg-warm-50/50">
      <div className="p-5">
        <button
          onClick={onAddSource}
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
          onClick={onAddFile}
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
              onClick={() => onSetActiveTab("style")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeTab === "style"
                  ? "bg-white text-terracotta-600 shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-warm-200/50"
              }`}
            >
              🎨 スタイル ({styles.length})
            </button>
            <button
              onClick={() => onSetActiveTab("sources")}
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
            <StyleTabContent
              styles={styles}
              editingSource={editingSource}
              onSelectSource={onSelectSource}
              onToggleSelected={onToggleStyleSelected}
              onDeleteStyle={onDeleteStyle}
            />
          )}

          {/* ソースタブのコンテンツ */}
          {activeTab === "sources" && (
            <SourceTabContent
              sources={sources}
              editingSource={editingSource}
              onSelectSource={onSelectSource}
              onToggleSelected={onToggleSourceSelected}
              onDeleteSource={onDeleteSource}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

// スタイルタブのコンテンツ
function StyleTabContent({
  styles,
  editingSource,
  onSelectSource,
  onToggleSelected,
  onDeleteStyle,
}: {
  styles: Source[];
  editingSource: Source | null;
  onSelectSource: (source: Source) => void;
  onToggleSelected: (id: string, selected: boolean) => void;
  onDeleteStyle: (id: string) => void;
}) {
  return (
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
              onClick={() => onSelectSource(style)}
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
                  onToggleSelected(style.id, e.target.checked);
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
                  onDeleteStyle(style.id);
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
  );
}

// ソースタブのコンテンツ
function SourceTabContent({
  sources,
  editingSource,
  onSelectSource,
  onToggleSelected,
  onDeleteSource,
}: {
  sources: Source[];
  editingSource: Source | null;
  onSelectSource: (source: Source) => void;
  onToggleSelected: (id: string, selected: boolean) => void;
  onDeleteSource: (id: string) => void;
}) {
  return (
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
              onClick={() => onSelectSource(source)}
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
                  onToggleSelected(source.id, e.target.checked);
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
                  onDeleteSource(source.id);
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
  );
}
