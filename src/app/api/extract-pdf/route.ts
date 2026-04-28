export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/extract-pdf
 * Accepts multipart/form-data with a field named "file" (a PDF or TXT).
 * Returns { text: string } with the extracted plain text.
 * Uses dynamic import of pdf-parse to avoid Next.js module-level side effects.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded', details: 'Send a PDF or TXT file as "file" in form-data.' },
        { status: 400 },
      );
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isTxt = file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain';

    if (!isPdf && !isTxt) {
      return NextResponse.json(
        { error: 'Unsupported file type', details: 'Only PDF and TXT files are supported.' },
        { status: 400 },
      );
    }

    // ── TXT: read directly ────────────────────────────────────────────────
    if (isTxt) {
      const text = await file.text();
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'The text file appears to be empty.' },
          { status: 400 },
        );
      }
      return NextResponse.json({
        text,
        page_count: 1,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
      });
    }

    // ── PDF: use pdf-parse ────────────────────────────────────────────────
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

    return NextResponse.json({
      text: data.text,
      page_count: data.numpages,
      file_name: file.name,
      file_size_kb: Math.round(buffer.byteLength / 1024),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'File extraction failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
