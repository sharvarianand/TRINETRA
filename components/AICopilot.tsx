'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I am your TRINETRA AI Assistant. I can analyze camera feeds, query past incidents, and explain system features. How can I assist you today?',
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
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    // Simulate AI processing / backend call
    setTimeout(() => {
      const aiResponse = generateMockResponse(userMsg.content);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const generateMockResponse = (query: string) => {
    const q = query.toLowerCase();
    
    if (q.includes('video') || q.includes('camera') || q.includes('feed') || q.includes('show')) {
      return "I'm currently monitoring the active camera in the Main Plaza. No critical anomalies detected in the live feed right now. Crowd density is at normal levels (approx. 42 people).";
    }
    if (q.includes('alert') || q.includes('incident') || q.includes('happened')) {
      return "There were 3 incidents resolved today. The most recent was a 'High crowd density' warning at the Main Entrance 15 minutes ago, which has since normalized.";
    }
    if (q.includes('watchlist') || q.includes('suspect') || q.includes('face') || q.includes('plate')) {
      return "The watchlist currently monitors your flagged faces and vehicle plates. When a match is detected on any camera, the system will immediately generate a critical alert on your dashboard.";
    }
    if (q.includes('help') || q.includes('how to')) {
      return "You can use TRINETRA to manage camera streams, monitor crowds, track suspects, and review security logs. Navigate through the sidebar to access the Sector Map, Audit Ledger, and System Settings.";
    }
    if (q.includes('hello') || q.includes('hi')) {
      return "Hello! I'm here to help you monitor the TRINETRA surveillance system. Ask me anything about the live feeds or recent alerts.";
    }
    
    return "I can analyze video feeds, search incident logs, and help you configure the system. Could you provide more details about what you're looking for?";
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={ixed bottom-6 right-6 p-4 rounded-full bg-brand-red text-white shadow-[0_0_20px_rgba(239,51,72,0.4)] hover:bg-brand-red-dark transition-all transform hover:scale-110 z-40 flex items-center justify-center }
        title="Ask TRINETRA AI"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <div className={ixed bottom-6 right-6 w-[360px] sm:w-[400px] h-[550px] max-h-[85vh] bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 transform origin-bottom-right }>
        
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
            <div key={msg.id} className={lex gap-3 }>
              <div className={w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center }>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed }>
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
