'use client';

import { useState, useRef } from 'react';
import { X, RotateCcw, Share2, Check, ZoomIn } from 'lucide-react';

interface CameraScannerProps {
  onTextExtracted: (text: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onTextExtracted, onClose }: CameraScannerProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setError(null);
    setExtractedText(null);
  };

  const handleProcess = async () => {
    if (!capturedFile) return;
    setIsProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', capturedFile);
      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OCR failed');
      if (!data.text?.trim()) throw new Error('No text found. Try better lighting or a clearer photo.');
      setExtractedText(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!capturedImage) return;
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'scanned-document.jpg', { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Scanned Document',
          text: 'Document scanned with ClearConsent',
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = 'scanned-document.jpg';
        link.click();
      }
    } catch {}
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setExtractedText(null);
    setError(null);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleUseText = () => {
    if (extractedText) {
      onTextExtracted(extractedText);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px', background: '#000', color: 'white'
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '16px' }}>Scan Document</span>
        {capturedImage && (
          <button onClick={handleShare} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <Share2 size={24} />
          </button>
        )}
        {!capturedImage && <div style={{ width: 24 }} />}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!capturedImage ? (
          /* Capture screen */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '32px'
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCapture}
            />
            {/* Document frame guide */}
            <div style={{
              width: '280px', height: '360px', border: '3px solid #10B981',
              borderRadius: '12px', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {/* Corner marks */}
              {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(corner => (
                <div key={corner} style={{
                  position: 'absolute',
                  width: '24px', height: '24px',
                  borderColor: '#10B981',
                  borderStyle: 'solid',
                  top: corner.includes('top') ? -3 : 'auto',
                  bottom: corner.includes('bottom') ? -3 : 'auto',
                  left: corner.includes('Left') ? -3 : 'auto',
                  right: corner.includes('Right') ? -3 : 'auto',
                  borderWidth: corner.includes('top') && corner.includes('Left') ? '3px 0 0 3px' :
                               corner.includes('top') && corner.includes('Right') ? '3px 3px 0 0' :
                               corner.includes('bottom') && corner.includes('Left') ? '0 0 3px 3px' :
                               '0 3px 3px 0',
                }} />
              ))}
              <p style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
                Position your document within the frame
              </p>
            </div>
            <p style={{ color: '#6B7280', fontSize: '13px', textAlign: 'center' }}>
              Tip: Use good lighting and keep the document flat for best results
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'white', border: '4px solid #6B7280',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white', border: '2px solid #9CA3AF' }} />
            </button>
          </div>
        ) : (
          /* Preview screen */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Image preview */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <img
                src={capturedImage}
                alt="Scanned document"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              {/* Enhancement overlay label */}
              <div style={{
                position: 'absolute', top: '12px', left: '12px',
                background: 'rgba(16, 185, 129, 0.9)', color: 'white',
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700
              }}>
                ✓ Document captured
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#EF4444', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Extracted text preview */}
            {extractedText && (
              <div style={{
                padding: '12px 16px', background: '#F0FDF4', borderTop: '1px solid #10B981'
              }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', marginBottom: '4px' }}>
                  ✓ Text extracted successfully — {extractedText.split(' ').length} words found
                </p>
                <p style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', maxHeight: '40px' }}>
                  {extractedText.slice(0, 150)}...
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{
              padding: '16px', background: '#111', display: 'flex', gap: '12px'
            }}>
              <button onClick={handleRetake} style={{
                flex: 1, padding: '14px', borderRadius: '12px',
                background: 'transparent', border: '2px solid #374151',
                color: 'white', fontSize: '15px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                <RotateCcw size={18} /> Retake
              </button>

              {!extractedText ? (
                <button onClick={handleProcess} disabled={isProcessing} style={{
                  flex: 2, padding: '14px', borderRadius: '12px',
                  background: isProcessing ? '#374151' : '#10B981',
                  border: 'none', color: 'white', fontSize: '15px', fontWeight: 700,
                  cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                  {isProcessing ? (
                    <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Reading document...</>
                  ) : (
                    <><ZoomIn size={18} /> Extract Text</>
                  )}
                </button>
              ) : (
                <button onClick={handleUseText} style={{
                  flex: 2, padding: '14px', borderRadius: '12px',
                  background: '#1B2A4A', border: 'none', color: 'white',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                  <Check size={18} /> Use This Scan → Analyze
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
