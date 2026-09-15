'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Upload, 
    Home,
    Map,
    BarChart3,
    FileText,
    Settings,
    Bell,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    Wifi,
    WifiOff,
    Eye,
    EyeOff,
    Monitor,
    Gauge,
    Save,
    RotateCcw,
    Check,
    Info,
    Video,
    Plus,
    Trash2,
    RefreshCw,
    Ruler,
    Calculator,
    Pencil,
    Network
} from 'lucide-react';
import Logo from './Logo';

import { useTheme } from '@/lib/ThemeContext';
import { AppUser, Camera, calculateCapacity, DensityLevel, AreaUnit } from '@/lib/types';

interface SettingsData {
    lowBandwidthMode: boolean;
    privacyMaskingEnabled: boolean;
    autoRefreshInterval: number;
    showDensityOverlay: boolean;
    alertSoundEnabled: boolean;
    droidCamUrl?: string;
}

interface NewCameraForm {
    id: string;
    name: string;
    url: string;
    zone: string;
    area: number;
    areaUnit: AreaUnit;
    densityLevel: DensityLevel;
    useManualCapacity: boolean;
    manualCapacity: number;
}

const defaultSettings: SettingsData = {
    lowBandwidthMode: false,
    privacyMaskingEnabled: false,
    autoRefreshInterval: 2000,
    showDensityOverlay: true,
    alertSoundEnabled: true,
    droidCamUrl: ''
};

const defaultNewCamera: NewCameraForm = {
    id: '',
    name: '',
    url: '',
    zone: 'Main Plaza',
    area: 100,
    areaUnit: 'sqm',
    densityLevel: 'medium',
    useManualCapacity: false,
    manualCapacity: 150
};

const zones = ['Main Plaza', 'Entry Gate', 'Exit Gate', 'Stage Area', 'Food Court', 'Parking', 'VIP Area'];

const densityLevelDescriptions = {
    low: 'Comfortable (0.5 ppl/m²) - Free movement',
    medium: 'Moderate (1.5 ppl/m²) - Normal events',
    high: 'Dense (2.5 ppl/m²) - Max safe capacity'
};

