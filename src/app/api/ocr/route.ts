import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Mock OCR text extraction
    const mockExtractedText = `This is mock text extracted from the scanned image.
1. The interest rate is 12% per annum.
2. The loan must be repaid in 36 months.
3. Penalty for late payment is $50.`;

    return NextResponse.json({ text: mockExtractedText }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error during OCR' }, { status: 500 });
  }
}
