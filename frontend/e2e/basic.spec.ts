import { test, expect } from '@playwright/test';

test.describe('NotebookLM Clone Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正常にロードされること', async ({ page }) => {
    await expect(page).toHaveTitle(/NotebookLM Clone/);
    await expect(page.locator('h1')).toContainText('Untitled notebook');
  });

  test('ヘッダーに必要な要素が表示されること', async ({ page }) => {
    await expect(page.locator('text=+ ノートブックを作成')).toBeVisible();
    await expect(page.locator('text=PRO')).toBeVisible();
  });

  test('左サイドバーにソース追加ボタンが表示されること', async ({ page }) => {
    await expect(page.locator('text=+ ソースを追加')).toBeVisible();
    await expect(page.locator('text=ファイルを追加')).toBeVisible();
  });

  test('スタイルタブとソースタブが切り替え可能であること', async ({ page }) => {
    // スタイルタブをクリック
    await page.click('text=スタイル');
    await expect(page.locator('text=YouTuber動画のコツや雰囲気をここにメモ')).toBeVisible();

    // ソースタブをクリック
    await page.click('text=ソース');
    await expect(page.locator('text=保存したソースがここに表示されます')).toBeVisible();
  });

  test('中央エリアに初期メッセージが表示されること', async ({ page }) => {
    await expect(page.locator('text=ソースを追加して始める')).toBeVisible();
    await expect(page.locator('text=ソースをアップロード')).toBeVisible();
  });

  test('右サイドバーにシナリオ作成ボタンが表示されること', async ({ page }) => {
    await expect(page.locator('text=動画シナリオ作成')).toBeVisible();
    await expect(page.locator('text=シナリオを生成 ✅')).toBeVisible();
  });

  test('右下にメモ追加ボタンが表示されること', async ({ page }) => {
    const floatingButton = page.locator('button.fixed.bottom-6.right-6');
    await expect(floatingButton).toBeVisible();
  });

  test('ソースを追加ボタンをクリックするとダイアログが表示されること', async ({ page }) => {
    // ソースを追加ボタンをクリック
    await page.click('text=+ ソースを追加');

    // ダイアログが表示されることを確認
    await expect(page.locator('text=YouTube動画URLを入力')).toBeVisible();
  });

  test('ファイルを追加ボタンをクリックするとファイルアップロードゾーンが表示されること', async ({ page }) => {
    // ファイルを追加ボタンをクリック
    await page.click('text=ファイルを追加');

    // ファイルアップロードゾーンが表示されることを確認
    await expect(page.locator('text=ファイルをドロップ')).toBeVisible();
  });

  test('チャット入力欄がソースなしで無効になっていること', async ({ page }) => {
    const input = page.locator('input[placeholder*="開始するにはソースをアップロードしてください"]');
    await expect(input).toBeDisabled();
  });

  test('免責事項が表示されていること', async ({ page }) => {
    await expect(page.locator('text=NotebookLM は不正確な場合があります')).toBeVisible();
  });
});

test.describe('NotebookLM Clone Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('動画URLダイアログを開いて閉じることができること', async ({ page }) => {
    // ダイアログを開く
    await page.click('text=+ ソースを追加');
    await expect(page.locator('text=YouTube動画URLを入力')).toBeVisible();

    // キャンセルボタンまたはESCキーで閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('text=YouTube動画URLを入力')).not.toBeVisible();
  });

  test('ファイルアップロードゾーンを開いて閉じることができること', async ({ page }) => {
    // ファイルアップロードを開く
    await page.click('text=ファイルを追加');
    await expect(page.locator('text=ファイルをドロップ')).toBeVisible();

    // ESCキーで閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('text=ファイルをドロップ')).not.toBeVisible();
  });

  test('スタイルタブで空状態のメッセージが表示されること', async ({ page }) => {
    await page.click('text=スタイル');
    await expect(page.locator('text=YouTuber動画のコツや雰囲気をここにメモ')).toBeVisible();
    await expect(page.locator('text=動画の構成、話し方、編集テクニックなどを記録')).toBeVisible();
  });

  test('シナリオ生成ボタンが初期状態で無効になっていること', async ({ page }) => {
    // ソースがない状態でボタンは無効
    const button = page.locator('button:has-text("シナリオを生成 ✅")');
    await expect(button).toBeDisabled();
  });
});
