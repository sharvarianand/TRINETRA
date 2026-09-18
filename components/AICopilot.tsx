'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const TacticalBotIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 7 19 7 21 13 17 21 7 21 3 13 5 7" />
    <path d="M2 11h20" />
    <rect x="7" y="11" width="3" height="2" fill="currentColor" stroke="none" />
    <rect x="14" y="11" width="3" height="2" fill="currentColor" stroke="none" />
    <path d="M9 17h6" />
    <path d="M12 17v4" />
  </svg>
);

const SYSTEM_PROMPT = `You are TRINETRA AI, a military-grade surveillance intelligence assistant for the IBVAP (Intelligent Border Video Analytics Platform) deployed by the Sashastra Seema Bal (SSB) under India's Ministry of Home Affairs.

You assist border security operators with:
- Answering questions about detected human and vehicle activity
- Explaining surveillance features (ANPR, Face Detection, Virtual Fence, Night Vision)
- Navigating the dashboard (settings, heatmap, reports, watchlist, analysis)
- Interpreting alerts and threat levels
- General questions about the IBVAP platform and border security operations

You speak in a concise, tactical, professional tone. You refer to the user as "Operator". Keep responses under 3 sentences unless detail is required. When navigating, tell the user you are routing them. Never reveal you are powered by a third-party LLM.`;

export default function AICopilot() {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'TRINETRA AI online. I am your surveillance intelligence agent. Ask me about detected activity, alerts, or say "go to settings" to navigate the dashboard.',
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Check for navigation intent client-side before calling API
  const checkNavigation = (q: string): string | null => {
    const lower = q.toLowerCase();
    if ((lower.includes('go to') || lower.includes('open') || lower.includes('navigate') || lower.includes('take me')) ) {
      if (lower.includes('setting') || lower.includes('control')) { setTimeout(() => router.push('/settings'), 800); return 'Routing you to System Control...'; }
      if (lower.includes('map') || lower.includes('sector') || lower.includes('heat')) { setTimeout(() => router.push('/heatmap'), 800); return 'Routing you to the Sector Threat Map...'; }
      if (lower.includes('report') || lower.includes('log') || lower.includes('incident')) { setTimeout(() => router.push('/reports'), 800); return 'Routing you to Incident Logs...'; }
      if (lower.includes('watch') || lower.includes('suspect') || lower.includes('hotlist')) { setTimeout(() => router.push('/watchlist'), 800); return 'Routing you to the Suspect Watchlist...'; }
      if (lower.includes('analys')) { setTimeout(() => router.push('/analysis'), 800); return 'Routing you to the Analytics module...'; }
      if (lower.includes('blockchain') || lower.includes('ledger')) { setTimeout(() => router.push('/blockchain'), 800); return 'Routing you to the Blockchain Audit Ledger...'; }
      if (lower.includes('dashboard') || lower.includes('home')) { setTimeout(() => router.push('/dashboard'), 800); return 'Routing you to the main Command Dashboard...'; }
    }
    return null;
  };

  const callOpenRouter = async (userMessage: string): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
      return 'OpenRouter API key is not configured. Please add your NEXT_PUBLIC_OPENROUTER_API_KEY to .env.local to enable AI responses.';
    }

    // Build conversation history for context
    let liveContext = "No recent alerts.";
    try {
      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000';
      const res = await fetch(\/api/alert/history);
      if (res.ok) {
        const data = await res.json();
        if (data.alerts && data.alerts.length > 0) {
          liveContext = data.alerts.map((a: any) => []  at \).join('\n');
        }
      }
    } catch (e) {
      console.error("Failed to fetch RAG context", e);
    }

    const augmentedUserMessage = LIVE DATABASE CONTEXT:\nRecent Alerts:\n\
\nUser Question:\n\;
    const history = messages.slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'TRINETRA IBVAP',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
          { role: 'user', content: augmentedUserMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response received.';
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Fast-path: check navigation locally without burning API tokens
      const navResponse = checkNavigation(query);
      if (navResponse) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: navResponse, timestamp: new Date() }]);
        setIsTyping(false);
        return;
      }

      // Full LLM call via OpenRouter
      const aiText = await callOpenRouter(query);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: aiText, timestamp: new Date() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: `System error: ${err.message}`, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-brand-red text-white shadow-[0_0_20px_rgba(239,51,72,0.4)] hover:bg-brand-red-dark transition-all transform hover:scale-110 z-40 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        title="Ask TRINETRA AI"
      >
        <TacticalBotIcon className="w-6 h-6" />
      </button>

      <div className={`fixed bottom-6 right-6 w-[360px] sm:w-[400px] h-[550px] max-h-[85vh] bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        
        <div className="p-4 border-b border-gray-100 dark:border-brand-border bg-gradient-to-r from-brand-red to-brand-red-dark rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <TacticalBotIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">TRINETRA AI</h3>
              <p className="text-white/80 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.8)]"></span>
                Intelligence Agent · Llama 3.1
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-white/80 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
            title="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-brand-bg/50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <TacticalBotIcon className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-brand-red text-white rounded-tr-sm' : 'bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border text-gray-800 dark:text-brand-text rounded-tl-sm shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-red/10 text-brand-red border border-brand-red/20 flex items-center justify-center">
                <TacticalBotIcon className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-brand-red/60 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-brand-red/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-brand-red/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        <div className="p-4 bg-white dark:bg-brand-card rounded-b-2xl border-t border-gray-200 dark:border-brand-border shrink-0">
          <div className="flex items-center gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about alerts, detections, commands..."
              className="flex-1 bg-gray-100 dark:bg-brand-bg border border-transparent focus:border-brand-red/50 focus:bg-white dark:focus:bg-brand-card rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-brand-text placeholder-gray-500 dark:placeholder-brand-muted outline-none transition-all pr-12"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-1.5 p-2 text-brand-red hover:bg-brand-red/10 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-brand-muted mt-2 text-center">Powered by Llama 3.1 · OpenRouter</p>
        </div>
      </div>
    </>
  );
}
