'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Lock, Zap, Globe, Bot, Upload, Mail, Activity, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-[#FAF9F6] dark:bg-background">
      
      {/* ── Fix 1: Hero Section ────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 md:py-32 text-center flex flex-col items-center">
        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-[36px] font-bold text-[#1B2A4A] dark:text-white tracking-tight mb-6 leading-tight">
            Never Sign a Bad Loan Again
          </h1>
          <p className="text-[20px] text-muted-foreground font-medium mb-8 max-w-2xl">
            Upload any loan agreement, insurance policy, or mandate. ClearConsent's AI finds the hidden traps, calculates what you actually pay, and tells you exactly what to do — in plain language.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <div className="flex items-center gap-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm font-bold px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-4 w-4" /> Works in English, हिंदी, मराठी
            </div>
            <div className="flex items-center gap-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm font-bold px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-4 w-4" /> Your document is never stored
            </div>
            <div className="flex items-center gap-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm font-bold px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-4 w-4" /> Free to use
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md sm:max-w-none">
            <Link href="/analyze" className="w-full sm:w-auto">
              <Button className="w-full h-[52px] px-8 text-[18px] font-black rounded-xl bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white">
                Analyze Your Document Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" className="w-full sm:w-auto h-[52px] px-8 text-[18px] font-bold rounded-xl border-2" onClick={() => { document.getElementById('live-demo')?.scrollIntoView({ behavior: 'smooth' }); }}>
              See a live example
            </Button>
          </div>
        </div>
      </section>

      {/* ── Fix 2: Live Demo Section ───────────────────────────────────────── */}
      <section id="live-demo" className="w-full px-4 sm:px-6 py-16 bg-white dark:bg-[#0F172A] border-y border-border">
        <div className="container mx-auto max-w-4xl flex flex-col items-center">
          <h2 className="text-3xl font-black text-[#1B2A4A] dark:text-white mb-8">See It In Action</h2>
          
          <Card className="w-full bg-[#FAF9F6] dark:bg-card border-2 border-border shadow-md rounded-2xl overflow-hidden text-left">
            <div className="bg-muted px-4 py-3 border-b border-border font-bold text-sm text-muted-foreground">
              Sample Analysis — Personal Loan Agreement
            </div>
            <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-6">
              <div className="flex items-center justify-center w-32 h-32 rounded-full border-[6px] border-red-500 bg-red-50 dark:bg-red-950/30">
                <div className="text-center">
                  <div className="text-3xl font-black text-red-600 dark:text-red-400 leading-none">42<span className="text-lg text-red-400">/100</span></div>
                  <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mt-1">High Risk</div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-r-xl">
                  <span className="font-bold text-red-700 dark:text-red-400">🔴 High Risk:</span> "Prepayment Penalty Clause — You will be charged 3% of remaining balance if you repay early"
                </div>
                <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-r-xl">
                  <span className="font-bold text-amber-700 dark:text-amber-400">🟡 Medium Risk:</span> "Floating Interest Rate — Your rate can increase without notice after 6 months"
                </div>
                <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30 p-4 rounded-r-xl">
                  <span className="font-bold text-green-700 dark:text-green-400">🟢 Standard:</span> "Monthly EMI of ₹4,584 for 12 months — Total repayment ₹55,008"
                </div>
              </div>

              <div className="w-full bg-[#1B2A4A] text-white p-5 rounded-xl text-center font-medium">
                In total you will pay ₹55,008 — that is ₹5,008 more than you borrowed
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide text-center">
                This is what ClearConsent shows you for any document you upload
              </p>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Link href="/analyze">
              <Button className="h-14 px-8 text-[16px] font-bold rounded-xl bg-primary hover:bg-primary/90 text-white">
                Analyze your own document <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Fix 4: How It Works Section ────────────────────────────────────── */}
      <section className="w-full px-4 sm:px-6 py-16 bg-[#FAF9F6] dark:bg-background">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-black text-[#1B2A4A] dark:text-white mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-12 left-[15%] right-[15%] h-1 bg-border z-0"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-card border-4 border-border flex items-center justify-center mb-6 shadow-sm">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#1B2A4A] dark:text-white mb-2">Step 1: Upload or paste your document</h3>
              <p className="text-muted-foreground font-medium">PDF, image, or text</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-card border-4 border-border flex items-center justify-center mb-6 shadow-sm">
                <Activity className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#1B2A4A] dark:text-white mb-2">Step 2: AI analyzes every clause</h3>
              <p className="text-muted-foreground font-medium">Risk score calculated in seconds</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-card border-4 border-border flex items-center justify-center mb-6 shadow-sm">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#1B2A4A] dark:text-white mb-2">Step 3: Get your action plan</h3>
              <p className="text-muted-foreground font-medium">Ready-to-send negotiation emails included</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fix 3: Add Trust Section ───────────────────────────────────────── */}
      <section className="w-full px-4 sm:px-6 py-16 bg-white dark:bg-[#0F172A] border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-black text-center text-[#1B2A4A] dark:text-white mb-12">Why People Trust ClearConsent</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 border-border shadow-sm rounded-2xl bg-[#FAF9F6] dark:bg-card">
              <CardContent className="p-6 text-center">
                <Lock className="h-8 w-8 text-[#1B2A4A] dark:text-white mx-auto mb-4" />
                <p className="text-[15px] font-medium text-muted-foreground">Your document is analyzed privately — we never store your financial documents</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border shadow-sm rounded-2xl bg-[#FAF9F6] dark:bg-card">
              <CardContent className="p-6 text-center">
                <Bot className="h-8 w-8 text-[#1B2A4A] dark:text-white mx-auto mb-4" />
                <p className="text-[15px] font-medium text-muted-foreground">Powered by Groq AI — the same technology used by financial professionals</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border shadow-sm rounded-2xl bg-[#FAF9F6] dark:bg-card">
              <CardContent className="p-6 text-center">
                <Globe className="h-8 w-8 text-[#1B2A4A] dark:text-white mx-auto mb-4" />
                <p className="text-[15px] font-medium text-muted-foreground">Available in English, Hindi, and Marathi — built for India</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border shadow-sm rounded-2xl bg-[#FAF9F6] dark:bg-card">
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 text-[#1B2A4A] dark:text-white mx-auto mb-4" />
                <p className="text-[15px] font-medium text-muted-foreground">Results in under 10 seconds — faster than reading the fine print yourself</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Fix 6: Disclaimer Footer ───────────────────────────────────────── */}
      <footer className="w-full px-4 py-8 bg-[#FAF9F6] dark:bg-background text-center border-t border-border">
        <p className="text-[12px] text-muted-foreground max-w-3xl mx-auto">
          ClearConsent provides AI-powered document analysis for educational purposes only. This is not legal or financial advice. Always consult a qualified professional before making financial decisions.
        </p>
      </footer>

    </div>
  );
}
