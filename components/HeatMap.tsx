'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';

interface Zone {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    density: number;
    peopleCount: number;
    capacity: number;
}

interface HeatMapProps {
    className?: string;
}

const HeatMapVisualization: React.FC<HeatMapProps> = ({ className = '' }) => {
    const { resolvedTheme } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [zones, setZones] = useState<Zone[]>([
        { id: 'zone-a', name: 'Fence Line Alpha', x: 50, y: 50, width: 200, height: 150, density: 0, peopleCount: 0, capacity: 500 },
        { id: 'zone-b', name: 'BOP Sentinel', x: 280, y: 50, width: 150, height: 100, density: 0, peopleCount: 0, capacity: 200 },
        { id: 'zone-c', name: 'Checkpoint Charlie', x: 280, y: 180, width: 150, height: 100, density: 0, peopleCount: 0, capacity: 200 },
        { id: 'zone-d', name: 'Patrol Route Delta', x: 50, y: 230, width: 180, height: 120, density: 0, peopleCount: 0, capacity: 300 },
        { id: 'zone-e', name: 'Observation Ridge Echo', x: 460, y: 50, width: 180, height: 200, density: 0, peopleCount: 0, capacity: 800 },
        { id: 'zone-f', name: 'Logistics Spur Foxtrot', x: 460, y: 280, width: 180, height: 100, density: 0, peopleCount: 0, capacity: 400 },
        { id: 'zone-g', name: 'Restricted Corridor Gamma', x: 260, y: 310, width: 170, height: 80, density: 0, peopleCount: 0, capacity: 100 },
    ]);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);

    // Simulate real-time density updates
    useEffect(() => {
        const updateDensities = async () => {
            try {
                // Fetch real zone data from /analytics/all
                const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000'}/analytics/all`);
                if (response.ok) {
                    const data = await response.json();

                    // Map camera zones to visualization zones
                    setZones(prev => prev.map(zone => {
                        // Find a camera that belongs to this zone or has this zone name
                        const matchedCam = data.cameras.find((c: any) =>
                            c.zone.toLowerCase() === zone.name.toLowerCase() ||
                            c.camera_id === zone.id
                        );

                        if (matchedCam) {
                            return {
                                ...zone,
                                density: matchedCam.density,
                                peopleCount: matchedCam.people_count
                            };
                        }

                        // Fallback if no specific camera for this zone
                        return zone;
                    }));
                }
            } catch (err) {
                console.error('HeatMap: Failed to fetch zone densities:', err);
            }
        };

        updateDensities();
        const interval = setInterval(updateDensities, 3000);
        return () => clearInterval(interval);
    }, []);

    // Helper function to get density color - wrapped in useCallback for stable reference
    const getDensityColor = useCallback((density: number): string => {
        if (density < 30) return 'rgba(16, 185, 129, 0.6)'; // Green
        if (density < 50) return 'rgba(34, 197, 94, 0.6)'; // Light green
        if (density < 70) return 'rgba(245, 158, 11, 0.6)'; // Yellow/Orange
        if (density < 85) return 'rgba(249, 115, 22, 0.6)'; // Orange
        return 'rgba(239, 68, 68, 0.6)'; // Red
    }, []);

    const getDensityLevel = (density: number): { level: string; color: string } => {
        if (density < 30) return { level: 'LOW', color: 'text-green-400' };
        if (density < 50) return { level: 'MODERATE', color: 'text-green-300' };
        if (density < 70) return { level: 'HIGH', color: 'text-yellow-400' };
        if (density < 85) return { level: 'VERY HIGH', color: 'text-orange-400' };
        return { level: 'CRITICAL', color: 'text-red-400' };
    };

    // Draw heat map on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid background
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw zones with heat colors
        zones.forEach(zone => {
            const isHovered = hoveredZone?.id === zone.id;
            const isSelected = selectedZone?.id === zone.id;

            // Calculate color based on density
            const color = getDensityColor(zone.density);

            // Draw zone fill with gradient
            const gradient = ctx.createRadialGradient(
                zone.x + zone.width / 2, zone.y + zone.height / 2, 0,
                zone.x + zone.width / 2, zone.y + zone.height / 2, Math.max(zone.width, zone.height)
            );
            gradient.addColorStop(0, color.replace('0.6', '0.8'));
            gradient.addColorStop(1, color.replace('0.6', '0.3'));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 8);
            ctx.fill();

            // Draw border
            if (isSelected) {
                // Use dark border in light mode, white in dark mode, based on app theme
                const isDark = resolvedTheme === 'dark';
                ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(24,24,27,0.8)'; // zinc-900 in light, white in dark
                ctx.lineWidth = 3;
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
            }
            ctx.stroke();

            // Draw zone label (white)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(zone.name, zone.x + zone.width / 2, zone.y + zone.height / 2 - 8);

            // Draw people count (white)
            ctx.fillStyle = '#fff';
            ctx.font = '11px sans-serif';
            ctx.fillText(`${zone.peopleCount}/${zone.capacity}`, zone.x + zone.width / 2, zone.y + zone.height / 2 + 10);

            // Draw density percentage (white)
            const densityLabel = `${Math.round(zone.density)}%`;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(densityLabel, zone.x + zone.width / 2, zone.y + zone.height / 2 + 28);
        });

    }, [zones, hoveredZone, selectedZone, getDensityColor]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedZone = zones.find(zone =>
            x >= zone.x && x <= zone.x + zone.width &&
            y >= zone.y && y <= zone.y + zone.height
        );

        setSelectedZone(clickedZone || null);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hovered = zones.find(zone =>
            x >= zone.x && x <= zone.x + zone.width &&
            y >= zone.y && y <= zone.y + zone.height
        );

        setHoveredZone(hovered || null);
        canvas.style.cursor = hovered ? 'pointer' : 'default';
    };

    const totalPeople = zones.reduce((sum, z) => sum + z.peopleCount, 0);
    const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
    const avgDensity = Math.round(zones.reduce((sum, z) => sum + z.density, 0) / zones.length);

    return (
        <div className={`flex flex-col h-full ${className}`}>
            <div className="flex-1 flex gap-4">
                {/* Heat Map Canvas */}
                <div className="flex-1 bg-white dark:bg-[#0a101f] rounded-xl border border-cyan-900/30 p-4 relative overflow-hidden print:bg-white print:text-black print:border-gray-300">
                    <div className="absolute top-4 left-4 z-10">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-cyan-100 tracking-wider">VENUE HEAT MAP</h3>
                        <p className="text-xs text-zinc-700 dark:text-cyan-500/70 mt-1">Click on a zone for details</p>
                    </div>

                    {/* Legend */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-zinc-100/80 dark:bg-black/40 px-3 py-2 rounded-lg border border-cyan-900/30 print:bg-white print:text-black print:border-gray-300">
                        <span className="text-[10px] text-zinc-700 dark:text-gray-400">Density:</span>
                        <div className="flex gap-1">
                            <div className="w-4 h-3 rounded-sm bg-green-500/60" title="Low"></div>
                            <div className="w-4 h-3 rounded-sm bg-yellow-500/60" title="Medium"></div>
                            <div className="w-4 h-3 rounded-sm bg-orange-500/60" title="High"></div>
                            <div className="w-4 h-3 rounded-sm bg-red-500/60" title="Critical"></div>
                        </div>
                    </div>

                    <canvas
                        ref={canvasRef}
                        width={680}
                        height={420}
                        className="mt-12 mx-auto"
                        onClick={handleCanvasClick}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseLeave={() => setHoveredZone(null)}
                    />
                </div>

                {/* Side Panel */}
                <div className="w-80 flex flex-col gap-4">
                    {/* Overall Stats */}
                    <div className="bg-white dark:bg-[#0f1729] rounded-lg border border-cyan-900/30 p-4 print:bg-white print:text-black print:border-gray-300">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-cyan-100 mb-3 tracking-wider">OVERALL STATISTICS</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-700 dark:text-gray-400">Total People</span>
                                <span className="text-lg font-mono text-cyan-600 dark:text-cyan-400">{totalPeople.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-700 dark:text-gray-400">Total Capacity</span>
                                <span className="text-sm font-mono text-zinc-700 dark:text-gray-300">{totalCapacity.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-700 dark:text-gray-400">Avg Density</span>
                                <span className={`text-sm font-bold text-zinc-900 dark:${getDensityLevel(avgDensity).color}`}>
                                    {avgDensity}% ({getDensityLevel(avgDensity).level})
                                </span>
                            </div>
                            <div className="mt-2">
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${avgDensity > 70 ? 'bg-red-500' : avgDensity > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${avgDensity}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selected Zone Details */}
                    <div className="bg-white dark:bg-[#0f1729] rounded-lg border border-cyan-900/30 p-4 flex-1 print:bg-white print:text-black print:border-gray-300">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-cyan-100 mb-3 tracking-wider">
                            {selectedZone ? 'ZONE DETAILS' : 'SELECT A ZONE'}
                        </h3>
                        {selectedZone ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${selectedZone.density > 70 ? 'bg-red-500 animate-pulse' :
                                            selectedZone.density > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`} />
                                    <span className="text-lg font-bold text-black dark:text-white">{selectedZone.name}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-100 dark:bg-black/30 rounded-lg p-3 print:bg-white print:text-black print:border-gray-300">
                                        <div className="text-[10px] text-zinc-700 dark:text-gray-500 mb-1">PEOPLE</div>
                                        <div className="text-xl font-mono text-cyan-600 dark:text-cyan-400">{selectedZone.peopleCount}</div>
                                    </div>
                                    <div className="bg-zinc-100 dark:bg-black/30 rounded-lg p-3 print:bg-white print:text-black print:border-gray-300">
                                        <div className="text-[10px] text-zinc-700 dark:text-gray-500 mb-1">CAPACITY</div>
                                        <div className="text-xl font-mono text-zinc-700 dark:text-gray-300">{selectedZone.capacity}</div>
                                    </div>
                                </div>

                                <div className="bg-zinc-100 dark:bg-black/30 rounded-lg p-3 print:bg-white print:text-black print:border-gray-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] text-zinc-700 dark:text-gray-500">DENSITY LEVEL</span>
                                        <span className={`text-sm font-bold text-zinc-900 dark:${getDensityLevel(selectedZone.density).color}`}>
                                            {getDensityLevel(selectedZone.density).level}
                                        </span>
                                    </div>
                                    <div className="text-3xl font-mono text-center my-2" style={{
                                        color: selectedZone.density > 70 ? '#ef4444' : selectedZone.density > 40 ? '#eab308' : '#22c55e',
                                        WebkitTextStroke: '0.5px #fff',
                                    }}>
                                        {Math.round(selectedZone.density)}%
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${selectedZone.density > 70 ? 'bg-red-500' : selectedZone.density > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${selectedZone.density}%` }}
                                        />
                                    </div>
                                </div>

                                {selectedZone.density > 70 && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                            <span className="text-xs font-bold">⚠️ HIGH DENSITY ALERT</span>
                                        </div>
                                        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
                                            This zone is approaching capacity. Consider redirecting traffic.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-40 text-zinc-700 dark:text-gray-500 text-sm">
                                Click on a zone in the heat map
                            </div>
                        )}
                    </div>

                    {/* Zone List */}
                    <div className="bg-white dark:bg-[#0f1729] rounded-lg border border-cyan-900/30 p-4 max-h-48 overflow-y-auto custom-scrollbar print:bg-white print:text-black print:border-gray-300">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-cyan-100 mb-3 tracking-wider">ALL ZONES</h3>
                        <div className="space-y-2">
                            {zones.sort((a, b) => b.density - a.density).map(zone => (
                                <div
                                    key={zone.id}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedZone?.id === zone.id ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-zinc-100 dark:bg-black/20 hover:bg-zinc-200 dark:hover:bg-black/40 print:bg-white print:text-black print:border-gray-300'
                                        }`}
                                    onClick={() => setSelectedZone(zone)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${zone.density > 70 ? 'bg-red-500' : zone.density > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`} />
                                        <span className="text-xs text-black dark:text-gray-300">{zone.name}</span>
                                    </div>
                                    <span className={`text-xs font-mono ${zone.density > 70 ? 'text-red-600 dark:text-red-400' : zone.density > 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-cyan-600 dark:text-green-400'
                                        }`}>
                                        {Math.round(zone.density)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeatMapVisualization;
