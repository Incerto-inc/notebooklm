# 環境変数設定ガイド

このドキュメントでは、NotebookLMクローンプロジェクトで使用する環境変数の設定方法について説明します。

## 概要

このプロジェクトでは以下のサービスを使用しており、それぞれの環境変数を設定する必要があります：
- **Supabase**: データベース、認証、ストレージ
- **OpenRouter**: AI API（チャット、動画分析、シナリオ生成）
- **アプリケーション**: Next.jsの動作設定

## 環境変数一覧

### データベース（Supabase）

> **注意**: Supabaseを使用する場合、`DATABASE_URL`は**不要**です。Supabase CLIが自動的に接続を管理します。

**Supabaseネイティブマイグレーションを使用しているため、以下の環境変数のみで動作します**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabaseクライアント設定

| 環境変数 | 説明 | 必須 | 接頭辞 |
|---------|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | ✅ | `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | ✅ | `NEXT_PUBLIC_` |

**ローカル開発環境**:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

**本番環境**:
```bash
# Supabaseダッシュボード → Settings → API から取得
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

> **注意**: `NEXT_PUBLIC_` 接頭辞が付いた環境変数は**クライアントサイド（ブラウザ）**で公開されます。シークレットキーを含めないでください。

### OpenRouter API

| 環境変数 | 説明 | 必須 | デフォルト値 |
|---------|------|------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter APIキー | ✅ | なし |
| `OPENROUTER_MODEL_CHAT` | チャット用モデル | ❌ | `google/gemini-2.5-flash` |
| `OPENROUTER_MODEL_VIDEO` | 動画分析用モデル | ❌ | `google/gemini-2.5-flash` |
| `OPENROUTER_MODEL_SCENARIO` | シナリオ生成用モデル | ❌ | `google/gemini-2.5-flash` |

**設定例**:
```bash
# APIキー（必須）
OPENROUTER_API_KEY=sk-or-...

# モデル設定（オプション）
OPENROUTER_MODEL_CHAT=google/gemini-2.5-flash
OPENROUTER_MODEL_VIDEO=google/gemini-2.5-flash
OPENROUTER_MODEL_SCENARIO=google/gemini-2.5-flash
```

