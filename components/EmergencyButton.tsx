'use client';

import React, { useState } from 'react';
import { AlertTriangle, Phone, X } from 'lucide-react';

interface EmergencyButtonProps {
  onEmergency?: () => void;
  className?: string;
}

export default function EmergencyButton({ onEmergency, className = '' }: EmergencyButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);

  const handleClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    
    setIsTriggered(true);
    onEmergency?.();
    
    // Reset after 5 seconds
    setTimeout(() => {
      setIsTriggered(false);
      setIsConfirming(false);
    }, 5000);
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  if (isTriggered) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-xl ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
            <Phone className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Emergency Alert Sent</p>
            <p className="text-xs text-red-600">Authorities have been notified</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {isConfirming ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-semibold text-red-800">Confirm Emergency?</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClick}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Yes, Alert Now
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors font-medium text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-lg shadow-red-600/20"
        >
          <AlertTriangle className="w-5 h-5" />
          Emergency Alert
        </button>
      )}
    </div>
  );
}
