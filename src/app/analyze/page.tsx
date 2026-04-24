'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskMeter } from '@/components/RiskMeter';
import { Switch } from '@/components/ui/switch';
import {
  Volume2, CheckCircle, AlertTriangle, UploadCloud, FileText,
  ArrowRight, Loader2, RefreshCw, X, Eye, Camera, Share2, SplitSquareHorizontal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Language, CurrentAnalysis } from '@/lib/store';

// ─── Small read-aloud helper ──────────────────────────────────────────────────
function speakText(text: string, lang: Language) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
  window.speechSynthesis.speak(utter);
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
          <h3 className="text-[20px] font-bold flex items-center gap-2 text-primary dark:text-primary-foreground">
            {icon} {title}
          </h3>
          <Button variant="ghost" size="icon" title="Read aloud" onClick={() => speakText(readText, lang)}>
            <Volume2 className="h-6 w-6 text-muted-foreground hover:text-primary" />
          </Button>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start text-[16px] text-foreground font-medium gap-2">
              <span className="mt-1 shrink-0">{icon}</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function AnalyzePage() {
  const { language, simplifiedMode, setSimplifiedMode, currentAnalysis, setCurrentAnalysis, addHistory, setSimulationPrefill } = useAppStore();
  const router = useRouter();

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [secondAnalysis, setSecondAnalysis] = useState<CurrentAnalysis | null>(null);

  // States for Document 1
  const [text1, setText1] = useState('');
  const [isLoading1, setIsLoading1] = useState(false);
  const [error1, setError1] = useState<string | null>(null);
  const [uploadFileName1, setUploadFileName1] = useState<string | null>(null);
  const [isUploading1, setIsUploading1] = useState(false);
  const extractedTextRef1 = useRef<string>('');
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const cameraInputRef1 = useRef<HTMLInputElement>(null);

  // States for Document 2
  const [text2, setText2] = useState('');
  const [isLoading2, setIsLoading2] = useState(false);
  const [error2, setError2] = useState<string | null>(null);
  const [uploadFileName2, setUploadFileName2] = useState<string | null>(null);
  const [isUploading2, setIsUploading2] = useState(false);
  const extractedTextRef2 = useRef<string>('');
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const runAnalysis = async (docNum: 1 | 2, docText: string) => {
    if (!docText.trim()) {
      docNum === 1 ? setError1('Please provide document text.') : setError2('Please provide document text.');
      return;
    }
    
    docNum === 1 ? setError1(null) : setError2(null);
    docNum === 1 ? setIsLoading1(true) : setIsLoading2(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: docText, language, simplified: simplifiedMode }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();

      const result: CurrentAnalysis = {
        id: `CLR-${Date.now()}`,
        documentType: data.document_type ?? 'Financial Document',
        pros: Array.isArray(data.pros) ? data.pros : [],
        cons: Array.isArray(data.cons) ? data.cons : [],
        hiddenClauses: Array.isArray(data.hidden_clauses) ? data.hidden_clauses : [],
        specificClauses: Array.isArray(data.specific_clauses) ? data.specific_clauses : [],
        repaymentInfo: typeof data.callout_text === 'string' ? data.callout_text : '',
        riskScore: typeof data.risk_score === 'number' ? data.risk_score : 0,
        risk_explanation: typeof data.risk_explanation === 'string' ? data.risk_explanation : '',
        summary: typeof data.summary === 'string' ? data.summary : '',
        quiz: Array.isArray(data.quiz) ? data.quiz : [],
        extractedFigures: data.extracted_figures ?? null,
      };

      if (docNum === 1) {
        setCurrentAnalysis(result);
        if (data.extracted_figures) setSimulationPrefill(data.extracted_figures);
        addHistory({ id: result.id, type: 'analysis', date: new Date().toISOString(), riskScore: result.riskScore, details: result });
      } else {
        setSecondAnalysis(result);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      docNum === 1 ? setError1(msg) : setError2(msg);
    } finally {
      docNum === 1 ? setIsLoading1(false) : setIsLoading2(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docNum: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    docNum === 1 ? setIsUploading1(true) : setIsUploading2(true);
    docNum === 1 ? setUploadFileName1(file.name) : setUploadFileName2(file.name);
    
    try {
      if (file.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        const { text } = await res.json();
        docNum === 1 ? setText1(text) : setText2(text);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const content = await file.text();
        docNum === 1 ? setText1(content) : setText2(content);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        if (docNum === 1) {
          if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
          const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
          setPdfPreviewUrl(URL.createObjectURL(blob));
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
        const { text: extracted } = await res.json();
        if (docNum === 1) { extractedTextRef1.current = extracted; setText1('PDF Extracted (Hidden)'); }
        else { extractedTextRef2.current = extracted; setText2('PDF Extracted (Hidden)'); }
      }
    } catch {
      docNum === 1 ? setError1('Failed to read file') : setError2('Failed to read file');
    } finally {
      docNum === 1 ? setIsUploading1(false) : setIsUploading2(false);
    }
  };

  const handleShareWhatsApp = (analysis: CurrentAnalysis) => {
    const msg = `ClearConsent Analysis for ${analysis.documentType}:\nRisk Score: ${analysis.riskScore}/100\nSummary: ${analysis.summary}\nCheck it out!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const renderInputSection = (docNum: 1 | 2) => {
    const text = docNum === 1 ? text1 : text2;
    const setText = docNum === 1 ? setText1 : setText2;
    const uploadFileName = docNum === 1 ? uploadFileName1 : uploadFileName2;
    const isUploading = docNum === 1 ? isUploading1 : isUploading2;
    const fileInputRef = docNum === 1 ? fileInputRef1 : fileInputRef2;
    const extractedTextRef = docNum === 1 ? extractedTextRef1 : extractedTextRef2;

    return (
      <Card className="bg-surface dark:bg-card border-border shadow-sm rounded-xl">
        <CardContent className="pt-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <label className="text-[16px] font-semibold text-primary dark:text-primary-foreground">
              Document {isCompareMode ? docNum : ''}
            </label>
            {docNum === 1 && (
              <Button variant="ghost" size="sm" onClick={() => cameraInputRef1.current?.click()} className="md:hidden text-primary">
                <Camera className="h-4 w-4 mr-2" /> Scan
              </Button>
            )}
          </div>
          
          <textarea
            className="flex min-h-[140px] w-full rounded-md border border-border bg-transparent px-4 py-3 text-[16px] focus:ring-2 focus:ring-primary"
            placeholder="Paste text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input ref={fileInputRef} type="file" accept=".txt,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, docNum)} />
          {docNum === 1 && <input ref={cameraInputRef1} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, 1)} />}

          {uploadFileName ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-success bg-success/10">
              <FileText className="h-5 w-5 text-success" />
              <span className="text-[14px] font-semibold text-success truncate flex-1">{uploadFileName}</span>
              <Button variant="ghost" size="sm" onClick={() => docNum === 1 ? setUploadFileName1(null) : setUploadFileName2(null)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <Button variant="outline" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="w-full border-dashed">
              <UploadCloud className="mr-2 h-5 w-5" /> {isUploading ? 'Reading...' : 'Upload File'}
            </Button>
          )}

          {docNum === 1 && pdfPreviewUrl && (
            <div className="w-full rounded-xl border border-border overflow-hidden bg-card mt-2">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                <p className="text-[14px] font-semibold text-muted-foreground">📄 {uploadFileName1}</p>
                <button
                  onClick={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <iframe src={pdfPreviewUrl} className="w-full" style={{ height: '420px', border: 'none' }} title="PDF Preview" />
            </div>
          )}

          <Button
            onClick={() => runAnalysis(docNum, extractedTextRef.current || text)}
            disabled={(docNum === 1 ? isLoading1 : isLoading2) || isUploading}
            className="w-full h-[48px] font-bold bg-[#1B2A4A] text-white"
          >
            {(docNum === 1 ? isLoading1 : isLoading2) ? <Loader2 className="animate-spin" /> : 'Analyze'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderAnalysis = (analysis: CurrentAnalysis | null, isBetterDeal?: boolean) => {
    if (!analysis) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
          <div>
            <div className="inline-flex bg-[#1B2A4A] text-white text-xs font-bold px-2 py-1 rounded-full mb-2">
              {analysis.documentType}
            </div>
            {isBetterDeal && (
              <div className="inline-flex ml-2 bg-success text-white text-xs font-bold px-2 py-1 rounded-full mb-2">
                🌟 Better Deal
              </div>
            )}
            <h2 className="text-xl font-bold">Analysis Results</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleShareWhatsApp(analysis)}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
        </div>

        <RiskMeter score={analysis.riskScore} />

        {/* Specific Clauses to Watch */}
        {analysis.specificClauses && analysis.specificClauses.length > 0 && (
          <Card className="border-border bg-card shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-[16px] font-bold flex items-center gap-2">
                <Eye className="h-5 w-5 text-warning" /> Specific Clauses to Watch
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {analysis.specificClauses.map((clause: any, idx: number) => (
                <div key={idx} className={cn(
                  'rounded-xl border p-4',
                  clause.severity === 'high' ? 'border-red-400/40 bg-red-500/5' :
                  clause.severity === 'medium' ? 'border-yellow-400/40 bg-yellow-500/5' :
                  'border-green-400/40 bg-green-500/5'
                )}>
                  <span className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full uppercase inline-block mb-2',
                    clause.severity === 'high' ? 'bg-red-500 text-white' :
                    clause.severity === 'medium' ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  )}>{clause.severity ?? 'low'} risk</span>
                  <blockquote className="text-[13px] italic text-muted-foreground border-l-2 border-border pl-3 mb-2">
                    "{clause.quote ?? clause.text ?? ''}"
                  </blockquote>
                  {clause.explanation && <p className="text-[14px] text-foreground font-medium">{clause.explanation}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <ResultCard title="Pros" items={analysis.pros} borderColor="border-l-success" icon={<CheckCircle className="text-success" />} readText="" lang={language} />
        <ResultCard title="Cons" items={analysis.cons} borderColor="border-l-warning" icon={<AlertTriangle className="text-warning" />} readText="" lang={language} />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground tracking-tight">
            Analyze Document
          </h1>
          <p className="text-muted-foreground mt-1 text-[16px]">Upload documents to translate them into plain language.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-card p-3 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 pr-4 border-r border-border">
            <Switch checked={simplifiedMode} onCheckedChange={setSimplifiedMode} id="simplified-mode" />
            <label htmlFor="simplified-mode" className="text-sm font-bold cursor-pointer">Simplified Mode</label>
          </div>
          <Button variant="ghost" className="font-bold text-primary" onClick={() => setIsCompareMode(!isCompareMode)}>
            <SplitSquareHorizontal className="mr-2 h-4 w-4" />
            {isCompareMode ? 'Disable Compare' : 'Compare Two Docs'}
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-6", isCompareMode ? "lg:grid-cols-2" : "lg:grid-cols-2")}>
        
        {/* Document 1 Section */}
        <div className="flex flex-col gap-6">
          {renderInputSection(1)}
          {renderAnalysis(currentAnalysis, isCompareMode && secondAnalysis ? currentAnalysis.riskScore > secondAnalysis.riskScore : false)}
        </div>

        {/* Document 2 Section (if Compare mode or normal output mode) */}
        {isCompareMode ? (
          <div className="flex flex-col gap-6">
            {renderInputSection(2)}
            {renderAnalysis(secondAnalysis, isCompareMode && currentAnalysis ? (secondAnalysis?.riskScore || 0) > currentAnalysis.riskScore : false)}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* If not compare mode, show analysis 1 here on desktop */}
            {!currentAnalysis ? (
              <div className="h-full min-h-[400px] border-[2px] border-dashed border-border rounded-xl bg-surface/50 dark:bg-card/50 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <FileText className="h-16 w-16 mb-4 text-border" />
                <p className="text-lg font-semibold">Results will appear here</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

    </div>
  );
}
