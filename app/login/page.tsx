'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center font-sans p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,51,72,0.05),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="scale-125 mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-3xl font-black tracking-[0.2em] text-brand-text mt-4">TRINETRA</h1>
          <p className="text-xs text-brand-muted tracking-widest uppercase mt-3">SECURE ACCESS // BORDER SURVEILLANCE</p>
        </div>

        {/* Login Card */}
        <div className="bg-brand-card border border-brand-border rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="p-8 space-y-6">
            
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3.5 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px bg-brand-border flex-1" />
              <span className="text-xs text-brand-muted uppercase tracking-widest font-mono">or email</span>
              <div className="h-px bg-brand-border flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red-glow text-sm p-4 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-brand-muted mb-2 tracking-wider">OPERATOR EMAIL</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg pl-11 pr-4 py-3.5 text-brand-text text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-brand-muted/50"
                    placeholder="operator@trinetra.mil"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-brand-muted mb-2 tracking-wider">SECURE PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg pl-11 pr-12 py-3.5 text-brand-text text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-brand-muted/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-red hover:bg-white text-white hover:text-brand-red font-bold py-3.5 rounded-lg tracking-widest shadow-[0_0_20px_rgba(239,51,72,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'ACCESS SYSTEM' : 'CREATE ACCOUNT'}
              </button>
            </form>
          </div>

          <div className="bg-brand-bg/50 px-8 py-5 border-t border-brand-border">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="w-full text-center text-xs font-mono text-brand-muted hover:text-brand-text transition-colors"
            >
              {mode === 'login' ? 'NO CLEARANCE? REQUEST ACCESS' : 'HAVE CLEARANCE? SIGN IN'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-brand-muted/50 mt-8 font-mono tracking-widest">
          TRINETRA // MHA & SSB HACKATHON
        </p>
      </div>
    </div>
  );
}

