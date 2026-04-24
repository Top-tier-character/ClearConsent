'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/store';

export function AiAssistant() {
  const { chatHistory, addChatMessage, clearChatHistory } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen, isLoading]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', content: inputText };
    addChatMessage(userMsg);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatHistory, userMsg] }),
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      
      addChatMessage({ role: 'assistant', content: data.reply });
    } catch (error) {
      addChatMessage({ role: 'assistant', content: "Sorry, I'm having trouble connecting right now." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating FAB */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white z-50 flex items-center justify-center animate-bounce-slow"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Slide-over Panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-full sm:w-[380px] max-w-[calc(100vw-48px)] transition-all duration-300 transform",
          isOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
        )}
      >
        <Card className="h-[500px] max-h-[calc(100vh-100px)] flex flex-col shadow-2xl border-border bg-surface dark:bg-card rounded-2xl overflow-hidden">
          {/* Header */}
          <CardHeader className="bg-primary px-4 py-3 flex flex-row items-center justify-between border-b-0 space-y-0 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[16px] leading-tight">ClearConsent AI</h3>
                <p className="text-[12px] text-white/80 font-medium">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearChatHistory} className="text-white hover:bg-white/20 hover:text-white h-8 px-2 text-[12px] font-medium">
                  Clear
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 h-8 w-8">
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Chat Body */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30" ref={scrollRef}>
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground px-4">
                <Bot className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-[15px] font-semibold mb-1 text-foreground">How can I help you today?</p>
                <p className="text-[13px]">Ask me about loan terms, specific clauses, or how to use the platform.</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px]",
                    msg.role === 'user' 
                      ? "bg-primary text-white rounded-br-sm" 
                      : "bg-surface dark:bg-background border border-border text-foreground rounded-bl-sm shadow-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface dark:bg-background border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </CardContent>

          {/* Input Footer */}
          <CardFooter className="p-3 bg-surface dark:bg-card border-t border-border shrink-0">
            <div className="flex w-full items-end gap-2">
              <Input
                placeholder="Ask a question..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-muted/50 border-transparent focus-visible:ring-primary text-[14px] rounded-xl h-[44px]"
              />
              <Button 
                onClick={handleSend} 
                disabled={isLoading || !inputText.trim()}
                size="icon"
                className="h-[44px] w-[44px] shrink-0 bg-primary hover:bg-primary/90 text-white rounded-xl"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
