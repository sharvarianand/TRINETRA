'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AICopilot() {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I am your TRINETRA AI Assistant. I can analyze camera feeds, query the database for past incidents, and navigate the system for you. Try asking: "What time was the last person detected?" or "Go to settings".',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const query = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    // Simulate slight processing delay for natural feel
    setTimeout(async () => {
      const aiResponse = await processQuery(query);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  const processQuery = async (query: string): Promise<string> => {
    const q = query.toLowerCase();
    
    // 1. ACTION AGENT (Navigation)
    if (q.includes('navigate') || q.includes('go to') || q.includes('open') || q.includes('take me')) {
      if (q.includes('setting') || q.includes('control')) {
        setTimeout(() => router.push('/settings'), 1000);
        return "Executing command: Navigating to System Control settings...";
      }
      if (q.includes('map') || q.includes('sector')) {
        setTimeout(() => router.push('/heatmap'), 1000);
        return "Executing command: Opening the Sector Map...";
      }
      if (q.includes('report') || q.includes('log')) {
        setTimeout(() => router.push('/reports'), 1000);
        return "Executing command: Accessing Incident Logs...";
      }
      if (q.includes('watch') || q.includes('suspect')) {
        setTimeout(() => router.push('/watchlist'), 1000);
        return "Executing command: Loading Suspect Watchlist...";
      }
    }
    
    // 2. DATA QUERY AGENT (Supabase DB)
    if (q.includes('person') || q.includes('detected') || q.includes('time') || q.includes('when') || q.includes('last')) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1);
          
        if (data && data.length > 0) {
           const latest = data[0];
           const time = new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
           const date = new Date(latest.timestamp).toLocaleDateString();
           return "I checked the secure ledger. The most recent detection was a **\** recorded at **\** (\) in the **\** zone.";
        } else {
           return "I scanned the database ledger, but there are no detection alerts logged in the system yet.";
        }
      } catch (err) {
        return "I encountered an error querying the encrypted database for recent detections.";
      }
    }
    
    // 3. FALLBACK COMMANDS
    if (q.includes('hello') || q.includes('hi')) {
      return "System Agent Online. I am ready to process queries about the database or navigate the dashboard for you.";
    }
    
    return "I am currently running in rule-based agent mode. I can query the database for recent detections (e.g., 'when was the last person detected?') or navigate the interface (e.g., 'go to settings').";
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-brand-red text-white shadow-[0_0_20px_rgba(239,51,72,0.4)] hover:bg-brand-red-dark transition-all transform hover:scale-110 z-40 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        title="Ask TRINETRA AI"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <div className={`fixed bottom-6 right-6 w-[360px] sm:w-[400px] h-[550px] max-h-[85vh] bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        
        <div className="p-4 border-b border-gray-100 dark:border-brand-border bg-gradient-to-r from-brand-red to-brand-red-dark rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">TRINETRA AI</h3>
              <p className="text-white/80 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.8)]"></span>
                System Copilot
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-brand-bg/50 relative">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-red text-white rounded-tr-sm' : 'bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border text-gray-800 dark:text-brand-text rounded-tl-sm shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-red/10 text-brand-red border border-brand-red/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
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
              placeholder="Ask about video feeds, alerts..."
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
        </div>
      </div>
    </>
  );
}
