# GitHub ActionsでSupabaseに自動マイグレーションする方法

このドキュメントでは、GitHub Actionsを使用してSupabaseのデータベースマイグレーションを自動化する方法について説明します。

## 概要

Supabase CLIの`supabase db push`コマンドを使用することで、GitHub Actionsワークフローから本番環境のデータベースにマイグレーションを自動適用できます。

## 必要な設定

### 1. 環境変数の設定

GitHubリポジトリのSecretsに以下の環境変数を設定します：

| 環境変数 | 説明 |
|---------|------|
| `SUPABASE_ACCESS_TOKEN` | Supabaseのパーソナルアクセストークン |
| `SUPABASE_DB_PASSWORD` | プロジェクト固有のデータベースパスワード |
| `SUPABASE_PROJECT_ID` | プロジェクト固有のリファレンス文字列 |

### 2. アクセストークンの取得

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. アカウント設定 → アクセストークン
3. 新しいトークンを生成（`db push`権限が必要）

## GitHub Actionsワークフローの作成

### 基本的なマイグレーション自動デプロイ

`.github/workflows/supabase-migrate.yml`を作成：

```yaml
name: Supabase Migrate

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  migrate:
    runs-on: ubuntu-latest

    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link to Supabase project
        run: supabase link --project-ref $PROJECT_ID

      - name: Push migrations to remote database
        run: supabase db push
```

### DATABASE_URLを使用した方法（別のアプローチ）

`--db-url`フラグを使用して、直接データベースURLを指定する方法：

```yaml
name: Supabase Migrate

on:
  push:
    branches:
      - main

jobs:
  migrate:
    runs-on: ubuntu-latest

    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Push migrations
        run: supabase db push --db-url "$DATABASE_URL"
```

### オプションを含めた高度な設定

```yaml
name: Supabase Migrate Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  migrate:
    runs-on: ubuntu-latest

    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link to Supabase project
        run: supabase link --project-ref $PROJECT_ID

      - name: Dry run to preview changes
        run: supabase db push --dry-run

      - name: Push migrations with roles and seed data
        run: supabase db push --include-roles --include-seed
```

## `supabase db push` コマンドの詳細

### 基本的な使用方法

```bash
supabase db push
```

### 主なオプション

| オプション | 説明 |
|----------|------|
| `--dry-run` | 適用前に変更内容をプレビュー |
| `--db-url` | データベース接続URLを直接指定 |
| `--include-roles` | ロールも含めて適用 |
| `--include-seed` | シードデータも含めて適用 |

### 機能

- 最初の実行時に`supabase_migrations.schema_migrations`テーブルが作成されます
- 既に適用されたマイグレーションはスキップされます
- 各マイグレーション適用後にタイムスタンプ付きのレコードが挿入されます

## Prismaプロジェクトでの使用例

Prismaを使用しているプロジェクトでのGitHub Actions設定例：

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install
        working-directory: ./frontend

      - name: Generate Prisma Client
        run: cd .. && npx prisma generate
        working-directory: ./frontend

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Push migrations
        run: supabase db push --db-url "$DATABASE_URL"
```

## 注意点

### マイグレーションファイルの管理

- **既存のマイグレーションファイルは絶対に編集しないでください**
- 修正が必要な場合は、新しいマイグレーションファイルを作成してください
- マイグレーション履歴の整合性を保つため、このルールは厳守してください

### トラブルシューティング

#### `supabase link` が失敗する場合

```yaml
- name: Link to Supabase project
  run: |
    supabase link --project-ref $PROJECT_ID --password "$SUPABASE_DB_PASSWORD"
```

#### 接続プールの問題

直接接続を使用する場合は `--skip-pooler` フラグを追加：

```bash
supabase link --project-ref $PROJECT_ID --skip-pooler
```

## ベストプラクティス

1. **`--dry-run`を活用**: 本番適用前に必ず変更内容を確認
2. **プルリクエストでのテスト**: 本番に適用前にステージング環境でテスト
3. **ロールバック計画**: 各マイグレーションに対応するロールバックファイルを用意
4. **シークレット管理**: データベース接続情報はGitHub Secretsで厳密に管理

## 参考リンク

- [Supabase CLIドキュメント](https://supabase.com/docs/reference/cli)
- [GitHub Actionsでデータベースのバックアップ](https://supabase.com/docs/guides/deployment/ci/backups)
- [環境の管理](https://supabase.com/docs/guides/cli/managing-environments)
