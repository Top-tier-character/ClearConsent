'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Moon, Sun, User, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const pathname = usePathname();
  const { language, setLanguage, user, setUser } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/analyze', label: 'Analyze' },
    { href: '/simulate', label: 'Simulate' },
    { href: '/history', label: 'History' },
  ];

  const LanguageDropdown = ({ compact }: { compact?: boolean }) => (
    <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
      <SelectTrigger className={cn('font-semibold', compact ? 'w-[90px] h-[40px] text-xs px-2' : 'w-[120px] h-[40px]')}>
        <SelectValue placeholder={compact ? 'Lang' : 'Language'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="hi">हिन्दी</SelectItem>
        <SelectItem value="mr">मराठी</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <nav className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-50">
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
          {/* Language selector — desktop only (single instance) */}
          <div className="hidden lg:block">
            <LanguageDropdown />
          </div>

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
          {user ? (
            <Button
              variant="outline"
              className="rounded-full h-[44px] px-4 font-bold bg-card border-border hidden sm:flex items-center gap-2"
              onClick={() => setUser(null)}
            >
              <User className="h-[18px] w-[18px] text-success" />
              <span className="hidden md:inline">{user.name}</span>
            </Button>
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block text-[16px] font-semibold transition-colors hover:text-success px-4 py-3 rounded-md',
                pathname === link.href ? 'text-success bg-success/10' : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
          {/* Language inside mobile drawer — single instance */}
          <div className="pt-3 border-t border-border mt-2">
            <p className="text-[12px] uppercase font-semibold text-muted-foreground mb-2 px-4">Language</p>
            <div className="px-4">
              <LanguageDropdown />
            </div>
          </div>
          {!user && (
            <div className="px-4 pt-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button className="w-full h-[44px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl">
                  <User className="mr-2 h-4 w-4" /> Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
