'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, WifiOff, Maximize2, Users, RefreshCw, VideoOff, AlertTriangle, ShieldCheck, ShieldAlert, Ruler, Activity } from 'lucide-react';
import { Camera as CameraType, AreaUnit, DensityLevel } from '@/lib/types';

interface CameraConfig {
  id: string;
  name: string;
  url: string;
  zone: string;
  enabled: boolean;
  type?: 'live' | 'offline';
  capacity?: number;
  area?: number;
  areaUnit?: AreaUnit;
  densityLevel?: DensityLevel;
}

interface CameraStats {
  count: number;
  density: number;
  people: any[];
}

interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  percentage: number;
  message: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function assessRisk(count: number, capacity: number): RiskAssessment {
  if (capacity === 0) {
    if (count > 0) {
      return {
        level: 'critical',
        percentage: 100,
        message: 'RESTRICTED ZONE BREACH!',
        color: 'text-red-500',
        bgColor: 'bg-red-500',
        borderColor: 'border-red-500'
      };
    }
    return {
      level: 'low',
      percentage: 0,
      message: 'Perimeter Secure',
      color: 'text-brand-red',
      bgColor: 'bg-brand-red',
      borderColor: 'border-brand-red'
    };
  }

  const percentage = Math.round((count / capacity) * 100);

  if (count > 0) {
    return {
      level: percentage >= 50 ? 'high' : 'medium',
      percentage,
      message: `DETECTED: ${count} TARGETS IN SECTOR`,
      color: percentage >= 50 ? 'text-orange-500' : 'text-amber-500',
      bgColor: percentage >= 50 ? 'bg-orange-500' : 'bg-amber-500',
      borderColor: percentage >= 50 ? 'border-orange-500' : 'border-amber-500'
    };
  } else {
    return {
      level: 'low',
      percentage,
      message: 'Sector Clear',
      color: 'text-brand-red',
      bgColor: 'bg-brand-red',
      borderColor: 'border-brand-red'
    };
  }
}

export default function CameraGrid({ className = '', settings }: { className?: string; settings?: any }) {
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await fetch(`${serverUrl}/cameras`);
        if (response.ok) {
          const data = await response.json();
          setCameras(data.cameras || []);
          setServerConnected(true);
        }
      } catch {
        setServerConnected(false);
        setCameras([
          { id: 'cam-1', name: 'Fence Line Alpha', url: '', zone: 'Sector Alpha', enabled: true, type: 'live', area: 100, areaUnit: 'sqm', densityLevel: 'medium', capacity: 150 },
          { id: 'cam-2', name: 'Observation Post Bravo', url: '', zone: 'Sector Bravo', enabled: false, type: 'offline', area: 200, areaUnit: 'sqm', densityLevel: 'medium', capacity: 300 },
          { id: 'cam-3', name: 'Transit Checkpoint Charlie', url: '', zone: 'Sector Charlie', enabled: false, type: 'offline', area: 50, areaUnit: 'sqm', densityLevel: 'high', capacity: 125 },
          { id: 'cam-4', name: 'Logistics Route Delta', url: '', zone: 'Sector Delta', enabled: false, type: 'offline', area: 500, areaUnit: 'sqm', densityLevel: 'low', capacity: 250 },
        ]);
      }
    };

    fetchCameras();
    const interval = setInterval(fetchCameras, 10000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  if (!isMounted) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm p-8 flex items-center justify-center transition-colors duration-200 ${className}`}>
        <RefreshCw className="w-6 h-6 text-brand-muted dark:text-brand-text animate-spin" />
      </div>
    );
  }

  const liveCameras = cameras.filter(c => c.enabled && (c.type === 'live' || c.type === undefined));
  const offlineCameras = cameras.filter(c => !c.enabled || c.type === 'offline');

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm overflow-hidden transition-colors duration-200 ${className}`}>
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-brand-muted dark:text-brand-text" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Live Cameras</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
            {liveCameras.length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          {serverConnected ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-brand-card/10 dark:bg-brand-card/30 rounded-full border border-brand-border dark:border-brand-border">
              <span className="w-2 h-2 bg-brand-red dark:bg-brand-red rounded-full animate-pulse"></span>
              <span className="text-xs text-brand-muted dark:text-brand-text font-medium">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded-full border border-red-200 dark:border-red-700">
              <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full"></span>
              <span className="text-xs text-red-700 dark:text-red-400 font-medium">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-0.5 bg-zinc-200 dark:bg-zinc-700">
        {liveCameras.map((camera) => (
          <LiveCameraFeed
            key={camera.id}
            camera={camera}
            serverUrl={serverUrl}
            settings={settings}
          />
        ))}

        {offlineCameras.map((camera) => (
          <OfflineCameraPlaceholder key={camera.id} camera={camera} />
        ))}
      </div>

      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-700/50 border-t border-zinc-100 dark:border-zinc-700 flex items-center justify-between transition-colors duration-200">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {liveCameras.length}/{cameras.length} cameras online
        </span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-brand-red rounded-full"></span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Safe</span>
          <span className="w-2 h-2 bg-amber-500 rounded-full ml-2"></span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Moderate</span>
          <span className="w-2 h-2 bg-orange-500 rounded-full ml-2"></span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">High</span>
          <span className="w-2 h-2 bg-red-500 rounded-full ml-2"></span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Critical</span>
        </div>
      </div>
    </div>
  );
}

