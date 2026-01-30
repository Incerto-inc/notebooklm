import { prisma } from './prisma';
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

const CHAT_MODEL = process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash';
const VIDEO_MODEL = process.env.OPENROUTER_MODEL_VIDEO || 'google/gemini-2.5-flash';
const SCENARIO_MODEL = process.env.OPENROUTER_MODEL_SCENARIO || 'google/gemini-2.5-flash';

const JOB_TIMEOUT = 5 * 60 * 1000; // 5分

export async function processJobAsync(jobId: string) {
  // タイムアウト設定
  const timeoutId = setTimeout(async () => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (job && job.status === 'PROCESSING') {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: 'Job timeout',
          completedAt: new Date(),
        },
      });
    }
  }, JOB_TIMEOUT);

  try {
    // ステータスをPROCESSINGに更新
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    // AI処理実行
    const result = await executeAIProcessing(jobId);

    // 完了
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        result,
        completedAt: new Date(),
      },
    });
  } catch (error: any) {
    // エラーハンドリング（リトライ or 失敗）
    await handleJobError(jobId, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeAIProcessing(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');

  switch (job.type) {
    case 'ANALYZE_VIDEO':
      return await processAnalyzeVideo(job.input);
    case 'ANALYZE_FILE':
      return await processAnalyzeFile(job.input);
    case 'GENERATE_SCENARIO':
      return await processGenerateScenario(job.input);
    default:
      throw new Error('Unknown job type');
  }
}

async function processAnalyzeVideo(input: any) {
  const { url, mode } = input;
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
          { type: 'video_url', videoUrl: { url } },
        ],
      },
    ],
    stream: false,
  });

  const content = (result.choices[0]?.message?.content as string) || '';
  return { content };
}

async function processAnalyzeFile(input: any) {
  // PDFファイルの場合（base64エンコード）
  if (input.fileData && input.fileType === 'application/pdf') {
    const prompt = input.mode === 'style'
      ? `このPDFドキュメントのスタイルを分析してください。構成、トーン、フォーマット、重要なポイントを日本語でMarkdown形式で抽出してください。`
      : `このPDFドキュメントの内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。`;

    const result = await openRouter.chat.send({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: 'file' as any,
              file: {
                filename: input.filename,
                fileData: input.fileData,
              },
            },
          ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      ],
      stream: false,
      plugins: [
        {
          id: 'file-parser',
          pdf: {
            engine: 'pdf-text',
          },
        },
      ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const content = (result.choices[0]?.message?.content as string) || '';
    return { content };
  }

  // テキストファイルの場合
  if (input.content) {
    const prompt = input.mode === 'style'
      ? `以下のドキュメントのスタイルを分析してください。構成、トーン、フォーマット、重要なポイントを日本語でMarkdown形式で抽出してください。\n\n${input.content}`
      : `以下のドキュメントの内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。\n\n${input.content}`;

    const result = await openRouter.chat.send({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
    });

    const content = (result.choices[0]?.message?.content as string) || '';
    return { content };
  }

  throw new Error('Invalid file input');
}

async function processGenerateScenario(input: any) {
  const { styles, sources, chatHistory } = input;

  const styleContents = styles
    .filter((s: any) => s.selected)
    .map((s: any) => `# ${s.name}\n${s.content}`);

  const sourceContents = sources
    .filter((s: any) => s.selected)
    .map((s: any) => `# ${s.name}\n${s.content}`);

  const chatText = chatHistory
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n\n');

  const prompt = `以下の情報を元に、YouTube動画のシナリオを作成してください。

スタイル情報:
${styleContents.join('\n\n')}

ソース情報:
${sourceContents.join('\n\n')}

ディスカッション履歴:
${chatText}

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

  const scenario = (result.choices[0]?.message?.content as string) || '';
  return { scenario };
}

async function handleJobError(jobId: string, error: any) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  // リトライ可能か判定
  if (isRetryableError(error) && job.retryCount < job.maxRetries) {
    const delay = Math.min(1000 * Math.pow(2, job.retryCount), 30000);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        error: error.message,
      },
    });

    setTimeout(() => processJobAsync(jobId), delay);
  } else {
    // 永続的エラーまたはリトライ回数超過
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: error.message,
        completedAt: new Date(),
      },
    });
  }
}

function isRetryableError(error: any): boolean {
  if (error.code === 'NETWORK_TIMEOUT') return true;
  if (error.status >= 500 && error.status < 600) return true;
  if (error.message?.includes('ECONNRESET')) return true;
  if (error.message?.includes('ETIMEDOUT')) return true;
  return false;
}
