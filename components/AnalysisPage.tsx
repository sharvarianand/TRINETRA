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
    Moon,
    TrendingUp,
    TrendingDown,
    Users,
    Clock,
    AlertTriangle,
    Activity,
    Target,
    Zap,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import Logo from './Logo';

import { useTheme } from '@/lib/ThemeContext';
import { AppUser } from '@/lib/types';

interface AnalyticsData {
    totalVisitors: number;
    peakHour: string;
    avgDwellTime: number;
    crowdDensity: number;
    incidentCount: number;
    safetyScore: number;
}

interface TrendData {
    label: string;
    value: number;
    change: number;
    trend: 'up' | 'down';
}

interface HourlyData {
    hour: string;
    count: number;
}

interface ZoneAnalysis {
    zone: string;
    avgOccupancy: number;
    peakOccupancy: number;
    riskLevel: 'low' | 'medium' | 'high';
    incidents: number;
}

export default function AnalysisPage({ user }: { user?: AppUser }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const supabase = createClient();
    const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month'>('today');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
        totalVisitors: 0,
        peakHour: '14:00',
        avgDwellTime: 0,
        crowdDensity: 0,
        incidentCount: 0,
        safetyScore: 0
    });
    const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
    const [zoneAnalysis, setZoneAnalysis] = useState<ZoneAnalysis[]>([]);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [cameras, setCameras] = useState<any[]>([]);
    const baseUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000';

    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard', href: '/dashboard' },
        { id: 'heatmap', icon: Map, label: 'Heat Map', href: '/heatmap' },
        { id: 'analytics', icon: BarChart3, label: 'Analysis', href: '/analysis' },
        { id: 'reports', icon: FileText, label: 'Reports', href: '/reports' },
        { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
    ];

    // Fetch real analytics data
    useEffect(() => {
        const fetchRealAnalytics = async () => {
            try {
                // 1. Fetch Global Data
                const globalRes = await fetch(`${baseUrl}/analytics/global`);
                if (globalRes.ok) {
                    const gData = await globalRes.json();

                    setAnalyticsData(prev => ({
                        ...prev,
                        totalVisitors: gData.total_visitors,
                        peakHour: gData.peak_hour,
                        crowdDensity: Math.round(gData.peak_count * 1.5), // Estimate based on peak
                        incidentCount: gData.recent_alerts?.length || 0,
                        safetyScore: 95 - (gData.recent_alerts?.filter((a: any) => a.type === 'emergency').length * 20 || 0)
                    }));

                    setHourlyData(gData.hourly_history.map((count: number, idx: number) => ({
                        hour: `${idx.toString().padStart(2, '0')}:00`,
                        count
                    })));
                }

                // 2. Fetch Zone-wise Data
                const allRes = await fetch(`${baseUrl}/analytics/all`);
                if (allRes.ok) {
                    const aData = await allRes.json();
                    setZoneAnalysis(aData.cameras.map((cam: any) => ({
                        zone: cam.zone,
                        avgOccupancy: cam.people_count,
                        peakOccupancy: cam.people_count, // Instantaneous for now
                        riskLevel: cam.density > 70 ? 'high' : cam.density > 40 ? 'medium' : 'low',
                        incidents: 0
                    })));

                    setTrends([
                        { label: 'Visitor Count', value: aData.total_people_count, change: 0, trend: 'up' },
                        { label: 'Active Cameras', value: aData.cameras.length, change: 0, trend: 'up' },
                        { label: 'Safety Score', value: 98, change: 0, trend: 'up' },
                        { label: 'Peak Hour', value: 0, change: 0, trend: 'up' } // Placeholder for chart
                    ]);
                }

                setLastUpdated(new Date().toLocaleTimeString());
            } catch (err) {
                console.error('Failed to fetch real analytics:', err);
            }
        };

        const fetchCameras = async () => {
            try {
                const response = await fetch(`${baseUrl}/cameras`);
                if (response.ok) {
                    const data = await response.json();
                    setCameras(data.cameras || []);
                }
            } catch (err) {
                console.error('Failed to fetch cameras:', err);
            }
        };

        fetchCameras();
        fetchRealAnalytics();

        const interval = setInterval(fetchRealAnalytics, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [selectedTimeRange, cameras.length]);

    const maxHourlyCount = Math.max(...hourlyData.map(h => h.count), 1);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
            case 'medium': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
            default: return 'text-brand-muted dark:text-brand-text bg-cyan-50 dark:bg-brand-card/30';
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
                                    ? 'bg-cyan-50 dark:bg-brand-card/30 text-brand-muted dark:text-brand-text font-medium'
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
                            <BarChart3 className="w-6 h-6 text-brand-red" />
                            Intelligence Analysis
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sector activity, movement patterns & operational insights</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Time Range Selector */}
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg p-1">
                            {(['today', 'week', 'month'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setSelectedTimeRange(range)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedTimeRange === range
                                        ? 'bg-white dark:bg-zinc-600 text-brand-muted dark:text-brand-text shadow-sm'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:text-brand-muted dark:hover:text-brand-text'
                                        }`}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="relative p-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-muted dark:hover:text-brand-text transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button className="relative p-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-muted dark:hover:text-brand-text transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-9 h-9 rounded-full bg-cyan-50 dark:bg-brand-card/30 flex items-center justify-center border border-cyan-200 dark:border-brand-border hover:border-cyan-400 transition-colors cursor-pointer">
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

                {/* Analytics Content */}
                <main className="flex-1 p-6 overflow-auto">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-6 gap-4 mb-6">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-2">
                                <Users className="w-5 h-5 text-brand-red" />
                                <span className="text-xs text-brand-muted dark:text-brand-text flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> 12.5%
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{analyticsData.totalVisitors.toLocaleString()}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Tracked Subjects</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-2">
                                <Clock className="w-5 h-5 text-purple-500" />
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">{analyticsData.peakHour}</span>
                            </div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{analyticsData.avgDwellTime}m</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Avg Presence Time</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-2">
                                <Activity className="w-5 h-5 text-amber-500" />
                                <span className="text-xs text-amber-600 dark:text-amber-400">{analyticsData.crowdDensity}%</span>
                            </div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{analyticsData.crowdDensity}%</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Movement Density</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="text-xs text-brand-muted dark:text-brand-text flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3" /> -15%
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{analyticsData.incidentCount}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Incidents Today</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-2">
                                <Target className="w-5 h-5 text-brand-red" />
                            </div>
                            <div className="text-2xl font-bold text-brand-muted dark:text-brand-text">{analyticsData.safetyScore}%</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Sector Readiness</div>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between mb-2">
                                <Zap className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{analyticsData.peakHour}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Peak Hour</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        {/* Hourly Footfall Chart */}
                        <div className="col-span-8 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-brand-red" />
                                Hourly Footfall Analysis
                            </h3>
                            <div className="flex items-end gap-2 h-64">
                                {hourlyData.map((data, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full bg-linear-to-t from-cyan-600 to-cyan-400 dark:from-cyan-700 dark:to-cyan-500 rounded-t-sm transition-all duration-500 hover:from-cyan-500 hover:to-cyan-300"
                                            style={{ height: `${(data.count / maxHourlyCount) * 100}%` }}
                                            title={`${data.count} visitors`}
                                        ></div>
                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 -rotate-45 origin-center">
                                            {data.hour}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Peak: {hourlyData.reduce((max, d) => d.count > max.count ? d : max, hourlyData[0])?.hour || 'N/A'}</span>
                                <span>Total: {hourlyData.reduce((sum, d) => sum + d.count, 0).toLocaleString()} visitors</span>
                            </div>
                        </div>

                        {/* Trends */}
                        <div className="col-span-4 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-purple-500" />
                                Key Trends
                            </h3>
                            <div className="space-y-4">
                                {trends.map((trend, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border border-zinc-100 dark:border-zinc-600">
                                        <div>
                                            <div className="text-sm text-zinc-500 dark:text-zinc-400">{trend.label}</div>
                                            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{trend.value.toLocaleString()}</div>
                                        </div>
                                        <div className={`flex items-center gap-1 text-sm ${trend.trend === 'up' ? 'text-brand-muted dark:text-brand-text' : 'text-red-600 dark:text-red-400'}`}>
                                            {trend.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            {Math.abs(trend.change)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Zone Analysis */}
                        <div className="col-span-12 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                <Map className="w-5 h-5 text-brand-red" />
                                Zone-wise Analysis
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Zone</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Avg Occupancy</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Peak Occupancy</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Risk Level</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Incidents</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Occupancy Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {zoneAnalysis.map((zone, index) => (
                                            <tr key={index} className="border-b border-zinc-100 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                                                <td className="py-3 px-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{zone.zone}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-sm text-brand-muted dark:text-brand-text">{zone.avgOccupancy}%</span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-sm text-amber-600 dark:text-amber-400">{zone.peakOccupancy}%</span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(zone.riskLevel)}`}>
                                                        {zone.riskLevel.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`text-sm ${zone.incidents > 0 ? 'text-red-600 dark:text-red-400' : 'text-brand-muted dark:text-brand-text'}`}>
                                                        {zone.incidents}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="w-full bg-zinc-200 dark:bg-zinc-600 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${zone.avgOccupancy > 70 ? 'bg-red-500' :
                                                                zone.avgOccupancy > 50 ? 'bg-amber-500' : 'bg-cyan-500'
                                                                }`}
                                                            style={{ width: `${zone.avgOccupancy}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* AI Predictions */}
                        <div className="col-span-6 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" />
                                AI Predictions
                            </h3>
                            <div className="space-y-3">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center gap-3 mb-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Expected Peak in 2 hours</span>
                                    </div>
                                    <p className="text-xs text-amber-600 dark:text-amber-400/80">Based on historical data, crowd density is expected to reach 85% by 16:00.</p>
                                </div>
                                <div className="p-4 bg-cyan-50 dark:bg-brand-card/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                                    <div className="flex items-center gap-3 mb-2">
                                        <TrendingUp className="w-5 h-5 text-brand-muted dark:text-brand-text" />
                                        <span className="text-sm font-medium text-brand-muted dark:text-cyan-300">Visitor Surge Predicted</span>
                                    </div>
                                    <p className="text-xs text-brand-muted dark:text-brand-text/80">Weather conditions favorable. Expected 15% increase in visitors.</p>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Staffing Recommendation</span>
                                    </div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400/80">Recommend 3 additional security personnel at Food Court during 12:00-14:00.</p>
                                </div>
                            </div>
                        </div>

                        {/* Anomaly Detection */}
                        <div className="col-span-6 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Anomaly Detection
                            </h3>
                            <div className="space-y-3">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Unusual Gathering - Zone B</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">12:34 PM</span>
                                    </div>
                                    <p className="text-xs text-red-600 dark:text-red-400/80">Detected 40% higher than normal crowd density in Zone B.</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded">High Priority</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Flow Disruption - Entry Gate</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">11:15 AM</span>
                                    </div>
                                    <p className="text-xs text-amber-600 dark:text-amber-400/80">Entry rate dropped by 60% for 5 minutes.</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="px-2 py-1 bg-cyan-100 dark:bg-brand-card/40 text-brand-muted dark:text-cyan-300 text-xs rounded">Resolved</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Unusual Movement Pattern</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">10:45 AM</span>
                                    </div>
                                    <p className="text-xs text-purple-600 dark:text-purple-400/80">Detected counter-flow movement in Main Plaza.</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded">Monitoring</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer Status */}
                <footer className="bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 px-6 py-3 flex items-center justify-between transition-colors duration-200">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                        <span className="text-xs font-medium text-brand-muted dark:text-brand-text">Analytics Engine Active</span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Last updated: {lastUpdated || '--:--:--'}
                    </div>
                </footer>
            </div>
        </div>
    );
}
