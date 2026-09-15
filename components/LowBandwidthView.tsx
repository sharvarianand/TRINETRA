'use client';

import React, { useState, useEffect } from 'react';
import { Users, Activity, WifiOff } from 'lucide-react';

interface Person {
    id: number;
    x: number;
    y: number;
}

interface CoordinateData {
    timestamp: number;
    people: Person[];
    count: number;
    density: number;
}

interface LowBandwidthViewProps {
    className?: string;
    isPaused?: boolean;
}

export default function LowBandwidthView({ className = '', isPaused = false }: LowBandwidthViewProps) {
    const [data, setData] = useState<CoordinateData>({
        timestamp: 0,
        people: [],
        count: 0,
        density: 0
    });
    const [isConnected, setIsConnected] = useState(false);
    const [displayTime, setDisplayTime] = useState<string>('--:--:--');
    const [isMounted, setIsMounted] = useState(false);

    // Set mounted state to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch coordinates from server
    useEffect(() => {
        if (isPaused || !isMounted) return;

        const fetchCoordinates = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000'}/coordinates`
                );
                if (response.ok) {
                    const result = await response.json();
                    setData({
                        timestamp: result.timestamp,
                        people: result.people || [],
                        count: result.people?.length || 0,
                        density: result.density || 0
                    });
                    setDisplayTime(new Date(result.timestamp).toLocaleTimeString());
                    setIsConnected(true);
                } else {
                    throw new Error('Server error');
                }
            } catch (error) {
                console.log('Coordinates fetch error:', error);
                setIsConnected(false);
                setDisplayTime(new Date().toLocaleTimeString());
            }
        };

        fetchCoordinates();
        const interval = setInterval(fetchCoordinates, 500);
        return () => clearInterval(interval);
    }, [isPaused, isMounted]);

    // Get density color - updated for enterprise theme
    const getDensityColor = (density: number) => {
        if (density > 70) return 'text-red-600';
        if (density > 40) return 'text-amber-600';
        return 'text-brand-muted';
    };

    return (
        <div className={`relative bg-white overflow-hidden rounded-xl border border-zinc-200 ${className}`} style={{ minHeight: '300px' }}>
            {/* Camera Frame Simulation - Light background */}
            <div className="absolute inset-0 bg-linear-to-b from-zinc-50 to-white">
                {/* Subtle grid overlay */}
                <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(5,150,105,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.4) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* Header Badge */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    isConnected ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    <WifiOff className="w-3 h-3" />
                    LOW BANDWIDTH
                </div>
                {isConnected && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-cyan-50 rounded-full border border-brand-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
                        <span className="text-[10px] text-brand-muted font-semibold">LIVE</span>
                    </div>
                )}
            </div>

            {/* Stats Overlay */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200 shadow-sm">
                    <Users className="w-4 h-4 text-brand-muted" />
                    <span className="text-sm font-semibold text-zinc-900">{data.people.length}</span>
                    <span className="text-[10px] text-zinc-500">detected</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200 shadow-sm">
                    <Activity className={`w-4 h-4 ${getDensityColor(data.density)}`} />
                    <span className={`text-sm font-semibold ${getDensityColor(data.density)}`}>{data.density}%</span>
                </div>
            </div>

            {/* People Dots - cyan-600 theme */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                {data.people.map((person) => (
                    <div
                        key={person.id}
                        className="absolute flex items-center justify-center"
                        style={{
                            left: `${person.x}%`,
                            top: `${person.y}%`,
                            width: '0',
                            height: '0'
                        }}
                    >
                        {/* Outer pulse ring */}
                        <div 
                            className="absolute w-12 h-12 rounded-full bg-brand-red/15 animate-ping"
                            style={{ animationDuration: '1.5s' }}
                        />
                        {/* Middle glow */}
                        <div className="absolute w-6 h-6 rounded-full bg-brand-red/25 blur-[2px]" />
                        {/* Main dot */}
                        <div className="absolute w-3 h-3 rounded-full bg-brand-red border border-cyan-400 shadow-[0_0_10px_rgba(5,150,105,0.6)]" />
                        {/* Center highlight */}
                        <div className="absolute w-1 h-1 rounded-full bg-white" />
                    </div>
                ))}
            </div>

            {/* Corner Frame Markers */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-brand-red/50 rounded-tl z-10"></div>
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-brand-red/50 rounded-tr z-10"></div>
            <div className="absolute bottom-12 left-6 w-8 h-8 border-b-2 border-l-2 border-brand-red/50 rounded-bl z-10"></div>
            <div className="absolute bottom-12 right-6 w-8 h-8 border-b-2 border-r-2 border-brand-red/50 rounded-br z-10"></div>

            {/* Bottom Info Bar */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-white border-t border-zinc-200 flex justify-between items-center z-30">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-brand-muted font-mono font-semibold">CAM-01</span>
                    <span className="text-[10px] text-zinc-300">|</span>
                    <span className="text-[10px] text-zinc-600">
                        {data.people.length} {data.people.length === 1 ? 'person' : 'people'} in frame
                    </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                    {isMounted ? displayTime : '--:--:--'}
                </div>
            </div>

            {/* Paused Overlay */}
            {isPaused && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center backdrop-blur-sm z-40">
                    <div className="text-amber-700 font-semibold tracking-wider text-lg border border-amber-200 px-6 py-2 rounded-lg bg-amber-50">
                        PAUSED
                    </div>
                </div>
            )}
        </div>
    );
}

