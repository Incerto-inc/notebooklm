# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

NotebookLM クローン - YouTuber向け動画制作支援ツール。GoogleのNotebookLMのUIをベースに、スタイル収集、ソース管理、AIディスカッション、動画シナリオ作成を一元的に行うアプリケーションです。

## 開発環境

このプロジェクトはTypeScriptで記述されています。**必ず bun を使用してください**。

```bash
# インストールとセットアップ
bun install              # 依存関係のインストール（ルートディレクトリで実行）
supabase start           # Supabase ローカル環境の起動（初回のみ）

# 開発
bun run dev              # 開発サーバーの起動 (http://localhost:3000)
bun run build            # プロダクションビルド
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

## プロジェクト構造

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/           # APIルート (Next.js App Router)
│   │   │   ├── analyze-video/   # YouTube動画のAI分析
│   │   │   ├── analyze-file/    # ファイルのAI分析
│   │   │   ├── chat/            # AIチャット（ストリーミング対応）
│   │   │   ├── chat-messages/   # チャット履歴のCRUD
│   │   │   ├── sources/         # ソースのCRUD
│   │   │   ├── styles/          # スタイルのCRUD
│   │   │   ├── scenarios/       # シナリオのCRUD
│   │   │   ├── upload-file/     # ファイルアップロード
│   │   │   └── generate-scenario/ # シナリオ生成
│   │   ├── layout.tsx    # ルートレイアウト
│   │   └── page.tsx      # メインページ（NotebookLM UI）
│   ├── components/       # Reactコンポーネント
│   │   ├── FileUploadZone.tsx    # ファイルアップロードUI
│   │   └── VideoUploadDialog.tsx # 動画URL入力ダイアログ
│   ├── hooks/           # カスタムフック
│   │   ├── useLocalStorage.ts     # localStorage管理
│   │   └── useSupabaseData.ts     # Supabaseデータ管理
│   └── lib/
│       ├── openrouter.ts         # OpenRouter APIクライアント
│       ├── prisma.ts             # Prismaクライアント（シングルトン）
│       ├── supabase/
│       │   ├── client.ts         # Supabaseクライアント
│       │   └── types.ts          # Supabase型定義（自動生成）
│       └── types.ts              # アプリケーション型定義
e2e/                    # Playwright E2Eテスト
prisma/
└── schema.prisma       # データベーススキーマ定義
supabase/               # Supabase設定（ローカル開発環境）
└── migrations/         # データベースマイグレーション
playwright.config.ts    # Playwright設定（ルート）
.env                    # 環境変数（Git管理外）
```

## アーキテクチャ

### データフロー

1. **インプット**: ユーザーは「スタイル」（YouTuberのノウハウ）と「ソース」（参考動画/資料）を追加
2. **AI処理**: OpenRouter API経由でAI分析を実行
   - YouTube動画URL → AIがスタイル/内容を分析
   - ファイルアップロード → AIがテキスト/PDFを解析
3. **対話**: チャットでAIと対話（ストリーミング対応）
4. **アウトプット**: 収集した情報を元に動画シナリオを生成

### データ管理アーキテクチャ

**Supabase + Prisma**によるデータ永続化：

- **データベース**: Supabase Local（PostgreSQL on port 54321）
- **ORM**: Prisma（`prisma/schema.prisma`でスキーマ定義）
- **フロントエンド統合**: `useSupabaseData.ts`フックでデータ管理
  - 初期マウント時にSupabaseから全データをフェッチ
  - CRUD操作はNext.js APIルート経由でPrismaにアクセス
  - 楽観的更新：即座にローカル状態を更新し、バックグラウンドでAPI呼び出し

**APIルートパターン**（`/api/sources`等で共通）:
- `GET`: 全データ取得（`findMany`）
- `POST`: 作成（`create`）
- `PUT`: 更新（`update`）
- `DELETE`: 削除（`delete`）

### Prismaスキーマ設計

4つの主要モデル（`prisma/schema.prisma`）:
- **Style**: YouTuberのノウハウ（編集テクニック、話し方等）
- **Source**: 参考動画/資料（要約、ポイント）
- **Scenario**: 動画シナリオ
- **ChatMessage**: チャット履歴

全モデル共通のフィールド:
- `id`: 主キー（文字列）
- `title`, `type`, `content`: コンテンツ
- `selected`: UI選択状態
- `createdAt`: タイムスタンプ形式（`yyyy年mm月dd日ss.mmm.md`）
- `videoUrl`: YouTube URL（Style/Sourceのみ、オプション）

**重要**: `createdAt`と`createdAtDateTime`の2つの日付フィールドが存在：
- `createdAt`: ファイル名形式の文字列（UI表示用）
- `createdAtDateTime`: PostgreSQL DateTime（ソート用）

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
- **Prisma**: ORM（データベースアクセス）
- **pdf-parse**: PDF解析
- **Playwright**: E2Eテスト

## 開発の注意点

1. **bunの使用**: TypeScriptプロジェクトなので必ずbunを使用（npm禁止）
2. **Supabase起動**: 開発前に必ず`supabase start`を実行
3. **マイグレーションルール**:
   - 既存マイグレーションの絶対的な書き換え禁止
   - 修正が必要な場合は新規マイグレーションを作成
   - 適用は`supabase db push --local`を使用（`db reset`はデータ消えるため禁止）
4. **Prisma Client**: `lib/prisma.ts`でシングルトンパターン実装（ホットリロード対応）
5. **Hydrationエラー**: クライアントサイドのみのコードは`mounted`チェックで保護
6. **データフロー**: Supabase → API Route → Prisma → フロントエンド（`useSupabaseData`）
7. **ローディング状態**: AI処理中は`loading: true`を設定してスピナーを表示
8. **ストリーミング**: チャットはリアルタイムでストリーミングされるため、状態更新に注意

## 追加のドキュメント

- `README.md`: プロジェクト概要と機能説明
- `DESIGN.md`: NotebookLM UIの詳細な設計思想
- `docs/openrouter-tool-calling.md`: OpenRouterのツール呼び出し機能
- `docs/openrouter-video-inputs.md`: OpenRouterの動画入力機能
