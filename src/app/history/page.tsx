'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RiskMeter } from '@/components/RiskMeter';
import { Clock, Menu, X, ArrowRight, Lock, FileText, Search, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ConsentRecord {
  consent_id: string;
  timestamp: string;
  consent_type: string;
  risk_score: number;
  risk_level: string;
  language_used: string;
  quiz_score: number;
  document_name: string;
}

// Loading skeleton for a history card
function HistoryCardSkeleton() {
  return (
    <div className="bg-surface dark:bg-card border border-border rounded-xl p-6 animate-pulse">
      <div className="h-6 w-1/3 bg-border/60 rounded mb-3" />
      <div className="h-4 w-1/2 bg-border/40 rounded mb-2" />
      <div className="h-4 w-2/3 bg-border/40 rounded" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 text-muted-foreground bg-surface dark:bg-card rounded-2xl border-[2px] border-dashed border-border">
      <Clock className="h-16 w-16 mx-auto mb-4 opacity-40" />
      <p className="text-[22px] font-bold mb-2 text-primary dark:text-primary-foreground">No records yet</p>
      <p className="text-[16px] mb-6">Analyze a document or simulate a loan to create your first record.</p>
      <Link href="/analyze">
        <Button className="h-[48px] px-8 text-[16px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl">
          Analyze Your First Document <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}

function getStatusBadge(riskLevel?: string, riskScore?: number) {
  const s = riskLevel ?? (typeof riskScore === 'number' ? (riskScore < 40 ? 'safe' : riskScore < 75 ? 'caution' : 'danger') : 'safe');
  if (s === 'safe') return <Badge className="bg-success text-white">Approved</Badge>;
  if (s === 'caution') return <Badge className="bg-warning text-white">Caution</Badge>;
  return <Badge className="bg-danger text-white">Flagged</Badge>;
}

export default function HistoryPage() {
  const { history, user } = useAppStore();
  const sessionId = user?.id ?? 'guest-session';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiRecords, setApiRecords] = useState<ConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Fetch real records from /api/history ─────────────────────────────────
  const fetchHistory = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/history?session_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setApiRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load history.');
      setApiRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  // ── Build unified display list (API records + local store fallback) ───────
  // If API returns real records, use those. Otherwise fall back to Zustand history.
  const displayRecords = apiRecords.length > 0
    ? apiRecords.map(r => ({
        id: r.consent_id,
        documentName: r.document_name || 'Financial Agreement',
        type: r.consent_type,
        date: r.timestamp,
        riskScore: r.risk_score,
        riskLevel: r.risk_level,
        quizScore: r.quiz_score,
        language: r.language_used,
      }))
    : history.map(h => ({
        id: h.id,
        documentName: h.type === 'analysis' ? 'Financial Agreement' : 'Loan Simulation',
        type: h.type,
        date: h.date,
        riskScore: h.riskScore,
        riskLevel: undefined as string | undefined,
        quizScore: 100,
        language: 'en',
      }));

  const filtered = displayRecords.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (searchQuery && !r.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.documentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    if (filterDate !== 'all') {
      const recordDate = new Date(r.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - recordDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filterDate === 'today' && diffDays > 1) return false;
      if (filterDate === 'week' && diffDays > 7) return false;
      if (filterDate === 'month' && diffDays > 30) return false;
    }
    
    return true;
  });

  return (
    <div className="flex min-h-[calc(100vh-72px)] bg-background relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static top-[72px] left-0 h-[calc(100vh-72px)] bg-surface dark:bg-card border-r border-border',
        'w-[300px] shrink-0 z-50 flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-[22px] font-bold text-primary dark:text-primary-foreground">Your Documents</h2>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl border border-border animate-pulse">
                <div className="h-4 w-3/4 bg-border/60 rounded mb-2" />
                <div className="h-3 w-1/2 bg-border/40 rounded" />
              </div>
            ))
          ) : displayRecords.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-[14px]">No documents yet.</div>
          ) : (
            displayRecords.map(r => (
              <div key={r.id} className="p-4 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors bg-background">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-[15px] text-primary dark:text-primary-foreground truncate flex-1 pr-2">
                    {r.documentName}
                  </span>
                  {getStatusBadge(r.riskLevel, r.riskScore)}
                </div>
                <p className="text-[12px] text-muted-foreground font-mono truncate">{r.id}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-center gap-2 text-muted-foreground font-semibold text-[13px] bg-muted/20">
          <Lock className="h-4 w-4 text-success" />
          <span>Your data is private and secure</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 w-full">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="icon" className="lg:hidden h-12 w-12" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground flex-1">History</h1>
            <Button variant="ghost" size="icon" onClick={fetchHistory} title="Refresh">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Error banner */}
          {fetchError && (
            <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r text-danger font-semibold text-[15px] flex items-center justify-between">
              <span>{fetchError}</span>
              <Button variant="link" onClick={fetchHistory} className="text-danger p-0 h-auto ml-4 font-bold">
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by ID or name…"
                className="pl-10 h-[52px] text-[15px] bg-surface dark:bg-card border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="w-full sm:w-[200px] h-[52px] text-[15px] bg-surface dark:bg-card border-border">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="loan">Loan</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="simulation">Simulation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDate} onValueChange={(v: any) => setFilterDate(v)}>
              <SelectTrigger className="w-full sm:w-[200px] h-[52px] text-[15px] bg-surface dark:bg-card border-border">
                <SelectValue placeholder="Filter by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards */}
          <div className="grid gap-6">
            {isLoading ? (
              [1, 2, 3].map(i => <HistoryCardSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              displayRecords.length === 0 ? <EmptyState /> : (
                <div className="text-center py-20 text-muted-foreground bg-surface dark:bg-card rounded-2xl border-[2px] border-dashed border-border">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-40" />
                  <p className="text-[20px] font-bold">No records match your filters.</p>
                </div>
              )
            ) : (
              filtered.map(r => (
                <Card key={r.id} className="bg-surface dark:bg-card border rounded-xl overflow-hidden flex flex-col md:flex-row">
                  <div className="flex-1 p-6 md:border-r border-border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-[20px] font-bold text-primary dark:text-primary-foreground leading-tight">
                            {r.documentName}
                          </h3>
                          <p className="text-[13px] text-muted-foreground font-mono mt-0.5">{r.id}</p>
                        </div>
                      </div>
                      <div className="hidden sm:block">{getStatusBadge(r.riskLevel, r.riskScore)}</div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-muted-foreground mt-2">
                      <p><strong>Date:</strong> {new Date(r.date).toLocaleDateString()}</p>
                      <p className="capitalize"><strong>Type:</strong> {r.type}</p>
                      {r.quizScore !== undefined && <p><strong>Quiz:</strong> {r.quizScore}%</p>}
                      {r.language && <p><strong>Language:</strong> {r.language.toUpperCase()}</p>}
                    </div>
                  </div>
                  <div className="md:w-[300px] p-6 bg-muted/10 flex flex-col justify-center border-t md:border-t-0 border-border">
                    <div className="mb-5">
                      <RiskMeter score={r.riskScore} />
                    </div>
                    <Link href={r.type === 'analysis' || r.type === 'analysis' ? '/analyze' : '/simulate'}>
                      <Button className="w-full h-[44px] text-[15px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl">
                        View Again <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
