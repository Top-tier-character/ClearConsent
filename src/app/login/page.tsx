'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    // Mock authentication
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setUser({
      name: email.split('@')[0],
      email: email,
    });
    
    router.push('/');
  };

  return (
    <div className="container mx-auto px-6 py-16 max-w-lg flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      
      <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
        <ShieldCheck className="h-10 w-10 text-success" />
      </div>
      
      <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground mb-2 text-center tracking-tight">
        Welcome Back
      </h1>
      <p className="text-[18px] text-muted-foreground mb-8 text-center max-w-sm">
        Log in to access your securely saved documents and history.
      </p>

      <Card className="w-full bg-surface dark:bg-card border-[2px] border-border shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6 pt-8">
          <form onSubmit={handleLogin} className="space-y-6">
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

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-[52px] text-[18px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl mt-4 transition-transform hover:-translate-y-1"
            >
              {loading ? 'Logging in...' : 'Sign In'} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="pt-4 text-center text-[16px] text-muted-foreground">
              Don't have an account?{' '}
              <a href="/signup" className="text-primary dark:text-primary-foreground font-bold hover:underline">
                Sign up here
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center gap-2 text-muted-foreground font-semibold text-[16px] bg-muted/50 px-4 py-2 rounded-full">
        <Lock className="h-5 w-5 text-success" />
        <span>Your connection is heavily encrypted</span>
      </div>
      
    </div>
  );
}
