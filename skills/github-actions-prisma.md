# GitHub ActionsでPrismaマイグレーションを自動化

## 概要

このスキルは、GitHub Actionsを使用してPRがmainブランチにマージされた時にPrismaマイグレーションを本番データベースに自動適用するワークフローを設定します。

## 使用タイミング

以下の場合にこのスキルを使用します：

- 新しいプロジェクトでCI/CDをセットアップする場合
- Prismaを使用したデータベース管理を自動化したい場合
- マージ時の手動マイグレーション作業を削減したい場合

## 前提条件

- Prismaが設定されているプロジェクト
- 本番データベース（Supabase、PostgreSQLなど）
- GitHubリポジトリ

## 手順

### 1. GitHub Actionsワークフローの作成

`.github/workflows/prisma-migrate-production.yml`を作成：

```yaml
name: Prisma Production Migration

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  migrate:
    name: Run Prisma Migrate on Production
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun (or Node.js)
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: |
          bun install
          # プロジェクト構造に応じて調整
          # cd frontend && bun install

      - name: Generate Prisma Client
        run: bunx prisma generate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Run Prisma Migrate Deploy
        run: bunx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify migration
        run: |
          echo "Migration completed successfully!"
          echo "Database schema is now up to date."
```

**重要**: プロジェクト構造に応じて調整してください：
- Prismaスキーマがプロジェクトルートにある場合: 上記の設定を使用
- Prismaスキーマがサブディレクトリにある場合: `--schema`オプションを追加

### 2. GitHub Secretsの設定

1. GitHubリポジトリで **Settings** → **Secrets and variables** → **Actions** に移動
2. **New repository secret** をクリック
3. 以下を追加：
   - **Name**: `DATABASE_URL`
   - **Value**: 本番DBの接続文字列

#### Supabaseの場合の接続文字列取得方法

1. Supabaseダッシュボードにアクセス
2. プロジェクトを選択
3. **Settings** → **Database** に移動
4. **Connection string** → **URI**タブを選択
5. 接続文字列をコピー：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 3. 環境変数テンプレートの作成

`.env.example`ファイルを作成：

```env
# Database（Prisma + Supabase）
# ローカル開発環境
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# 本番環境（GitHub Secretsに設定）
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### 4. ドキュメントの作成

`docs/github-actions-setup.md`を作成して詳細な設定手順を記載：

- GitHub Secretsの設定方法
- 接続文字列の取得方法
- 最初のセットアップ手順
- トラブルシューティング
- ベストプラクティス

### 5. READMEの更新

`README.md`にCI/CDセクションを追加：

```markdown
## CI/CD

### GitHub Actions

このプロジェクトではGitHub Actionsを使用して、mainブランチへのマージ時に自動的にデータベーススキーマを更新します。

**詳細**: [docs/github-actions-setup.md](docs/github-actions-setup.md)
```

## よくある問題と解決策

### エラー: "Could not find Prisma Schema"

**原因**: Prismaスキーマのパスが正しく設定されていない

**解決策**:
1. プロジェクト構造を確認
2. ワークフローで `cd frontend` 等のディレクトリ移動を削除
3. プロジェクトルートでPrismaコマンドを実行
4. 必要に応じて `--schema` オプションを追加

```yaml
# スキーマのパスを明示的に指定
- name: Run Prisma Migrate Deploy
  run: bunx prisma migrate deploy --schema=./prisma/schema.prisma
```

### エラー: "Connection refused"

**原因**: DATABASE_URLが正しく設定されていない、またはDBに接続できない

**解決策**:
1. GitHub SecretsにDATABASE_URLが正しく設定されているか確認
2. 接続文字列のフォーマットを確認
3. データベースのファイアウォール設定を確認
4. Supabaseの場合、接続許可IPを確認

### マイグレーションが適用されない

**原因**: すでに適用済みのマイグレーション

**確認方法**:
```sql
-- 本番DBで確認
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;
```

**解決策**:
- `prisma migrate deploy` は未適用のマイグレーションのみを実行します
- すべてのマイグレーションが適用されている場合は正常動作です

## ベストプラクティス

1. **ローカルでテスト**: マイグレーションをPRする前にローカルでテスト
2. **段階的な変更**: 大きなスキーマ変更は複数の小さなマイグレーションに分割
3. **データのバックアップ**: 本番DBの変更前にバックアップを作成
4. **レビュー**: マイグレーションファイルのPRは慎重にレビュー

## トラブルシューティングコマンド

### ローカルで本番DBの状態を確認

```bash
# マイグレーションステータスを確認
DATABASE_URL="your-production-db-url" bunx prisma migrate status

# スキーマの差分を確認
DATABASE_URL="your-production-db-url" bunx prisma migrate diff \
  --from-schema-datasource $DATABASE_URL \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

### 強制的にスキーマを同期（注意：データ損失のリスクあり）

```bash
DATABASE_URL="your-production-db-url" bunx prisma db push --accept-data-loss
```

## 関連リンク

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## メモ

- **Bunプロジェクトの場合**: `oven-sh/setup-bun@v1` を使用
- **Node.jsプロジェクトの場合**: `actions/setup-node@v3` を使用
- **プロジェクト構造**: Prismaスキーマの場所に応じてワークフローを調整
