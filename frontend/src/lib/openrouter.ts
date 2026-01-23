import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

// 環境変数からモデルを取得（デフォルト値を設定）
const CHAT_MODEL = process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash';
const VIDEO_MODEL = process.env.OPENROUTER_MODEL_VIDEO || 'google/gemini-2.5-flash';
const SCENARIO_MODEL = process.env.OPENROUTER_MODEL_SCENARIO || 'google/gemini-2.5-flash';

// ストリーミングチャット関数
export async function sendChatMessageStream(
  messages: Array<{role: string; content: string}>,
  contextSources: string[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const systemPrompt = `あなたは動画制作支援AIアシスタントです。
以下のソース情報を元に、ユーザーの質問に答えてください。

ソース情報:
${contextSources.join('\n\n---\n\n')}`;

  const stream = await openRouter.chat.send({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      onChunk(content);
    }
  }
}

export async function analyzeVideo(
  videoUrl: string,
  mode: 'style' | 'source'
): Promise<string> {
  const prompt = mode === 'style'
    ? `このYouTuber動画のスタイルを分析してください。編集テクニック、話し方、雰囲気、構成を日本語でMarkdown形式で抽出してください。`
    : `この動画の内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。`;

  const result = await openRouter.chat.send({
    model: VIDEO_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'video_url', videoUrl: { url: videoUrl } },
        ],
      },
    ],
    stream: false,
  });

  return (result.choices[0]?.message?.content as string) || '';
}

export async function sendChatMessage(
  messages: Array<{role: string; content: string}>,
  contextSources: string[]
): Promise<string> {
  const systemPrompt = `あなたは動画制作支援AIアシスタントです。
以下のソース情報を元に、ユーザーの質問に答えてください。

ソース情報:
${contextSources.join('\n\n---\n\n')}`;

  const result = await openRouter.chat.send({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    stream: false,
  });

  return (result.choices[0]?.message?.content as string) || '';
}

export async function generateScenario(
  styles: string[],
  sources: string[],
  chatHistory: string
): Promise<string> {
  const prompt = `以下の情報を元に、YouTube動画のシナリオを作成してください。

スタイル情報:
${styles.join('\n\n')}

ソース情報:
${sources.join('\n\n')}

ディスカッション履歴:
${chatHistory}

これらを統合して、以下の構成でシナリオを作成してください：
1. 導入（フック）
2. 本論
3. まとめ

日本語でMarkdown形式で出力してください。`;

  const result = await openRouter.chat.send({
    model: SCENARIO_MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
  });

  return (result.choices[0]?.message?.content as string) || '';
}
