'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    Home,
    Map,
    BarChart3,
    Settings,
    Bell,
    FileText,
    LogOut,
    Menu,
    X,
    Sun,
    Moon
} from 'lucide-react';
import Logo from './Logo';
import HeatMapVisualization from './HeatMap';
import { useTheme } from '@/lib/ThemeContext';
import { AppUser } from '@/lib/types';

export default function HeatMapPage({ user }: { user?: AppUser }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const supabase = createClient();

    // Hydration-safe last updated time
    const [lastUpdated, setLastUpdated] = useState<string>("");
    useEffect(() => {
        setLastUpdated(new Date().toLocaleTimeString());
        const interval = setInterval(() => {
            setLastUpdated(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Command Post', href: '/dashboard' },
        { id: 'heatmap', icon: Map, label: 'Sector Map', href: '/heatmap' },
        { id: 'analytics', icon: BarChart3, label: 'Intel Analysis', href: '/analysis' },
        { id: 'reports', icon: FileText, label: 'Incident Log', href: '/reports' },
        { id: 'settings', icon: Settings, label: 'System Control', href: '/settings' },
    ];

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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex transition-colors duration-200">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 transition-all duration-300 flex flex-col`}>
                {/* Logo - Click to toggle sidebar */}
                <div
                    className="p-4 border-b border-zinc-100 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    <Logo size={sidebarOpen ? 'md' : 'sm'} showText={sidebarOpen} />
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-brand-card/10 dark:bg-brand-card/30 text-brand-muted dark:text-brand-text font-medium'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                    }`}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                {sidebarOpen && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 flex items-center justify-between transition-colors duration-200">
                    <div>
                        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Map className="w-6 h-6 text-brand-red" />
                            Heat Map
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Live sector activity and movement-density visualization</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="relative p-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-muted dark:hover:text-brand-text transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5" />
                            ) : (
                                <Moon className="w-5 h-5" />
                            )}
                        </button>
                        <button className="relative p-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-muted dark:hover:text-brand-text transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-9 h-9 rounded-full bg-brand-card/10 dark:bg-brand-card/30 flex items-center justify-center border border-brand-border dark:border-brand-border hover:border-brand-red transition-colors cursor-pointer">
                                <span className="text-brand-muted dark:text-brand-text font-medium text-sm">{getUserInitials()}</span>
                            </button>
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-2 z-50">
                                    {user && (<div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-700"><p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.firstName || 'User'}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p></div>)}
                                    <button
                                        onClick={async () => {
                                            localStorage.removeItem('TRINETRA_admin_verified');
                                            localStorage.removeItem('TRINETRA_admin_verify_time');
                                            await supabase.auth.signOut();
                                            router.push('/');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm w-full text-left"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Heat Map Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 h-full overflow-hidden">
                        <HeatMapVisualization className="h-full" />
                    </div>
                </main>

                {/* Footer Status */}
                <footer className="bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 px-6 py-3 flex items-center justify-between transition-colors duration-200">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
                        <span className="text-xs font-medium text-brand-muted dark:text-brand-text">Heat Map Active</span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Last updated: {lastUpdated}
                    </div>
                </footer>
            </div>
        </div>
    );
}


