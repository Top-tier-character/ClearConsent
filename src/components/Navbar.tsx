'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Moon, Sun, User, Menu, X, BarChart3, Clock, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { language, setLanguage } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/analyze', label: 'Analyze' },
    { href: '/history', label: 'My Documents' },
    { href: '/simulate', label: 'Simulate' },
    ...(session?.user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
  ];

  return (
    <nav className={cn(
      "bg-background/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200",
      isScrolled ? "border-b border-border shadow-sm" : ""
    )}>
      <div className="container mx-auto flex items-center justify-between h-[72px] px-4">

        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <ShieldCheck className="h-8 w-8 text-success" />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-primary dark:text-primary-foreground leading-tight">ClearConsent</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground hidden sm:block">
              Smart Financial Decision Assistant
            </span>
          </div>
        </Link>

        {/* Center: Nav links (desktop only) */}
        <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[15px] font-semibold transition-colors hover:text-success px-4 py-2 rounded-md',
                pathname === link.href ? 'text-success bg-success/10' : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Language (desktop) + theme + login + hamburger (mobile) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language selector removed */}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full h-[44px] w-[44px]"
          >
            <Sun className="h-[20px] w-[20px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[20px] w-[20px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Login / user avatar */}
          {session?.user ? (
            <Link href="/profile" className="hidden sm:block">
              <Button
                variant="outline"
                className="rounded-full h-[44px] w-[44px] sm:w-auto sm:px-4 font-bold bg-card border-border flex items-center gap-2 hover:border-success hover:bg-success/10 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline text-primary dark:text-primary-foreground">{session.user.name}</span>
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="hidden sm:block">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-[44px] w-[44px] bg-card border-border hover:bg-success/10 hover:text-success hover:border-success"
              >
                <User className="h-[20px] w-[20px]" />
                <span className="sr-only">Login</span>
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-[44px] w-[44px]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile full drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 top-[72px] bg-background z-40 lg:hidden overflow-y-auto pb-20">
          <div className="flex flex-col p-4 space-y-6">
            
            {/* User Profile Area (Mobile) */}
            {session?.user ? (
              <div className="flex items-center gap-4 bg-card p-4 rounded-xl border-[2px] border-border">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[18px] text-primary dark:text-primary-foreground">{session.user.name}</p>
                  <p className="text-[13px] text-muted-foreground truncate">{session.user.email}</p>
                </div>
                <Link href="/profile" onClick={() => setMobileOpen(false)}>
                  <Button size="icon" variant="ghost" className="h-10 w-10">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </Link>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full">
                <Button className="w-full h-[52px] font-bold bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white rounded-xl text-[16px]">
                  <User className="mr-2 h-5 w-5" /> Sign In or Register
                </Button>
              </Link>
            )}

            {/* Navigation Links */}
            <div className="space-y-1">
              <p className="text-[12px] uppercase font-bold text-muted-foreground tracking-wider mb-2 px-2">Navigation</p>
              {links.map((link) => {
                let Icon = FileText;
                if (link.href === '/simulate') Icon = BarChart3;
                else if (link.href === '/history') Icon = Clock;
                else if (link.href === '/') Icon = ShieldCheck;
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 text-[16px] font-bold transition-colors px-4 py-3.5 rounded-xl border-[2px] border-transparent hover:border-border hover:bg-card',
                      pathname === link.href ? 'border-success/50 bg-success/10 text-success' : 'text-primary dark:text-primary-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>



          </div>
        </div>
      )}
    </nav>
  );
}
