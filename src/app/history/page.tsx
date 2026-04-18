'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RiskMeter } from '@/components/RiskMeter';
import { Clock, Menu, X, ArrowRight, Lock, FileText, Search } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const { history } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate some robust mock history if empty
  const displayHistory = history.length > 0 ? history : [
    {
      id: 'CLR-2026-A1B2C3',
      type: 'simulation',
      date: new Date(Date.now() - 86400000).toISOString(),
      riskScore: 25,
      status: 'Approved',
      details: { amount: 500000 }
    },
    {
      id: 'CLR-2026-X9Y8Z7',
      type: 'analyze',
      date: new Date(Date.now() - 172800000).toISOString(),
      riskScore: 85,
      status: 'Flagged',
      details: {}
    },
    {
      id: 'CLR-2026-M4N5P6',
      type: 'simulation',
      date: new Date(Date.now() - 345600000).toISOString(),
      riskScore: 60,
      status: 'Pending',
      details: { amount: 150000 }
    }
  ];

  const filteredHistory = displayHistory.filter(h => {
    if (filterType !== 'all') {
      const displayType = h.type === 'analysis' ? 'Insurance' : h.type === 'simulation' ? 'Loan' : 'Mandate';
      if (displayType.toLowerCase() !== filterType.toLowerCase()) return false;
    }
    if (searchQuery) {
      if (!h.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const getStatusBadge = (status?: string, risk?: number) => {
    const s = status || (risk && risk < 40 ? 'Approved' : risk && risk < 75 ? 'Pending' : 'Flagged');
    if (s === 'Approved') return <Badge className="bg-success text-white">Approved</Badge>;
    if (s === 'Pending') return <Badge className="bg-warning text-white">Pending</Badge>;
    return <Badge className="bg-danger text-white">Flagged</Badge>;
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)] bg-background relative">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static top-[72px] left-0 h-[calc(100vh-72px)] bg-surface dark:bg-card border-r border-border 
        w-[320px] shrink-0 z-50 flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-[24px] font-bold text-primary dark:text-primary-foreground">Your Documents</h2>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayHistory.map((item) => (
            <div key={item.id} className="p-4 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors bg-background">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-[16px] text-primary dark:text-primary-foreground truncate flex-1 pr-2">
                  {item.type === 'analysis' ? 'Financial Agreement' : `Loan Estimate`}
                </span>
                {getStatusBadge(item.status, item.riskScore)}
              </div>
              <p className="text-[14px] text-muted-foreground font-mono">{item.id}</p>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-border mt-auto flex items-center justify-center gap-2 text-muted-foreground font-semibold text-[14px] bg-muted/20">
          <Lock className="h-4 w-4 text-success" />
          <span>Your data is private and secure</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 w-full">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="icon" className="lg:hidden h-12 w-12" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-[32px] font-bold text-primary dark:text-primary-foreground">
              History
            </h1>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search by ID..." 
                className="pl-10 h-[52px] text-[16px] bg-surface dark:bg-card border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={(val: any) => setFilterType(val || 'all')}>
              <SelectTrigger className="w-full sm:w-[200px] h-[52px] text-[16px] bg-surface dark:bg-card border-border">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="loan">Loan</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="mandate">Mandate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Records Grid */}
          <div className="grid gap-6">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground bg-surface dark:bg-card rounded-2xl border-[2px] border-dashed border-border">
                <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-[20px] font-bold">No records match your filters.</p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <Card key={item.id} className="bg-surface dark:bg-card border-[1px] border-border shadow-sm flex flex-col md:flex-row rounded-xl overflow-hidden">
                  <div className="flex-1 p-6 md:border-r border-border">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-[22px] font-bold text-primary dark:text-primary-foreground leading-tight">
                            {item.type === 'analysis' ? 'Financial Agreement' : `Loan Estimate`}
                          </h3>
                          <p className="text-[14px] text-muted-foreground font-mono mt-1">{item.id}</p>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        {getStatusBadge(item.status, item.riskScore)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-[16px] text-muted-foreground mt-4">
                      <p><strong>Date:</strong> {new Date(item.date).toLocaleDateString()}</p>
                      <p className="capitalize"><strong>Type:</strong> {item.type === 'analysis' ? 'Insurance' : 'Loan'}</p>
                    </div>
                  </div>
                  
                  <div className="md:w-[320px] p-6 bg-muted/10 flex flex-col justify-center border-t md:border-t-0 border-border">
                    <div className="mb-6">
                      <RiskMeter score={item.riskScore} />
                    </div>
                    <Link href={`/${item.type === 'analysis' ? 'analyze' : 'simulate'}`}>
                      <Button className="w-full h-[48px] text-[16px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl">
                        View Details <ArrowRight className="ml-2 h-5 w-5" />
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
