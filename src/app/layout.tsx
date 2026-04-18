import type { Metadata } from 'next';
import { Inter, Noto_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ConvexClientProvider } from './ConvexClientProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSans = Noto_Sans({ 
  weight: ['400', '500', '600', '700'], 
  subsets: ['latin'], 
  variable: '--font-noto-sans' 
});

export const metadata: Metadata = {
  title: 'ClearConsent — Smart Financial Decision Assistant',
  description: 'Understand financial terms before you sign. Predict risks and simulate loans.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSans.variable} font-sans min-h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ConvexClientProvider>
            <TooltipProvider>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
            </TooltipProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
