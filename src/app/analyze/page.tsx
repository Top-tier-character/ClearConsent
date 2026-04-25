'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { calculateEMI } from '@/lib/finance';

import {
  FileText, CheckCircle, AlertTriangle, UploadCloud,
  Loader2, Camera, FileWarning, ShieldAlert, CheckCircle2, Copy, FileQuestion, HelpCircle, ChevronRight, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CurrentAnalysis } from '@/lib/store';
import { toast } from 'sonner';

const DOC_TYPES = [
  { id: 'Loan Agreement', icon: <FileText className="h-6 w-6" /> },
  { id: 'Insurance Policy', icon: <ShieldAlert className="h-6 w-6" /> },
  { id: 'Auto-Pay Mandate', icon: <RefreshCwIcon className="h-6 w-6" /> },
  { id: 'Account Opening', icon: <FileQuestion className="h-6 w-6" /> },
];

function RefreshCwIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export default function AnalyzePage() {
  const { language, setLanguage, simplifiedMode, setSimplifiedMode, currentAnalysis, setCurrentAnalysis, addHistory, setAiAssistantOpen, addChatMessage } = useAppStore();

  const [phase, setPhase] = useState<'upload' | 'dashboard'>('upload');
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'action' | 'numbers'>('overview');

  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'paste' | 'camera'>('file');
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [incomeOverride, setIncomeOverride] = useState<number>(0);
  const [incomeDrop, setIncomeDrop] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  const paragraphs = currentAnalysis?.rawTextParagraphs || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        const data = await res.json();
        setText(data.text);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const content = await file.text();
        setText(content);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setFileName(file.name);
        // Inline preview — no API call needed
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
        setPdfPreviewUrl(URL.createObjectURL(blob));
        // Extract text
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.text) {
          setText(data.text);
        } else {
          setError(data.error || 'Could not extract text. Try Paste Text instead.');
        }
      }
    } catch {
      setError('Failed to read file');
    }
  };

  const runAnalysis = async () => {
    if (!text.trim()) {
      setError('Please provide document text.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, simplified: simplifiedMode }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Analysis failed (${response.status})`);
      }
      const data = await response.json();

      const paras = text.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);

      const result: CurrentAnalysis = {
        id: `CLR-${Date.now()}`,
        documentType: selectedDocType || data.document_type || 'Financial Document',
        pros: Array.isArray(data.pros) ? data.pros : [],
        cons: Array.isArray(data.cons) ? data.cons : [],
        hiddenClauses: Array.isArray(data.hidden_clauses) ? data.hidden_clauses : [],
        specificClauses: Array.isArray(data.specific_clauses) ? data.specific_clauses : (Array.isArray(data.risk_flags) ? data.risk_flags : []),
        actionPlan: Array.isArray(data.action_plan) ? data.action_plan : [],
        repaymentInfo: data.callout_text || '',
        riskScore: data.risk_score || 0,
        risk_explanation: data.risk_explanation || '',
        summary: data.summary || '',
        extractedFigures: data.extracted_figures || null,
        rawTextParagraphs: paras,
      };

      if (data.extracted_figures?.monthly_income) {
        setIncomeOverride(data.extracted_figures.monthly_income);
      }

      setCurrentAnalysis(result);
      addHistory({ id: result.id, type: 'analysis', date: new Date().toISOString(), riskScore: result.riskScore, details: result });
      setPhase('dashboard');
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setPhase('upload');
    setText('');
    setCurrentAnalysis(null);
    setSelectedParagraphIndex(null);
  };

  const handleParagraphClick = (idx: number, pText: string) => {
    setSelectedParagraphIndex(idx);
    setActiveTab('risks');
    // Simple heuristic to scroll right panel
    if (rightColumnRef.current) {
      rightColumnRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const copyEmail = (template: string) => {
    navigator.clipboard.writeText(template);
    toast('Email copied to clipboard!');
  };

  const handleAskAi = (actionText: string) => {
    addChatMessage({ role: 'user', content: `Can you explain more about this: "${actionText}"?` });
    setAiAssistantOpen(true);
  };

  // Safe parsed numbers for Numbers tab
  const loanAmount = currentAnalysis?.extractedFigures?.loan_amount || 0;
  const interestRate = currentAnalysis?.extractedFigures?.interest_rate || 0;
  const tenureMonths = currentAnalysis?.extractedFigures?.tenure_months || 0;
  
  const emiCalc = loanAmount > 0 ? calculateEMI(loanAmount, interestRate, tenureMonths) : 0;
  const actualIncome = incomeDrop ? incomeOverride * 0.8 : incomeOverride;
  const ratio = actualIncome > 0 ? (emiCalc / actualIncome) * 100 : 0;

  if (phase === 'upload') {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-[#1B2A4A] dark:text-white tracking-tight mb-4">Analyze Your Document</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload any contract, loan agreement, or financial policy. We will instantly translate it into plain language and uncover hidden risks.
          </p>
        </div>

        <div className="bg-[#FAF9F6] dark:bg-card rounded-3xl p-8 border-4 border-dashed border-[#1B2A4A]/20 dark:border-border min-h-[320px] flex flex-col items-center justify-center gap-8 transition-colors">
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant={uploadMode === 'file' ? 'default' : 'outline'} className={cn("h-14 px-6 text-lg rounded-xl", uploadMode === 'file' && "bg-[#1B2A4A] text-white hover:bg-[#1B2A4A]/90")} onClick={() => setUploadMode('file')}>
              📂 Upload PDF/TXT
            </Button>
            <Button variant={uploadMode === 'paste' ? 'default' : 'outline'} className={cn("h-14 px-6 text-lg rounded-xl", uploadMode === 'paste' && "bg-[#1B2A4A] text-white hover:bg-[#1B2A4A]/90")} onClick={() => setUploadMode('paste')}>
              📋 Paste Text
            </Button>
            <Button variant={uploadMode === 'camera' ? 'default' : 'outline'} className={cn("md:hidden h-14 px-6 text-lg rounded-xl", uploadMode === 'camera' && "bg-[#1B2A4A] text-white hover:bg-[#1B2A4A]/90")} onClick={() => setUploadMode('camera')}>
              📷 Scan
            </Button>
          </div>

          <div className="w-full max-w-2xl">
            {uploadMode === 'file' && (
              <div className="flex flex-col items-center">
                <input ref={fileInputRef} type="file" accept=".txt,.pdf" className="hidden" onChange={handleFileUpload} />
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-20 w-full border-2 border-dashed text-lg font-semibold bg-white dark:bg-black">
                  <UploadCloud className="mr-3 h-6 w-6" /> Select File from Device
                </Button>
                {text && <p className="mt-3 text-success font-bold flex items-center"><CheckCircle2 className="mr-2 h-5 w-5"/> File loaded and ready!</p>}
                {pdfPreviewUrl && (
                  <div className="w-full mt-4 rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
                      <span className="text-sm font-semibold text-muted-foreground">📄 {fileName}</span>
                      <button onClick={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }} className="text-muted-foreground hover:text-red-500 p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <iframe src={pdfPreviewUrl} className="w-full" style={{ height: '400px', border: 'none' }} title="PDF Preview" />
                  </div>
                )}
              </div>
            )}
            {uploadMode === 'paste' && (
              <textarea
                className="w-full h-40 p-4 rounded-xl border-2 border-border focus:border-[#1B2A4A] focus:ring-0 bg-white dark:bg-black text-base"
                placeholder="Paste the contents of your document here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
            {uploadMode === 'camera' && (
              <div className="flex flex-col items-center">
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                <Button onClick={() => cameraInputRef.current?.click()} variant="outline" className="h-20 w-full border-2 border-dashed text-lg font-semibold bg-white dark:bg-black">
                  <Camera className="mr-3 h-6 w-6" /> Open Camera to Scan
                </Button>
                {text && <p className="mt-3 text-success font-bold flex items-center"><CheckCircle2 className="mr-2 h-5 w-5"/> Image scanned!</p>}
              </div>
            )}
          </div>

          <div className="w-full max-w-2xl border-t border-border/50 pt-8 mt-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 text-center">What kind of document is this?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {DOC_TYPES.map(dt => (
                <button
                  key={dt.id}
                  onClick={() => setSelectedDocType(dt.id)}
                  className={cn("flex flex-col items-center p-4 rounded-2xl border-2 transition-all bg-white dark:bg-black", selectedDocType === dt.id ? "border-[#1B2A4A] bg-[#1B2A4A]/5" : "border-border hover:border-[#1B2A4A]/40")}
                >
                  <div className={cn("mb-2", selectedDocType === dt.id ? "text-[#1B2A4A] dark:text-white" : "text-muted-foreground")}>{dt.icon}</div>
                  <span className="text-xs font-bold text-center">{dt.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-4">
             <select 
               className="h-14 px-4 rounded-xl border-2 border-border bg-white dark:bg-black font-semibold text-lg min-w-[140px]"
               value={language}
               onChange={(e: any) => setLanguage(e.target.value)}
             >
               <option value="en">English</option>
               <option value="hi">हिन्दी</option>
               <option value="mr">मराठी</option>
             </select>
             
             <Button 
               className="flex-1 h-14 bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white text-lg font-bold rounded-xl"
               onClick={runAnalysis}
               disabled={isLoading || !text}
             >
               {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Analyze Document →"}
             </Button>
          </div>
          {error && <p className="text-red-500 font-bold">{error}</p>}

          <p className="flex items-center text-xs text-muted-foreground font-semibold mt-4">
            <ShieldAlert className="h-4 w-4 mr-2" /> Your document is analyzed privately and never stored without consent.
          </p>

        </div>
      </div>
    );
  }

  // PHASE 2: DASHBOARD
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-72px)] overflow-hidden bg-background">
      
      {/* LEFT COLUMN: Document Viewer */}
      <div className="w-full md:w-1/2 h-full flex flex-col border-r border-border bg-[#FAF9F6] dark:bg-background">
        <div className="flex items-center justify-between p-4 bg-white dark:bg-card border-b border-border z-10 shrink-0">
          <div className="flex flex-col">
            <span className="font-bold text-[#1B2A4A] dark:text-white text-lg flex items-center gap-2">
               {currentAnalysis?.documentType} <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded-full">{paragraphs.length} paragraphs</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-border hidden sm:flex">
              <Switch id="simplify" checked={simplifiedMode} onCheckedChange={setSimplifiedMode} />
              <label htmlFor="simplify" className="text-xs font-bold cursor-pointer">Simplified Mode</label>
            </div>
            <Button variant="outline" size="sm" className="font-bold border-border" onClick={resetAnalysis}>
              📷 New
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-2xl mx-auto space-y-4 pb-20">
            {paragraphs.map((p, idx) => {
              // Basic logic: if simplified is on and we have simple text mapped, show it. Otherwise show raw.
              // Since the API didn't return simplified paragraphs, we just render the raw text. The user could enhance this later.
              const isSelected = selectedParagraphIndex === idx;
              return (
                <p 
                  key={idx}
                  data-index={idx}
                  onClick={() => handleParagraphClick(idx, p)}
                  className={cn(
                    "p-3 rounded-lg text-[15px] leading-relaxed cursor-pointer transition-colors border",
                    isSelected ? "bg-[#1B2A4A]/10 border-[#1B2A4A] dark:bg-[#1B2A4A]/40 dark:border-white shadow-sm" : "bg-white dark:bg-black border-transparent hover:bg-[#1B2A4A]/5 hover:border-border"
                  )}
                >
                  {p}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: AI Insights */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-full flex flex-col bg-white dark:bg-card" ref={rightColumnRef}>
        
        {/* TABS */}
        <div className="flex items-center gap-1 border-b border-border p-2 bg-muted/20 shrink-0 overflow-x-auto hide-scrollbar">
          {(['overview', 'risks', 'action', 'numbers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-4 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap transition-all",
                activeTab === t ? "bg-white dark:bg-black text-[#1B2A4A] dark:text-white shadow-sm border border-border" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {t === 'overview' && 'Overview'}
              {t === 'risks' && `Risk Flags (${currentAnalysis?.specificClauses?.length || 0})`}
              {t === 'action' && 'Action Plan'}
              {t === 'numbers' && 'Numbers'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto pb-20">

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col items-center justify-center text-center p-8 bg-[#FAF9F6] dark:bg-black rounded-3xl border border-border">
                  <div className={cn(
                    "w-32 h-32 rounded-full flex flex-col items-center justify-center border-[8px] mb-4",
                    (currentAnalysis?.riskScore || 0) < 30 ? "border-green-500 text-green-600 dark:text-green-400" :
                    (currentAnalysis?.riskScore || 0) < 70 ? "border-yellow-500 text-yellow-600 dark:text-yellow-400" :
                    "border-red-500 text-red-600 dark:text-red-400"
                  )}>
                    <span className="text-4xl font-black">{currentAnalysis?.riskScore}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Score</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1B2A4A] dark:text-white mb-2">{currentAnalysis?.documentType}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{currentAnalysis?.risk_explanation}</p>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/> Key Benefits</h4>
                    <ul className="space-y-2">
                      {currentAnalysis?.pros.map((pro: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-sm font-semibold">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500"/> Obligations</h4>
                    <ul className="space-y-2">
                      {currentAnalysis?.cons.map((con: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
                          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                          <span className="text-sm font-semibold">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* RISKS TAB */}
            {activeTab === 'risks' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-2xl font-black text-[#1B2A4A] dark:text-white">We found {currentAnalysis?.specificClauses?.length || 0} red flags in this document.</h3>
                
                <div className="space-y-4">
                  {currentAnalysis?.specificClauses?.map((flag: any, i: number) => {
                    const isHigh = flag.severity === 'high';
                    const isMed = flag.severity === 'medium';
                    return (
                      <div key={i} className={cn(
                        "p-5 rounded-2xl border-l-[6px] border-y border-r shadow-sm",
                        isHigh ? "border-l-red-500 border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10" :
                        isMed ? "border-l-orange-500 border-orange-100 dark:border-orange-900/30 bg-orange-50/30 dark:bg-orange-900/10" :
                        "border-l-yellow-500 border-yellow-100 dark:border-yellow-900/30 bg-yellow-50/30 dark:bg-yellow-900/10"
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn(
                            "px-2 py-1 text-[11px] font-black uppercase tracking-wider rounded-md",
                            isHigh ? "bg-red-500 text-white" : isMed ? "bg-orange-500 text-white" : "bg-yellow-500 text-white"
                          )}>
                            {isHigh ? '🔴 High Risk' : isMed ? '🟡 Medium Risk' : '🟢 Standard'}
                          </span>
                          <Button variant="ghost" size="sm" className="text-xs font-bold h-8">
                            Find in Document <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                        <blockquote className="text-[13px] italic text-muted-foreground border-l-[3px] border-border pl-3 mb-3 font-serif">
                          "{flag.quote || flag.text}"
                        </blockquote>
                        <p className="text-[15px] font-semibold text-foreground">{flag.explanation}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ACTION PLAN TAB */}
            {activeTab === 'action' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-2xl font-black text-[#1B2A4A] dark:text-white">Here is what you should do before signing.</h3>
                
                {(!currentAnalysis?.actionPlan || currentAnalysis.actionPlan.length === 0) ? (
                  <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-bold">No critical actions needed.</p>
                    <p className="text-muted-foreground text-sm">This document looks relatively safe.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {currentAnalysis.actionPlan.map((action: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-black border-2 border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-[#1B2A4A]"></div>
                        <h4 className="text-lg font-black text-[#1B2A4A] dark:text-white mb-2">{action.riskTitle}</h4>
                        <p className="text-[15px] text-muted-foreground font-medium mb-6">{action.actionText}</p>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button className="flex-1 bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white font-bold h-12 rounded-xl" onClick={() => copyEmail(action.emailTemplate)}>
                            <Copy className="mr-2 h-4 w-4" /> Copy Email to Lender
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-[#1B2A4A] text-[#1B2A4A] dark:border-white dark:text-white font-bold h-12 rounded-xl"
                            onClick={() => handleAskAi(action.riskTitle)}
                          >
                            <HelpCircle className="mr-2 h-4 w-4" /> Ask AI About This
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NUMBERS TAB */}
            {activeTab === 'numbers' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-2xl font-black text-[#1B2A4A] dark:text-white">The Real Cost</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border border-border inline-flex items-center gap-2">
                   <FileText className="h-4 w-4" /> Extracted directly from your document
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FAF9F6] dark:bg-black p-5 rounded-2xl border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Loan Amount</p>
                    <p className="text-2xl font-black">₹{currentAnalysis?.extractedFigures?.loan_amount?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="bg-[#FAF9F6] dark:bg-black p-5 rounded-2xl border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Interest Rate</p>
                    <p className="text-2xl font-black">{currentAnalysis?.extractedFigures?.interest_rate || '---'}%</p>
                  </div>
                  <div className="bg-[#FAF9F6] dark:bg-black p-5 rounded-2xl border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Tenure</p>
                    <p className="text-2xl font-black">{currentAnalysis?.extractedFigures?.tenure_months || '---'} mo</p>
                  </div>
                  <div className="bg-[#FAF9F6] dark:bg-black p-5 rounded-2xl border border-border">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Calculated EMI</p>
                    <p className="text-2xl font-black">₹{emiCalc ? emiCalc.toFixed(0) : '---'}</p>
                  </div>
                </div>

                <div className="mt-8 space-y-6 bg-white dark:bg-black p-6 rounded-3xl border-2 border-border shadow-sm">
                  <h4 className="font-black text-lg">Affordability Check</h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold">Your Monthly Income (₹)</label>
                      <span className="font-black text-lg">₹{incomeOverride.toLocaleString()}</span>
                    </div>
                    <input 
                      type="number" 
                      value={incomeOverride || ''} 
                      onChange={(e) => setIncomeOverride(Number(e.target.value))}
                      className="w-full h-12 px-4 rounded-xl border-2 border-border bg-transparent focus:border-[#1B2A4A] outline-none font-bold"
                      placeholder="Enter income to see risk..."
                    />
                  </div>

                  {incomeOverride > 0 && emiCalc > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-muted-foreground">EMI to Income Ratio</span>
                        <span className={cn("font-black text-xl", ratio > 40 ? "text-red-500" : ratio > 30 ? "text-orange-500" : "text-green-500")}>
                          {ratio.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full transition-all", ratio > 40 ? "bg-red-500" : ratio > 30 ? "bg-orange-500" : "bg-green-500")} style={{ width: `${Math.min(ratio, 100)}%` }}></div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Switch id="incomeDrop" checked={incomeDrop} onCheckedChange={setIncomeDrop} />
                        <label htmlFor="incomeDrop" className="text-sm font-bold cursor-pointer">What if income drops by 20%?</label>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
