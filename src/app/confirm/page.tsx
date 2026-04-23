'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, Check, X, Lock, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

// Confirmation checklist keys must match what /api/confirm expects
const CONFIRMATION_KEYS = [
  'understands_repayment',
  'understands_clauses',
  'understands_emi',
  'voluntary_decision',
  'authorizes_processing',
] as const;

const STATEMENT_LABELS: Record<typeof CONFIRMATION_KEYS[number], string> = {
  understands_repayment: 'I understand the total amount I will repay and the total extra interest.',
  understands_clauses:   'I have read and understood the hidden clauses and penalties.',
  understands_emi:       'I understand my monthly EMI obligation and how it impacts my income.',
  voluntary_decision:    'I am making this financial decision voluntarily without pressure.',
  authorizes_processing: 'I authorize the institution to process my application with these terms.',
};

// Fallback quiz shown if the analysis didn't produce AI questions
const FALLBACK_QUIZ = [
  {
    question: 'Do you understand the total repayment amount for this agreement?',
    options: ['Yes, I understand it fully', 'No, I need more time', 'I am not sure', 'I did not read it'],
    correct_answer: 'Yes, I understand it fully',
  },
  {
    question: 'Are you making this decision without any pressure or coercion?',
    options: ['Yes, completely voluntarily', 'Somewhat pressured', 'Under pressure', 'I am not sure'],
    correct_answer: 'Yes, completely voluntarily',
  },
];

