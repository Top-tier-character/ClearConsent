'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ArrowRight, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 7) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(password);
  
  const getStrengthColor = () => {
    if (password.length === 0) return 'bg-muted';
    if (strength <= 1) return 'bg-danger';
    if (strength === 2 || strength === 3) return 'bg-warning';
    return 'bg-success';
  };

  const getStrengthText = () => {
    if (password.length === 0) return '';
    if (strength <= 1) return 'Weak';
    if (strength === 2 || strength === 3) return 'Medium';
    return 'Strong';
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      // Auto-login after successful signup
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        throw new Error(signInRes.error);
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="container mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      
      <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
        <ShieldCheck className="h-10 w-10 text-success" />
      </div>
      
      <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground mb-8 text-center tracking-tight">
        Create an Account
      </h1>

      <Card className="w-full max-w-[440px] bg-[#FAF9F6] dark:bg-card border-[2px] border-border shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6 pt-8">
          <form onSubmit={handleSignUp} className="space-y-6">
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
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-[52px] text-[18px] pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                    <div className={`h-full ${strength >= 1 ? getStrengthColor() : 'bg-transparent'} w-1/4 transition-colors`} />
                    <div className={`h-full ${strength >= 2 ? getStrengthColor() : 'bg-transparent'} w-1/4 transition-colors`} />
                    <div className={`h-full ${strength >= 3 ? getStrengthColor() : 'bg-transparent'} w-1/4 transition-colors`} />
                    <div className={`h-full ${strength >= 4 ? getStrengthColor() : 'bg-transparent'} w-1/4 transition-colors`} />
                  </div>
                  <span className={`text-xs font-bold ${strength <= 1 ? 'text-danger' : strength < 4 ? 'text-warning' : 'text-success'}`}>
                    {getStrengthText()}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-[18px] font-bold text-primary dark:text-primary-foreground block">Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-[52px] text-[18px] pr-12"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border-l-4 border-danger p-3 rounded text-danger font-semibold text-[15px]">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-[52px] text-[18px] font-bold bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white rounded-xl mt-4 transition-transform hover:-translate-y-1"
            >
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creating account...</> : <>Create Account <ArrowRight className="ml-2 h-5 w-5" /></>}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#FAF9F6] dark:bg-card px-2 text-muted-foreground font-semibold">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-[52px] text-[18px] font-bold border-[2px] border-border bg-transparent rounded-xl flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.25027 6.60998L5.32028 9.77C6.27528 6.61001 9.19528 4.75 12.0003 4.75Z" fill="#EA4335" />
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L20.18 21.29C22.57 19.09 24 15.96 24 12.275H23.49Z" fill="#4285F4" />
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.53494C0.46 8.17494 0 10.0299 0 11.9999C0 13.9699 0.46 15.8249 1.28 17.4649L5.26498 14.2949Z" fill="#FBBC05" />
              <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L15.8404 17.905C14.7704 18.62 13.4604 19.05 12.0004 19.05C9.13038 19.05 6.15536 17.135 5.20036 13.905L1.13037 17.15C3.12537 21.1601 7.2354 24.0001 12.0004 24.0001Z" fill="#34A853" />
            </svg>
            Continue with Google
          </Button>

          <div className="pt-2 text-center text-[16px] text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary dark:text-primary-foreground font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center gap-2 text-muted-foreground font-semibold text-[15px] bg-muted/50 px-5 py-2.5 rounded-full">
        <Lock className="h-5 w-5 text-success" />
        <span>Your information is safe and encrypted</span>
      </div>
      
    </div>
  );
}
