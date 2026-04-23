'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ArrowRight, Lock, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setUser({ id: data.session_id, name: data.name, email: data.email });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 max-w-lg flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      
      <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
        <ShieldCheck className="h-10 w-10 text-success" />
      </div>
      
      <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground mb-2 text-center tracking-tight">
        Create an Account
      </h1>
      <p className="text-[18px] text-muted-foreground mb-8 text-center max-w-sm">
        Join ClearConsent to save your financial analysis and compare documents.
      </p>

      <Card className="w-full bg-surface dark:bg-card border-[2px] border-border shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6 pt-8">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground block">Full Name</Label>
              <Input 
                type="text" 
                placeholder="John Doe" 
                className="h-[52px] text-[18px]" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground block">Email Address</Label>
              <Input 
                type="email" 
                placeholder="you@example.com" 
                className="h-[52px] text-[18px]" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground block">Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="h-[52px] text-[18px]" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-danger/10 border-l-4 border-danger p-3 rounded text-danger font-semibold text-[15px]">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-[52px] text-[18px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl mt-4 transition-transform hover:-translate-y-1"
            >
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creating...</> : <>Sign Up <ArrowRight className="ml-2 h-5 w-5" /></>}
            </Button>

            <div className="pt-4 text-center text-[16px] text-muted-foreground">
              Already have an account?{' '}
              <a href="/login" className="text-primary dark:text-primary-foreground font-bold hover:underline">
                Log in here
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center gap-2 text-muted-foreground font-semibold text-[16px] bg-muted/50 px-4 py-2 rounded-full">
        <Lock className="h-5 w-5 text-success" />
        <span>Your data is completely private</span>
      </div>
      
    </div>
  );
}
