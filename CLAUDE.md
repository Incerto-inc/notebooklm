# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

NotebookLM クローン - YouTuber向け動画制作支援ツール。GoogleのNotebookLMのUIをベースに、スタイル収集、ソース管理、AIディスカッション、動画シナリオ作成を一元的に行うアプリケーションです。

## 開発環境

このプロジェクトはTypeScriptで記述されています。**必ず bun を使用してください**。

```bash
cd frontend
bun install        # 依存関係のインストール（npmではなくbunを使用）
bun run dev        # 開発サーバーの起動 (http://localhost:3000)
bun run build      # プロダクションビルド
bun run lint       # ESLintによるリント
```

## テスト

Playwrightを使用したE2Eテストが設定されています：

```bash
cd frontend
bunx playwright test        # テスト実行
bunx playwright show-report # レポート表示
bunx playwright test --ui   # UIモードで実行
```

テスト設定は `frontend/playwright.config.ts` にあります。開発サーバーはPlaywrightが自動的に起動します。

## プロジェクト構造

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/           # APIルート (Next.js App Router)
│   │   │   ├── analyze-video/   # YouTube動画のAI分析
│   │   │   ├── analyze-file/    # ファイルのAI分析
│   │   │   ├── chat/            # AIチャット（ストリーミング対応）
│   │   │   └── generate-scenario/ # シナリオ生成
│   │   ├── layout.tsx    # ルートレイアウト
│   │   └── page.tsx      # メインページ（NotebookLM UI）
│   ├── components/       # Reactコンポーネント
│   ├── hooks/           # カスタムフック（useLocalStorage）
│   └── lib/
│       ├── openrouter.ts # OpenRouter APIクライアント
│       └── types.ts      # TypeScript型定義
├── e2e/                 # Playwright E2Eテスト
├── public/              # 静的アセット
└── .env.local          # 環境変数（Git管理外）
```

## アーキテクチャ

### データフロー

1. **インプット**: ユーザーは「スタイル」（YouTuberのノウハウ）と「ソース」（参考動画/資料）を追加
2. **AI処理**: OpenRouter API経由でAI分析を実行
   - YouTube動画URL → AIがスタイル/内容を分析
   - ファイルアップロード → AIがテキスト/ PDFを解析
3. **対話**: チャットでAIと対話（ストリーミング対応）
4. **アウトプット**: 収集した情報を元に動画シナリオを生成

### 状態管理

- **ローカルストレージ**: すべてのデータ（styles, sources, scenarios, chatMessages）はブラウザのlocalStorageに自動保存
- **Hydration回避**: Next.jsのSSR hydrationエラーを回避するため、mountedフラグでクライアントサイドレンダリングを制御
- **リアルタイム更新**: ソース追加時はローディング状態を表示し、バックグラウンドでAPI呼び出し

### OpenRouter統合

`src/lib/openrouter.ts` でAI機能を提供：

- `sendChatMessageStream()`: ストリーミングチャット
- `analyzeVideo()`: YouTube動画分析
- `generateScenario()`: 動画シナリオ生成

環境変数（`.env.local`）で使用モデルを個別に設定可能：

```
OPENROUTER_MODEL_CHAT=google/gemini-3-flash-preview
OPENROUTER_MODEL_VIDEO=google/gemini-3-flash-preview
OPENROUTER_MODEL_SCENARIO=google/gemini-3-flash-preview
```

### ファイル命名規則

タイムスタンプ形式: `yyyy年mm月dd日ss.mmm.md`（例: `2026年01月20日15.123.md`）

## 重要な実装詳細

### ストリーミングチャット

`src/app/api/chat/route.ts` でServer-Sent Events (SSE) を使用したストリーミングを実装：

- `text/event-stream` コンテンツタイプ
- `data: {...}\n\n` 形式でチャンクを送信
- `data: [DONE]\n\n` で完了を通知

### コンポーネント構成

メインページ（`src/app/page.tsx`）はシングルファイルコンポーネント：
- 左サイドバー: スタイル/ソース管理（タブ切り替え）
- 中央: チャットインターフェース
- 右サイドバー: シナリオ作成
- エディタ: 選択時のみ左側に展開

### YouTube埋め込み

`videoUrl` プロパティがあるソースは、YouTube iframeを自動表示：
- `extractYouTubeId()` でURLからIDを抽出
- `youtube.com/embed/{id}` で埋め込み表示

## 環境変数

`.env.local` で設定（Gitコミットしないこと）：

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL_CHAT=google/gemini-3-flash-preview
OPENROUTER_MODEL_VIDEO=google/gemini-3-flash-preview
OPENROUTER_MODEL_SCENARIO=google/gemini-3-flash-preview
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 依存関係

主要なライブラリ：
- **Next.js 16.1.3**: Reactフレームワーク（App Router）
- **React 19.2.3**: UIライブラリ
- **Tailwind CSS 4**: スタイリング
- **@openrouter/sdk**: AI APIクライアント
- **pdf-parse**: PDF解析
- **Playwright**: E2Eテスト

## 開発の注意点

1. **bunの使用**: TypeScriptプロジェクトなので必ずbunを使用（npm禁止）
2. **Hydrationエラー**: クライアントサイドのみのコードは`mounted`チェックで保護
3. **localStorageの永続化**: すべての状態変更は自動保存される
4. **ローディング状態**: AI処理中は`loading: true`を設定してスピナーを表示
5. **ストリーミング**: チャットはリアルタイムでストリーミングされるため、状態更新に注意

## 追加のドキュメント

- `README.md`: プロジェクト概要と機能説明
- `DESIGN.md`: NotebookLM UIの詳細な設計思想
- `docs/openrouter-tool-calling.md`: OpenRouterのツール呼び出し機能
- `docs/openrouter-video-inputs.md`: OpenRouterの動画入力機能
