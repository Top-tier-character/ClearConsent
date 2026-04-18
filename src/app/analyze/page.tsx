'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RiskMeter } from '@/components/RiskMeter';
import { Volume2, CheckCircle, AlertTriangle, UploadCloud, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AnalyzePage() {
  const { language, currentAnalysis, setCurrentAnalysis, addHistory } = useAppStore();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please paste document text or upload a file first.');
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server error ${response.status}`);
      }

      const data = await response.json();

      // Normalise the backend field names to what the UI already expects
      const result = {
        id: `CLR-${Date.now()}`,
        pros: data.pros ?? [],
        cons: data.cons ?? [],
        hiddenClauses: data.hidden_clauses ?? [],
        repaymentInfo: data.callout_text ?? '',
        riskScore: data.risk_score ?? 0,
        risk_explanation: data.risk_explanation ?? '',
        summary: data.summary ?? '',
        quiz: data.quiz ?? [],
      };

      setCurrentAnalysis(result);
      addHistory({
        id: result.id,
        type: 'analysis',
        date: new Date().toISOString(),
        riskScore: result.riskScore,
        details: result,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze the document.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    router.push('/confirm');
  };

  /** Read a .txt or .pdf file and populate the textarea. */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setUploadFileName(file.name);

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const content = await file.text();
        setText(content);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Lightweight PDF text extraction without external libraries.
        // Works on text-based (non-scanned) PDFs by parsing BT...ET blocks.
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let raw = '';
        for (let i = 0; i < bytes.length; i++) {
          const c = bytes[i];
          if ((c >= 32 && c <= 126) || c === 10 || c === 13) raw += String.fromCharCode(c);
        }
        const btEtMatches = raw.match(/BT[\s\S]*?ET/g) ?? [];
        let extracted = '';
        if (btEtMatches.length > 0) {
          extracted = btEtMatches
            .join(' ')
            .replace(/\(([^)]+)\)\s*Tj/g, '$1 ')
            .replace(/\[([^\]]+)\]\s*TJ/g, (_, inner) => inner.replace(/\(([^)]+)\)/g, '$1 '))
            .replace(/[^\x20-\x7E\n\r]/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        }
        setText(extracted || raw.replace(/\s{2,}/g, ' ').trim());
      } else {
        setError('Unsupported file type. Please upload a .txt or .pdf file.');
        setUploadFileName(null);
      }
    } catch {
      setError('Failed to read the file. Please try pasting the text manually.');
      setUploadFileName(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearUpload = () => {
    setText('');
    setUploadFileName(null);
    setError(null);
  };

  /** Calls /api/tts to get the BCP-47 language code, then uses browser speechSynthesis. */
  const readAloud = async (textToRead: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead, language }),
      });
      const { text: ttsText, language_code } = await res.json();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(ttsText);
      utterance.lang = language_code;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback: speak directly without API
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground mb-8">
        Here is what this document means for you
      </h1>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Input Column */}
        <div className="flex flex-col gap-6">
          <Card className="bg-surface dark:bg-card border-border shadow-sm rounded-xl border-[1px]">
            <CardContent className="pt-6 flex flex-col gap-6">
              <textarea 
                className="flex min-h-[350px] w-full rounded-md border border-border bg-transparent px-4 py-3 text-[18px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Paste your loan agreement, terms, or insurance clauses here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {/* Hidden real file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Upload trigger button */}
              {uploadFileName ? (
                <div className="flex items-center gap-3 w-full h-[48px] px-4 rounded-lg border border-success bg-success/10">
                  <FileText className="h-5 w-5 text-success shrink-0" />
                  <span className="text-[16px] font-semibold text-success truncate flex-1">{uploadFileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearUpload}
                    className="text-muted-foreground hover:text-danger shrink-0 h-7 px-2"
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[48px] text-[18px] text-primary dark:text-primary-foreground font-semibold border-dashed border-2 bg-transparent hover:bg-muted"
                >
                  <UploadCloud className="mr-2 h-6 w-6" />
                  {isUploading ? 'Reading file...' : 'Upload File (.pdf, .txt)'}
                </Button>
              )}

              
              {error && (
                <div className="bg-danger/10 border-l-4 border-danger p-4 rounded-r text-danger font-semibold flex items-center justify-between">
                  {error}
                  <Button variant="link" onClick={() => setError(null)} className="text-danger p-0">Dismiss</Button>
                </div>
              )}
              
              <Button 
                onClick={handleAnalyze} 
                disabled={isLoading}
                className="w-full h-[52px] text-[20px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl"
              >
                {isLoading ? 'Analyzing...' : 'Analyze This'} <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Column */}
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-[140px] bg-border/50 animate-pulse rounded-xl" />
              <div className="h-[140px] bg-border/50 animate-pulse rounded-xl" />
              <div className="h-[140px] bg-border/50 animate-pulse rounded-xl" />
            </div>
          ) : currentAnalysis ? (
            <div className="space-y-4">
              {/* Stack 1: Pros */}
              <Card className="border-l-[6px] border-l-success border-y-[1px] border-r-[1px] border-border bg-surface dark:bg-card shadow-sm rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[24px] font-bold flex items-center text-primary dark:text-primary-foreground">
                      <CheckCircle className="mr-3 h-8 w-8 text-success" /> 
                      What You Will Get
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => readAloud("What you will get. " + currentAnalysis.pros.join(". "))}>
                      <Volume2 className="h-6 w-6 text-muted-foreground hover:text-primary" />
                    </Button>
                  </div>
                  <ul className="space-y-3">
                    {currentAnalysis.pros.map((item: string, i: number) => (
                      <li key={i} className="flex items-start text-[18px] text-foreground font-medium">
                        <span className="text-success mr-3 text-[22px] leading-tight">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Stack 2: Cons */}
              <Card className="border-l-[6px] border-l-warning border-y-[1px] border-r-[1px] border-border bg-surface dark:bg-card shadow-sm rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[24px] font-bold flex items-center text-primary dark:text-primary-foreground">
                      <AlertTriangle className="mr-3 h-8 w-8 text-warning" /> 
                      What You Must Pay or Do
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => readAloud("What you must pay or do. " + currentAnalysis.cons.join(". "))}>
                      <Volume2 className="h-6 w-6 text-muted-foreground hover:text-primary" />
                    </Button>
                  </div>
                  <ul className="space-y-3">
                    {currentAnalysis.cons.map((item: string, i: number) => (
                      <li key={i} className="flex items-start text-[18px] text-foreground font-medium">
                        <span className="text-warning mr-3 text-[22px] leading-tight">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Stack 3: Hidden Clauses */}
              <Card className="border-l-[6px] border-l-danger border-y-[1px] border-r-[1px] border-border bg-surface dark:bg-card shadow-sm rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[24px] font-bold flex items-center text-primary dark:text-primary-foreground">
                      <AlertTriangle className="mr-3 h-8 w-8 text-danger" /> 
                      Risks and Hidden Rules
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => readAloud("Risks and hidden rules. " + currentAnalysis.hiddenClauses.join(". "))}>
                      <Volume2 className="h-6 w-6 text-muted-foreground hover:text-primary" />
                    </Button>
                  </div>
                  <ul className="space-y-3">
                    {currentAnalysis.hiddenClauses.map((item: string, i: number) => (
                      <li key={i} className="flex items-start text-[18px] text-foreground font-medium">
                        <span className="text-danger mr-3 text-[22px] leading-tight">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Full Width Callout */}
              <div className="bg-primary px-6 py-5 rounded-xl shadow-md my-6">
                <p className="text-[24px] font-bold text-white leading-tight">
                  {currentAnalysis.repaymentInfo}
                </p>
              </div>

              {/* Risk Meter */}
              <div className="bg-surface dark:bg-card p-6 rounded-xl border border-border mt-4">
                <RiskMeter score={currentAnalysis.riskScore} />
              </div>
              
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-[2px] border-dashed border-border rounded-xl bg-surface/50 dark:bg-card/50 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
              <FileText className="h-20 w-20 text-border" />
              <p className="max-w-[300px] text-[20px] font-semibold">Results will safely appear here once analysis completes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