interface LiveCameraFeedProps {
  camera: CameraConfig;
  serverUrl: string;
  settings?: any;
}

function LiveCameraFeed({ camera, serverUrl, settings }: LiveCameraFeedProps) {
  const [cameraStats, setCameraStats] = useState<CameraStats>({ count: 0, density: 0, people: [] });
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lastAlertTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const privacyEnabled = settings?.privacyMaskingEnabled;
  const lowBandwidth = settings?.lowBandwidthMode;

  const videoFeedUrl = privacyEnabled
    ? `${serverUrl}/stream-with-privacy?camera_id=${camera.id}`
    : `${serverUrl}/stream-with-boxes?camera_id=${camera.id}`;

  const capacity = camera.capacity ?? 50;
  const isNoEntryZone = capacity === 0;
  const risk = assessRisk(cameraStats.count, capacity === 0 ? 0 : capacity);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${serverUrl}/coordinates?camera_id=${camera.id}`);
        if (response.ok) {
          const data = await response.json();
          setCameraStats({
            count: data.count || data.people?.length || 0,
            density: data.density || 0,
            people: data.people || [],
          });
          // If we have data, we're at least partially "loaded"
        }
      } catch (err) {
        console.error(`Feed ${camera.id}: Failed to fetch coordinates`, err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 500);
    return () => clearInterval(interval);
  }, [serverUrl, camera.id]);

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onrm/wMDAv7+/v7/AwMDBwb+/wMDAv7+/wMG/v8DCwcHBwsLCwsLBwcHBwcHBwcHAwMDAwMDAwMHBwcHBwcHAwMDAwMHBwcHCwsLCw8PDw8PDw8PDw8LCwsLCwsLCwsLCwsLBwcHBwcHBwcLCwsLCwsLDw8PDxMTExMTExMTExMTExMTDw8PDw8PDw8PDw8LCwsLCwsHBwcHBwcHBwMDAwMDAwMDAwMHBwcHBwcHBwcHBwcHBwcHBwcDAwMDAwMDAwMC/v7+/v7+/v7+/v7+/v7+/v7+/vMDAwMDAwMDAwMDAwMDAwMDAwMDAwMHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwQ==');
  }, []);

  useEffect(() => {
    const checkAndTriggerAlert = async () => {
      const now = Date.now();
      const alertCooldown = 60000;
      const shouldAlert = (isNoEntryZone && cameraStats.count > 0) || (!isNoEntryZone && cameraStats.count > capacity);

      if (shouldAlert && !alertTriggered && (now - lastAlertTimeRef.current > alertCooldown)) {
        setAlertTriggered(true);
        lastAlertTimeRef.current = now;

        if (audioRef.current) {
          try {
            audioRef.current.loop = true;
            await audioRef.current.play();
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.loop = false;
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
            }, 3000);
          } catch (e) {
            console.log('Audio play failed:', e);
          }
        }

        try {
          await fetch(`${serverUrl}/api/alert/check-capacity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              camera_id: camera.id,
              zone: camera.zone || camera.name,
              people_count: cameraStats.count,
              max_capacity: capacity
            })
          });
        } catch (err) {
          console.error('Failed to trigger alert:', err);
        }
        setTimeout(() => setAlertTriggered(false), alertCooldown);
      }
    };
    checkAndTriggerAlert();
  }, [cameraStats.count, capacity, isNoEntryZone, alertTriggered, serverUrl, camera.id, camera.zone, camera.name]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  useEffect(() => {
    if (hasError) {
      const timer = setTimeout(handleRetry, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasError]);

  const hasData = cameraStats.count !== undefined && (cameraStats.count > 0 || cameraStats.people.length > 0);
  const showLoadingOverlay = isLoading && !hasFirstFrame && !hasData;

  return (
    <div className="relative group bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-brand-red/50 transition-all duration-300 shadow-lg">
      <div className="aspect-video relative overflow-hidden bg-zinc-950">
        {lowBandwidth ? (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <div className="relative w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_100%)]">
              {cameraStats.people?.map((person: any) => (
                <div
                  key={person.id}
                  className="absolute w-2 h-2 bg-brand-red rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-300"
                  style={{ left: `${person.x}%`, top: `${person.y}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[9px] text-zinc-400 font-mono text-uppercase">
                LOW-BW: {cameraStats.count} DETECTIONS
              </div>
            </div>
          </div>
        ) : !hasError ? (
          <>
            <img
              key={`feed-${retryCount}-${privacyEnabled}`}
              src={videoFeedUrl}
              alt={camera.name}
              className="w-full h-full object-cover"
              onLoad={() => {
                setIsLoading(false);
                setHasFirstFrame(true);
              }}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
            {showLoadingOverlay && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin"></div>
                  <Activity className="absolute inset-0 m-auto w-5 h-5 text-brand-red animate-pulse" />
                </div>
                <p className="mt-4 text-[10px] font-bold text-brand-red/80 animate-pulse tracking-widest uppercase">Initializing Stream...</p>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-400 p-4 text-center">
            <WifiOff className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-semibold">Feed Connection Lost</span>
            <button onClick={handleRetry} className="mt-2 px-3 py-1 bg-brand-red hover:bg-brand-red-dark text-white rounded-md text-[10px] uppercase font-bold transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Overlays - Always show if we have data or video */}
        {(!isLoading || hasData) && !hasError && (
          <>
            <div className="absolute top-0 left-0 right-0 p-2.5 bg-linear-to-b from-black/80 to-transparent z-10 transition-opacity duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
                  <span className="text-[9px] text-red-400 font-black tracking-tighter">LIVE</span>
                  <span className="text-[10px] font-bold text-white uppercase tracking-tight">{camera.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isNoEntryZone && <span className="text-[8px] bg-red-500 text-white px-1 py-0.5 rounded font-black tracking-widest">RESTRICTED</span>}
                  <span className="text-[8px] text-zinc-300 bg-zinc-800/80 px-1.5 py-0.5 rounded font-mono uppercase">{camera.zone}</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-20">
              {alertTriggered && (
                <div className="px-2 py-1 bg-brand-red flex items-center justify-center gap-2 animate-bounce">
                  <span className="text-[9px] font-black text-white italic">WhatsApp Alert Dispatched!</span>
                </div>
              )}

              {(risk.level !== 'low') && !alertTriggered && (
                <div className={`px-2 py-1 ${risk.bgColor} flex items-center justify-center gap-2 animate-pulse`}>
                  <AlertTriangle className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-black text-white uppercase">{risk.message}</span>
                </div>
              )}

              <div className="p-2.5 bg-linear-to-t from-black/95 via-black/80 to-transparent">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-black text-white leading-none">{cameraStats.count}</span>
                          <span className="text-[10px] text-white/40 font-bold">/ {capacity === 0 ? '🚫' : capacity}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${risk.bgColor}/20 border border-${risk.level === 'low' ? 'red' : risk.level === 'medium' ? 'amber' : 'red'}-500/30`}>
                          <span className={`text-[8px] font-black uppercase ${risk.color}`}>
                            {isNoEntryZone && cameraStats.count > 0 ? 'BREACH' : isNoEntryZone ? 'SECURE' : risk.level}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{risk.percentage}% LOAD</span>
                    </div>

                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ease-out ${risk.bgColor} shadow-[0_0_10px_${risk.level === 'low' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}]`}
                        style={{ width: `${Math.min(risk.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5 group"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400 font-black tracking-tighter">LIVE</span>
              <span className="text-sm font-bold text-white uppercase">{camera.name}</span>
              <span className="text-[10px] text-zinc-400 font-mono uppercase">{camera.zone}</span>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 bg-white/5 hover:bg-white/15 rounded-lg transition-colors border border-white/10"
              title="Exit fullscreen (Esc)"
            >
              <Minimize2 className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <img
              src={videoFeedUrl}
              alt={camera.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OfflineCameraPlaceholder({ camera }: { camera: CameraConfig }) {
  const capacity = camera.capacity || 50;
  return (
    <div className="relative bg-zinc-900 overflow-hidden aspect-video border border-zinc-800 grayscale opacity-60">
      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
        <VideoOff className="w-8 h-8 mb-2 opacity-30" />
        <span className="text-[10px] font-black tracking-widest uppercase">{camera.name}</span>
        <span className="text-[8px] mt-1 font-bold text-red-500/50 uppercase">Offline</span>
      </div>
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
        <span className="text-[8px] text-white/20 font-bold uppercase">{camera.zone}</span>
        <div className="flex items-center gap-1">
          <Ruler className="w-2.5 h-2.5 text-white/20" />
          <span className="text-[8px] text-white/20 font-mono">{camera.area || 0}m²</span>
        </div>
      </div>
    </div>
  );
}



