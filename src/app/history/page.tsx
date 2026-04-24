'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RiskMeter } from '@/components/RiskMeter';
import { FileText, ArrowRight, Clock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ConsentRecord {
  consent_id: string;
  timestamp: string;
  consent_type: string;
  risk_score: number;
  risk_level: string;
  language_used: string;
  document_name: string;
  details?: any; // To hold local store details
}

function HistoryCardSkeleton() {
  return (
    <div className="bg-white dark:bg-card border-2 border-border rounded-2xl p-6 animate-pulse">
      <div className="h-6 w-1/3 bg-border/60 rounded mb-3" />
      <div className="h-4 w-1/2 bg-border/40 rounded mb-2" />
      <div className="h-4 w-2/3 bg-border/40 rounded" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 text-muted-foreground bg-white dark:bg-card rounded-3xl border-2 border-dashed border-border shadow-sm">
      <Clock className="h-16 w-16 mx-auto mb-4 opacity-40 text-[#1B2A4A]" />
      <p className="text-[22px] font-black mb-2 text-[#1B2A4A] dark:text-white">No documents yet</p>
      <p className="text-[16px] mb-6 font-medium">Analyze a document to create your first record.</p>
      <Button className="h-[48px] px-8 text-[16px] font-bold bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white rounded-xl" onClick={() => window.location.href = '/analyze'}>
        Analyze Your First Document <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

export default function MyDocumentsPage() {
  const router = useRouter();
  const { history, user, setCurrentAnalysis } = useAppStore();
  const sessionId = user?.id ?? 'guest-session';
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'safe'>('all');
  const [apiRecords, setApiRecords] = useState<ConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history?session_id=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        setApiRecords(Array.isArray(data.records) ? data.records : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  // Merge API records and local history, preferring local if ID matches (to get full details)
  const displayRecords = [...apiRecords.map(r => ({
    id: r.consent_id,
    documentName: r.document_name || 'Financial Agreement',
    type: r.consent_type,
    date: r.timestamp,
    riskScore: r.risk_score,
    riskLevel: r.risk_level,
    details: undefined
  }))];

  history.forEach(h => {
    const existing = displayRecords.find(r => r.id === h.id);
    if (existing) {
      existing.details = h.details;
      if (h.type === 'analysis' && h.details?.documentType) {
        existing.documentName = h.details.documentType;
      }
    } else {
      displayRecords.push({
        id: h.id,
        documentName: h.details?.documentType || (h.type === 'analysis' ? 'Financial Agreement' : 'Loan Simulation'),
        type: h.type,
        date: h.date,
        riskScore: h.riskScore,
        riskLevel: h.riskScore >= 75 ? 'danger' : h.riskScore >= 40 ? 'caution' : 'safe',
        details: h.details
      });
    }
  });

  // Sort newest first
  displayRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = displayRecords.filter(r => {
    if (filterLevel === 'high') return r.riskScore >= 75;
    if (filterLevel === 'safe') return r.riskScore < 40;
    return true;
  });

  const handleViewAnalysis = (record: any) => {
    if (record.details && record.type === 'analysis') {
      setCurrentAnalysis(record.details);
      router.push('/analyze');
    } else {
      // fallback
      router.push(record.type === 'simulation' ? '/simulate' : '/analyze');
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#FAF9F6] dark:bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-black text-[#1B2A4A] dark:text-white">My Documents</h1>
          
          <div className="flex items-center gap-2 bg-white dark:bg-card p-1 rounded-xl border border-border shadow-sm">
            {(['all', 'high', 'safe'] as const).map(level => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg capitalize transition-colors",
                  filterLevel === level ? "bg-[#1B2A4A] text-white" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {level === 'all' ? 'All Docs' : level === 'high' ? 'High Risk' : 'Safe'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => <HistoryCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            filtered.map(r => {
              const isHighRisk = r.riskScore >= 75;
              const numFlags = r.details?.specificClauses?.length || 0;
              const topRisk = r.details?.specificClauses?.[0]?.explanation || r.details?.actionPlan?.[0]?.riskTitle || 'Standard review completed.';

              return (
                <Card key={r.id} className="bg-white dark:bg-card border-2 border-border shadow-sm rounded-3xl overflow-hidden flex flex-col md:flex-row transition-all hover:border-[#1B2A4A]/30">
                  <div className="flex-1 p-6 md:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="font-bold border-[#1B2A4A] text-[#1B2A4A] dark:border-white dark:text-white">
                            {r.type === 'simulation' ? 'Simulation' : r.documentName}
                          </Badge>
                          <span className="text-sm font-semibold text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-2xl font-black text-foreground">ClearConsent Score: <span className={isHighRisk ? 'text-red-500' : r.riskScore >= 40 ? 'text-orange-500' : 'text-green-500'}>{r.riskScore}</span></h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-semibold mb-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                      <div className="flex items-center gap-1.5">
                        {isHighRisk ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <ShieldCheck className="h-4 w-4 text-green-500" />}
                        <span>{numFlags} Red Flags Found</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-border" />
                      <p className="truncate flex-1 text-muted-foreground">{topRisk}</p>
                    </div>

                    <Button onClick={() => handleViewAnalysis(r)} className="w-full sm:w-auto h-12 px-6 font-bold bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-white rounded-xl">
                      View Analysis <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="md:w-[250px] p-6 bg-[#FAF9F6] dark:bg-black flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-border">
                     <RiskMeter score={r.riskScore} />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
