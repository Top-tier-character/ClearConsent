export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/preview-pdf
 * Accepts multipart/form-data with a field named "file" (a PDF).
 * Returns a base64-encoded version of the PDF so the frontend can display
 * it in an <iframe> without ever showing raw extracted text to the user.
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

    // Use pdf-parse only to get page count — no text needed here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const data = await pdfParse(buffer);

    const base64 = buffer.toString('base64');

    return NextResponse.json({
      base64_pdf: base64,
      mime_type: 'application/pdf',
      file_name: file.name,
      file_size_kb: Math.round(buffer.byteLength / 1024),
      page_count: data.numpages,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'PDF preview failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
