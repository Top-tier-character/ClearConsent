import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSearch, Calculator, CheckCircle, ArrowRight, Lock, Upload, Brain, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-20 md:py-32 text-center flex flex-col items-center bg-gradient-to-b from-background to-card dark:from-background dark:to-card">
        {/* Subtle radial background glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(27,42,74,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

        <div className="relative max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-success/10 text-success font-semibold text-[14px] px-4 py-1.5 rounded-full mb-6 border border-success/20">
            <ShieldCheck className="h-4 w-4" /> Trusted Financial Decision Assistant
          </div>

          <h1 className="text-[40px] md:text-[56px] font-bold text-primary dark:text-primary-foreground tracking-tight mb-6 leading-tight">
            Understand Before<br className="hidden md:block" /> You Sign
          </h1>
          <p className="text-[20px] md:text-[22px] text-muted-foreground mb-10 leading-relaxed max-w-3xl">
            We translate confusing legal documents into plain language, calculate your actual loan costs,
            and check for hidden risks — before you make a commitment.
          </p>

          {/* CTA buttons — visually distinct */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
            <Link href="/analyze" className="w-full sm:w-auto">
              <Button className="w-full h-[52px] px-10 text-[18px] font-bold rounded-xl shadow-md transition-transform hover:-translate-y-1">
                <FileSearch className="mr-2 h-6 w-6" />
                Analyze a Financial Document
              </Button>
            </Link>
            <Link href="/simulate" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full h-[52px] px-10 text-[18px] font-bold rounded-xl shadow-sm transition-transform hover:-translate-y-1 bg-transparent border-2 border-primary text-primary dark:border-primary-foreground dark:text-primary-foreground"
              >
                <Calculator className="mr-2 h-6 w-6" />
                Simulate a Loan or EMI
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-2 text-muted-foreground font-semibold text-[15px] bg-muted/50 dark:bg-[#1E293B]/50 px-5 py-2.5 rounded-full">
            <Lock className="h-5 w-5 text-success" />
            <span>Your data is private, encrypted, and never shared</span>
          </div>
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-16 max-w-6xl">
        <h2 className="text-[28px] md:text-[36px] font-bold text-center text-primary dark:text-primary-foreground mb-12">
          Everything you need to decide with confidence
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <Card className="border-[2px] border-border bg-surface dark:bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 pt-4 rounded-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4 text-[36px]">
                📄
              </div>
              <CardTitle className="text-[22px] font-bold text-primary dark:text-primary-foreground">Simplify Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground text-[17px] px-6 pb-6">
              Upload your agreement or paste the text. We instantly show you the clear benefits and obligations in plain language.
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card className="border-[2px] border-border bg-surface dark:bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 pt-4 rounded-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-warning/10 w-20 h-20 rounded-full flex items-center justify-center mb-4 text-[36px]">
                📊
              </div>
              <CardTitle className="text-[22px] font-bold text-primary dark:text-primary-foreground">Predict Risk</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground text-[17px] px-6 pb-6">
              Calculate exactly how much extra money you will pay and verify if the monthly cost is safe for your income.
            </CardContent>
          </Card>

          {/* Card 3 */}
          <Card className="border-[2px] border-border bg-surface dark:bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 pt-4 rounded-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-success/10 w-20 h-20 rounded-full flex items-center justify-center mb-4 text-[36px]">
                ✅
              </div>
              <CardTitle className="text-[22px] font-bold text-primary dark:text-primary-foreground">Confirm with Confidence</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground text-[17px] px-6 pb-6">
              Pass a quick comprehension check, confirm you understand the facts, and generate a secure digital receipt.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="bg-muted/30 dark:bg-[#1E293B] py-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-[28px] md:text-[36px] font-bold text-center text-primary dark:text-primary-foreground mb-12">
            How It Works
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-0 md:gap-0">
            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center text-center px-6 py-8">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-5 shadow-lg">
                <Upload className="h-9 w-9 text-white" />
              </div>
              <div className="text-[13px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Step 1</div>
              <h3 className="text-[22px] font-bold text-primary dark:text-primary-foreground mb-2">Upload</h3>
              <p className="text-[16px] text-muted-foreground">
                Paste your document text or upload a PDF or TXT file.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center text-muted-foreground shrink-0">
              <ArrowRight className="h-8 w-8" />
            </div>
            <div className="md:hidden text-muted-foreground my-2">
              <ArrowRight className="h-6 w-6 rotate-90" />
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center text-center px-6 py-8">
              <div className="w-20 h-20 rounded-full bg-warning flex items-center justify-center mb-5 shadow-lg">
                <Brain className="h-9 w-9 text-white" />
              </div>
              <div className="text-[13px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Step 2</div>
              <h3 className="text-[22px] font-bold text-primary dark:text-primary-foreground mb-2">Understand</h3>
              <p className="text-[16px] text-muted-foreground">
                Our AI breaks down complex terms into simple, plain-language explanations.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center text-muted-foreground shrink-0">
              <ArrowRight className="h-8 w-8" />
            </div>
            <div className="md:hidden text-muted-foreground my-2">
              <ArrowRight className="h-6 w-6 rotate-90" />
            </div>

            {/* Step 3 */}
            <div className="flex-1 flex flex-col items-center text-center px-6 py-8">
              <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center mb-5 shadow-lg">
                <CheckCircle className="h-9 w-9 text-white" />
              </div>
              <div className="text-[13px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Step 3</div>
              <h3 className="text-[22px] font-bold text-primary dark:text-primary-foreground mb-2">Confirm</h3>
              <p className="text-[16px] text-muted-foreground">
                Confirm your understanding and receive a secure, verifiable consent record.
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <Link href="/analyze">
              <Button className="h-[52px] px-10 text-[18px] font-bold rounded-xl shadow-md">
                Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
