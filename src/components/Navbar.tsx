'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Moon, Sun, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const pathname = usePathname();
  const { language, setLanguage, user, setUser } = useAppStore();
  const { theme, setTheme } = useTheme();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/analyze', label: 'Analyze' },
    { href: '/simulate', label: 'Simulate' },
    { href: '/history', label: 'History' },
  ];

  return (
    <nav className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-[72px] px-4">
        {/* Left: Logo & Tagline */}
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-success" />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-primary dark:text-primary-foreground leading-tight">ClearConsent</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground hidden sm:block">Smart Financial Decision Assistant</span>
          </div>
        </Link>
        
        {/* Center: Language & Nav Links */}
        <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[16px] font-semibold transition-colors hover:text-success px-4 py-2 rounded-md',
                pathname === link.href ? 'text-success bg-success/10' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-4 pl-4 border-l border-border">
            <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
              <SelectTrigger className="w-[110px] h-[40px] font-semibold">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="mr">मराठी</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right: Theme Toggle & Avatar */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full h-[48px] w-[48px]"
          >
            <Sun className="h-[22px] w-[22px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[22px] w-[22px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          {user ? (
            <Button variant="outline" className="rounded-full h-[48px] px-4 font-bold bg-card border-border flex items-center gap-2" onClick={() => setUser(null)}>
              <User className="h-[20px] w-[20px] text-success" />
              <span className="hidden sm:inline-block">{user.name}</span>
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="icon" className="rounded-full h-[48px] w-[48px] bg-card border-border hover:bg-success/10 hover:text-success hover:border-success">
                <User className="h-[22px] w-[22px]" />
                <span className="sr-only">Login</span>
              </Button>
            </Link>
          )}

          {/* Quick mobile language toggle instead of links on extremely small screens */}
          <div className="lg:hidden pl-2">
            <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
              <SelectTrigger className="w-[80px] h-[48px] font-semibold text-xs px-2">
                <SelectValue placeholder="Lang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="hi">HI</SelectItem>
                <SelectItem value="mr">MR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Mobile Nav Links Row */}
      <div className="lg:hidden flex items-center justify-around border-t border-border bg-card overflow-x-auto whitespace-nowrap">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'text-[14px] font-semibold transition-colors hover:text-success px-4 py-3 shrink-0 flex-1 text-center',
              pathname === link.href ? 'text-success border-b-2 border-success' : 'text-muted-foreground'
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
