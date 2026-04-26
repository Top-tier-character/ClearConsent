'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Loader2, UploadCloud, Camera, X, CheckCircle, AlertTriangle, Volume2, Copy, Check } from 'lucide-react';

export default function AnalyzePage() {
  const { language } = useAppStore();

  // Upload phase state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const extractedTextRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Analysis phase state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'flags' | 'action' | 'numbers'>('overview');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Handle PDF file selection
  const handleFileSelect = async (file: File) => {
    setExtractError(null);
    setAnalysis(null);
    setUploadedFile(file);

    // Show PDF preview immediately using object URL
    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);

    // Extract text silently in background
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      extractedTextRef.current = data.text;
    } catch (err) {
      setExtractError('Could not read this PDF. Try a different file.');
      extractedTextRef.current = '';
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle camera capture
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    setExtractError(null);
    setAnalysis(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OCR failed');
      extractedTextRef.current = data.text;
      setUploadedFile(file);
      setPdfPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setExtractError('Camera scan failed. Please try again in good lighting.');
    } finally {
      setIsExtracting(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Run analysis
  const handleAnalyze = async () => {
    if (!extractedTextRef.current.trim()) {
      setAnalyzeError('Please upload a document first.');
      return;
    }
    setAnalyzeError(null);
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedTextRef.current,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data);
      setActiveTab('overview');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear everything
  const handleClear = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setUploadedFile(null);
    setPdfPreviewUrl(null);
    setAnalysis(null);
    setExtractError(null);
    setAnalyzeError(null);
    extractedTextRef.current = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Copy email to clipboard
  const handleCopyEmail = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Speak text aloud
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    window.speechSynthesis.speak(utter);
  };

  const scoreColor = !analysis ? '' :
    analysis.clearconsent_score >= 70 ? '#10B981' :
    analysis.clearconsent_score >= 40 ? '#F59E0B' : '#EF4444';

  const scoreLabel = !analysis ? '' :
    analysis.clearconsent_score >= 70 ? 'Safe' :
    analysis.clearconsent_score >= 40 ? 'Moderate Risk' : 'High Risk';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>

      {/* Top bar — only shown after analysis */}
      {analysis && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '12px 24px', borderBottom: '1px solid #E5E7EB',
          background: 'var(--background)'
        }}>
          <span style={{
            background: '#1B2A4A', color: 'white',
            padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700
          }}>
            📄 {analysis.document_type}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['overview', 'flags', 'action', 'numbers'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                background: activeTab === tab ? '#1B2A4A' : 'transparent',
                color: activeTab === tab ? 'white' : 'inherit',
                border: activeTab === tab ? 'none' : '1px solid #E5E7EB',
                cursor: 'pointer'
              }}>
                {tab === 'overview' ? 'Overview' :
                 tab === 'flags' ? `Risk Flags (${analysis.risk_flags?.length ?? 0})` :
                 tab === 'action' ? 'Action Plan' : 'Numbers'}
              </button>
            ))}
          </div>
          <button onClick={handleClear} style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: '8px',
            border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px'
          }}>
            + New Document
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — Upload zone or PDF viewer */}
        <div style={{
          width: analysis ? '50%' : '100%',
          borderRight: analysis ? '1px solid #E5E7EB' : 'none',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          padding: analysis ? '0' : '40px',
          alignItems: analysis ? 'stretch' : 'center',
          justifyContent: analysis ? 'flex-start' : 'center',
        }}>

          {!uploadedFile ? (
            /* Upload zone */
            <div style={{
              border: '2px dashed #E5E7EB', borderRadius: '16px',
              padding: '48px 32px', textAlign: 'center', maxWidth: '560px', width: '100%'
            }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1B2A4A', marginBottom: '8px' }}>
                Analyze Your Document
              </h1>
              <p style={{ color: '#6B7280', marginBottom: '32px', fontSize: '16px' }}>
                Upload any loan agreement, insurance policy, or financial contract.
                Our AI will find the hidden traps and tell you exactly what to do.
              </p>

              <input ref={fileInputRef} type="file" accept=".pdf,.txt"
                className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleCameraCapture} />

              <button onClick={() => fileInputRef.current?.click()} style={{
                width: '100%', padding: '16px', borderRadius: '12px',
                background: '#1B2A4A', color: 'white', fontSize: '18px',
                fontWeight: 700, border: 'none', cursor: 'pointer', marginBottom: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                <UploadCloud size={20} /> Upload PDF or TXT File
              </button>

              <button onClick={() => cameraInputRef.current?.click()} style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'transparent', color: '#1B2A4A', fontSize: '16px',
                fontWeight: 600, border: '2px solid #1B2A4A', cursor: 'pointer',
                alignItems: 'center', justifyContent: 'center', gap: '8px'
              }} className="md:hidden flex">
                <Camera size={18} /> Scan with Camera
              </button>

              <p style={{ marginTop: '16px', fontSize: '13px', color: '#9CA3AF' }}>
                🔒 Your document is analyzed privately and never stored without your consent
              </p>
            </div>
          ) : (
            /* PDF Preview */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderBottom: '1px solid #E5E7EB'
              }}>
                <span style={{ fontSize: '14px', fontWeight: 600, flex: 1 }}>
                  📄 {uploadedFile.name}
                </span>
                {isExtracting && <span style={{ fontSize: '13px', color: '#6B7280' }}>Reading document...</span>}
                {!isExtracting && extractedTextRef.current && (
                  <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>✓ Ready to analyze</span>
                )}
                <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {pdfPreviewUrl && uploadedFile.type === 'application/pdf' ? (
                <iframe src={pdfPreviewUrl} style={{ flex: 1, border: 'none', width: '100%' }} title="PDF" />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#6B7280' }}>Image captured — ready to analyze</p>
                </div>
              )}

              {extractError && (
                <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#EF4444', fontSize: '14px' }}>
                  {extractError}
                </div>
              )}

              {!analysis && (
                <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
                  {analyzeError && (
                    <p style={{ color: '#EF4444', fontSize: '14px', marginBottom: '8px' }}>{analyzeError}</p>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || isExtracting || !extractedTextRef.current}
                    style={{
                      width: '100%', padding: '16px', borderRadius: '12px',
                      background: isAnalyzing || isExtracting || !extractedTextRef.current ? '#9CA3AF' : '#1B2A4A',
                      color: 'white', fontSize: '18px', fontWeight: 700,
                      border: 'none', cursor: isAnalyzing ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                    {isAnalyzing ? <><Loader2 size={20} className="animate-spin" /> Analyzing document...</> :
                     isExtracting ? <><Loader2 size={20} className="animate-spin" /> Reading file...</> :
                     'Analyze This Document →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Analysis results */}
        {analysis && (
          <div style={{ width: '50%', overflowY: 'auto', padding: '24px' }}>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Score card */}
                <div style={{
                  background: '#1B2A4A', borderRadius: '16px', padding: '32px',
                  textAlign: 'center', color: 'white'
                }}>
                  <div style={{
                    width: '120px', height: '120px', borderRadius: '50%',
                    border: `8px solid ${scoreColor}`, margin: '0 auto 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    <span style={{ fontSize: '36px', fontWeight: 800, color: scoreColor }}>
                      {analysis.clearconsent_score}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>/ 100</span>
                  </div>
                  <div style={{
                    display: 'inline-block', padding: '4px 16px', borderRadius: '20px',
                    background: scoreColor, fontSize: '14px', fontWeight: 700, marginBottom: '8px'
                  }}>
                    {scoreLabel}
                  </div>
                  <p style={{ color: '#9CA3AF', fontSize: '14px' }}>{analysis.score_explanation}</p>
                </div>

                {/* Callout */}
                {analysis.callout_text && (
                  <div style={{
                    background: '#1B2A4A', borderRadius: '12px', padding: '20px',
                    color: 'white', fontSize: '18px', fontWeight: 700, lineHeight: 1.4
                  }}>
                    ⚠ {analysis.callout_text}
                  </div>
                )}

                {/* Summary */}
                {analysis.summary && (
                  <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '16px' }}>Summary</h3>
                      <button onClick={() => handleSpeak(analysis.summary)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <p style={{ fontSize: '15px', lineHeight: 1.6 }}>{analysis.summary}</p>
                  </div>
                )}

                {/* Pros */}
                {analysis.pros?.length > 0 && (
                  <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', borderLeft: '6px solid #10B981' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px', color: '#10B981' }}>✓ What You Get</h3>
                    {analysis.pros.map((p: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '15px' }}>
                        <CheckCircle size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                        {p}
                      </div>
                    ))}
                  </div>
                )}

                {/* Cons */}
                {analysis.cons?.length > 0 && (
                  <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', borderLeft: '6px solid #F59E0B' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px', color: '#F59E0B' }}>⚠ What You Must Pay or Do</h3>
                    {analysis.cons.map((c: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '15px' }}>
                        <AlertTriangle size={16} color="#F59E0B" style={{ marginTop: '2px', flexShrink: 0 }} />
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Risk Flags tab */}
            {activeTab === 'flags' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
                  🚨 {analysis.risk_flags?.length ?? 0} Risk Flags Found
                </h2>
                {(analysis.risk_flags ?? []).map((flag: any, i: number) => (
                  <div key={i} style={{
                    borderRadius: '12px', padding: '20px',
                    borderTop: '1px solid',
                    borderRight: '1px solid',
                    borderBottom: '1px solid',
                    borderLeft: '6px solid',
                    borderColor: flag.severity === 'high' ? '#EF4444' : flag.severity === 'medium' ? '#F59E0B' : '#10B981',
                    background: 'var(--card)'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        background: flag.severity === 'high' ? '#EF4444' : flag.severity === 'medium' ? '#F59E0B' : '#10B981',
                        color: 'white', textTransform: 'uppercase' as const
                      }}>
                        {flag.severity} risk
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>{flag.title}</span>
                    </div>
                    {flag.quote && (
                      <blockquote style={{
                        borderLeft: '3px solid #E5E7EB', paddingLeft: '12px',
                        color: '#6B7280', fontSize: '13px', fontStyle: 'italic',
                        marginBottom: '8px'
                      }}>
                        &ldquo;{flag.quote}&rdquo;
                      </blockquote>
                    )}
                    <p style={{ fontSize: '14px', lineHeight: 1.6 }}>{flag.explanation}</p>
                  </div>
                ))}
                {(!analysis.risk_flags || analysis.risk_flags.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#10B981', fontSize: '18px', fontWeight: 700 }}>
                    ✓ No major risk flags found in this document
                  </div>
                )}
              </div>
            )}

            {/* Action Plan tab */}
            {activeTab === 'action' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📋 Your Action Plan</h2>
                <p style={{ color: '#6B7280', fontSize: '15px' }}>
                  Here is exactly what you should do before signing this document.
                </p>
                {(analysis.risk_flags ?? []).filter((f: any) => f.action_email).map((flag: any, i: number) => (
                  <div key={i} style={{
                    background: 'var(--card)', borderRadius: '12px', padding: '20px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                      {flag.severity === 'high' ? '🔴' : '🟡'} {flag.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>{flag.explanation}</p>
                    {flag.action_email && (
                      <>
                        <div style={{
                          background: '#F9FAFB', borderRadius: '8px', padding: '12px',
                          fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'pre-wrap',
                          marginBottom: '8px', maxHeight: '120px', overflowY: 'auto',
                          border: '1px solid #E5E7EB'
                        }}>
                          {flag.action_email}
                        </div>
                        <button
                          onClick={() => handleCopyEmail(flag.action_email, i)}
                          style={{
                            padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                            fontWeight: 600, border: '1px solid #1B2A4A', cursor: 'pointer',
                            background: copiedIndex === i ? '#10B981' : 'transparent',
                            color: copiedIndex === i ? 'white' : '#1B2A4A',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}>
                          {copiedIndex === i ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Email to Lender</>}
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {(!analysis.risk_flags || analysis.risk_flags.filter((f: any) => f.action_email).length === 0) && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#10B981', fontSize: '18px', fontWeight: 700 }}>
                    ✓ No immediate action required for this document
                  </div>
                )}
              </div>
            )}

            {/* Numbers tab */}
            {activeTab === 'numbers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>🧮 The Real Numbers</h2>
                {analysis.extracted_figures ? (() => {
                  const f = analysis.extracted_figures;
                  const P = f.loan_amount;
                  const r = f.interest_rate ? f.interest_rate / 12 / 100 : null;
                  const n = f.tenure_months;
                  const emi = P && r && n ? Math.round(P * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1)) : null;
                  const total = emi && n ? emi * n : null;
                  const extra = total && P ? total - P : null;
                  const ratio = emi && f.monthly_income ? Math.round(emi / f.monthly_income * 100) : null;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {P && <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>LOAN AMOUNT</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#1B2A4A' }}>₹{P.toLocaleString('en-IN')}</div>
                      </div>}
                      {emi && <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>MONTHLY EMI</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#1B2A4A' }}>₹{emi.toLocaleString('en-IN')}</div>
                      </div>}
                      {total && <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid #EF4444', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>TOTAL REPAYMENT</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>₹{total.toLocaleString('en-IN')}</div>
                      </div>}
                      {extra && <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid #EF4444', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>EXTRA YOU PAY</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>₹{extra.toLocaleString('en-IN')}</div>
                      </div>}
                      {ratio && <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: `1px solid ${ratio > 50 ? '#EF4444' : ratio > 30 ? '#F59E0B' : '#10B981'}`, textAlign: 'center', gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px' }}>EMI AS % OF INCOME</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: ratio > 50 ? '#EF4444' : ratio > 30 ? '#F59E0B' : '#10B981' }}>{ratio}%</div>
                        <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                          {ratio > 50 ? '⚠ Dangerous — more than half your income goes to EMI' :
                           ratio > 30 ? '⚠ Caution — significant portion of income committed' :
                           '✓ Manageable — within safe EMI range'}
                        </div>
                      </div>}
                    </div>
                  );
                })() : (
                  <p style={{ color: '#6B7280', padding: '20px', textAlign: 'center' }}>
                    No financial figures could be extracted from this document.
                    Use the Simulate page to calculate manually.
                  </p>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
