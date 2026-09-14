'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, AlertCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
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
    const { theme, toggleTheme } = useTheme();
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        if (passcode === ADMIN_PASSCODE) {
            // Store admin verification in localStorage
            localStorage.setItem('TRINETRA_admin_verified', 'true');
            localStorage.setItem('TRINETRA_admin_verify_time', Date.now().toString());
            // Force page reload to re-check verification status
            window.location.reload();
        } else {
            setError('Invalid passcode. Please try again.');
            setPasscode('');
            setIsLoading(false);
        }
    };

    const getUserInitials = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'US';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-cyan-50/30 to-zinc-100 dark:from-zinc-900 dark:via-cyan-900/10 dark:to-zinc-900 flex items-center justify-center p-6 transition-colors duration-200">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="fixed top-6 right-6 p-2 text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800/50"
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Logo size="lg" showText={true} />
                </div>

                {/* Verification Card */}
                <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-8">
                    {/* User Info */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center mx-auto mb-3 border-2 border-cyan-200 dark:border-cyan-700">
                            <span className="text-cyan-600 dark:text-cyan-400 font-bold text-xl">{getUserInitials()}</span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Logged in as</p>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{user.firstName || user.email}</p>
                    </div>

                    <div className="text-center mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Admin Verification Required</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Enter admin passcode to continue</p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-6">
                        {/* Passcode Input */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Admin Passcode
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                <input
                                    type="password"
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    placeholder="Enter 6-digit passcode"
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-lg tracking-widest text-center"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || passcode.length < 6}
                            className="w-full py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all font-medium shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    Verify Access
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 mt-6">
                    Contact administrator for passcode access
                </p>
            </div>
        </div>
    );
}
