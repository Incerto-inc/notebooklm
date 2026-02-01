import { NextRequest, NextResponse } from 'next/server';

// @ts-expect-error - pdf-parse doesn't have proper types
import * as pdfParseModule from 'pdf-parse';

// Get the default export properly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let content = '';

    if (file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      const data = await pdfParse(Buffer.from(buffer));
      content = data.text;
    } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      content = await file.text();
    } else if (file.type === 'text/plain') {
      content = await file.text();
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, content, filename: file.name });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
