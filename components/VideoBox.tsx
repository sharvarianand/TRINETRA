// Gets the video stream from localhost:8000/stream-with-boxes and displays it in a box
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, WifiOff, Maximize2, Minimize2, Settings, RefreshCw } from 'lucide-react';

interface VideoBoxProps {
  cameraId?: string;
  cameraName?: string;
  streamUrl?: string;
  className?: string;
}

export default function VideoBox({ 
  cameraId = 'cam-1', 
  cameraName = 'Camera 1',
  streamUrl,
  className = '' 
}: VideoBoxProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const serverUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000';
  const videoSrc = streamUrl || `${serverUrl}/video_feed`;

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${serverUrl}/health`);
        setIsConnected(response.ok);
        setIsLoading(false);
      } catch {
        setIsConnected(false);
        setIsLoading(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-white rounded-xl border border-zinc-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-brand-muted" />
          <span className="text-sm font-semibold text-zinc-900">{cameraName}</span>
          <span className="text-xs text-zinc-400 font-mono">({cameraId})</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-cyan-50 rounded-full border border-cyan-200">
              <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse"></span>
              <span className="text-[10px] text-brand-muted font-semibold">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full border border-red-200">
              <WifiOff className="w-3 h-3 text-red-600" />
              <span className="text-[10px] text-red-700 font-semibold">OFFLINE</span>
            </div>
          )}
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 text-zinc-500 hover:text-brand-muted hover:bg-zinc-100 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Video Content */}
      <div className="aspect-video pt-12 bg-zinc-50">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-brand-muted animate-spin" />
          </div>
        ) : isConnected ? (
          <img 
            src={videoSrc}
            alt={cameraName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
            <WifiOff className="w-12 h-12" />
            <p className="text-sm font-medium">Camera Offline</p>
            <p className="text-xs text-zinc-400">Check connection and try again</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-white/95 backdrop-blur-sm border-t border-zinc-100 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono">
          {new Date().toLocaleTimeString()}
        </span>
        <button className="p-1 text-zinc-400 hover:text-brand-muted transition-colors">
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
