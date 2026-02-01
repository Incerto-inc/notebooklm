/**
 * AIプロンプト集約ファイル
 *
 * すべてのAIプロンプトを一元管理し、保守性と一覧性を向上させる。
 */

/**
 * チャット用プロンプト
 */
export const chatPrompts = {
  /**
   * システムプロンプト
   * @param contextSources - コンテキストとなるソース情報の配列
   */
  system: (contextSources: string[]): string => {
    return `あなたは動画制作支援AIアシスタントです。
以下のソース情報を元に、ユーザーの質問に答えてください。

ソース情報:
${contextSources.join('\n\n---\n\n')}`;
  },
} as const;

/**
 * 動画・ファイル分析用プロンプト
 */
export const analyzePrompts = {
  /**
   * スタイル分析プロンプト
   * YouTuberの動画のスタイル（編集テクニック、話し方、雰囲気、構成）を分析
   */
  style: `このYouTuber動画のスタイルを分析してください。編集テクニック、話し方、雰囲気、構成を日本語でMarkdown形式で抽出してください。`,

  /**
   * ソース分析プロンプト
   * 動画の内容を要約
   */
  source: `この動画の内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。`,
} as const;

/**
 * シナリオ生成用プロンプト
 */
export const scenarioPrompts = {
  /**
   * 1回目：シナリオ草案生成プロンプト
   * @param styles - スタイル情報の配列
   * @param sources - ソース情報の配列
   * @param chatHistory - ディスカッション履歴
   */
  generateDraft: (styles: string[], sources: string[], chatHistory: string): string => {
    return `以下の情報を元に、YouTube動画のシナリオの**草案**を作成してください。

スタイル情報:
${styles.join('\n\n')}

ソース情報:
${sources.join('\n\n')}

ディスカッション履歴:
${chatHistory}

まず基本的な構成でシナリオ草案を作成してください。後で改善のプロセスを経ますので、現時点で思いつくベースラインとしてのシナリオを作成してください。

構成:
1. 導入（フック）
2. 本論
3. まとめ

日本語でMarkdown形式で出力してください。`;
  },

  /**
   * 2回目：シナリオ改善プロンプト
   * @param styles - スタイル情報の配列
   * @param sources - ソース情報の配列
   * @param chatHistory - ディスカッション履歴
   * @param draftScenario - 1回目の回答（草案）
   */
  refineScenario: (
    styles: string[],
    sources: string[],
    chatHistory: string,
    draftScenario: string
  ): string => {
    return `以下は、YouTube動画シナリオの**草案**です。

---
**【草案】**
${draftScenario}
---

この草案を元に、より洗練された最終シナリオを作成してください。

**改善のポイント:**
1. 草案の弱点や不足している点を批判的に分析してください
2. 視聴者の没入感を高めるためのフック（導入）の工夫を検討してください
3. ストーリーテリングの観点から、情報の順序や構成を再評価してください
4. 具体的な表現や例を追加して、より魅力的な内容にしてください

**元の情報:**
スタイル情報:
${styles.join('\n\n')}

ソース情報:
${sources.join('\n\n')}

ディスカッション履歴:
${chatHistory}

構成:
1. 導入（フック）- 視聴者の注意を強く引く工夫を入れる
2. 本論 - 具体的な例やエピソードを交える
3. まとめ - 行動を促す強い締めくくり

日本語でMarkdown形式で出力してください。`;
  },

  /**
   * @deprecated 後方互換性のために残す（内部ではgenerateDraft/refineScenarioを使用）
   */
  generate: (styles: string[], sources: string[], chatHistory: string): string => {
    return scenarioPrompts.generateDraft(styles, sources, chatHistory);
  },
} as const;