**APIキーの取得方法**:
1. [OpenRouter](https://openrouter.ai/)にサインアップ
2. Settings → API Keys で新しいキーを発行
3. キーを `.env` にコピー

**推奨モデル**:
- **チャット**: `google/gemini-2.5-flash`（高速・低コスト）
- **動画分析**: `google/gemini-2.5-flash`（マルチモーダル対応）
- **シナリオ生成**: `google/gemini-2.5-flash`（長文生成に対応）

### アプリケーション設定

| 環境変数 | 説明 | 必須 | ローカル値 | 本番値 |
|---------|------|------|-----------|--------|
| `NODE_ENV` | Node.js環境 | ❌ | `development` | `production` |
| `NEXT_PUBLIC_APP_URL` | アプリケーションURL | ❌ | `http://localhost:3000` | `https://your-domain.com` |

**ローカル開発環境**:
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**本番環境**:
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### GitHub Actions用追加環境変数

本番デプロイ用GitHub Actionsで必要な環境変数：

| 環境変数 | 説明 | 取得方法 |
|---------|------|---------|
| `SUPABASE_ACCESS_TOKEN` | Supabaseパーソナルアクセストークン | [Supabaseダッシュボード](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_ID` | SupabaseプロジェクトID | プロジェクト設定 → General → Project Reference |

> **注意**: `DATABASE_URL`は**不要**です。`supabase link`でプロジェクトをリンクしているため、Supabase CLIが自動的に接続を管理します。

詳細: `docs/github-actions-supabase-migration.md`

---

## 環境変数の使用方法

### サーバーサイド（Node.js/API Routes）

```typescript
// シークレット環境変数（サーバーサイドのみ）
const apiKey = process.env.OPENROUTER_API_KEY
const dbUrl = process.env.DATABASE_URL
```

### クライアントサイド（ブラウザ）

```typescript
// NEXT_PUBLIC_ 接頭辞付きのみアクセス可能
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL
```

> **重要**: シークレットキー（APIキー、DBパスワード等）は `NEXT_PUBLIC_` を付けず、サーバーサイドでのみ使用してください。

---

## 初期セットアップ手順

### 1. Supabase Localの起動

```bash
# Supabase Localを起動
supabase start

# 起動後、環境変数が表示されます
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### 2. `.env` ファイルの作成

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

### 3. 環境変数の設定

`.env` ファイルを編集して、各環境変数を設定：

```bash
# Database（Supabase Local）
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Supabase（ローカル開発環境）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# OpenRouter API
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL_CHAT=google/gemini-2.5-flash
OPENROUTER_MODEL_VIDEO=google/gemini-2.5-flash
OPENROUTER_MODEL_SCENARIO=google/gemini-2.5-flash

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 依存関係のインストール

```bash
bun install
```

### 5. 開発サーバーの起動

```bash
bun run dev
```

---

## 本番環境へのデプロイ

### Vercelの場合

1. **Vercelダッシュボードでプロジェクトを開く**
2. **Settings → Environment Variables** で以下を設定：

| Key | Value | Environment |
|-----|-------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter APIキー | Production |
| `OPENROUTER_MODEL_CHAT` | `google/gemini-2.5-flash` | Production |
| `OPENROUTER_MODEL_VIDEO` | `google/gemini-2.5-flash` | Production |
| `OPENROUTER_MODEL_SCENARIO` | `google/gemini-2.5-flash` | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase本番URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase本番anonキー | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Production |
| `NODE_ENV` | `production` | Production |

> **注意**: `DATABASE_URL`は不要です（Supabase CLIが自動的に接続を管理します）。

### GitHub Secretsの設定（GitHub Actions用）

GitHubリポジトリの **Settings → Secrets and variables → Actions** で以下を設定：

| Secret名 | 説明 |
|---------|------|
| `SUPABASE_ACCESS_TOKEN` | Supabaseパーソナルアクセストークン |
| `SUPABASE_PROJECT_ID` | SupabaseプロジェクトID |

> **注意**: `DATABASE_URL`は不要です（`supabase link`でプロジェクトをリンクしているため）。

---

## 環境変数のベストプラクティス

### 1. `.env` ファイルはGitコミットしない

`.gitignore` に含まれていますが、念のため確認してください：

```gitignore
# .gitignore
.env
.env.local
.env.production
```

### 2. `.env.example` を最新に保つ

新しい環境変数を追加した場合は、`.env.example` も更新してください。

### 3. デフォルト値をコードに設定

コード内でデフォルト値を設定することで、環境変数がない場合のエラーを防げます：

```typescript
// 良い例
const model = process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash'

// 悪い例（環境変数がない場合にエラー）
const model = process.env.OPENROUTER_MODEL_CHAT
```

### 4. 型安全な環境変数アクセス

環境変数を使用する際は、型チェックを行うことを推奨します：

```typescript
const requiredEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing environment variable: ${key}`)
  return value
}

// 使用例
const apiKey = requiredEnv('OPENROUTER_API_KEY')
```

### 5. 環境ごとの設定を分ける

- **開発環境**: `.env`
- **本番環境**: Vercel/Vercelダッシュボード
- **テスト環境**: `.env.test`（必要に応じて）

---

## トラブルシューティング

### 問題: `process.env.OPENROUTER_API_KEY` が undefined

**解決策**:
1. `.env` ファイルが存在するか確認
2. `.env` ファイルに `OPENROUTER_API_KEY=sk-or-...` が設定されているか確認
3. サーバーを再起動（`bun run dev`）

### 問題: Supabase接続エラー

**解決策**:
1. Supabase Localが起動しているか確認（`supabase status`）
2. `DATABASE_URL` が正しいか確認
3. `.env` ファイルを保存した後、サーバーを再起動

### 問題: 本番環境で環境変数が反映されない

**解決策**:
1. Vercelダッシュボードで環境変数が設定されているか確認
2. デプロイを再実行（Redeploy）
3. `NODE_ENV=production` が設定されているか確認

---

## 参考リンク

- [Supabase CLIドキュメント](https://supabase.com/docs/reference/cli)
- [OpenRouter APIドキュメント](https://openrouter.ai/docs)
- [Next.js環境変数](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel環境変数](https://vercel.com/docs/concepts/projects/environment-variables)