export default function SettingsPage({ user }: { user?: AppUser }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState('');
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const supabase = createClient();
    const [settings, setSettings] = useState<SettingsData>(defaultSettings);
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [showAddCamera, setShowAddCamera] = useState(false);
    const [newCamera, setNewCamera] = useState<NewCameraForm>(defaultNewCamera);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<NewCameraForm>(defaultNewCamera);

    // Custom zones state
    const [customZones, setCustomZones] = useState<string[]>([]);
    const [showAddZoneInput, setShowAddZoneInput] = useState(false);
    const [showEditZoneInput, setShowEditZoneInput] = useState(false);
    const [newCustomZoneName, setNewCustomZoneName] = useState('');

    // Combined zones list
    const allZones = Array.from(new Set([...zones, ...customZones]));

    const baseUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000';

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

    // Fetch cameras function - defined before use
    const fetchCameras = async () => {
        try {
            const response = await fetch(`${baseUrl}/cameras`);
            if (response.ok) {
                const data = await response.json();
                const fetchedCameras = data.cameras || [];
                setCameras(fetchedCameras);

                // Extract unique zones that aren't in the default list
                const detectedZones = fetchedCameras
                    .map((c: Camera) => c.zone)
                    .filter((z: string) => z && !zones.includes(z));

                if (detectedZones.length > 0) {
                    setCustomZones(prev => Array.from(new Set([...prev, ...detectedZones])));
                }
            }
        } catch (err) {
            console.error('Failed to fetch cameras:', err);
        }
    };

    // Load settings from backend (with localStorage fallback)
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Try to fetch from backend first
                const response = await fetch(`${baseUrl}/settings`);
                if (response.ok) {
                    const data = await response.json();
                    setSettings(prev => ({ ...prev, ...data }));
                    console.log('Settings loaded from backend');
                    return;
                }
            } catch (err) {
                console.error('Failed to fetch settings from backend:', err);
            }

            // Fallback to localStorage
            const savedSettings = localStorage.getItem('TRINETRA_settings');
            if (savedSettings) {
                try {
                    setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
                } catch {
                    console.error('Failed to parse settings');
                }
            }
        };

        loadSettings();
        fetchCameras();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update time
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
        setSaved(false);
    };

    const saveSettings = async () => {
        try {
            // Save to backend
            const response = await fetch(`${baseUrl}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                console.log('Settings saved to backend');
            } else {
                console.error('Failed to save settings to backend');
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
        }

        // Also save to localStorage as fallback
        localStorage.setItem('TRINETRA_settings', JSON.stringify(settings));
        setSaved(true);
        setHasChanges(false);
        setTimeout(() => setSaved(false), 3000);
    };

    // Camera management functions
    const addCamera = async () => {
        if (!newCamera.id || !newCamera.name || !newCamera.url) {
            alert('Please fill in all required fields');
            return;
        }

        if (!newCamera.area || newCamera.area <= 0) {
            alert('Please enter a valid area for the monitored zone');
            return;
        }

        // Calculate capacity from area or use manual override
        const calculatedCapacity = calculateCapacity(newCamera.area, newCamera.areaUnit, newCamera.densityLevel);
        const capacity = newCamera.useManualCapacity ? newCamera.manualCapacity : calculatedCapacity;

        setCameraLoading(true);
        try {
            let finalUrlToSave = newCamera.url;
            if (newCamera.sourceType === 'upload' && newCamera.videoFile) {
                const formData = new FormData();
                formData.append('camera_id', newCamera.id);
                formData.append('file', newCamera.videoFile);
                const uploadResponse = await fetch(`${baseUrl}/cameras/upload`, { method: 'POST', body: formData });
                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok) throw new Error(uploadData.detail || 'Upload failed');
                finalUrlToSave = uploadData.url;
            }

            const response = await fetch(`${baseUrl}/cameras`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: newCamera.id,
                    name: newCamera.name,
                    url: finalUrlToSave,
                    zone: newCamera.zone,
                    enabled: true,
                    area: newCamera.area,
                    areaUnit: newCamera.areaUnit,
                    densityLevel: newCamera.densityLevel,
                    capacity: capacity,
                    useManualCapacity: newCamera.useManualCapacity
                })
            });

            if (response.ok) {
                await fetchCameras();
                setNewCamera(defaultNewCamera);
                setShowAddCamera(false);
            } else {
                const error = await response.json();
                alert(error.detail || 'Failed to add camera');
            }
        } catch (err) {
            console.error('Failed to add camera:', err);
            alert('Failed to add camera');
        }
        setCameraLoading(false);
    };

    const updateCamera = async (cameraId: string, updates: Partial<Camera>) => {
        setCameraLoading(true);
        try {
            const response = await fetch(`${baseUrl}/cameras/${cameraId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                await fetchCameras();
                setEditingCameraId(null);
            }
        } catch (err) {
            console.error('Failed to update camera:', err);
        }
        setCameraLoading(false);
    };

    const deleteCamera = async (cameraId: string) => {
        if (!confirm('Are you sure you want to delete this camera?')) return;

        setCameraLoading(true);
        try {
            const response = await fetch(`${baseUrl}/cameras/${cameraId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchCameras();
            }
        } catch (err) {
            console.error('Failed to delete camera:', err);
        }
        setCameraLoading(false);
    };

    const toggleCameraEnabled = async (camera: Camera) => {
        await updateCamera(camera.id, { enabled: !camera.enabled });
    };

    const startEditingCamera = (camera: Camera) => {
        setEditingCameraId(camera.id);
        const calculatedCap = calculateCapacity(camera.area || 100, camera.areaUnit || 'sqm', camera.densityLevel || 'medium');
        const isManual = camera.capacity !== undefined && camera.capacity !== calculatedCap;

        setEditForm({
            id: camera.id,
            name: camera.name,
            url: camera.url,
            zone: camera.zone,
            area: camera.area || 100,
            areaUnit: camera.areaUnit || 'sqm',
            densityLevel: camera.densityLevel || 'medium',
            useManualCapacity: camera.useManualCapacity || false,
            manualCapacity: camera.capacity !== undefined ? camera.capacity : calculatedCap
        });
    };

    const saveEditedCamera = async () => {
        if (!editingCameraId) return;

        const calculatedCapacity = calculateCapacity(editForm.area, editForm.areaUnit, editForm.densityLevel);
        const capacity = editForm.useManualCapacity ? editForm.manualCapacity : calculatedCapacity;

        let finalUrlToSave = editForm.url;
        if (editForm.sourceType === 'upload' && editForm.videoFile) {
            const formData = new FormData();
            formData.append('camera_id', editingCameraId);
            formData.append('file', editForm.videoFile);
            const uploadResponse = await fetch(`${baseUrl}/cameras/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok) throw new Error(uploadData.detail || 'Upload failed');
            finalUrlToSave = uploadData.url;
        }

        await updateCamera(editingCameraId, {
            name: editForm.name,
            url: finalUrlToSave,
            zone: editForm.zone,
            area: editForm.area,
            areaUnit: editForm.areaUnit,
            densityLevel: editForm.densityLevel,
            capacity: capacity,
            useManualCapacity: editForm.useManualCapacity
        });

        setEditingCameraId(null);
        setEditForm(defaultNewCamera);
    };

    const cancelEditing = () => {
        setEditingCameraId(null);
        setEditForm(defaultNewCamera);
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        setHasChanges(true);
        setSaved(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-brand-bg flex transition-colors duration-200">


            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-brand-card border-r border-gray-200 dark:border-brand-border transition-all duration-300 flex flex-col`}>
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
                <header className="bg-white dark:bg-brand-card border-b border-gray-200 dark:border-brand-border px-6 py-4 flex items-center justify-between transition-colors duration-200">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-brand-text flex items-center gap-2">
                            <Settings className="w-6 h-6 text-brand-red" />
                            Settings
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-brand-muted">Configure your monitoring preferences</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={resetSettings}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-brand-bg text-gray-600 dark:text-brand-text rounded-lg border border-gray-200 dark:border-brand-border hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                        <button
                            onClick={saveSettings}
                            disabled={!hasChanges}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${hasChanges
                                ? 'bg-brand-red text-white hover:bg-brand-red-dark'
                                : 'bg-brand-card/20 dark:bg-brand-card/30 text-brand-text dark:text-brand-muted cursor-not-allowed'
                                }`}
                        >
                            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved ? 'Saved!' : 'Save Changes'}
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
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-9 h-9 rounded-full bg-brand-card/10 dark:bg-brand-card/30 flex items-center justify-center border border-brand-border dark:border-brand-border hover:border-brand-red dark:hover:border-brand-red transition-colors cursor-pointer"
                            >
                                <span className="text-brand-muted dark:text-brand-text font-medium text-sm">{getUserInitials()}</span>
                            </button>
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-brand-card rounded-xl shadow-lg border border-gray-200 dark:border-brand-border py-2 z-50">
                                    {user && (
                                        <div className="px-4 py-2 border-b border-gray-100 dark:border-brand-border">
                                            <p className="text-sm font-medium text-gray-900 dark:text-brand-text">{user.firstName || 'User'}</p>
                                            <p className="text-xs text-gray-500 dark:text-brand-muted">{user.email}</p>
                                        </div>
                                    )}
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

                {/* Settings Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-4xl mx-auto">
                        {/* Settings Sections */}
                        <div className="space-y-6">
                            {/* Camera Configuration */}
                            <div className="bg-white dark:bg-brand-card rounded-xl p-6 border border-gray-200 dark:border-brand-border">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-brand-text flex items-center gap-2">
                                        <Video className="w-5 h-5 text-red-500" />
                                        Camera Configuration
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={fetchCameras}
                                            className="p-2 text-brand-muted dark:text-brand-text hover:bg-brand-card/10 dark:hover:bg-brand-card/30 rounded-lg transition-colors"
                                            title="Refresh cameras"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${cameraLoading ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => setShowAddCamera(true)}
                                            className="flex items-center gap-2 px-3 py-2 bg-brand-red/20 text-brand-muted dark:text-brand-text rounded-lg border border-brand-red/30 hover:bg-brand-red/30 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Camera
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-brand-muted mb-6">Manage video source inputs for crowd monitoring</p>

                                {/* Add Camera Form */}
                                {showAddCamera && (
                                    <div className="mb-6 p-4 bg-gray-100 dark:bg-brand-bg/50 rounded-lg border border-brand-red/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-medium text-gray-900 dark:text-brand-text">Add New Camera</h4>
                                            <button
                                                onClick={() => {
                                                    setShowAddCamera(false);
                                                    setNewCamera(defaultNewCamera);
                                                }}
                                                className="text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Camera ID *</label>
                                                <input
                                                    type="text"
                                                    value={newCamera.id}
                                                    onChange={(e) => setNewCamera({ ...newCamera, id: e.target.value })}
                                                    placeholder="cam-1"
                                                    className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Camera Name *</label>
                                                <input
                                                    type="text"
                                                    value={newCamera.name}
                                                    onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                                                    placeholder="Main Plaza Camera"
                                                    className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Stream URL * (DroidCam IP)</label>
                                                <input
                                                    type="text"
                                                    value={newCamera.url}
                                                    onChange={(e) => setNewCamera({ ...newCamera, url: e.target.value })}
                                                    placeholder="http://192.168.1.100:4747/video"
                                                    className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                />
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400/70 mt-1 flex items-center gap-1">
                                                    ⚠️ Laptop and DroidCam must be on the same local network (same IP range)
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Zone</label>
                                                {showAddZoneInput ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newCustomZoneName}
                                                            onChange={(e) => setNewCustomZoneName(e.target.value)}
                                                            placeholder="Enter zone name"
                                                            autoFocus
                                                            className="flex-1 bg-white dark:bg-brand-card border border-brand-red rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const z = newCustomZoneName.trim();
                                                                    if (z) {
                                                                        setCustomZones(prev => Array.from(new Set([...prev, z])));
                                                                        setNewCamera({ ...newCamera, zone: z });
                                                                        setShowAddZoneInput(false);
                                                                        setNewCustomZoneName('');
                                                                    }
                                                                } else if (e.key === 'Escape') {
                                                                    setShowAddZoneInput(false);
                                                                    setNewCustomZoneName('');
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setShowAddZoneInput(false);
                                                                setNewCustomZoneName('');
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={newCamera.zone}
                                                            onChange={(e) => setNewCamera({ ...newCamera, zone: e.target.value })}
                                                            className="flex-1 bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                        >
                                                            {allZones.map(zone => (
                                                                <option key={zone} value={zone}>{zone}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); setShowAddZoneInput(true); }}
                                                            className="p-2 bg-gray-100 dark:bg-brand-bg hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-brand-muted dark:text-brand-text transition-colors"
                                                            title="New Zone"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Area Configuration Section */}
                                            <div className="col-span-2 mt-2 pt-4 border-t border-gray-300 dark:border-gray-600">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Ruler className="w-4 h-4 text-brand-muted dark:text-brand-text" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-brand-text">Area Configuration</span>
                                                    <span className="text-[10px] text-gray-500">(One-time setup for capacity calculation)</span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Physical Area *</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={newCamera.area}
                                                            onChange={(e) => setNewCamera({ ...newCamera, area: parseFloat(e.target.value) || 0 })}
                                                            placeholder="100"
                                                            className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Unit</label>
                                                        <select
                                                            value={newCamera.areaUnit}
                                                            onChange={(e) => setNewCamera({ ...newCamera, areaUnit: e.target.value as AreaUnit })}
                                                            className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                        >
                                                            <option value="sqm">Square Meters (m²)</option>
                                                            <option value="sqft">Square Feet (ft²)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Crowd Density</label>
                                                        <select
                                                            value={newCamera.densityLevel}
                                                            onChange={(e) => setNewCamera({ ...newCamera, densityLevel: e.target.value as DensityLevel })}
                                                            className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                        >
                                                            <option value="low">Low - Comfortable</option>
                                                            <option value="medium">Medium - Normal</option>
                                                            <option value="high">High - Max Safe</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <p className="text-[10px] text-gray-500 mt-2">
                                                    {densityLevelDescriptions[newCamera.densityLevel]}
                                                </p>

                                                {/* Capacity Section with Auto/Manual Toggle */}
                                                <div className="mt-3 p-3 bg-white dark:bg-brand-card rounded-lg border border-brand-red/30">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Calculator className="w-4 h-4 text-brand-red" />
                                                            <span className="text-xs text-gray-500 dark:text-brand-muted">Max Capacity:</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs ${!newCamera.useManualCapacity ? 'text-brand-red font-medium' : 'text-gray-400'}`}>Auto</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewCamera({ ...newCamera, useManualCapacity: !newCamera.useManualCapacity })}
                                                                className={`relative w-10 h-5 rounded-full transition-colors ${newCamera.useManualCapacity ? 'bg-amber-500' : 'bg-brand-red'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newCamera.useManualCapacity ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                                                            </button>
                                                            <span className={`text-xs ${newCamera.useManualCapacity ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>Manual</span>
                                                        </div>
                                                    </div>

                                                    {newCamera.useManualCapacity ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={newCamera.manualCapacity}
                                                                onChange={(e) => setNewCamera({ ...newCamera, manualCapacity: parseInt(e.target.value) || 0 })}
                                                                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-amber-500/50 rounded-lg px-3 py-2 text-lg font-bold text-amber-500 focus:outline-none focus:border-amber-500"
                                                            />
                                                            <span className="text-xs text-gray-500">people</span>
                                                            {newCamera.manualCapacity === 0 && (
                                                                <span className="text-xs text-red-500 font-medium">🚫 NO ENTRY ZONE</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-400">Based on area & density:</span>
                                                            <span className="text-lg font-bold text-brand-red">
                                                                {calculateCapacity(newCamera.area, newCamera.areaUnit, newCamera.densityLevel)} people
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-span-2 flex items-end">
                                                <button
                                                    onClick={addCamera}
                                                    disabled={cameraLoading}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg hover:bg-brand-red transition-colors disabled:opacity-50"
                                                >
                                                    {cameraLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                    Add Camera
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Camera List */}
                                <div className="space-y-3">
                                    {cameras.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>No cameras configured</p>
                                            <p className="text-sm">Click &quot;Add Camera&quot; to get started</p>
                                        </div>
                                    ) : (
                                        cameras.map((camera) => (
                                            <div
                                                key={camera.id}
                                                className={`p-4 bg-gray-50 dark:bg-brand-bg/50 rounded-lg border transition-colors ${camera.enabled ? 'border-gray-200 dark:border-brand-border' : 'border-gray-300 dark:border-gray-700 opacity-60'
                                                    }`}
                                            >
                                                {editingCameraId === camera.id ? (
                                                    /* Edit Form */
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-medium text-brand-muted dark:text-brand-text flex items-center gap-2">
                                                                <Pencil className="w-4 h-4" />
                                                                Edit Camera
                                                            </h4>
                                                            <button onClick={cancelEditing} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Camera Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={editForm.name}
                                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                                    className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Zone</label>
                                                                {showEditZoneInput ? (
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={newCustomZoneName}
                                                                            onChange={(e) => setNewCustomZoneName(e.target.value)}
                                                                            placeholder="Enter zone name"
                                                                            autoFocus
                                                                            className="flex-1 bg-white dark:bg-brand-card border border-brand-red rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    const z = newCustomZoneName.trim();
                                                                                    if (z) {
                                                                                        setCustomZones(prev => Array.from(new Set([...prev, z])));
                                                                                        setEditForm({ ...editForm, zone: z });
                                                                                        setShowEditZoneInput(false);
                                                                                        setNewCustomZoneName('');
                                                                                    }
                                                                                } else if (e.key === 'Escape') {
                                                                                    setShowEditZoneInput(false);
                                                                                    setNewCustomZoneName('');
                                                                                }
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                setShowEditZoneInput(false);
                                                                                setNewCustomZoneName('');
                                                                            }}
                                                                            className="p-2 text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex gap-2">
                                                                        <select
                                                                            value={editForm.zone}
                                                                            onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                                                                            className="flex-1 bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                                        >
                                                                            {allZones.map(zone => (
                                                                                <option key={zone} value={zone}>{zone}</option>
                                                                            ))}
                                                                        </select>
                                                                        <button
                                                                            onClick={(e) => { e.preventDefault(); setShowEditZoneInput(true); }}
                                                                            className="p-2 bg-gray-100 dark:bg-brand-bg hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-brand-muted dark:text-brand-text transition-colors"
                                                                            title="New Zone"
                                                                        >
                                                                            <Plus className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="col-span-2">
                                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 flex items-center gap-1">
                                                                    <Network className="w-3 h-3" />
                                                                    IP Address / Stream URL
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={editForm.url}
                                                                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                                                    placeholder="http://192.168.1.100:4747/video"
                                                                    className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red font-mono"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Area Configuration */}
                                                        <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <Ruler className="w-4 h-4 text-brand-muted dark:text-brand-text" />
                                                                <span className="text-sm font-medium text-gray-900 dark:text-brand-text">Area Configuration</span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Physical Area</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={editForm.area}
                                                                        onChange={(e) => setEditForm({ ...editForm, area: parseFloat(e.target.value) || 0 })}
                                                                        className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Unit</label>
                                                                    <select
                                                                        value={editForm.areaUnit}
                                                                        onChange={(e) => setEditForm({ ...editForm, areaUnit: e.target.value as AreaUnit })}
                                                                        className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                                    >
                                                                        <option value="sqm">m²</option>
                                                                        <option value="sqft">ft²</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">Density</label>
                                                                    <select
                                                                        value={editForm.densityLevel}
                                                                        onChange={(e) => setEditForm({ ...editForm, densityLevel: e.target.value as DensityLevel })}
                                                                        className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                                                    >
                                                                        <option value="low">Low</option>
                                                                        <option value="medium">Medium</option>
                                                                        <option value="high">High</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* Capacity Section with Auto/Manual Toggle */}
                                                            <div className="mt-3 p-2 bg-white dark:bg-brand-card rounded-lg border border-brand-red/30">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-xs text-gray-500 dark:text-brand-muted">Max Capacity:</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[10px] ${!editForm.useManualCapacity ? 'text-brand-red font-medium' : 'text-gray-400'}`}>Auto</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditForm({ ...editForm, useManualCapacity: !editForm.useManualCapacity })}
                                                                            className={`relative w-8 h-4 rounded-full transition-colors ${editForm.useManualCapacity ? 'bg-amber-500' : 'bg-brand-red'}`}
                                                                        >
                                                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${editForm.useManualCapacity ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                                                                        </button>
                                                                        <span className={`text-[10px] ${editForm.useManualCapacity ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>Manual</span>
                                                                    </div>
                                                                </div>

                                                                {editForm.useManualCapacity ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={editForm.manualCapacity}
                                                                            onChange={(e) => setEditForm({ ...editForm, manualCapacity: parseInt(e.target.value) || 0 })}
                                                                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-amber-500/50 rounded px-2 py-1 text-sm font-bold text-amber-500 focus:outline-none"
                                                                        />
                                                                        <span className="text-[10px] text-gray-500">people</span>
                                                                        {editForm.manualCapacity === 0 && (
                                                                            <span className="text-[10px] text-red-500 font-medium">🚫</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[10px] text-gray-400">Auto:</span>
                                                                        <span className="text-sm font-bold text-brand-red">
                                                                            {calculateCapacity(editForm.area, editForm.areaUnit, editForm.densityLevel)} people
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Save/Cancel Buttons */}
                                                        <div className="flex gap-2 pt-2">
                                                            <button
                                                                onClick={saveEditedCamera}
                                                                disabled={cameraLoading}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg hover:bg-brand-red transition-colors disabled:opacity-50"
                                                            >
                                                                {cameraLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                                Save Changes
                                                            </button>
                                                            <button
                                                                onClick={cancelEditing}
                                                                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Normal Camera Display */
                                                    <>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-3 h-3 rounded-full ${camera.status === 'online' ? 'bg-brand-red' : camera.status === 'offline' ? 'bg-red-500' : 'bg-gray-400'
                                                                }`}></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-900 dark:text-brand-text">{camera.name}</span>
                                                                    <span className="text-xs text-brand-muted dark:text-brand-text bg-brand-red/10 px-2 py-0.5 rounded">{camera.zone}</span>
                                                                    <span className={`text-xs px-2 py-0.5 rounded ${camera.status === 'online' ? 'bg-brand-red/10 text-brand-muted dark:text-brand-text' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                                        }`}>
                                                                        {camera.status || 'offline'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate mt-1 flex items-center gap-1 font-mono">
                                                                    <Network className="w-3 h-3" />
                                                                    {camera.url || 'No URL configured'}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => startEditingCamera(camera)}
                                                                    className="p-2 text-brand-muted dark:text-brand-text hover:bg-brand-red/10 rounded-lg transition-colors"
                                                                    title="Edit camera"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleCameraEnabled(camera)}
                                                                    className={`relative w-10 h-5 rounded-full transition-colors ${camera.enabled ? 'bg-brand-red' : 'bg-gray-400 dark:bg-gray-600'
                                                                        }`}
                                                                    title={camera.enabled ? 'Disable camera' : 'Enable camera'}
                                                                >
                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${camera.enabled ? 'translate-x-5' : 'translate-x-0.5'
                                                                        }`}></div>
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteCamera(camera.id)}
                                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                    title="Delete camera"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Area & Capacity Info */}
                                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-brand-border grid grid-cols-3 gap-4 text-xs">
                                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-brand-muted">
                                                                <Ruler className="w-3.5 h-3.5" />
                                                                <span>Area: {camera.area || 'N/A'} {camera.area ? (camera.areaUnit === 'sqft' ? 'ft²' : 'm²') : ''}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-brand-red">
                                                                <Calculator className="w-3.5 h-3.5" />
                                                                <span>Capacity: {camera.capacity !== undefined ? camera.capacity : 'N/A'} {camera.capacity !== undefined ? 'people' : ''}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400/70">
                                                                <span>Density: {camera.densityLevel || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Network & Performance */}
                            <div className="bg-white dark:bg-brand-card rounded-xl p-6 border border-gray-200 dark:border-brand-border shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-brand-text mb-1 flex items-center gap-2">
                                    <Gauge className="w-5 h-5 text-brand-muted dark:text-brand-text" />
                                    Network & Performance
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-brand-muted mb-6">Optimize for your network conditions</p>

                                {/* Low Bandwidth Mode */}
                                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-brand-bg/50 rounded-lg border border-gray-200 dark:border-brand-border mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${settings.lowBandwidthMode ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-brand-red/10 border border-brand-red/20'
                                            }`}>
                                            {settings.lowBandwidthMode ? (
                                                <WifiOff className="w-6 h-6 text-amber-500" />
                                            ) : (
                                                <Wifi className="w-6 h-6 text-brand-red" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-brand-text">Low Bandwidth Mode</h4>
                                            <p className="text-sm text-gray-500 dark:text-brand-muted mt-1 max-w-md">
                                                Disable video streams and show only coordinate data on a map. Reduces bandwidth by ~100x.
                                                Ideal for areas with poor 5G/LTE connectivity.
                                            </p>
                                            {settings.lowBandwidthMode && (
                                                <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 dark:text-amber-400">
                                                    <Info className="w-3 h-3" />
                                                    Video feeds will be replaced with dot visualization
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('lowBandwidthMode', !settings.lowBandwidthMode)}
                                        className={`relative w-14 h-7 rounded-full transition-colors ${settings.lowBandwidthMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.lowBandwidthMode ? 'translate-x-8' : 'translate-x-1'
                                            }`}></div>
                                    </button>
                                </div>

                                {/* Auto Refresh Interval */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-brand-bg/50 rounded-lg border border-gray-200 dark:border-brand-border">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-brand-text">Data Refresh Interval</h4>
                                        <p className="text-sm text-gray-500 dark:text-brand-muted mt-1">How often to fetch analytics data</p>
                                    </div>
                                    <select
                                        value={settings.autoRefreshInterval}
                                        onChange={(e) => updateSetting('autoRefreshInterval', parseInt(e.target.value))}
                                        className="bg-white dark:bg-brand-card border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-brand-text focus:outline-none focus:border-brand-red"
                                    >
                                        <option value={1000}>1 second</option>
                                        <option value={2000}>2 seconds</option>
                                        <option value={5000}>5 seconds</option>
                                        <option value={10000}>10 seconds</option>
                                        <option value={30000}>30 seconds</option>
                                    </select>
                                </div>
                            </div>

                            {/* Privacy & Security */}
                            <div className="bg-white dark:bg-brand-card rounded-xl p-6 border border-gray-200 dark:border-brand-border shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-brand-text mb-1 flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-purple-500" />
                                    Privacy & Security
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-brand-muted mb-6">GDPR compliance and privacy controls</p>

                                {/* Privacy Masking */}
                                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-brand-bg/50 rounded-lg border border-gray-200 dark:border-brand-border mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${settings.privacyMaskingEnabled ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-brand-red/10 border border-brand-red/20'
                                            }`}>
                                            {settings.privacyMaskingEnabled ? (
                                                <EyeOff className="w-6 h-6 text-purple-500" />
                                            ) : (
                                                <Eye className="w-6 h-6 text-brand-red" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-brand-text">Privacy Masking (Face Blur)</h4>
                                            <p className="text-sm text-gray-500 dark:text-brand-muted mt-1 max-w-md">
                                                Use AI to automatically blur faces in real-time video feeds.
                                                Ensures GDPR/Privacy compliance for public monitoring.
                                            </p>
                                            {settings.privacyMaskingEnabled && (
                                                <div className="flex items-center gap-2 mt-2 text-xs text-purple-600 dark:text-purple-400">
                                                    <Info className="w-3 h-3" />
                                                    Face detection is active on all video streams
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('privacyMaskingEnabled', !settings.privacyMaskingEnabled)}
                                        className={`relative w-14 h-7 rounded-full transition-colors ${settings.privacyMaskingEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.privacyMaskingEnabled ? 'translate-x-8' : 'translate-x-1'
                                            }`}></div>
                                    </button>
                                </div>
                            </div>

                            {/* Display Settings */}
                            <div className="bg-white dark:bg-brand-card rounded-xl p-6 border border-gray-200 dark:border-brand-border shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-brand-text mb-1 flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-brand-red" />
                                    Display Settings
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-brand-muted mb-6">Customize your dashboard appearance</p>

                                {/* Density Overlay */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-brand-bg/50 rounded-lg border border-gray-200 dark:border-brand-border mb-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-brand-text">Show Density Overlay</h4>
                                        <p className="text-sm text-gray-500 dark:text-brand-muted mt-1">Display crowd density indicators on video feeds</p>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('showDensityOverlay', !settings.showDensityOverlay)}
                                        className={`relative w-14 h-7 rounded-full transition-colors ${settings.showDensityOverlay ? 'bg-brand-red' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.showDensityOverlay ? 'translate-x-8' : 'translate-x-1'
                                            }`}></div>
                                    </button>
                                </div>

                                {/* Alert Sounds */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-brand-bg/50 rounded-lg border border-gray-200 dark:border-brand-border">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-brand-text">Alert Sounds</h4>
                                        <p className="text-sm text-gray-500 dark:text-brand-muted mt-1">Play audio notifications for critical alerts</p>
                                    </div>
                                    <button
                                        onClick={() => updateSetting('alertSoundEnabled', !settings.alertSoundEnabled)}
                                        className={`relative w-14 h-7 rounded-full transition-colors ${settings.alertSoundEnabled ? 'bg-brand-red' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.alertSoundEnabled ? 'translate-x-8' : 'translate-x-1'
                                            }`}></div>
                                    </button>
                                </div>
                            </div>

                            {/* Bandwidth Comparison */}
                            {settings.lowBandwidthMode && (
                                <div className="bg-linear-to-r from-amber-500/10 to-transparent rounded-xl p-6 border border-amber-500/30">
                                    <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-4">Low Bandwidth Mode Active</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white/50 dark:bg-brand-card/50 rounded-lg p-4">
                                            <div className="text-sm text-gray-500 dark:text-brand-muted mb-1">Normal Mode</div>
                                            <div className="text-2xl font-bold text-red-500">~2-5 MB/s</div>
                                            <div className="text-xs text-gray-500">MJPEG video streams</div>
                                        </div>
                                        <div className="bg-white/50 dark:bg-brand-card/50 rounded-lg p-4">
                                            <div className="text-sm text-gray-500 dark:text-brand-muted mb-1">Low Bandwidth</div>
                                            <div className="text-2xl font-bold text-brand-red">~10-50 KB/s</div>
                                            <div className="text-xs text-gray-500">Coordinate data only</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-brand-muted mt-4">
                                        Video feeds will be replaced with a real-time dot map showing person positions.
                                        All analytics and alerts remain fully functional.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="h-12 border-t border-gray-200 dark:border-brand-border bg-white dark:bg-brand-card px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
                        <span className="text-xs font-bold text-brand-muted dark:text-brand-red tracking-wider">SETTINGS</span>
                    </div>
                    <div className="text-xs text-gray-500">
                        {hasChanges ? 'Unsaved changes' : 'All changes saved'}
                    </div>
                </footer>
            </div>
        </div>
    );
}









