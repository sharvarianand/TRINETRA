import React from 'react';
import { Github, ArrowRight, Shield, Code, Video } from 'lucide-react';
import Logo from '@/components/Logo';

export default function HubPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans selection:bg-brand-red selection:text-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none" />
      
      {/* Header */}
      <header className="w-full p-6 flex justify-center relative z-10">
        <Logo size="lg" showText={true} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 relative z-10 max-w-6xl mx-auto w-full mb-20">
        <div className="text-center mb-10">

          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-brand-text">
            TRINETRA PORTAL
          </h1>
          <p className="text-brand-muted max-w-lg mx-auto text-lg font-light">
            AI-Powered Border Surveillance & Intelligent Video Analytics
          </p>
        </div>

        <div className="w-full grid lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left Column: Embedded Video Demo */}
          <div className="w-full h-full min-h-75 lg:min-h-100 rounded-xl overflow-hidden border border-brand-border bg-black shadow-[0_0_30px_rgba(239,51,72,0.1)] relative">
            <iframe 
              src="https://drive.google.com/file/d/1sy9G-PXDalpzb7JR_s2w-aNFKwzdaU1C/preview" 
              className="absolute inset-0 w-full h-full"
              allow="autoplay"
              allowFullScreen
            ></iframe>
          </div>

          {/* Right Column: Links & Info */}
          <div className="w-full flex flex-col gap-4 justify-center">
            
            <div className="p-8 border rounded-xl backdrop-blur-sm bg-brand-card/30 border-brand-border/50 text-center mb-2">
              <h3 className="text-xl font-bold mb-2">System Demonstration</h3>
              <p className="text-sm text-brand-muted font-light leading-relaxed">
                Watch the video to see TRINETRA's intelligent threat detection, low-bandwidth synchronization, and cryptographic audit logs in action.
              </p>
            </div>

            <a 
              href="https://github.com/sharvarianand/TRINETRA"
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col sm:flex-row items-center justify-between p-6 border transition-all duration-300 backdrop-blur-sm bg-brand-red/5 border-brand-red/30 hover:bg-brand-red/10 hover:border-brand-red/50 shadow-[0_0_20px_rgba(239,51,72,0.1)] rounded-xl"
            >
              <div className="flex items-center gap-6 mb-4 sm:mb-0">
                <div className="p-4 transition-colors group-hover:scale-110 duration-300 rounded border bg-brand-red/10 border-brand-red/20">
                  <Code className="w-8 h-8 text-brand-red" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-brand-text mb-1 tracking-tight">GitHub Repository</h2>
                  <p className="text-sm text-brand-muted font-light">View the source code & setup instructions</p>
                </div>
              </div>
              <div className="p-3 rounded group-hover:translate-x-1 transition-transform bg-brand-red text-black hidden sm:block">
                <ArrowRight size={24} />
              </div>
            </a>

          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs font-mono tracking-widest text-brand-muted relative z-10 border-t border-brand-border mt-auto">
        TRINETRA SYSTEMS // PROOF OF CONCEPT
      </footer>
    </div>
  );
}
