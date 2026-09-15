'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Globe, Twitter, ArrowRight, Network, Search, Crosshair, Radio, ScanLine, ShieldAlert, User, Car, Users, Type, Map, Clock, Moon, Bell, Lock, WifiOff, Database, Video } from 'lucide-react';
import Logo from '@/components/Logo';

export default function LandingPage() {
  const router = useRouter();

  const allFeatures = [
    { icon: User, title: 'Human Detection & Tracking', desc: 'Real-time identification and persistent tracking across frames.' },
    { icon: Car, title: 'Vehicle Detection & Classification', desc: 'Differentiate between civilian, military, and transport vehicles.' },
    { icon: Users, title: 'Face Watchlist Matching', desc: 'Compares detected faces against a local database using histogram correlations to identify known suspects.' },
    { icon: Type, title: 'ANPR Hotlist System', desc: 'Extracts vehicle registration plates and flags stolen/wanted vehicles instantly.' },
    { icon: Network, title: 'Multi-Camera Tracking', desc: 'Seamlessly tracks suspects or vehicles across multiple camera feeds, linking their path across the entire border network.' },
    { icon: Search, title: 'Natural Language Querying', desc: 'Incident metadata is logged naturally. Commanders can ask questions like "Show me a red truck at Post 4" to instantly retrieve threats.' },
    { icon: Map, title: 'Virtual Fence Intrusion Detection', desc: 'Draw digital boundaries that trigger alerts upon breach.' },
    { icon: Clock, title: 'Loitering & Suspicious Activity', desc: 'Tracks object dwell-time and triggers alerts if subjects remain in restricted areas for >15 seconds.' },
    { icon: Moon, title: 'Night-Time Vision Enhancement', desc: 'Automatically applies CLAHE (Contrast Limited Adaptive Histogram Equalization) during night hours for low-light conditions.' },
    { icon: Bell, title: 'Real-Time Alerts & Event Logging', desc: 'Instant tactical alerts pushed to the Command Center via WebSocket and WhatsApp.' },
    { icon: Lock, title: 'Blockchain Immutable Audit Logs', desc: 'All critical alerts (Intrusions, ANPR hits, Watchlist Matches) are cryptographically hashed using SHA-256 and chained to previous events. Logs cannot be tampered with by corrupt insiders.', isXFactor: true },
    { icon: WifiOff, title: 'Low-Bandwidth Metadata Alerts', desc: 'Designed for areas with poor connectivity. The system detects people and movement locally, transmitting only lightweight alert data without needing to send complete heavy video footage.', isXFactor: true },
    { icon: Database, title: 'Centralized Watchlist Sync', desc: 'Upload profiles of wanted persons and stolen vehicles to the central database, instantly syncing across all border edge nodes to match and alert automatically.', isXFactor: true }
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const { top, height } = scrollRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const offsetTop = top + scrollY; // Absolute top of the container
      
      // Calculate how far we have scrolled into the container
      const scrolledIntoContainer = scrollY - offsetTop;
      const scrollableHeight = height - window.innerHeight;
      
      if (scrolledIntoContainer < 0) {
        setActiveIndex(0);
        return;
      }
      
      if (scrolledIntoContainer > scrollableHeight) {
        setActiveIndex(allFeatures.length - 1);
        return;
      }

      const progress = scrolledIntoContainer / scrollableHeight;
      const currentIndex = Math.floor(progress * allFeatures.length);
      setActiveIndex(Math.min(currentIndex, allFeatures.length - 1));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Init
    return () => window.removeEventListener('scroll', handleScroll);
  }, [allFeatures.length]);
  
  return (
    <div className="bg-brand-bg text-brand-text font-sans"><main className="relative z-10 w-full min-h-screen bg-brand-bg flex flex-col mb-[550px] border-b border-brand-border shadow-[0_30px_60px_rgba(0,0,0,1)] rounded-b-[40px] selection:bg-[brand-red] selection:text-black">
      
      <style>{`
        @keyframes tracking {
          0% { transform: translate(0px, 0px); }
          20% { transform: translate(60px, -30px); }
          40% { transform: translate(110px, 40px); }
          60% { transform: translate(40px, 80px); }
          80% { transform: translate(-30px, 20px); }
          100% { transform: translate(0px, 0px); }
        }
        .animate-tracking {
          animation: tracking 15s ease-in-out infinite;
        }
      `}</style>

      {/* Floating Glassmorphism Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50 flex items-center justify-between rounded-full border border-brand-border bg-brand-bg/70 px-6 py-3 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <Logo size="sm" showText={true} />
        <div className="hidden md:flex items-center gap-8 text-[11px] font-bold tracking-[0.2em] text-brand-muted">
          <a href="#features" className="hover:text-brand-text transition-colors">CAPABILITIES</a>
          <a href="/tour" className="hover:text-brand-text transition-colors">PROTOTYPE TOUR</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="rounded-full border border-brand-red bg-[brand-red]/10 px-5 py-2.5 text-[11px] font-bold tracking-widest text-[brand-red] hover:bg-[brand-red] hover:text-black transition-all shadow-[0_0_15px_rgba(255,48,72,0.2)]">
            COMMAND CENTER
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="overview" className="relative min-h-screen flex items-center px-5 py-32 md:px-10">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="absolute left-0 top-[46%] h-px w-full bg-[brand-red-glow]/40 shadow-[0_0_20px_#ff3038]" />
        
        <div className="absolute -right-30 top-[-20%] h-[850px] w-[850px] rounded-full border border-brand-border bg-[radial-gradient(circle_at_45%_45%,rgba(20,20,20,.8),rgba(5,5,5,.9)_44%,transparent_66%)]" />
        <div className="absolute right-[14%] top-[14%] h-110 w-110 rounded-full border border-brand-border opacity-80"><div className="absolute inset-8 rounded-full border border-dashed border-brand-border" /><div className="absolute left-1/2 top-0 h-1/2 w-px origin-bottom rotate-[62deg] bg-[brand-red-glow] shadow-[0_0_12px_brand-red-glow]" /></div>
        
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.86fr_1.14fr]">
          <div className="z-10">
            <h1 className="max-w-xl text-5xl font-bold leading-[.94] tracking-tight text-brand-text md:text-7xl">
              A shared picture.<br /><span className="text-[brand-red]">A faster response.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-brand-muted">
              TRINETRA brings video, thermal, radar and field assets into one operational view—so commanders can recognize, verify and coordinate a response without switching systems.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => router.push('/dashboard')} className="flex items-center justify-center gap-2 rounded-full bg-[brand-red] px-8 py-4 text-sm font-bold tracking-widest text-black hover:bg-[brand-red-glow] transition-all">
                ACCESS SYSTEM <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => router.push('/tour')} className="rounded-full border border-white/20 bg-brand-bg px-8 py-4 text-sm font-bold tracking-widest text-brand-text hover:bg-white/10 transition-all">
                TAKE THE TOUR
              </button>
            </div>
          </div>
          
          <div className="relative min-h-[430px] border border-brand-border bg-brand-card/90 p-3 shadow-[0_0_70px_rgba(0,0,0,0.8)] backdrop-blur">
            <div className="flex justify-between border-b border-brand-border px-2 pb-3 text-[10px] font-bold tracking-widest text-brand-muted">
              <span>SECTOR VIEW // NORTH RIDGE</span><span className="text-[brand-red]">● PRIORITY WATCH</span>
            </div>
            
            <div className="relative mt-3 h-[370px] overflow-hidden bg-[radial-gradient(ellipse_at_70%_40%,rgba(40,40,40,.4),transparent_27%),radial-gradient(ellipse_at_22%_82%,rgba(20,20,20,.6),transparent_26%),linear-gradient(140deg,#0a0a0a,#050505_47%,#111_48%,#000)]">
              <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.15)_1px,transparent_1px)] [background-size:38px_38px]" />
              
              <div className="absolute left-[45%] top-[40%] animate-tracking z-10 w-0 h-0">
                <div className="absolute -left-14 -top-14 h-28 w-28 rounded-full border border-dashed border-white/30">
                  <div className="absolute inset-3 rounded-full border border-white/20" />
                  <div className="absolute left-1/2 top-1/2 h-px w-30 origin-left -rotate-25 bg-[brand-red] shadow-[0_0_13px_brand-red]" />
                </div>
                <div className="absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full border-2 border-[brand-red] bg-[brand-red-dark]/80 p-1 text-[brand-red-glow] shadow-[0_0_20px_#ff4d54]">
                  <Crosshair className="h-4 w-4" />
                </div>
                <p className="absolute left-6 -top-3 w-40 text-[10px] font-bold tracking-widest text-[brand-red-glow]">
                  TRACK 042<br /><span className="font-normal text-brand-muted">CONFIDENCE 87%</span>
                </p>
              </div>

              <div className="absolute bottom-5 left-5 flex items-center gap-2 text-[10px] tracking-widest text-brand-muted"><Radio className="h-4 w-4 text-brand-muted" /> RADAR-02: LINKED</div>
              <div className="absolute bottom-5 right-5 flex items-center gap-2 text-[10px] tracking-widest text-brand-muted"><ScanLine className="h-4 w-4 text-brand-muted" /> THERMAL-04: ACTIVE</div>
            </div>
          </div>
        </div>
      </section>

      {/* GSAP / ScrollTrigger Mimic Section (Crossfading Features) */}
      <section id="features" ref={scrollRef} className="relative border-t border-brand-border" style={{ height: '500vh' }}>
        
        {/* Sticky Stage */}
        <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
          
          <div className="absolute inset-0 opacity-10 pointer-events-none [background-image:linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:54px_54px]" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(255,48,72,0.08),transparent_50%)]" />
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-16 lg:gap-24 w-full">
            
            {/* Left Side: Static Text */}
            <div className="h-fit py-10 lg:py-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-red/30 bg-[brand-red]/10 px-3 py-1 mb-6 text-[10px] font-bold tracking-widest text-[brand-red]">
                {allFeatures[activeIndex].isXFactor ? '🔥 X-FACTOR FEATURE' : 'CORE CAPABILITIES'}
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-brand-text mb-6 leading-tight transition-all duration-700">
                Unrivaled intelligence at the edge.
              </h2>
              <p className="text-brand-muted text-lg font-light">
                Designed specifically for remote border environments, TRINETRA processes heavy AI models locally, requiring zero constant internet dependency.
              </p>
              
              {/* Progress Dots */}
              <div className="mt-12 flex gap-2 flex-wrap max-w-[200px]">
                {allFeatures.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-6 bg-[brand-red]' : 'w-2 bg-zinc-800'}`} />
                ))}
              </div>
            </div>

            {/* Right Side: Crossfading Cards */}
            <div className="relative h-[400px] w-full">
              {allFeatures.map((f, i) => {
                const Icon = f.icon;
                const isActive = i === activeIndex;
                const isPast = i < activeIndex;
                
                return (
                  <div 
                    key={i} 
                    className={`absolute inset-0 w-full transition-all duration-700 ease-in-out ${isActive ? 'opacity-100 translate-y-0 pointer-events-auto' : isPast ? 'opacity-0 -translate-y-12 pointer-events-none' : 'opacity-0 translate-y-12 pointer-events-none'}`}
                  >
                    <div className="w-full h-full p-10 md:p-12 rounded-3xl border border-brand-red/30 bg-brand-card shadow-[0_0_50px_rgba(255,48,72,0.04)] backdrop-blur-xl flex flex-col justify-center">
                      <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-8 bg-[brand-red]/15 text-[brand-red] border border-brand-red/20">
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-3xl font-bold text-brand-text tracking-wide mb-4">{f.title}</h3>
                      <p className="text-lg text-brand-muted leading-relaxed font-light">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      </main>

            {/* Cinematic Reveal Footer (Rich Layout) */}
      <footer className="fixed bottom-0 left-0 w-full h-[550px] z-0 bg-brand-bg flex flex-col justify-end pb-8 overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,48,72,0.05),transparent_60%)] pointer-events-none" />
         
         <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 relative z-10">
            <div>
              <Logo size="sm" showText={true} />
              <p className="mt-4 text-brand-muted text-sm leading-relaxed">
                TRINETRA is a modern AI-based intelligent video analytics platform designed for the MHA & SSB border surveillance hackathon.
              </p>
            </div>
            
            <div>
              <h4 className="text-brand-text text-lg font-bold mb-6 font-sans">Platform</h4>
              <ul className="space-y-3 text-sm text-brand-muted">
                <li><a href="#overview" className="hover:text-[brand-red] transition-colors">Overview</a></li>
                <li><a href="#features" className="hover:text-[brand-red] transition-colors">Core Capabilities</a></li>
                <li><a href="/dashboard" className="hover:text-[brand-red] transition-colors">Command Center</a></li>
                <li className="relative inline-block">
                  <a href="/tour" className="hover:text-[brand-red] transition-colors">Interactive Tour</a>
                  <span className="absolute top-1 right-[-12px] w-1.5 h-1.5 rounded-full bg-[brand-red] animate-pulse"></span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-brand-text text-lg font-bold mb-6 font-sans">Resources</h4>
              <ul className="space-y-3 text-sm text-brand-muted">
                <li><a href="#" className="hover:text-[brand-red] transition-colors">Architecture Diagram</a></li>
                <li><a href="#" className="hover:text-[brand-red] transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-[brand-red] transition-colors">Security Whitepaper</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-brand-text text-lg font-bold mb-6 font-sans">Contact HQ</h4>
              <ul className="space-y-4 text-sm text-brand-muted">
                <li className="flex items-center space-x-3"><Mail size={16} className="text-[brand-red]" /><span>command@trinetra.mil</span></li>
                <li className="flex items-center space-x-3"><Phone size={16} className="text-[brand-red]" /><span>+91 SECURE LINE</span></li>
                <li className="flex items-center space-x-3"><MapPin size={16} className="text-[brand-red]" /><span>New Delhi, India</span></li>
              </ul>
            </div>
         </div>
         
         <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
           <hr className="border-t border-brand-border mb-6" />
           <div className="flex flex-col md:flex-row justify-between items-center text-xs font-mono tracking-widest text-brand-muted">
             <div className="flex space-x-6 mb-4 md:mb-0">
               <a href="#" className="hover:text-[brand-red] transition-colors"><Globe size={18} /></a>
               <a href="#" className="hover:text-[brand-red] transition-colors"><Twitter size={18} /></a>
             </div>
             <p>© 2026 TRINETRA SYSTEMS. ALL RIGHTS RESERVED.</p>
           </div>
         </div>

                  {/* Giant Background Text Hover Effect */}
         <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-full text-center z-0">
           <style>{`
             .giant-text {
               -webkit-text-stroke: 1px rgba(255, 255, 255, 0.1);
               color: transparent;
               opacity: 0.4;
               transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
             }
             .giant-text:hover {
               -webkit-text-stroke: 1px rgba(255, 82, 88, 0.4);
               color: rgba(255, 82, 88, 0.05);
               opacity: 1;
               text-shadow: 0 0 80px rgba(255, 82, 88, 0.3);
             }
           `}</style>
           <h1 className="giant-text text-[22vw] font-black whitespace-nowrap tracking-tighter select-none cursor-crosshair">
             TRINETRA
           </h1>
         </div>
      </footer>
    </div>
  );
}








