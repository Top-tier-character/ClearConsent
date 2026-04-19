export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/extract-pdf
 * Accepts multipart/form-data with a field named "file" (a PDF).
 * Returns { text: string } with the extracted plain text.
 * Uses dynamic import of pdf-parse to avoid Next.js module-level side effects.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded', details: 'Send a PDF as "file" in form-data.' },
        { status: 400 },
      );
    }

    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type', details: 'Only PDF files are supported.' },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dynamic import avoids the test-fixture side-effect that crashes pdf-parse
    // when imported at the module level in Next.js App Router.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const data = await pdfParse(buffer);

    if (!data.text || !data.text.trim()) {
      return NextResponse.json(
        { error: 'No readable text found in this PDF. It may be a scanned image — please paste the text manually.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ text: data.text });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'PDF extraction failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
