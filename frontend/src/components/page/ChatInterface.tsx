import type { ChatMessage, Source } from "@/lib/types";

interface ChatInterfaceProps {
  chatMessages: ChatMessage[];
  sources: Source[];
  inputValue: string;
  loading: boolean;
  suggestedPrompts: string[];
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export function ChatInterface({
  chatMessages,
  sources,
  inputValue,
  loading,
  suggestedPrompts,
  onInputChange,
  onSendMessage,
}: ChatInterfaceProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {chatMessages.length === 0 ? (
          <ChatEmptyState suggestedPrompts={suggestedPrompts} />
        ) : (
          <ChatMessagesList messages={chatMessages} />
        )}
      </div>

      {/* 入力エリア */}
      <div className="border-t border-warm-200 p-5 bg-white/50 backdrop-blur-sm">
        <ChatInput
          inputValue={inputValue}
          sources={sources}
          loading={loading}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
        />
      </div>
    </>
  );
}

// チャット空の状態
function ChatEmptyState({
  suggestedPrompts,
}: {
  suggestedPrompts: string[];
}) {
  return (
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
  );
}

// チャットメッセージリスト
function ChatMessagesList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
      {messages.map((message, index) => (
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
  );
}

// チャット入力
function ChatInput({
  inputValue,
  sources,
  loading,
  onInputChange,
  onSendMessage,
}: {
  inputValue: string;
  sources: Source[];
  loading: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative flex items-center bg-white rounded-2xl border-2 border-warm-200 focus-within:border-terracotta-300 transition-colors duration-200 medium-shadow">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={sources.length === 0 ? "開始するにはソースを追加してください..." : "AIに質問する..."}
          disabled={sources.length === 0}
          className="flex-1 bg-transparent px-5 py-4 pr-32 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:bg-transparent disabled:text-text-tertiary rounded-2xl"
        />
        <div className="absolute right-2 flex items-center gap-2">
          <span className="text-xs text-text-secondary bg-warm-100 rounded-full px-3 py-1.5 font-medium">
            {sources.filter(s => s.selected).length} 個のソース
          </span>
          <button
            onClick={onSendMessage}
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
  );
}
