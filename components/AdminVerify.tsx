'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';

const ADMIN_PASSCODE = '123456';

interface AdminVerifyProps {
    user: {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
    };
}

export default function AdminVerify({ user }: AdminVerifyProps) {
    const router = useRouter();
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        await new Promise(resolve => setTimeout(resolve, 500));

        if (passcode === ADMIN_PASSCODE) {
            localStorage.setItem('TRINETRA_admin_verified', 'true');
            localStorage.setItem('TRINETRA_admin_verify_time', Date.now().toString());
            window.location.reload();
        } else {
            setError('Invalid passcode. Security lockout initiated.');
            setPasscode('');
            setIsLoading(false);
        }
    };

    const getUserInitials = () => {
        if (user?.firstName && user?.lastName) {
            return \\.toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'US';
    };

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 transition-colors duration-200 relative overflow-hidden font-sans">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,51,72,0.05),transparent_60%)] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo Area */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="scale-125 mb-6">
                        <Logo size="lg" showText={false} />
                    </div>
                    <h1 className="text-2xl font-black tracking-[0.2em] text-brand-text">TRINETRA</h1>
                    <p className="text-xs text-brand-muted tracking-widest uppercase mt-2">RESTRICTED COMMAND SECTOR</p>
                </div>

                {/* Verification Card */}
                <div className="bg-brand-card border border-brand-border rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] p-8">
                    {/* User Info */}
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-full bg-brand-bg border-2 border-brand-red flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(239,51,72,0.2)]">
                            <span className="text-brand-red font-bold text-xl">{getUserInitials()}</span>
                        </div>
                        <p className="text-xs font-mono text-brand-muted uppercase tracking-widest">Authenticated Identity</p>
                        <p className="font-medium text-brand-text mt-1">{user.firstName || user.email}</p>
                    </div>

                    <div className="text-center mb-6 p-4 bg-brand-red/5 rounded-xl border border-brand-red/20">
                        <h2 className="text-sm font-bold tracking-widest text-brand-red mb-1">ELEVATED CLEARANCE REQUIRED</h2>
                        <p className="text-brand-muted font-mono text-xs">Enter administrative override code to access Command Center</p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-6">
                        {/* Passcode Input */}
                        <div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                                <input
                                    type="password"
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full pl-12 pr-4 py-4 bg-brand-bg/50 border border-brand-border rounded-lg text-brand-text placeholder-brand-muted/50 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all text-xl tracking-[0.5em] text-center font-mono"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center justify-center gap-2 p-3 bg-brand-red/10 border border-brand-red/30 rounded-lg text-brand-red-glow text-xs font-mono">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || passcode.length < 6}
                            className="w-full py-4 bg-brand-red hover:bg-white text-white hover:text-brand-red rounded-lg transition-all font-bold tracking-widest text-sm shadow-[0_0_20px_rgba(239,51,72,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? 'VERIFYING SIGNATURE...' : 'AUTHORIZE ACCESS'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] font-mono tracking-widest text-brand-muted mt-8">
                    UNAUTHORIZED ACCESS IS PROHIBITED
                </p>
            </div>
        </div>
    );
}
