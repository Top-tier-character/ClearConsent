'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, ShieldCheck, Settings, Bell, Lock, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function ProfilePage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { simplifiedMode, setSimplifiedMode, history } = useAppStore();
  
  const [name, setName] = useState(session?.user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Update failed');
      setMessage('Profile updated successfully! (Refresh to see changes)');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error('Password update failed');
      setPwdMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPwdMessage(''), 3000);
    } catch (err) {
      setPwdMessage('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-primary mb-4">Please log in to view your profile.</h1>
        <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
      <h1 className="text-[28px] sm:text-[36px] font-bold text-primary dark:text-primary-foreground tracking-tight mb-8">
        Account Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar / Left Column */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-[36px] font-bold mb-4">
                {session.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h2 className="text-[20px] font-bold text-primary dark:text-primary-foreground">
                {session.user?.name}
              </h2>
              <p className="text-[14px] text-muted-foreground break-all mb-4">
                {session.user?.email}
              </p>
              <div className="inline-flex items-center gap-1.5 bg-success/10 text-success font-semibold text-[13px] px-3 py-1 rounded-full border border-success/20">
                <ShieldCheck className="h-4 w-4" /> Verified Account
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-[16px] font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[14px]">Total Analyzed</span>
                <span className="font-bold text-primary dark:text-primary-foreground">{history.length} docs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[14px]">Member Since</span>
                <span className="font-bold text-primary dark:text-primary-foreground">April 2026</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content / Right Column */}
        <div className="md:col-span-2 space-y-8">
          
          {/* General Information */}
          <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-[18px] font-bold flex items-center gap-2">
                <User className="h-5 w-5" /> General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[15px]">Full Name</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="h-12 text-[16px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[15px]">Email Address</Label>
                  <Input 
                    value={session.user?.email || ''} 
                    disabled 
                    className="h-12 text-[16px] bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Email addresses cannot be changed.</p>
                </div>
                
                {message && <p className="text-success font-semibold text-sm">{message}</p>}

                <Button type="submit" disabled={isUpdating || name === session.user?.name} className="h-12 px-8 font-bold">
                  {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-[18px] font-bold flex items-center gap-2">
                <Settings className="h-5 w-5" /> Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[16px] text-primary dark:text-primary-foreground">Dark Mode</h4>
                  <p className="text-[14px] text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Switch 
                  checked={theme === 'dark'} 
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[16px] text-primary dark:text-primary-foreground">Simplified Language Mode</h4>
                  <p className="text-[14px] text-muted-foreground">Always default to ultra-simple explanations</p>
                </div>
                <Switch 
                  checked={simplifiedMode} 
                  onCheckedChange={setSimplifiedMode} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-[18px] font-bold flex items-center gap-2">
                <Lock className="h-5 w-5" /> Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[15px]">Current Password</Label>
                  <Input 
                    type="password"
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    className="h-12 text-[16px]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[15px]">New Password</Label>
                  <Input 
                    type="password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="h-12 text-[16px]"
                    required
                  />
                </div>
                
                {pwdMessage && <p className="font-semibold text-sm">{pwdMessage}</p>}

                <Button type="submit" disabled={isUpdatingPassword} variant="outline" className="h-12 px-8 font-bold border-2">
                  {isUpdatingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Updating...</> : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-danger/20 border-[2px] shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-danger/10 bg-danger/5">
              <CardTitle className="text-[18px] font-bold flex items-center gap-2 text-danger">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-danger/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-[16px] text-primary dark:text-primary-foreground">Sign Out</h4>
                <p className="text-[14px] text-muted-foreground">Log out of your account on this device.</p>
              </div>
              <Button onClick={() => signOut({ callbackUrl: '/' })} className="bg-danger hover:bg-danger/90 text-white font-bold w-full sm:w-auto h-[44px]">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
