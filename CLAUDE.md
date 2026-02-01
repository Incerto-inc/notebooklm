# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

NotebookLM クローン - YouTuber向け動画制作支援ツール。GoogleのNotebookLMのUIをベースに、スタイル収集、ソース管理、AIディスカッション、動画シナリオ作成を一元的に行うアプリケーションです。

## ディレクトリ構成

このプロジェクトは**モノレポ構成**です：
- **ルートディレクトリ**: Supabaseマイグレーション、設定、E2Eテスト
- **frontend/**: Next.jsアプリケーション（フロントエンド + API Routes）

```
├── frontend/             # Next.jsアプリケーション
│   ├── src/
│   ├── package.json
│   └── ...
├── supabase/            # Supabaseマイグレーション・設定
│   └── migrations/      # マイグレーションファイル
├── e2e/                 # Playwright E2Eテスト（ルート）
├── playwright.config.ts # Playwright設定（ルート）
└── package.json         # ルートpackage.json
```

## 開発環境

このプロジェクトはTypeScriptで記述されています。**必ず bun を使用してください**。

```bash
# インストールとセットアップ（ルートディレクトリで実行）
bun install              # 依存関係のインストール
supabase start           # Supabase ローカル環境の起動（初回のみ）

# 開発サーバー起動
bun run dev              # http://localhost:3000

# ビルド・リント
bun run build            # プロダクションビルド（frontend/）
bun run lint             # ESLintによるリント
```

**Supabase管理コマンド**:
```bash
supabase start           # ローカル Supabase 環境を起動（ポート54321）
supabase stop            # ローカル Supabase 環境を停止
supabase db push --local # マイグレーションをローカルDBに適用（リセット禁止）
supabase status          # 環境の状態確認
```

## テスト

Playwrightを使用したE2Eテストが設定されています：

```bash
bunx playwright test                 # すべてのテスト実行
bunx playwright test --ui            # UIモードで実行
bunx playwright test --project=chromium # 特定ブラウザのみ
bunx playwright test e2e/basic.spec.ts   # 特定ファイルのみ
bunx playwright test -g "ページが正常" # 特定テストのみ（grep）
bunx playwright show-report          # レポート表示
```

テスト設定は `playwright.config.ts`（ルートディレクトリ）にあり、Playwrightが自動的に開発サーバーを起動します。

## CI/CD

**GitHub Actions** - mainブランチへのマージ時に自動的にデータベーススキーマを更新します：

- ワークフロー: `.github/workflows/supabase-migrate-production.yml`
- トリガー: mainブランチへのpush、または手動実行
- 必要なSecret:
  - `DATABASE_URL`: 本番DB接続文字列
  - `SUPABASE_ACCESS_TOKEN`: Supabaseパーソナルアクセストークン
  - `SUPABASE_PROJECT_ID`: SupabaseプロジェクトID

詳細: `docs/github-actions-setup.md`

## アーキテクチャ

### データフロー

1. **インプット**: ユーザーは「スタイル」（YouTuberのノウハウ）と「ソース」（参考動画/資料）を追加
2. **AI処理（非同期ジョブキューシステム）**: OpenRouter API経由でAI分析を実行
   - YouTube動画URL → AIがスタイル/内容を分析
   - ファイルアップロード → AIがテキスト/PDFを解析
   - **すべてのAI処理はサーバーサイドで非同期実行**（クライアントはポーリングで進捗を取得）
3. **対話**: チャットでAIと対話（ストリーミング対応）
4. **アウトプット**: 収集した情報を元に動画シナリオを生成

### 非同期AI処理システム（ジョブキューアーキテクチャ）

**概要**:
AI処理を完全非同期化し、ユーザー体験を改善するジョブキューシステムを採用しています。

**アーキテクチャ図**:
```
クライアント                    サーバー                   Worker
   |                            |                          |
   |--(1)ジョブ作成リクエスト-->|                          |
   |                            |--(2)Jobレコード作成-->[DB]
   |<--(3)jobIdを即座に返却-----|                          |
   |                            |                          |
   |--(4)ポーリング(2秒毎)----->|                          |
   |                            |--(5)ステータス確認--->[DB]
   |<--(6)processing-----------|                          |
   |                            |                          |
   |--(7)ポーリング------------>|        |--(8)AI処理--->[OpenRouter]
   |                            |        |<--(9)結果-----|
   |                            |--(10)結果保存----->[DB]
   |                            |                          |
   |--(11)ポーリング----------->|                          |
   |<--(12)completed + 結果------|                          |
```

**ジョブステータス**:
- `PENDING`: 処理待ち
- `PROCESSING`: 処理中
- `COMPLETED`: 完了
- `FAILED`: 失敗（リトライ可能）
- `CANCELLED`: キャンセル済み

**ジョブタイプ**:
- `ANALYZE_VIDEO`: YouTube動画の分析
- `ANALYZE_FILE`: ファイル（PDF/テキスト）の分析
- `GENERATE_SCENARIO`: 動画シナリオの生成

**APIエンドポイント**:
- `POST /api/jobs`: ジョブ作成（即座にjobIdを返却）
- `GET /api/jobs/[jobId]`: ジョブステータス確認（ポーリング用）

**フロントエンド実装**:
- `useJobPolling.ts`: カスタムフックでジョブステータスをポーリング（2秒間隔）
- `page.tsx`: AI処理関数が非同期化され、ジョブ作成後に即座にUIを更新
  - `handleVideoSubmit`: 動画分析を非同期実行
  - `handleFileSelect`: ファイル分析を非同期実行
  - `handleGenerateScenario`: シナリオ生成を非同期実行

**サーバーサイド実装**:
- `lib/job-processor.ts`: バックグラウンドジョブプロセッサー
  - 自動リトライ（指数バックオフ、最大3回、最大30秒）
  - 5分間のタイムアウト設定
  - エラーハンドリング（ネットワークエラーはリトライ、その他は即時失敗）

**UXの改善**:
- AI処理中もユーザーは他の操作が可能
- 「AIで分析中...」のローディング表示
- 完了時に自動的に結果を表示
- エラー発生時の適切なエラーメッセージ表示

### データ管理アーキテクチャ

**Supabase**によるデータ永続化：

- **データベース**: Supabase Local（PostgreSQL on port 54321）
- **マイグレーション**: Supabaseネイティブマイグレーション（`supabase/migrations/`）
- **型定義**: Supabase自動生成型（`frontend/src/lib/supabase/types.ts`）
- **フロントエンド統合**: `useSupabaseData.ts`フックでデータ管理
  - 初期マウント時にSupabaseから全データをフェッチ
  - CRUD操作はNext.js APIルート経由でSupabaseにアクセス
  - 楽観的更新：即座にローカル状態を更新し、バックグラウンドでAPI呼び出し

**APIルートパターン**（`/api/sources`等で共通）:
- `GET`: 全データ取得
- `POST`: 作成
- `PUT`: 更新
- `DELETE`: 削除

### Supabaseスキーマ設計

5つの主要テーブル（`supabase/migrations/`）:
- **styles**: YouTuberのノウハウ（編集テクニック、話し方等）
- **sources**: 参考動画/資料（要約、ポイント）
- **scenarios**: 動画シナリオ
- **chat_messages**: チャット履歴
- **jobs**: 非同期AI処理ジョブ（ジョブキューシステム用）

**Jobsテーブルのフィールド**:
- `id`: TEXT（主キー）
- `type`: ジョブタイプ（`JobType`: `ANALYZE_VIDEO`, `ANALYZE_FILE`, `GENERATE_SCENARIO`）
- `status`: ジョブステータス（`JobStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`）
- `input`: 処理入力パラメータ（JSONB）
- `result`: 処理結果（JSONB、オプション）
- `error`: エラーメッセージ（オプション）
- `retryCount`: リトライ回数（デフォルト0）
- `maxRetries`: 最大リトライ回数（デフォルト3）
- `priority`: 優先度（デフォルト0、高い数値ほど高優先度）
- `startedAt`: 処理開始時刻（TIMESTAMP）
- `completedAt`: 処理完了時刻（TIMESTAMP）
- `createdAt`: ジョブ作成時刻（TIMESTAMP）
- `updatedAt`: 最終更新時刻（TIMESTAMP）

**Styles/Sources/Scenarios/ChatMessagesテーブル共通のフィールド**:
- `id`: 主キー（TEXT）
- `title`, `type`, `content`: コンテンツ
- `selected`: UI選択状態（BOOLEAN）
- `createdAt`: タイムスタンプ形式（TEXT: `yyyy年mm月dd日HH.mm.md`）
- `created_at`: PostgreSQL Timestamp（デフォルトCURRENT_TIMESTAMP）
- `video_url`: YouTube URL（Styles/Sourcesのみ、オプション）

### OpenRouter統合

`src/lib/openrouter.ts` でAI機能を提供：

- `sendChatMessageStream()`: ストリーミングチャット
- `analyzeVideo()`: YouTube動画分析
- `generateScenario()`: 動画シナリオ生成

環境変数（`.env`）で使用モデルを個別に設定可能：

```
OPENROUTER_MODEL_CHAT=google/gemini-2.5-flash
OPENROUTER_MODEL_VIDEO=google/gemini-2.5-flash
OPENROUTER_MODEL_SCENARIO=google/gemini-2.5-flash
```

### ファイル命名規則

タイムスタンプ形式: `yyyy年mm月dd日HH.mm.md`（例: `2026年01月20日15.123.md`）

### Hydration回避

Next.jsのSSR hydrationエラー回避のため：
- `mounted`フラグでクライアントサイドレンダリングを制御
- `useSupabaseData.ts`内で`mounted`が`true`になるまでUI表示を待機

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

`.env`で設定（Gitコミットしないこと）：

```bash
# Database（Prisma + Supabase Local）
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Supabase（ローカル開発環境）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL_CHAT=google/gemini-2.5-flash
OPENROUTER_MODEL_VIDEO=google/gemini-2.5-flash
OPENROUTER_MODEL_SCENARIO=google/gemini-2.5-flash

# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 依存関係

主要なライブラリ：
- **Next.js 16.1.3**: Reactフレームワーク（App Router）
- **React 19.2.3**: UIライブラリ
- **Tailwind CSS 4**: スタイリング
- **@openrouter/sdk**: AI APIクライアント
- **@supabase/supabase-js**: Supabaseクライアント
- **pdf-parse**: PDF解析
- **Playwright**: E2Eテスト

## 開発の注意点

1. **bunの使用**: TypeScriptプロジェクトなので必ずbunを使用（npm禁止）
2. **Supabase起動**: 開発前に必ず`supabase start`を実行
3. **マイグレーションルール**:
   - 既存マイグレーションの絶対的な書き換え禁止
   - 修正が必要な場合は新規マイグレーションを作成
   - 適用は`supabase db push --local`を使用（ローカル開発の場合）
   - 型定義の再生成: `supabase gen types typescript --local > frontend/src/lib/supabase/types.ts`
4. **Hydrationエラー**: クライアントサイドのみのコードは`mounted`チェックで保護
5. **データフロー**: Supabase → API Route → フロントエンド（`useSupabaseData`）
6. **非同期AI処理**: AI処理はすべてジョブキューシステム経由で非同期実行
   - クライアントは`/api/jobs`でジョブ作成
   - ポーリングで`/api/jobs/[jobId]`を定期的に確認
   - UIは即座に更新され、バックグラウンドで処理完了を待機
7. **ストリーミング**: チャットはリアルタイムでストリーミングされるため、状態更新に注意

## 追加のドキュメント

- `README.md`: プロジェクト概要と機能説明
- `DESIGN.md`: NotebookLM UIの詳細な設計思想
- `docs/openrouter-tool-calling.md`: OpenRouterのツール呼び出し機能
- `docs/openrouter-video-inputs.md`: OpenRouterの動画入力機能
- `docs/github-actions-setup.md`: GitHub Actionsの設定手順
