import { test, expect } from '@playwright/test';

test.describe('NotebookLM Clone Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正常にロードされること', async ({ page }) => {
    await expect(page).toHaveTitle(/動画制作ノート/);
    await expect(page.locator('h1')).toContainText('動画制作ノート');
  });

  test('ヘッダーに必要な要素が表示されること', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('動画制作ノート');
  });

  test('左サイドバーにソース追加ボタンが表示されること', async ({ page }) => {
    // 左サイドバーのボタンを特定するため、より具体的なセレクタを使用
    await expect(page.locator('aside').locator('button:has-text("ソースを追加")').first()).toBeVisible();
    await expect(page.locator('aside').locator('button:has-text("ファイルを追加")')).toBeVisible();
  });

  test('スタイルタブとソースタブが切り替え可能であること', async ({ page }) => {
    // タブコンテナ内のボタンを特定
    const tabContainer = page.locator('aside .flex.bg-warm-100\\/50.rounded-2xl');

    // スタイルタブをクリック
    await tabContainer.locator('button:has-text("スタイル")').click();
    // スタイルタブがアクティブになったことを確認
    await expect(tabContainer.locator('button:has-text("スタイル")')).toHaveClass(/bg-white/);

    // ソースタブをクリック
    await tabContainer.locator('button:has-text("ソース")').click();
    // ソースタブがアクティブになったことを確認
    await expect(tabContainer.locator('button:has-text("ソース")')).toHaveClass(/bg-white/);
  });

  test('中央エリアに初期メッセージが表示されること', async ({ page }) => {
    await expect(page.locator('text=AIと対話を始めましょう')).toBeVisible();
    await expect(page.locator('text=スタイルやソースを追加して')).toBeVisible();
  });

  test('右サイドバーにシナリオ作成ボタンが表示されること', async ({ page }) => {
    await expect(page.locator('text=動画シナリオ作成')).toBeVisible();
    await expect(page.locator('button:has-text("シナリオを生成")')).toBeVisible();
  });

  test('ソースを追加ボタンをクリックするとダイアログが表示されること', async ({ page }) => {
    // ソースを追加ボタンをクリック
    await page.click('aside button:has-text("ソースを追加")');

    // ダイアログが表示されることを確認（h2要素を指定）
    await expect(page.locator('h2:has-text("ソースを追加")')).toBeVisible();
    await expect(page.locator('input[placeholder*="YouTube動画のURL"]')).toBeVisible();
  });

  test('ファイルを追加ボタンをクリックするとファイルアップロードゾーンが表示されること', async ({ page }) => {
    // ファイルを追加ボタンをクリック
    await page.click('aside button:has-text("ファイルを追加")');

    // ファイルアップロードゾーンが表示されることを確認
    await expect(page.locator('h2:has-text("ソースファイルを追加")')).toBeVisible();
    await expect(page.locator('text=ファイルをドラッグ&ドロップ')).toBeVisible();
  });

  test('チャット入力欄がソースなしで無効になっていること', async ({ page }) => {
    const input = page.locator('input[placeholder*="開始するにはソースを追加してください"]');
    await expect(input).toBeDisabled();
  });

  test('免責事項が表示されていること', async ({ page }) => {
    await expect(page.locator('text=AIの回答は正確性を保証しない場合があります')).toBeVisible();
  });
});

test.describe('NotebookLM Clone Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('動画URLダイアログを開いて閉じることができること', async ({ page }) => {
    // ダイアログを開く
    await page.click('aside button:has-text("ソースを追加")');
    await expect(page.locator('h2:has-text("ソースを追加")')).toBeVisible();

    // キャンセルボタンで閉じる
    await page.click('button:has-text("キャンセル")');
    await expect(page.locator('h2:has-text("ソースを追加")')).not.toBeVisible();
  });

  test('ファイルアップロードゾーンを開いて閉じることができること', async ({ page }) => {
    // ファイルアップロードを開く
    await page.click('aside button:has-text("ファイルを追加")');
    await expect(page.locator('h2:has-text("ソースファイルを追加")')).toBeVisible();

    // キャンセルボタンで閉じる
    await page.click('button:has-text("キャンセル")');
    await expect(page.locator('h2:has-text("ソースファイルを追加")')).not.toBeVisible();
  });

  test('スタイルタブで空状態のメッセージが表示されること', async ({ page }) => {
    await page.click('text=スタイル');
    await expect(page.locator('text=YouTuber動画のコツや雰囲気を記録')).toBeVisible();
    await expect(page.locator('text=動画の構成、話し方、編集テクニックなど')).toBeVisible();
  });

  test('シナリオ生成ボタンが初期状態で無効になっていること', async ({ page }) => {
    // ソースとスタイルがない状態でボタンは無効
    const button = page.locator('button:has-text("シナリオを生成")');
    await expect(button).toBeDisabled();
  });
});
