export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ocr
 * Accepts multipart/form-data with an image field named "image".
 * Calls Google Cloud Vision DOCUMENT_TEXT_DETECTION and returns extracted text.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided. Send an image as the "image" field in form-data.' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

    // Call Google Cloud Vision API
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
            },
          ],
        }),
      }
    );

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      return NextResponse.json(
        { error: 'Google Vision API error.', details: errText },
        { status: 502 }
      );
    }

    const data = await visionRes.json();
    const extractedText: string = data.responses?.[0]?.fullTextAnnotation?.text ?? '';

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'No text found in image. Please try a clearer photo.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        text: extractedText,
        word_count: extractedText.split(/\s+/).filter(Boolean).length,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'OCR failed.', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
