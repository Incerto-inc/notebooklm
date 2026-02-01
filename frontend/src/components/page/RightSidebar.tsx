import type { Source } from "@/lib/types";

interface RightSidebarProps {
  scenarios: Source[];
  loading: boolean;
  styles: Source[];
  sources: Source[];
  editingSource: Source | null;
  onGenerateScenario: () => void;
  onSelectSource: (source: Source) => void;
  onDeleteScenario: (id: string) => void;
}

export function RightSidebar({
  scenarios,
  loading,
  styles,
  sources,
  editingSource,
  onGenerateScenario,
  onSelectSource,
  onDeleteScenario,
}: RightSidebarProps) {
  return (
    <aside className="w-96 border-l border-warm-200 overflow-y-auto bg-warm-50/50">
      <div className="p-5">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-text-primary mb-1">🎬 動画シナリオ作成</h2>
          <p className="text-xs text-text-tertiary">AIが自動でシナリオを生成します</p>
        </div>

        <button
          onClick={onGenerateScenario}
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
            <ScenarioEmptyState />
          ) : (
            <ScenarioList
              scenarios={scenarios}
              editingSource={editingSource}
              onSelectSource={onSelectSource}
              onDeleteScenario={onDeleteScenario}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

// シナリオ空の状態
function ScenarioEmptyState() {
  return (
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
  );
}

// シナリオリスト
function ScenarioList({
  scenarios,
  editingSource,
  onSelectSource,
  onDeleteScenario,
}: {
  scenarios: Source[];
  editingSource: Source | null;
  onSelectSource: (source: Source) => void;
  onDeleteScenario: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {scenarios.map((scenario, index) => (
        <div
          key={scenario.id}
          onClick={() => onSelectSource(scenario)}
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
              onDeleteScenario(scenario.id);
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
  );
}
