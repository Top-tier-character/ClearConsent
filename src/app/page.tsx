import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ArrowRight, Lock, Brain, FileWarning, Search, Zap } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function LandingPage() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error('[authOptions] getServerSession failed:', err);
  }

  return (
    <div className="overflow-hidden bg-[#FAF9F6] dark:bg-background">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 md:py-32 text-center flex flex-col items-center">
        {/* Subtle radial background glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(27,42,74,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-[#1B2A4A]/10 dark:bg-white/10 text-[#1B2A4A] dark:text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full mb-8 border border-[#1B2A4A]/20 dark:border-white/20">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" /> The Anti-Predatory Lending Tool
          </div>

          <h1 className="text-[40px] sm:text-[56px] md:text-[72px] font-black text-[#1B2A4A] dark:text-white tracking-tight mb-6 leading-[1.1] px-2">
            The only loan analyzer that works for <span className="text-red-500 underline decoration-4 underline-offset-8">you</span>, not the bank.
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium mb-12 max-w-2xl px-2">
            Upload any contract. We'll find the hidden traps, predatory clauses, and true costs in 5 seconds. Don't sign blindly.
          </p>

          {/* CTA buttons */}
          <div className="flex justify-center w-full max-w-lg sm:w-auto">
            {session?.user ? (
              <Link href="/analyze" className="w-full sm:w-auto">
                <Button className="w-full h-16 px-10 text-xl font-black rounded-2xl shadow-lg transition-transform hover:-translate-y-1 bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white">
                  <Search className="mr-3 h-6 w-6 shrink-0" />
                  Analyze a Document Now
                </Button>
              </Link>
            ) : (
              <Link href="/analyze" className="w-full sm:w-auto">
                <Button className="w-full h-16 px-10 text-xl font-black rounded-2xl shadow-lg transition-transform hover:-translate-y-1 bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white">
                  <Search className="mr-3 h-6 w-6 shrink-0" />
                  Analyze a Document for Free
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground font-bold text-sm bg-black/5 dark:bg-white/5 px-6 py-3 rounded-full">
            <Lock className="h-4 w-4 text-green-600 shrink-0" />
            <span>Your documents are analyzed privately and instantly deleted.</span>
          </div>
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────────────────────── */}
      <section className="w-full px-4 sm:px-6 py-20 bg-white dark:bg-[#0F172A] border-y border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <Card className="border-2 border-border shadow-sm hover:border-[#1B2A4A] transition-all duration-200 pt-6 rounded-3xl bg-[#FAF9F6] dark:bg-card">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto bg-red-100 dark:bg-red-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                  <FileWarning className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-2xl font-black text-[#1B2A4A] dark:text-white">Red Flag Finder</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground text-[17px] font-medium px-6 pb-8">
                We instantly scan for aggressive late fees, variable interest rate traps, and unfair repossession clauses buried in the fine print.
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="border-2 border-border shadow-sm hover:border-[#1B2A4A] transition-all duration-200 pt-6 rounded-3xl bg-[#FAF9F6] dark:bg-card">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto bg-orange-100 dark:bg-orange-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                  <Zap className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-2xl font-black text-[#1B2A4A] dark:text-white">Action Plan Generator</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground text-[17px] font-medium px-6 pb-8">
                Don't just find out what's wrong—know how to fix it. We generate exact email templates you can send to your lender to negotiate better terms.
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="border-2 border-border shadow-sm hover:border-[#1B2A4A] transition-all duration-200 pt-6 rounded-3xl bg-[#FAF9F6] dark:bg-card sm:col-span-2 md:col-span-1">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                  <Brain className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-black text-[#1B2A4A] dark:text-white">True Cost Calculator</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground text-[17px] font-medium px-6 pb-8">
                We extract the numbers directly from the document to show you exactly how much extra money the bank is taking over time.
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* ── CTA Bottom ────────────────────────────────────────────────────── */}
      <section className="bg-[#1B2A4A] py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-8">
            Protect yourself before you sign.
          </h2>
          <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto font-medium">
            Join thousands of users who are using ClearConsent to level the playing field against predatory financial institutions.
          </p>
          <Link href="/analyze">
            <Button className="h-16 px-12 text-xl font-black rounded-2xl bg-white text-[#1B2A4A] hover:bg-gray-100 shadow-xl transition-transform hover:-translate-y-1">
              Start Your Free Analysis <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
