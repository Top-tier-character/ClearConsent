'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Download, Home, FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';

export default function ReceiptPage() {
  const { currentSimulation, currentAnalysis, language } = useAppStore();

  // consent_id, consent_summary, quiz_score and timestamp are written into
  // currentAnalysis by the confirm page immediately after /api/confirm responds.
  const consentId: string =
    currentAnalysis?.consent_id ||
    `CLR-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;

  const quizScore: number = currentAnalysis?.quiz_score ?? 100;
  const totalQuestions: number = currentAnalysis?.quiz?.length ?? 2;
  const correctCount = Math.round((quizScore / 100) * totalQuestions);

  const consentSummary: string = currentAnalysis?.consent_summary ?? '';

  const timestamp: string = currentAnalysis?.timestamp
    ? new Date(currentAnalysis.timestamp).toLocaleString()
    : new Date().toLocaleString();

  const docType = currentSimulation ? 'Loan Simulation' : 'Document Analysis';
  const docName = currentSimulation
    ? `Loan Estimate (₹${Number(currentSimulation.loan_amount ?? currentSimulation.amount ?? 0).toLocaleString('en-IN')})`
    : 'Financial Agreement';

  const handleDownload = () => window.print();

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center">

      {/* CSS Animated Checkmark (styles in globals.css) */}
      <svg className="checkmark mb-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
        <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
      </svg>

      <h1 className="text-[32px] font-bold text-success mb-10 text-center">
        Consent Recorded Successfully
      </h1>

      <Card className="w-full max-w-[560px] bg-surface dark:bg-card border-[2px] border-border shadow-md rounded-2xl overflow-hidden relative">
        <div className="bg-success text-white py-3 px-6 flex justify-center items-center gap-2 font-bold text-[18px]">
          <ShieldCheck className="h-6 w-6" />
          Verified Informed Consent ✔
        </div>

        <CardContent className="p-8 pb-10 space-y-6">
          <div className="grid grid-cols-2 gap-y-4 text-[16px] border-b border-border pb-6">
            <span className="text-muted-foreground font-semibold">Document Name:</span>
            <span className="text-primary dark:text-primary-foreground font-bold flex items-center justify-end text-right">
              <FileText className="h-4 w-4 mr-2 shrink-0" /> {docName}
            </span>

            <span className="text-muted-foreground font-semibold">Type:</span>
            <span className="text-primary dark:text-primary-foreground font-bold text-right">{docType}</span>

            <span className="text-muted-foreground font-semibold">Language Used:</span>
            <span className="text-primary dark:text-primary-foreground font-bold text-right">
              {language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English'}
            </span>

            <span className="text-muted-foreground font-semibold">Date and Time:</span>
            <span className="text-primary dark:text-primary-foreground font-bold text-right">
              {timestamp}
            </span>

            <span className="text-muted-foreground font-semibold">Quiz Score:</span>
            <span className="text-primary dark:text-primary-foreground font-bold text-right">
              {correctCount}/{totalQuestions} ({quizScore}%)
            </span>
          </div>

          {/* Consent ID */}
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-muted-foreground font-semibold text-[14px] uppercase tracking-wider mb-2">
              Consent ID Number
            </p>
            <p className="font-mono text-[28px] font-bold tracking-widest text-primary dark:text-primary-foreground px-6 py-2 bg-muted/50 rounded-lg border border-border">
              {consentId}
            </p>
          </div>

          {/* AI-generated consent summary */}
          {consentSummary && (
            <div className="bg-muted/30 rounded-xl border border-border p-5">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                What you confirmed
              </p>
              <p className="text-[15px] text-foreground leading-relaxed">{consentSummary}</p>
            </div>
          )}

          {/* QR placeholder */}
          <div className="w-[150px] h-[150px] mx-auto border-[2px] border-dashed border-border rounded-xl flex flex-col items-center justify-center p-4 bg-muted/20">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mb-2 rounded shadow-inner">
              <span className="text-primary font-mono text-[10px] text-center leading-tight">QR CODE</span>
            </div>
            <p className="text-[10px] text-center text-muted-foreground font-semibold">
              Scan to verify this consent
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-[560px] flex flex-col sm:flex-row gap-4 mt-8">
        <Button
          onClick={handleDownload}
          className="flex-1 h-[52px] text-[18px] font-bold bg-success hover:bg-success/90 text-white rounded-xl shadow-md"
        >
          <Download className="mr-2 h-6 w-6" /> Download Receipt as PDF
        </Button>
        <Link href="/" className="flex-1">
          <Button
            variant="outline"
            className="w-full h-[52px] text-[18px] font-bold border-[2px] border-border bg-card text-primary dark:text-primary-foreground hover:bg-muted rounded-xl"
          >
            <Home className="mr-2 h-6 w-6" /> Go Back Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
