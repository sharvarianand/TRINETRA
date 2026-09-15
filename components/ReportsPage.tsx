'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
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
    X as XIcon,
    Sun,
    Moon,
    Download,
    Filter,
    Calendar,
    Clock,
    CheckCircle,
    Eye,
    Printer,
    Search,
    ChevronDown,
    ChevronUp,
    MapPin,
    Users,
    Camera,
    FileWarning,
    Shield
} from 'lucide-react';
import Logo from './Logo';

import { useTheme } from '@/lib/ThemeContext';
import { AppUser } from '@/lib/types';

interface Incident {
    id: string;
    timestamp: Date;
    type: 'critical' | 'warning' | 'info';
    category: string;
    title: string;
    description: string;
    zone: string;
    status: 'resolved' | 'pending' | 'investigating';
    responders: string[];
    duration: number; // in minutes
    crowdCount: number;
    cameraId: string;
    actions: string[];
}

interface DailyReport {
    date: Date;
    totalIncidents: number;
    critical: number;
    warnings: number;
    info: number;
    avgResponseTime: number;
    peakCrowdDensity: number;
    totalVisitors: number;
}

export default function ReportsPage({ user }: { user?: AppUser }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const supabase = createClient();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'resolved' | 'pending' | 'investigating'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [incidentToPrint, setIncidentToPrint] = useState<Incident | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [generatedTime, setGeneratedTime] = useState<string>('');
    const [baseUrl] = useState(process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000');
    const [realDailyReport, setRealDailyReport] = useState<DailyReport | null>(null);
    const [realIncidents, setRealIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Hydration-safe time updates
    useEffect(() => {
        setGeneratedTime(new Date().toLocaleString());
    }, []);

    const navItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard', href: '/dashboard' },
        { id: 'heatmap', icon: Map, label: 'Heat Map', href: '/heatmap' },
        { id: 'analytics', icon: BarChart3, label: 'Analysis', href: '/analysis' },
        { id: 'reports', icon: FileText, label: 'Reports', href: '/reports' },
        { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
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

    // Generate mock incidents using useMemo
    const incidents = useMemo(() => {
        const categories = ['Overcrowding', 'Stampede Risk', 'Medical Emergency', 'Security Breach', 'Fire Hazard', 'Unattended Object', 'Blocked Exit', 'VIP Incident'];
        const zones = ['Main Plaza', 'Entry Gate', 'Exit Gate', 'Food Court', 'Stage Area', 'Parking', 'VIP Area'];
        const responderNames = ['Officer Singh', 'Officer Patel', 'Officer Kumar', 'Officer Sharma', 'Medical Team A', 'Security Team B'];
        const statuses: Array<'resolved' | 'pending' | 'investigating'> = ['resolved', 'pending', 'investigating'];
        const types: Array<'critical' | 'warning' | 'info'> = ['critical', 'warning', 'info'];

        // Use selectedDate as seed for consistent results per date
        const seed = selectedDate.split('-').reduce((acc, val) => acc + parseInt(val), 0);
        const seededRandom = (index: number) => {
            const x = Math.sin(seed + index) * 10000;
            return x - Math.floor(x);
        };

        return Array.from({ length: 15 }, (_, i) => {
            const type = types[Math.floor(seededRandom(i * 7) * types.length)];
            const category = categories[Math.floor(seededRandom(i * 7 + 1) * categories.length)];
            const zone = zones[Math.floor(seededRandom(i * 7 + 2) * zones.length)];
            const status = statuses[Math.floor(seededRandom(i * 7 + 3) * statuses.length)];
            const hour = Math.floor(seededRandom(i * 7 + 4) * 14) + 6;
            const minute = Math.floor(seededRandom(i * 7 + 5) * 60);

            return {
                id: `INC-${String(i + 1).padStart(4, '0')}`,
                timestamp: new Date(2026, 0, 4, hour, minute),
                type,
                category,
                title: `${category} in ${zone}`,
                description: `${type === 'critical' ? 'URGENT: ' : ''}${category} detected in ${zone}. ${type === 'critical'
                    ? 'Immediate action required. Crowd density exceeded safe threshold.'
                    : type === 'warning'
                        ? 'Situation requires monitoring. Staff alerted.'
                        : 'Routine update. No immediate action needed.'
                    }`,
                zone,
                status,
                responders: Array.from({ length: Math.floor(seededRandom(i * 7 + 6) * 3) + 1 }, (_, j) =>
                    responderNames[Math.floor(seededRandom(i * 100 + j) * responderNames.length)]
                ),
                duration: Math.floor(seededRandom(i * 11) * 45) + 5,
                crowdCount: Math.floor(seededRandom(i * 13) * 200) + 50,
                cameraId: `CAM-${String(Math.floor(seededRandom(i * 17) * 20) + 1).padStart(2, '0')}`,
                actions: [
                    'Alert dispatched to security',
                    status === 'resolved' ? 'Situation resolved' : 'Monitoring in progress',
                    type === 'critical' ? 'Emergency protocol activated' : 'Standard protocol followed'
                ]
            };
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [selectedDate]);

    // Fetch Real Data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Global Data for Daily Summary
                const globalRes = await fetch(`${baseUrl}/analytics/global`);
                if (globalRes.ok) {
                    const gData = await globalRes.json();
                    setRealDailyReport({
                        date: new Date(),
                        totalIncidents: gData.recent_alerts?.length || 0,
                        critical: gData.recent_alerts?.filter((a: any) => a.type === 'emergency' || a.type === 'no_entry_violation').length || 0,
                        warnings: gData.recent_alerts?.filter((a: any) => a.type === 'overcrowding').length || 0,
                        info: gData.recent_alerts?.filter((a: any) => a.type === 'system_error').length || 0,
                        avgResponseTime: 4.2, // Mocked for now
                        peakCrowdDensity: Math.round(gData.peak_count * 1.5),
                        totalVisitors: gData.total_visitors
                    });
                }

                // 2. Fetch Alert History
                const alertsRes = await fetch(`${baseUrl}/api/alert/history?limit=20`);
                if (alertsRes.ok) {
                    const aData = await alertsRes.json();
                    const mappedIncidents: Incident[] = aData.alerts.map((a: any) => ({
                        id: a.id,
                        timestamp: new Date(a.timestamp),
                        type: a.type === 'emergency' || a.type === 'no_entry_violation' ? 'critical' :
                            a.type === 'overcrowding' ? 'warning' : 'info',
                        category: a.type.split('_').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                        title: `${a.type.replace('_', ' ')} at ${a.zone}`,
                        description: `Automated detection system flagged ${a.type} in ${a.zone}. People count: ${a.people_count}, Threshold: ${a.max_capacity}.`,
                        zone: a.zone,
                        status: a.acknowledged ? 'resolved' : 'pending',
                        responders: ['System AI'],
                        duration: 5,
                        crowdCount: a.people_count,
                        cameraId: a.camera_id,
                        actions: ['Alert logged', a.whatsapp_sent ? 'WhatsApp notification sent' : 'Notification queued']
                    }));
                    setRealIncidents(mappedIncidents);
                }
            } catch (err) {
                console.error('ReportsPage: Failed to fetch real data', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [baseUrl]);

    const dailyReport = realDailyReport || {
        date: new Date(),
        totalIncidents: 0,
        critical: 0,
        warnings: 0,
        info: 0,
        avgResponseTime: 0,
        peakCrowdDensity: 0,
        totalVisitors: 0
    };

    const filteredIncidents = realIncidents.filter(incident => {
        if (filterType !== 'all' && incident.type !== filterType) return false;
        if (filterStatus !== 'all' && incident.status !== filterStatus) return false;
        if (searchQuery && !incident.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !incident.zone.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !incident.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'critical': return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
            case 'warning': return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
            default: return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return 'text-brand-muted dark:text-brand-text bg-brand-card/10 dark:bg-brand-card/30';
            case 'pending': return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
            default: return 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'resolved': return <CheckCircle className="w-4 h-4" />;
            case 'pending': return <Clock className="w-4 h-4" />;
            default: return <Eye className="w-4 h-4" />;
        }
    };

    const handleExportReport = () => {
        window.print();
    };

    const handlePrintIncident = (incident: Incident) => {
        setIncidentToPrint(incident);
        setShowIncidentModal(true);
    };

    const printIncidentReport = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-brand-bg flex transition-colors duration-200">


            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-brand-card border-r border-gray-200 dark:border-brand-border transition-all duration-300 flex flex-col no-print`}>
                {/* Logo - Click to toggle sidebar */}
                <div
                    className="p-4 border-b border-gray-100 dark:border-brand-border cursor-pointer hover:bg-gray-50 dark:hover:bg-brand-bg/50 transition-colors"
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
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-brand-bg/50'
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
                <header className="bg-white dark:bg-brand-card border-b border-gray-200 dark:border-brand-border px-6 py-4 flex items-center justify-between transition-colors duration-200 no-print">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-brand-text flex items-center gap-2">
                            <FileText className="w-6 h-6 text-brand-red" />
                            Reports
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-brand-muted">Incident reports and daily summaries</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleExportReport}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-card/10 dark:bg-brand-card/30 text-brand-muted dark:text-brand-text rounded-lg border border-brand-border dark:border-brand-border hover:bg-brand-card/20 dark:hover:bg-brand-card/50 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="relative p-2 text-gray-500 dark:text-brand-muted hover:text-brand-muted dark:hover:text-brand-text transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-brand-bg"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button className="relative p-2 text-gray-500 dark:text-brand-muted hover:text-brand-muted dark:hover:text-brand-text transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-9 h-9 rounded-full bg-brand-card/10 dark:bg-brand-card/30 flex items-center justify-center border border-brand-border dark:border-brand-border hover:border-brand-red transition-colors cursor-pointer">
                                <span className="text-brand-muted dark:text-brand-text font-medium text-sm">{getUserInitials()}</span>
                            </button>
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-brand-card rounded-xl shadow-lg border border-gray-200 dark:border-brand-border py-2 z-50">
                                    {user && (<div className="px-4 py-2 border-b border-gray-100 dark:border-brand-border"><p className="text-sm font-medium text-gray-900 dark:text-brand-text">{user.firstName || 'User'}</p><p className="text-xs text-gray-500 dark:text-brand-muted">{user.email}</p></div>)}
                                    <button
                                        onClick={async () => {
                                            localStorage.removeItem('TRINETRA_admin_verified');
                                            localStorage.removeItem('TRINETRA_admin_verify_time');
                                            await supabase.auth.signOut();
                                            router.push('/');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm w-full text-left"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Reports Content */}
                <main className="flex-1 p-6 overflow-auto">
                    {/* Print Header - Only visible when printing */}
                    <div className="hidden print:block print:mb-8 print:border-b-2 print:border-gray-300 print:pb-6 print:text-center print:bg-white print:text-black">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <Logo size="md" showText variant="default" />
                        </div>
                        <h2 className="text-xl font-semibold text-black">DAILY INCIDENT REPORT</h2>
                        <p className="text-sm text-gray-700 mt-2">Report Date: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-gray-700">Generated on: {generatedTime || '--'}</p>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        {/* Daily Summary */}
                        <div className="col-span-12 bg-white dark:bg-brand-card rounded-xl p-6 border border-gray-200 dark:border-brand-border print:bg-white print:border-gray-300">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-brand-text flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-purple-500" />
                                    Daily Summary
                                </h3>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-brand-border rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                />
                            </div>
                            {dailyReport && (
                                <div className="grid grid-cols-7 gap-4">
                                    <div className="bg-gray-50 dark:bg-brand-bg/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                        <div className="text-2xl font-bold text-gray-900 dark:text-brand-text">{dailyReport.totalIncidents}</div>
                                        <div className="text-xs text-gray-500 dark:text-brand-muted">Total Incidents</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{dailyReport.critical}</div>
                                        <div className="text-xs text-gray-500 dark:text-brand-muted">Critical</div>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{dailyReport.warnings}</div>
                                        <div className="text-xs text-gray-500 dark:text-brand-muted">Warnings</div>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dailyReport.info}</div>
                                        <div className="text-xs text-gray-500 dark:text-brand-muted">Info</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-brand-bg/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                        <div className="text-2xl font-bold text-brand-muted dark:text-brand-text">{dailyReport.avgResponseTime}m</div>
                                        <div className="text-xs text-gray-500 dark:text-brand-muted">Avg Response</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-brand-bg/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dailyReport.peakCrowdDensity}%</div>
                                        <div className="text-xs text-gray-500 dark:text-brand-muted">Peak Density</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-brand-bg/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                        <div className="text-2xl font-bold text-brand-muted dark:text-brand-text">{dailyReport.totalVisitors.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500 dark:text-brand-muted">Total Visitors</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="col-span-12 flex items-center gap-4 flex-wrap no-print">
                            {/* Search */}
                            <div className="relative flex-1 min-w-50 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search incidents..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-brand-text placeholder-gray-400 focus:outline-none focus:border-brand-red"
                                />
                            </div>

                            {/* Type Filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as 'all' | 'critical' | 'warning' | 'info')}
                                    className="bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                >
                                    <option value="all">All Types</option>
                                    <option value="critical">Critical</option>
                                    <option value="warning">Warning</option>
                                    <option value="info">Info</option>
                                </select>
                            </div>

                            {/* Status Filter */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'resolved' | 'pending' | 'investigating')}
                                className="bg-white dark:bg-brand-card border border-gray-200 dark:border-brand-border rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                            >
                                <option value="all">All Statuses</option>
                                <option value="resolved">Resolved</option>
                                <option value="pending">Pending</option>
                                <option value="investigating">Investigating</option>
                            </select>

                            <span className="text-sm text-gray-500 dark:text-brand-muted">
                                Showing {filteredIncidents.length} of {incidents.length} incidents
                            </span>
                        </div>

                        {/* Incidents List */}
                        <div className="col-span-12 space-y-3">
                            {filteredIncidents.map((incident) => (
                                <div
                                    key={incident.id}
                                    className={`bg-white dark:bg-brand-card rounded-xl border ${incident.type === 'critical' ? 'border-red-200 dark:border-red-900/50' :
                                        incident.type === 'warning' ? 'border-amber-200 dark:border-amber-900/50' : 'border-gray-200 dark:border-brand-border'
                                        } overflow-hidden`}
                                >
                                    {/* Incident Header */}
                                    <div
                                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-brand-bg/50 transition-colors"
                                        onClick={() => setExpandedIncident(expandedIncident === incident.id ? null : incident.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(incident.type)}`}>
                                                    {incident.type.toUpperCase()}
                                                </span>
                                                <span className="text-sm font-mono text-gray-500 dark:text-brand-muted">{incident.id}</span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-brand-text">{incident.title}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                                                    {getStatusIcon(incident.status)}
                                                    {incident.status.toUpperCase()}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-brand-muted flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {incident.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {expandedIncident === incident.id ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedIncident === incident.id && (
                                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-brand-border">
                                            <div className="grid grid-cols-4 gap-6 mt-4">
                                                {/* Description */}
                                                <div className="col-span-2">
                                                    <h4 className="text-xs font-medium text-gray-500 dark:text-brand-muted mb-2">DESCRIPTION</h4>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{incident.description}</p>

                                                    <h4 className="text-xs font-medium text-gray-500 dark:text-brand-muted mt-4 mb-2">ACTIONS TAKEN</h4>
                                                    <ul className="space-y-1">
                                                        {incident.actions.map((action, i) => (
                                                            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                                <CheckCircle className="w-3 h-3 text-brand-red" />
                                                                {action}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Details */}
                                                <div>
                                                    <h4 className="text-xs font-medium text-gray-500 dark:text-brand-muted mb-2">INCIDENT DETAILS</h4>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <MapPin className="w-4 h-4 text-brand-red" />
                                                            <span className="text-gray-500 dark:text-brand-muted">Zone:</span>
                                                            <span className="text-gray-900 dark:text-brand-text">{incident.zone}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Camera className="w-4 h-4 text-brand-red" />
                                                            <span className="text-gray-500 dark:text-brand-muted">Camera:</span>
                                                            <span className="text-gray-900 dark:text-brand-text">{incident.cameraId}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Users className="w-4 h-4 text-brand-red" />
                                                            <span className="text-gray-500 dark:text-brand-muted">Crowd:</span>
                                                            <span className="text-gray-900 dark:text-brand-text">{incident.crowdCount} people</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Clock className="w-4 h-4 text-brand-red" />
                                                            <span className="text-gray-500 dark:text-brand-muted">Duration:</span>
                                                            <span className="text-gray-900 dark:text-brand-text">{incident.duration} min</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Responders */}
                                                <div>
                                                    <h4 className="text-xs font-medium text-gray-500 dark:text-brand-muted mb-2">RESPONDERS</h4>
                                                    <div className="space-y-2">
                                                        {incident.responders.map((responder, i) => (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-brand-card/10 dark:bg-brand-card/30 flex items-center justify-center border border-brand-border dark:border-brand-border">
                                                                    <span className="text-brand-muted dark:text-brand-text text-xs font-medium">{responder.charAt(0)}</span>
                                                                </div>
                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{responder}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePrintIncident(incident);
                                                        }}
                                                        className="mt-4 flex items-center gap-2 text-sm text-brand-muted dark:text-brand-text hover:text-brand-muted dark:hover:text-brand-red transition-colors"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                        Print Report
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {filteredIncidents.length === 0 && (
                                <div className="bg-white dark:bg-brand-card rounded-xl p-12 border border-gray-200 dark:border-brand-border text-center">
                                    <FileWarning className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No incidents found</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try adjusting your filters or search query</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Footer Status */}
                <footer className="bg-white dark:bg-brand-card border-t border-gray-200 dark:border-brand-border px-6 py-3 flex items-center justify-between transition-colors duration-200 no-print">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
                        <span className="text-xs font-medium text-brand-muted dark:text-brand-text">Reporting System Active</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-brand-muted">
                        Last updated: {generatedTime || '--'}
                    </div>
                </footer>
            </div>

            {/* Individual Incident Report Modal */}
            {showIncidentModal && incidentToPrint && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-100 print:bg-white print:static">
                    <div className="bg-white text-black rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible print:mx-0 print:rounded-none" ref={printRef}>
                        {/* Modal Header - Hidden in print */}
                        <div className="flex items-center justify-between p-4 border-b print:hidden">
                            <h3 className="text-lg font-bold">Incident Report - {incidentToPrint.id}</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={printIncidentReport}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg hover:bg-brand-red-dark transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                                <button
                                    onClick={() => {
                                        setShowIncidentModal(false);
                                        setIncidentToPrint(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Printable Report Content */}
                        <div className="p-8 print:p-4" id="incident-report">
                            {/* Report Header */}
                            <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <Shield className="w-10 h-10 text-brand-muted print:text-gray-800" />
                                    <h1 className="text-2xl font-bold">TRINETRA</h1>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-700">INCIDENT REPORT</h2>
                                <p className="text-sm text-gray-500 mt-2">Generated on {generatedTime || '--'}</p>
                            </div>

                            {/* Incident Summary */}
                            <div className="mb-6">
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg print:bg-gray-100">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase">Incident ID</span>
                                        <p className="font-bold text-lg">{incidentToPrint.id}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase">Date & Time</span>
                                        <p className="font-medium">{incidentToPrint.timestamp.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase">Type</span>
                                        <p className={`font-bold uppercase ${incidentToPrint.type === 'critical' ? 'text-red-600' :
                                            incidentToPrint.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                                            }`}>{incidentToPrint.type}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase">Status</span>
                                        <p className={`font-bold uppercase ${incidentToPrint.status === 'resolved' ? 'text-green-600' :
                                            incidentToPrint.status === 'pending' ? 'text-yellow-600' : 'text-purple-600'
                                            }`}>{incidentToPrint.status}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Incident Title */}
                            <div className="mb-6">
                                <h3 className="text-xs text-gray-500 uppercase mb-1">Incident Title</h3>
                                <p className="text-lg font-semibold">{incidentToPrint.title}</p>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <h3 className="text-xs text-gray-500 uppercase mb-1">Description</h3>
                                <p className="text-gray-700 leading-relaxed">{incidentToPrint.description}</p>
                            </div>

                            {/* Location Details */}
                            <div className="mb-6">
                                <h3 className="text-xs text-gray-500 uppercase mb-2">Location Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Zone:</span>
                                        <span className="font-medium">{incidentToPrint.zone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Camera:</span>
                                        <span className="font-medium">{incidentToPrint.cameraId}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Crowd Count:</span>
                                        <span className="font-medium">{incidentToPrint.crowdCount} people</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Duration:</span>
                                        <span className="font-medium">{incidentToPrint.duration} minutes</span>
                                    </div>
                                </div>
                            </div>

                            {/* Responders */}
                            <div className="mb-6">
                                <h3 className="text-xs text-gray-500 uppercase mb-2">Assigned Responders</h3>
                                <div className="flex flex-wrap gap-2">
                                    {incidentToPrint.responders.map((responder, i) => (
                                        <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
                                            {responder}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Actions Taken */}
                            <div className="mb-6">
                                <h3 className="text-xs text-gray-500 uppercase mb-2">Actions Taken</h3>
                                <ul className="space-y-2">
                                    {incidentToPrint.actions.map((action, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                            <span className="text-gray-700">{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Footer */}
                            <div className="mt-8 pt-6 border-t-2 border-gray-300">
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <div>
                                        <p>Report generated by: {user?.firstName || 'Admin'} {user?.lastName || ''}</p>
                                        <p>TRINETRA - Real-Time Crowd Monitoring System</p>
                                    </div>
                                    <div className="text-right">
                                        <p>Page 1 of 1</p>
                                        <p>Confidential</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    /* Hide everything except report content */
                    body * {
                        visibility: hidden;
                    }
                    
                    /* Hide emergency button completely */
                    [class*="emergency"], 
                    [class*="Emergency"],
                    button[class*="fixed"][class*="bottom"],
                    .no-print {
                        display: none !important;
                    }
                    
                    /* Show only the modal content when printing individual report */
                    #incident-report,
                    #incident-report * {
                        visibility: visible;
                    }
                    
                    /* If no modal, show main content */
                    main,
                    main * {
                        visibility: visible;
                    }
                    
                    /* Position the content properly */
                    #incident-report {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    
                    /* White background for print */
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    /* Hide navigation, header, footer when printing */
                    header, footer, nav {
                        display: none !important;
                    }
                    
                    /* Hide URL/link from print */
                    @page {
                        margin: 1cm;
                    }
                    
                    /* Remove URL display in print */
                    a[href]:after {
                        content: none !important;
                    }
                    
                    /* Ensure proper page breaks */
                    .page-break {
                        page-break-before: always;
                    }
                    
                    /* Style adjustments for print */
                    .print\:block {
                        display: block !important;
                        visibility: visible !important;
                    }
                    
                    .print\:bg-white {
                        background-color: white !important;
                    }
                    
                    .print\:border-gray-300 {
                        border-color: #d1d5db !important;
                    }
                    
                    .print\:text-black {
                        color: black !important;
                    }
                }
            `}</style>
        </div>
    );
}




