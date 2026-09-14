'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center font-mono p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-900/20 border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.3em] text-cyan-500">TRINETRA</h1>
          <p className="text-xs text-cyan-600/70 tracking-widest uppercase mt-2">SECURE ACCESS // BORDER SURVEILLANCE</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0c121b] border border-cyan-900/40 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <div className="p-6 border-b border-cyan-900/40">
            <h2 className="text-lg font-bold text-cyan-400 tracking-wider">
              {mode === 'login' ? 'AUTHENTICATE' : 'CREATE ACCOUNT'}
            </h2>
            <p className="text-xs text-cyan-600/50 mt-1">Authorized personnel only</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-950/50 border border-red-900/50 text-red-400 text-sm p-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-cyan-600 mb-2 tracking-wider">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-cyan-900/60 rounded pl-10 pr-4 py-3 text-cyan-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="operator@trinetra.mil"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-cyan-600 mb-2 tracking-wider">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-cyan-900/60 rounded pl-10 pr-12 py-3 text-cyan-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-700 hover:text-cyan-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3 rounded tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'ACCESS SYSTEM' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="px-6 pb-6">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="w-full text-center text-xs text-cyan-600 hover:text-cyan-400 transition-colors py-2"
            >
              {mode === 'login' ? 'Need an account? Register here' : 'Already registered? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-cyan-800 mt-6 tracking-wider">
          TRINETRA // INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM
        </p>
      </div>
    </div>
  );
}
