'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Clock, AlertTriangle, ShieldCheck, TrendingUp, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';

// Derive a risk label from a 0-100 numeric score (no direct risk_level on HistoryItem)
function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { history } = useAppStore();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Show spinner while NextAuth resolves
  if (status === 'loading') {
    return <div className="p-8 flex justify-center"><Activity className="animate-spin text-primary h-8 w-8" /></div>;
  }

  // Guard: history hasn't hydrated from localStorage yet (e.g. right after Google OAuth redirect)
  if (!Array.isArray(history)) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground text-[18px]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Safe list: exclude any null/undefined entries that could slip in during hydration
  const safeHistory = history.filter((item) => item != null && typeof item.riskScore === 'number');

  // Compute summary stats using the derived risk level
  const docsAnalyzed = safeHistory.length;
  const risksFound = safeHistory.reduce((acc, item) => {
    const level = getRiskLevel(item.riskScore);
    return acc + (level === 'high' ? 3 : level === 'medium' ? 1 : 0);
  }, 0);
  const safeDocs = safeHistory.filter((item) => getRiskLevel(item.riskScore) === 'low').length;
  const avgScore =
    docsAnalyzed > 0
      ? Math.round(safeHistory.reduce((acc, item) => acc + item.riskScore, 0) / docsAnalyzed)
      : null;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-primary dark:text-primary-foreground tracking-tight">
            {greeting}, {session?.user?.name || 'Guest'}
          </h1>
          <p className="text-muted-foreground text-[16px] mt-1">
            Here's an overview of your financial document analyses.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/simulate" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full border-[2px] border-border text-[15px] font-bold h-[44px]">
              <BarChart3 className="mr-2 h-4 w-4" /> Simulate Loan
            </Button>
          </Link>
          <Link href="/analyze" className="flex-1 md:flex-none">
            <Button className="w-full bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white text-[15px] font-bold h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-[14px] font-bold uppercase tracking-wider mb-1">Total Analyzed</p>
                <h3 className="text-[32px] font-bold text-primary dark:text-primary-foreground">{docsAnalyzed}</h3>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-[14px] font-bold uppercase tracking-wider mb-1">Risks Found</p>
                <h3 className="text-[32px] font-bold text-danger">{risksFound}</h3>
              </div>
              <div className="bg-danger/10 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-danger" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-[14px] font-bold uppercase tracking-wider mb-1">Safe Documents</p>
                <h3 className="text-[32px] font-bold text-success">{safeDocs}</h3>
              </div>
              <div className="bg-success/10 p-3 rounded-full">
                <ShieldCheck className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-[14px] font-bold uppercase tracking-wider mb-1">Avg Score</p>
                <h3 className="text-[32px] font-bold text-warning">
                  {avgScore !== null ? `${avgScore}/100` : 'N/A'}
                </h3>
              </div>
              <div className="bg-warning/10 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[20px] font-bold text-primary dark:text-primary-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" /> Recent Activity
          </h2>

          {safeHistory.length === 0 ? (
            <Card className="bg-surface dark:bg-card border-border border-dashed border-[2px] shadow-none rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-[18px] font-bold text-primary dark:text-primary-foreground mb-2">No documents analyzed yet</h3>
                <p className="text-muted-foreground max-w-sm mb-6">Upload your first loan agreement or privacy policy to see it appear here.</p>
                <Link href="/analyze">
                  <Button className="bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white">Start Analysis</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {safeHistory.slice(0, 5).map((item) => {
                const level = getRiskLevel(item.riskScore);
                // item.details holds the CurrentAnalysis or simulation result object
                const docName: string =
                  (item.details as any)?.documentType ??
                  (item.details as any)?.document_type ??
                  (item.type === 'simulation' ? 'Loan Simulation' : 'Financial Document');
                const summary: string = (item.details as any)?.summary ?? '';

                return (
                  <Card key={item.id} className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                          level === 'high' ? 'bg-danger/10 text-danger' :
                          level === 'medium' ? 'bg-warning/10 text-warning' :
                          'bg-success/10 text-success'
                        }`}>
                          {level === 'high' || level === 'medium'
                            ? <AlertTriangle className="h-5 w-5" />
                            : <ShieldCheck className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-[16px] text-primary dark:text-primary-foreground line-clamp-1">
                            {docName}
                          </h4>
                          <p className="text-[13px] text-muted-foreground">
                            {new Date(item.date).toLocaleDateString()}
                            {summary ? ` • ${summary.substring(0, 60)}…` : ''}
                          </p>
                        </div>
                      </div>
                      <Link href={item.type === 'analysis' ? `/analyze?id=${item.id}` : `/simulate`} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto border-border">View Report</Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}

              {safeHistory.length > 5 && (
                <div className="text-center pt-2">
                  <Link href="/history" className="text-primary font-bold text-[15px] hover:underline">
                    View all {safeHistory.length} records →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Risk Overview Chart */}
        <div className="space-y-4">
          <h2 className="text-[20px] font-bold text-primary dark:text-primary-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Risk Overview
          </h2>

          <Card className="bg-surface dark:bg-card border-border border-[2px] shadow-sm rounded-xl">
            <CardContent className="p-6">
              {safeHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Not enough data</div>
              ) : (
                <div className="space-y-6">
                  {/* Low */}
                  <div>
                    <div className="flex justify-between text-[14px] font-bold mb-2">
                      <span className="text-success">Low Risk ({safeDocs})</span>
                      <span className="text-muted-foreground">{Math.round((safeDocs / docsAnalyzed) * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div className="bg-success h-3 rounded-full" style={{ width: `${(safeDocs / docsAnalyzed) * 100}%` }} />
                    </div>
                  </div>

                  {/* Medium */}
                  {(() => {
                    const count = safeHistory.filter((i) => getRiskLevel(i.riskScore) === 'medium').length;
                    return (
                      <div>
                        <div className="flex justify-between text-[14px] font-bold mb-2">
                          <span className="text-warning">Medium Risk ({count})</span>
                          <span className="text-muted-foreground">{Math.round((count / docsAnalyzed) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div className="bg-warning h-3 rounded-full" style={{ width: `${(count / docsAnalyzed) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* High */}
                  {(() => {
                    const count = safeHistory.filter((i) => getRiskLevel(i.riskScore) === 'high').length;
                    return (
                      <div>
                        <div className="flex justify-between text-[14px] font-bold mb-2">
                          <span className="text-danger">High Risk ({count})</span>
                          <span className="text-muted-foreground">{Math.round((count / docsAnalyzed) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div className="bg-danger h-3 rounded-full" style={{ width: `${(count / docsAnalyzed) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
