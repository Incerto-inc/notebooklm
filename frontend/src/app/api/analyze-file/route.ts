import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

const CHAT_MODEL = process.env.OPENROUTER_MODEL_CHAT || 'google/gemini-2.5-flash';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // PDFファイルの場合（base64エンコード）
    if (body.fileData && body.fileType === 'application/pdf') {
      const prompt = body.mode === 'style'
        ? `このPDFドキュメントのスタイルを分析してください。構成、トーン、フォーマット、重要なポイントを日本語でMarkdown形式で抽出してください。`
        : `このPDFドキュメントの内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。`;

      // OpenRouter SDKの型定義がfileタイプをサポートしていないため、型アサーションを使用
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
                  filename: body.filename,
                  fileData: body.fileData,
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
              engine: 'pdf-text', // or 'mistral-ocr' for scanned documents
            },
          },
        ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const content = (result.choices[0]?.message?.content as string) || '';
      return NextResponse.json({ success: true, content });
    }

    // テキストファイルの場合
    if (body.content) {
      const prompt = body.mode === 'style'
        ? `以下のドキュメントのスタイルを分析してください。構成、トーン、フォーマット、重要なポイントを日本語でMarkdown形式で抽出してください。\n\n${body.content}`
        : `以下のドキュメントの内容を要約してください。主要なトピック、キーポイントを日本語でMarkdown形式で抽出してください。\n\n${body.content}`;

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
      return NextResponse.json({ success: true, content });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('File analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze file' }, { status: 500 });
  }
}