export default function ConfirmPage() {
  const router = useRouter();
  const { currentAnalysis, currentSimulation, language, setCurrentAnalysis } = useAppStore();

  // ── Checklist state ──────────────────────────────────────────────────────
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>(
    Object.fromEntries(CONFIRMATION_KEYS.map((k) => [k, false]))
  );

  // ── Quiz state ───────────────────────────────────────────────────────────
  // Use AI questions from analysis if available, otherwise fallback
  const quizQuestions: { question: string; options: string[]; correct_answer: string }[] =
    currentAnalysis?.quiz?.length >= 2 ? currentAnalysis.quiz : FALLBACK_QUIZ;

  const [quizAnswers, setQuizAnswers] = useState<(string | null)[]>(
    new Array(quizQuestions.length).fill(null)
  );

  // ── Submit state ─────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const checkedCount = CONFIRMATION_KEYS.filter((k) => confirmations[k]).length;
  const quizPassed = quizAnswers.every(
    (ans, idx) => ans !== null && ans === quizQuestions[idx]?.correct_answer
  );
  const canConfirm = checkedCount === 5 && quizPassed;

  const toggleConfirmation = (key: string) => {
    setConfirmations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleQuizAnswer = (qIndex: number, answer: string) => {
    setQuizAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = answer;
      return next;
    });
  };

  // ── Final submit ─────────────────────────────────────────────────────────
  const finalConfirm = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Build the quiz_answers payload for the API
      const quiz_answers = quizQuestions.map((q, i) => ({
        question: q.question,
        user_answer: quizAnswers[i] ?? '',
        correct_answer: q.correct_answer,
      }));

      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: `session-${Date.now()}`,
          quiz_answers,
          confirmations,
          simulation_data: currentSimulation ?? {},
          analysis_data: currentAnalysis ?? {},
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || `Server error ${response.status}`);
      }

      // Persist consent result into analysis store so Receipt page can read it
      setCurrentAnalysis({
        ...(currentAnalysis ?? {}),
        consent_id: data.consent_id,
        consent_summary: data.consent_summary,
        quiz_score: data.quiz_score,
        timestamp: data.timestamp,
      });

      router.push('/receipt');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowModal(false);
    }
  };

  // Keyboard ESC closes modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // ── Redirect if navigated directly with no data ────────────────────────────
  useEffect(() => {
    if (!currentAnalysis && !currentSimulation) {
      router.replace('/analyze');
    }
  }, []);

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl relative">
      <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground mb-8">
        Your Informed Consent
      </h1>

      {/* ── Section 1: Checklist ── */}
      <div className="space-y-6 mb-12">
        <h2 className="text-[22px] font-bold text-primary dark:text-primary-foreground">
          1. Consent Checklist
        </h2>
        <div className="space-y-4">
          {CONFIRMATION_KEYS.map((key, idx) => (
            <Card
              key={key}
              className={cn(
                'border-l-[6px] border-y-[1px] border-r-[1px] bg-surface dark:bg-card shadow-sm transition-colors',
                confirmations[key] ? 'border-l-success border-border' : 'border-l-warning border-border'
              )}
            >
              <CardContent
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => toggleConfirmation(key)}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    id={`check-${idx}`}
                    checked={confirmations[key]}
                    onCheckedChange={() => toggleConfirmation(key)}
                    className="h-6 w-6 mt-1 data-[state=checked]:bg-success data-[state=checked]:border-success"
                  />
                </div>
                <Label
                  htmlFor={`check-${idx}`}
                  className="text-[18px] font-medium leading-relaxed flex-1 cursor-pointer"
                >
                  {STATEMENT_LABELS[key]}
                </Label>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-[18px] font-bold text-muted-foreground mt-2">
          {checkedCount} of 5 confirmed
        </p>
      </div>

      {/* ── Section 2: AI Quiz ── */}
      <div className="space-y-6 mb-12">
        <h2 className="text-[22px] font-bold text-primary dark:text-primary-foreground">
          2. Comprehension Check
        </h2>
        {!currentAnalysis?.quiz?.length && (
          <div className="flex items-center gap-2 text-[14px] text-muted-foreground bg-muted/30 px-4 py-3 rounded-lg border border-border">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Using general comprehension questions — analyze a document first for personalised questions.
          </div>
        )}

        {quizQuestions.map((q, qIndex) => {
          const selected = quizAnswers[qIndex];
          const isCorrect = selected === q.correct_answer;

          return (
            <div
              key={qIndex}
              className="bg-surface dark:bg-card p-6 rounded-xl border border-border"
            >
              <p className="text-[20px] font-bold mb-4 flex items-start">
                <HelpCircle className="mr-3 h-6 w-6 text-primary mt-1 shrink-0" />
                {q.question}
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {q.options.map((opt: string, oIndex: number) => {
                  const isThisSelected = selected === opt;
                  const isThisCorrect = opt === q.correct_answer;

                  let btnColor = 'border-border text-foreground hover:bg-muted';
                  if (selected !== null) {
                    if (isThisSelected && isThisCorrect) btnColor = 'border-success bg-success/10 text-success border-2';
                    else if (isThisSelected && !isThisCorrect) btnColor = 'border-warning bg-warning/10 text-warning border-2';
                    else if (!isThisSelected && isThisCorrect) btnColor = 'border-success border-2 opacity-50';
                    else btnColor = 'opacity-50';
                  }

                  return (
                    <Button
                      key={oIndex}
                      variant="outline"
                      className={cn('h-[64px] text-[16px] whitespace-normal flex justify-start px-4 text-left', btnColor)}
                      onClick={() => handleQuizAnswer(qIndex, opt)}
                    >
                      {opt}
                    </Button>
                  );
                })}
              </div>
              {selected !== null && (
                <div className="mt-4 text-[16px] font-bold flex items-center">
                  {isCorrect ? (
                    <span className="text-success flex items-center">
                      <Check className="mr-2" /> Great! You got it.
                    </span>
                  ) : (
                    <span className="text-warning flex items-center">
                      <X className="mr-2" /> Incorrect. Please review the terms.
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Error banner ── */}
      {submitError && (
        <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r text-danger font-semibold text-[16px] flex items-center justify-between">
          <span>{submitError}</span>
          <Button variant="link" onClick={() => setSubmitError(null)} className="text-danger p-0 shrink-0 ml-4">
            Dismiss
          </Button>
        </div>
      )}

      {/* ── Submit row ── */}
      <div className="border-t border-border pt-8 flex flex-col items-center">
        <Button
          disabled={!canConfirm || isSubmitting}
          onClick={() => setShowModal(true)}
          className={cn(
            'w-full md:w-[400px] h-[52px] text-[20px] font-bold rounded-xl transition-all shadow-md',
            canConfirm ? 'bg-success hover:bg-success/90 text-white' : 'bg-muted text-muted-foreground'
          )}
        >
          {canConfirm ? 'I Confirm and Approve ✔' : 'Please complete checklist & quiz'}
        </Button>
        <div className="mt-6 flex items-center gap-2 text-muted-foreground font-semibold text-[16px]">
          <Lock className="h-5 w-5" />
          <span>Your consent is recorded securely</span>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !isSubmitting && setShowModal(false)}
        >
          <div
            className="bg-surface dark:bg-card w-full max-w-[400px] rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-4">
              <HelpCircle className="h-10 w-10 text-warning" />
            </div>
            <h3 className="text-[28px] font-bold text-primary dark:text-primary-foreground mb-2">
              Are you sure?
            </h3>
            <p className="text-[18px] text-muted-foreground mb-8">
              Once confirmed this cannot be undone. You are agreeing to everything in the document.
            </p>

            <div className="flex flex-col w-full gap-3">
              <Button
                onClick={finalConfirm}
                disabled={isSubmitting}
                className="w-full h-[52px] text-[18px] font-bold bg-success hover:bg-success/90 text-white rounded-xl disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Recording consent...</>
                ) : (
                  'Yes, Confirm →'
                )}
              </Button>
              <Button
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                variant="outline"
                className="w-full h-[52px] text-[18px] font-bold text-danger border-[2px] border-danger/30 hover:bg-danger/10 rounded-xl bg-transparent"
              >
                No, Go Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
