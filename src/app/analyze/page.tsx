'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RiskMeter } from '@/components/RiskMeter';
import {
  Volume2, CheckCircle, AlertTriangle, UploadCloud, FileText,
  ArrowRight, Loader2, RefreshCw, X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Language } from '@/lib/store';

// ─── Small read-aloud helper ──────────────────────────────────────────────────
function speakText(text: string, lang: Language) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
  window.speechSynthesis.speak(utter);
}

// ─── Loading skeletons ────────────────────────────────────────────────────────
function ResultSkeletons() {
  return (
    <div className="space-y-4">
      {[
        'border-l-success',
        'border-l-warning',
        'border-l-danger',
      ].map((color, i) => (
        <div
          key={i}
          className={cn(
            'border-l-[6px] rounded-xl border border-border bg-surface dark:bg-card p-6 animate-pulse',
            color,
          )}
        >
          <div className="h-6 w-1/3 bg-border/60 rounded mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-border/40 rounded" />
            <div className="h-4 w-5/6 bg-border/40 rounded" />
            <div className="h-4 w-4/6 bg-border/40 rounded" />
          </div>
        </div>
      ))}
      <div className="h-20 w-full bg-primary/20 rounded-xl animate-pulse" />
      <div className="h-16 w-full bg-border/40 rounded-xl animate-pulse" />
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({
  title, items, borderColor, icon, readText, lang,
}: {
  title: string;
  items: string[];
  borderColor: string;
  icon: React.ReactNode;
  readText: string;
  lang: Language;
}) {
  return (
    <Card className={cn('border-l-[6px] border-y border-r border-border bg-surface dark:bg-card shadow-sm rounded-xl', borderColor)}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[22px] font-bold flex items-center gap-2 text-primary dark:text-primary-foreground">
            {icon} {title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            title="Read aloud"
            onClick={() => speakText(readText, lang)}
          >
            <Volume2 className="h-6 w-6 text-muted-foreground hover:text-primary" />
          </Button>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start text-[17px] text-foreground font-medium gap-2">
              <span className="mt-1 shrink-0">{icon}</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const { language, setLanguage, currentAnalysis, setCurrentAnalysis, addHistory, setSimulationPrefill } = useAppStore();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfMeta, setPdfMeta] = useState<{ page_count: number; file_size_kb: number } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const extractedTextRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── Core analyze call ──────────────────────────────────────────────────────
  const runAnalysis = useCallback(async (lang: Language) => {
    const docText = extractedTextRef.current || text;
    if (!docText.trim()) {
      setError('Please paste document text or upload a file first.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: docText, language: lang }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server error ${response.status}`);
      }

      const data = await response.json();

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
      // Save extracted figures so the simulate page can auto-fill on mount
      if (data.extracted_figures) {
        setSimulationPrefill(data.extracted_figures);
      }
      addHistory({
        id: result.id,
        type: 'analysis',
        date: new Date().toISOString(),
        riskScore: result.riskScore,
        details: result,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [text, setCurrentAnalysis, addHistory, setSimulationPrefill]);

  // ── Language change → re-run if results already showing ──────────────────
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    const docText = extractedTextRef.current || text;
    if (currentAnalysis && docText.trim()) {
      runAnalysis(lang);
    }
  };

  // ── File upload ────────────────────────────────────────────────────────────
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
        setUploadedFile(file);
        // Send the file to our server-side route — runs in Node.js,
        // no browser worker needed, reliable across all Next.js versions.
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || `Server error ${res.status}`);
        }

        const { text: extracted, page_count, file_size_kb } = await res.json();
        if (!extracted || !extracted.trim()) {
          throw new Error('No readable text found in this PDF. It may be a scanned image — please paste the text manually.');
        }
        // Store extracted text silently — never show it in the textarea
        extractedTextRef.current = extracted;
        setPdfMeta({ page_count, file_size_kb });
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
    setCurrentAnalysis(null);
    extractedTextRef.current = '';
    setPdfMeta(null);
    setUploadedFile(null);
  };

  const handlePreviewPdf = async () => {
    if (!uploadedFile) return;
    const formData = new FormData();
    formData.append('file', uploadedFile);
    const res = await fetch('/api/preview-pdf', { method: 'POST', body: formData });
    const { base64_pdf } = await res.json();
    const win = window.open();
    win?.document.write(`<iframe src="data:application/pdf;base64,${base64_pdf}" width="100%" height="100%" style="border:none;position:fixed;top:0;left:0;"></iframe>`);
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground">
          Understand Before You Sign
        </h1>
        {/* Language selector */}
        <Select value={language} onValueChange={(v: any) => handleLanguageChange(v as Language)}>
          <SelectTrigger className="w-[140px] h-[44px] font-semibold">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="hi">हिंदी</SelectItem>
            <SelectItem value="mr">मराठी</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* ── Input Column ── */}
        <div className="flex flex-col gap-4">
          <Card className="bg-surface dark:bg-card border-border shadow-sm rounded-xl border">
            <CardContent className="pt-6 flex flex-col gap-4">
              <label className="text-[16px] font-semibold text-primary dark:text-primary-foreground">
                Paste your document text here
              </label>
              <textarea
                className="flex min-h-[220px] w-full rounded-md border border-border bg-transparent px-4 py-3 text-[17px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-y"
                placeholder="Paste your loan agreement, insurance policy, or terms here…"
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

              {/* Upload button / file badge */}
              {uploadFileName ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 w-full h-[48px] px-4 rounded-lg border border-success bg-success/10">
                    <FileText className="h-5 w-5 text-success shrink-0" />
                    <span className="text-[15px] font-semibold text-success truncate flex-1">{uploadFileName}</span>
                    {uploadedFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePreviewPdf}
                        className="text-primary hover:text-primary/80 shrink-0 h-7 px-2 text-[13px] font-semibold"
                      >
                        View PDF
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearUpload}
                      className="text-muted-foreground hover:text-danger shrink-0 h-7 px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {pdfMeta && (
                    <p className="text-[13px] text-muted-foreground px-1">
                      {pdfMeta.page_count} pages · {pdfMeta.file_size_kb} KB
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[48px] text-[17px] text-primary dark:text-primary-foreground font-semibold border-dashed border-2 bg-transparent hover:bg-muted"
                >
                  <UploadCloud className="mr-2 h-5 w-5" />
                  {isUploading ? 'Reading file…' : 'Upload File (.pdf, .txt)'}
                </Button>
              )}

              {/* Error banner */}
              {error && (
                <div className="bg-danger/10 border-l-4 border-danger p-4 rounded-r text-danger font-semibold text-[15px] flex items-start justify-between gap-3">
                  <span>{error}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {(text.trim() || extractedTextRef.current) && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => runAnalysis(language)}
                        className="text-danger p-0 h-auto font-bold"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Retry
                      </Button>
                    )}
                    <Button variant="link" onClick={() => setError(null)} className="text-danger p-0 h-auto">
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={() => runAnalysis(language)}
                disabled={isLoading || isUploading}
                className="w-full h-[52px] text-[20px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-60"
              >
                {isLoading
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing…</>
                  : <>Analyze This <ArrowRight className="ml-2 h-5 w-5" /></>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Results Column ── */}
        <div className="flex flex-col gap-5">
          {isLoading ? (
            <ResultSkeletons />
          ) : currentAnalysis ? (
            <div className="space-y-4">
              {/* Pros */}
              <ResultCard
                title="What You Will Get"
                items={currentAnalysis.pros}
                borderColor="border-l-success"
                icon={<CheckCircle className="h-5 w-5 text-success shrink-0" />}
                readText={`What you will get. ${currentAnalysis.pros.join('. ')}`}
                lang={language}
              />

              {/* Cons */}
              <ResultCard
                title="What You Must Pay or Do"
                items={currentAnalysis.cons}
                borderColor="border-l-warning"
                icon={<AlertTriangle className="h-5 w-5 text-warning shrink-0" />}
                readText={`What you must pay or do. ${currentAnalysis.cons.join('. ')}`}
                lang={language}
              />

              {/* Hidden clauses */}
              <ResultCard
                title="Risks and Hidden Rules"
                items={currentAnalysis.hiddenClauses}
                borderColor="border-l-danger"
                icon={<AlertTriangle className="h-5 w-5 text-danger shrink-0" />}
                readText={`Risks and hidden rules. ${currentAnalysis.hiddenClauses.join('. ')}`}
                lang={language}
              />

              {/* Callout box */}
              {currentAnalysis.repaymentInfo && (
                <div className="bg-primary px-6 py-5 rounded-xl shadow-md">
                  <p className="text-[22px] font-bold text-white leading-tight">
                    {currentAnalysis.repaymentInfo}
                  </p>
                </div>
              )}

              {/* Risk meter */}
              <div className="bg-surface dark:bg-card p-6 rounded-xl border border-border">
                <RiskMeter score={currentAnalysis.riskScore} />
                {currentAnalysis.risk_explanation && (
                  <p className="text-[15px] text-muted-foreground mt-3 font-medium">
                    {currentAnalysis.risk_explanation}
                  </p>
                )}
              </div>

              {/* Go to simulate CTA */}
              <Button
                onClick={() => router.push('/simulate')}
                variant="outline"
                className="w-full h-[48px] text-[17px] font-bold border-[2px] border-primary text-primary hover:bg-primary hover:text-white rounded-xl"
              >
                Simulate Your Loan <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-[2px] border-dashed border-border rounded-xl bg-surface/50 dark:bg-card/50 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
              <FileText className="h-20 w-20 text-border" />
              <p className="max-w-[300px] text-[20px] font-semibold">
                Results will appear here once you paste text and click Analyze.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
