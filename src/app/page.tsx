import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSearch, Calculator, CheckCircle, ArrowRight, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="container mx-auto px-6 py-12 md:py-24">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto mb-20 flex flex-col items-center">
        <h1 className="text-[36px] md:text-[48px] font-bold text-primary dark:text-primary-foreground tracking-tight mb-6 leading-tight">
          Understand Before You Sign
        </h1>
        <p className="text-[20px] md:text-[24px] text-muted-foreground mb-10 leading-relaxed max-w-3xl">
          We translate confusing legal documents into plain language, calculate your actual loan costs, and check for hidden risks before you make a commitment.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
          <Link href="/analyze" className="w-full sm:w-auto">
            <Button className="w-full h-[52px] px-8 text-[18px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md transition-transform hover:-translate-y-1">
              <FileSearch className="mr-2 h-6 w-6" />
              Analyze a Financial Document
            </Button>
          </Link>
          <Link href="/simulate" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full h-[52px] px-8 text-[18px] font-bold border-[2px] border-border bg-card hover:bg-muted text-primary dark:text-primary-foreground rounded-xl shadow-sm transition-transform hover:-translate-y-1">
              <Calculator className="mr-2 h-6 w-6" />
              Simulate a Loan or EMI
            </Button>
          </Link>
        </div>
        <div className="mt-8 flex items-center gap-2 text-muted-foreground font-semibold text-[16px] bg-muted/50 px-4 py-2 rounded-full">
          <Lock className="h-5 w-5 text-success" />
          <span>Your data is private and secure</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <Card className="border-[2px] border-border bg-surface dark:bg-card shadow-sm hover:shadow-md transition-all pt-4 rounded-2xl">
          <CardHeader className="text-center pb-4 text-primary dark:text-primary-foreground">
            <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <FileSearch className="h-10 w-10 text-primary dark:text-primary-foreground" />
            </div>
            <CardTitle className="text-[24px] font-bold">Simplify Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground text-[18px] px-6">
            <p className="line-clamp-3">Upload your agreement or paste the text. We instantly show you the clear benefits and obligations.</p>
          </CardContent>
        </Card>

        <Card className="border-[2px] border-border bg-surface dark:bg-card shadow-sm hover:shadow-md transition-all pt-4 rounded-2xl">
          <CardHeader className="text-center pb-4 text-primary dark:text-primary-foreground">
            <div className="mx-auto bg-warning/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <Calculator className="h-10 w-10 text-warning" />
            </div>
            <CardTitle className="text-[24px] font-bold">Predict Risk</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground text-[18px] px-6">
            <p className="line-clamp-3">Calculate exactly how much extra money you will pay and verify if the monthly cost is safe for your income.</p>
          </CardContent>
        </Card>

        <Card className="border-[2px] border-border bg-surface dark:bg-card shadow-sm hover:shadow-md transition-all pt-4 rounded-2xl">
          <CardHeader className="text-center pb-4 text-primary dark:text-primary-foreground">
            <div className="mx-auto bg-success/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <CardTitle className="text-[24px] font-bold">Confirm with Confidence</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground text-[18px] px-6">
            <p className="line-clamp-3">Pass a quick comprehension check ensuring you understand the facts, and generate a secure receipt.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
