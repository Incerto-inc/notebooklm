# GitHub Actions Setup Guide

このプロジェクトではGitHub Actionsを使用して、PRがmainブランチにマージされた時に本番データベースのスキーマを自動更新します。

## ワークフロー

- **`.github/workflows/prisma-migrate-production.yml`**: mainブランチへのマージ時にPrismaマイグレーションを本番DBに適用

## 必要なGitHub Secrets

このワークフローを動作させるために、以下のSecretをGitHubリポジトリに設定する必要があります：

### 1. DATABASE_URL（必須）

**説明**: 本番データベースの接続文字列

**取得方法（Supabase）**:
1. Supabaseダッシュボードにアクセス
2. プロジェクトを選択
3. Settings → Database に移動
4. "Connection string" を探す
5. "URI"タブを選択
6. 接続文字列をコピー（`postgres://...` の形式）

**設定手順**:
1. GitHubリポジトリに移動
2. Settings → Secrets and variables → Actions
3. "New repository secret" をクリック
4. Name: `DATABASE_URL`
5. Value: 取得した接続文字列
6. Add secret をクリック

**重要**:
- 接続文字列には直接パスワードが含まれているため、絶対に公開しないでください
- Supabaseプロジェクトのパスワードは、Settings → Database で確認/変更できます

## ワークフローの動作

### トリガー条件
- `main`ブランチへのpush時
- PRがマージされた時
- 手動実行（workflow_dispatch）

### 実行内容
1. コードのチェックアウト
2. Bunのセットアップ
3. 依存関係のインストール
4. Prisma Clientの生成（本番DB用）
5. マイグレーションの適用（`prisma migrate deploy`）

### `prisma migrate deploy` について
このコマンドは：
- まだ適用されていないマイグレーションのみを実行
- マイグレーション履歴（`_prisma_migrations`テーブル）を確認
- 本番環境でのスキーマ変更を安全に適用

## 最初のセットアップ時

### 1. 本番DBの初期設定

新しいSupabaseプロジェクトを作成した場合、最初のマイグレーションを適用する必要があります：

```bash
# ローカルで開発用DBにマイグレーションを適用
supabase db push --local

# 本番DBにマイグレーションを適用（DATABASE_URLを設定済みの場合）
DATABASE_URL="your-production-db-url" bunx prisma migrate deploy
```

または、GitHub Actionsを手動実行して本番DBにマイグレーションを適用することもできます。

### 2. 既存の本番DBがある場合

既に本番DBが稼働しており、スキーマの差分がある場合は：

**オプションA**: マイグレーションを作成して適用
```bash
# ローカルで差分を確認
bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script

# マイグレーションを作成
bunx prisma migrate dev --name init_production

# GitHub Actionsでデプロイ（または手動で適用）
DATABASE_URL="your-production-db-url" bunx prisma migrate deploy
```

**オプションB**: Prisma DB Push（注意：マイグレーション履歴を作成しない）
```bash
DATABASE_URL="your-production-db-url" bunx prisma db push
```

## トラブルシューティング

### マイグレーションが失敗した場合

1. **GitHub Actionsのログを確認**
   - Actionsタブ → 最新のワークフロー実行 → 失敗したステップのログを確認

2. **一般的なエラー原因**:
   - `DATABASE_URL`が正しく設定されていない
   - 接続文字列のフォーマットが間違っている
   - データベースの接続制限に達している
   - マイグレーションと既存のスキーマに競合がある

3. **解決方法**:
   ```
   # ローカルで本番DBに接続して状態を確認
   DATABASE_URL="your-production-db-url" bunx prisma migrate status

   # 強制的にスキーマを同期（注意：データ損失のリスクあり）
   DATABASE_URL="your-production-db-url" bunx prisma db push --accept-data-loss
   ```

### マイグレーション履歴が同期していない場合

本番DBの状態と`_prisma_migrations`テーブルが一致していない場合：

```bash
# マイグレーション履歴をリセット（慎重に実行）
# まず本番DBで _prisma_migrations テーブルの内容を確認してから、
# 必要に応じてレコードを追加/削除
```

## ベストプラクティス

1. **ローカルでテスト**: マイグレーションをPRする前に、ローカルで必ずテストする
2. **段階的な変更**: 大きなスキーマ変更は、複数の小さなマイグレーションに分割する
3. **データのバックアップ**: 本番DBの変更前にバックアップを作成する
4. **レビュー**: マイグレーションファイルのPRは慎重にレビューする

## 関連リンク

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Supabase Database](https://supabase.com/docs/guides/database)
