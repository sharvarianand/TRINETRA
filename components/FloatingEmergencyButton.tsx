'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Phone, MapPin, Send, CheckCircle, Loader2 } from 'lucide-react';

interface FloatingEmergencyButtonProps {
    baseUrl?: string;
    defaultZone?: string;
}

export default function FloatingEmergencyButton({
    baseUrl = 'http://localhost:8000',
    defaultZone = 'Dashboard'
}: FloatingEmergencyButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isTriggered, setIsTriggered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [zone, setZone] = useState(defaultZone);
    const [error, setError] = useState<string | null>(null);

    // Emergency contacts for display (prototype - not actually contacted)
    const emergencyContacts = [
        { name: 'Local Police', number: '100', type: 'Police' },
        { name: 'Fire Department', number: '101', type: 'Fire' },
        { name: 'Ambulance', number: '102', type: 'Medical' },
        { name: 'Event Security', number: '+91 XXXXXXXXXX', type: 'Security' },
    ];

    const handleEmergencyTrigger = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${baseUrl}/api/alert/emergency`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    zone: zone || defaultZone,
                    reason: reason || 'Manual emergency trigger',
                    camera_id: ''
                })
            });

            if (!response.ok) {
                throw new Error('Failed to trigger emergency alert');
            }

            const result = await response.json();
            console.log('Emergency triggered:', result);

            setIsTriggered(true);
            setIsConfirming(false);

            // Reset after 10 seconds
            setTimeout(() => {
                setIsTriggered(false);
                setIsOpen(false);
                setReason('');
            }, 10000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to trigger alert');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading && !isTriggered) {
            setIsOpen(false);
            setIsConfirming(false);
            setReason('');
            setError(null);
        }
    };

    // Pulse animation for the button
    const pulseAnimation = isTriggered ? '' : 'animate-pulse';

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${pulseAnimation} group`}
                style={{
                    boxShadow: '0 4px 20px rgba(220, 38, 38, 0.5)',
                    animation: isTriggered ? 'none' : undefined
                }}
                title="Emergency Alert"
            >
                <AlertTriangle className="w-8 h-8" />
                <span className="absolute -top-10 right-0 bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Emergency Alert
                </span>
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
                    onClick={handleClose}
                >
                    <div
                        className="bg-white dark:bg-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`p-5 ${isTriggered ? 'bg-brand-red' : 'bg-red-600'} relative`}>
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                                disabled={isLoading || isTriggered}
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full ${isTriggered ? 'bg-brand-red' : 'bg-red-500'} flex items-center justify-center`}>
                                    {isTriggered ? (
                                        <CheckCircle className="w-7 h-7 text-white" />
                                    ) : (
                                        <AlertTriangle className="w-7 h-7 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {isTriggered ? 'Alert Sent!' : 'Emergency Alert'}
                                    </h2>
                                    <p className="text-white/80 text-sm">
                                        {isTriggered ? 'Authorities have been notified' : 'Report an emergency situation'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            {isTriggered ? (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto bg-brand-card/20 dark:bg-brand-card/30 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-10 h-10 text-brand-muted" />
                                    </div>
                                    <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                                        Emergency alert has been triggered successfully.
                                    </p>
                                    <div className="bg-brand-card/10 dark:bg-brand-card/30 border border-brand-border dark:border-brand-border rounded-lg p-3 text-sm text-brand-muted dark:text-brand-red">
                                        <strong>✅ WhatsApp Alert Sent!</strong> Security personnel have been notified via WhatsApp. Alert also logged to dashboard.
                                    </div>
                                </div>
                            ) : isConfirming ? (
                                <div>
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                                        <p className="text-red-800 dark:text-red-200 font-medium text-center">
                                            Are you sure you want to trigger an emergency alert?
                                        </p>
                                        <p className="text-red-600 dark:text-red-300 text-sm text-center mt-1">
                                            This action will be logged and cannot be undone.
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-4">
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsConfirming(false)}
                                            disabled={isLoading}
                                            className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEmergencyTrigger}
                                            disabled={isLoading}
                                            className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    Confirm Alert
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {/* Zone Selection */}
                                    <div className="mb-4">
                                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                            <MapPin className="w-4 h-4" />
                                            Location / Zone
                                        </label>
                                        <input
                                            type="text"
                                            value={zone}
                                            onChange={(e) => setZone(e.target.value)}
                                            placeholder="Enter location"
                                            className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-red-500"
                                        />
                                    </div>

                                    {/* Reason */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                                            Reason (optional)
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Describe the emergency..."
                                            rows={2}
                                            className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-red-500 resize-none"
                                        />
                                    </div>

                                    {/* Emergency Contacts (Display Only) */}
                                    <div className="mb-5">
                                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                            <Phone className="w-4 h-4" />
                                            Emergency Contacts
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {emergencyContacts.map((contact, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg text-sm"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-600 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                                        {contact.type.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-zinc-800 dark:text-zinc-200 text-xs">{contact.name}</p>
                                                        <p className="text-zinc-500 dark:text-zinc-400 text-xs">{contact.number}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 italic">
                                            * Prototype mode - contacts are not actually notified
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setIsConfirming(true)}
                                        className="w-full py-3.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                                    >
                                        <AlertTriangle className="w-5 h-5" />
                                        Trigger Emergency Alert
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}



