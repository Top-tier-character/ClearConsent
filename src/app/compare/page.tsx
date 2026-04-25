'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, CheckCircle2, AlertTriangle, Scale, Trophy, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ComparePage() {
  const { language } = useAppStore();

  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (t: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const content = await file.text();
        setter(content);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.text) {
          setter(data.text);
        } else {
          setError(data.error || 'Could not extract text from PDF.');
        }
      }
    } catch {
      setError('Failed to read file');
    }
  };

  const handleCompare = async () => {
    if (!text1.trim() || !text2.trim()) {
      setError('Please provide text for both documents.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text1, text2, language }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Analysis failed (${response.status})`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetComparison = () => {
    setResult(null);
    setText1('');
    setText2('');
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-[#1B2A4A] dark:text-white tracking-tight mb-4 flex justify-center items-center gap-3">
          <Scale className="h-10 w-10 text-primary" /> Compare Documents
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Not sure which loan or policy to choose? Paste both below, and our AI will instantly highlight the better option and hidden traps.
        </p>
      </div>

      {!result ? (
        <div className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Document 1 */}
            <div className="bg-[#FAF9F6] dark:bg-card p-6 rounded-3xl border-2 border-[#1B2A4A]/10 dark:border-border">
              <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
                <span>Document A</span>
                <Button size="sm" variant="outline" onClick={() => fileInputRef1.current?.click()}>
                  <UploadCloud className="h-4 w-4 mr-2" /> Upload PDF
                </Button>
                <input ref={fileInputRef1} type="file" accept=".txt,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, setText1)} />
              </h2>
              <textarea
                className="w-full h-64 p-4 rounded-xl border border-border focus:border-[#1B2A4A] outline-none resize-none"
                placeholder="Paste the contents of Document A here..."
                value={text1}
                onChange={(e) => setText1(e.target.value)}
              />
            </div>

            {/* Document 2 */}
            <div className="bg-[#FAF9F6] dark:bg-card p-6 rounded-3xl border-2 border-[#1B2A4A]/10 dark:border-border">
              <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
                <span>Document B</span>
                <Button size="sm" variant="outline" onClick={() => fileInputRef2.current?.click()}>
                  <UploadCloud className="h-4 w-4 mr-2" /> Upload PDF
                </Button>
                <input ref={fileInputRef2} type="file" accept=".txt,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, setText2)} />
              </h2>
              <textarea
                className="w-full h-64 p-4 rounded-xl border border-border focus:border-[#1B2A4A] outline-none resize-none"
                placeholder="Paste the contents of Document B here..."
                value={text2}
                onChange={(e) => setText2(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 font-bold text-center">{error}</p>}

          <div className="flex justify-center">
            <Button 
              className="h-14 px-12 bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white text-lg font-bold rounded-xl shadow-lg"
              onClick={handleCompare}
              disabled={isLoading || !text1 || !text2}
            >
              {isLoading ? <><Loader2 className="animate-spin h-6 w-6 mr-3" /> Analyzing Both...</> : "Compare Now →"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-[#1B2A4A] dark:text-white">Comparison Results</h2>
            <Button variant="outline" onClick={resetComparison}>New Comparison</Button>
          </div>

          {/* Verdict Banner */}
          <div className={cn(
            "p-8 rounded-3xl border-2 text-center shadow-sm",
            result.comparison?.winner === 'doc1' ? "bg-green-50 dark:bg-green-900/10 border-green-200" :
            result.comparison?.winner === 'doc2' ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200" :
            "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200"
          )}>
            <div className="flex justify-center mb-4">
              {result.comparison?.winner === 'equal' ? (
                <Scale className="h-16 w-16 text-yellow-500" />
              ) : (
                <Trophy className={cn("h-16 w-16", result.comparison?.winner === 'doc1' ? "text-green-500" : "text-blue-500")} />
              )}
            </div>
            <h3 className="text-2xl font-black mb-2">
              {result.comparison?.winner === 'doc1' ? "Document A is Better" :
               result.comparison?.winner === 'doc2' ? "Document B is Better" :
               "It's a Tie (Similar Risk)"}
            </h3>
            <p className="text-lg font-medium text-muted-foreground">{result.comparison?.verdict}</p>
          </div>

          {/* Side by side stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Doc A */}
            <div className={cn(
              "p-6 rounded-3xl border-2",
              result.comparison?.winner === 'doc1' ? "border-green-400 bg-green-50/30 dark:bg-green-900/5 shadow-md" : "border-border bg-card"
            )}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <h4 className="text-xl font-bold">Document A</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Risk Score</span>
                  <span className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full font-black text-white",
                    result.doc1?.risk_score < 30 ? "bg-green-500" :
                    result.doc1?.risk_score < 70 ? "bg-yellow-500" : "bg-red-500"
                  )}>{result.doc1?.risk_score || 0}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500"/> Key Benefits
                  </h5>
                  <ul className="text-sm space-y-1 ml-6 list-disc text-foreground">
                    {result.doc1?.pros?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500"/> Major Risks
                  </h5>
                  <ul className="text-sm space-y-1 ml-6 list-disc text-foreground">
                    {result.doc1?.hidden_clauses?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Doc B */}
            <div className={cn(
              "p-6 rounded-3xl border-2",
              result.comparison?.winner === 'doc2' ? "border-blue-400 bg-blue-50/30 dark:bg-blue-900/5 shadow-md" : "border-border bg-card"
            )}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <h4 className="text-xl font-bold">Document B</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Risk Score</span>
                  <span className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full font-black text-white",
                    result.doc2?.risk_score < 30 ? "bg-green-500" :
                    result.doc2?.risk_score < 70 ? "bg-yellow-500" : "bg-red-500"
                  )}>{result.doc2?.risk_score || 0}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500"/> Key Benefits
                  </h5>
                  <ul className="text-sm space-y-1 ml-6 list-disc text-foreground">
                    {result.doc2?.pros?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500"/> Major Risks
                  </h5>
                  <ul className="text-sm space-y-1 ml-6 list-disc text-foreground">
                    {result.doc2?.hidden_clauses?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-card rounded-3xl border-2 border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold w-1/3">Parameter</th>
                  <th className="p-4 font-bold border-l border-border text-center w-1/3">Document A</th>
                  <th className="p-4 font-bold border-l border-border text-center w-1/3">Document B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.comparison?.table?.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-semibold">{row.parameter}</td>
                    <td className={cn(
                      "p-4 border-l border-border text-center",
                      row.winner === 'doc1' ? "bg-green-50/50 dark:bg-green-900/10 font-bold text-green-700 dark:text-green-400" : ""
                    )}>
                      {row.doc1_value}
                    </td>
                    <td className={cn(
                      "p-4 border-l border-border text-center",
                      row.winner === 'doc2' ? "bg-blue-50/50 dark:bg-blue-900/10 font-bold text-blue-700 dark:text-blue-400" : ""
                    )}>
                      {row.doc2_value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
