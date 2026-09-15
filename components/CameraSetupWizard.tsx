'use client';

import { useState } from 'react';
import { Camera, Plus, Minus, Check, Wifi, Shield, Calculator, Upload } from 'lucide-react';
import { AreaUnit, DensityLevel, calculateCapacity } from '@/lib/types';

interface CameraInput {
    id: string;
    name: string;
    url: string;
    zone: string;
    area: number;
    areaUnit: AreaUnit;
    densityLevel: DensityLevel;
    maxCapacity: number;
    useManualCapacity: boolean;
    sourceType: 'stream' | 'upload';
    videoFile: File | null;
}

interface CameraSetupWizardProps {
    onComplete: () => void;
    onClose?: () => void;
    baseUrl: string;
}

const defaultZones = ['Main Plaza', 'Entry Gate', 'Exit Gate', 'Stage Area', 'Food Court', 'Parking', 'VIP Area'];

export default function CameraSetupWizard({ onComplete, onClose, baseUrl }: CameraSetupWizardProps) {
    const [step, setStep] = useState(1);
    const [cameraCount, setCameraCount] = useState(1);
    const [cameras, setCameras] = useState<CameraInput[]>([
        {
            id: 'cam-1',
            name: 'Camera 1',
            url: '',
            zone: 'Main Plaza',
            area: 100,
            areaUnit: 'sqm',
            densityLevel: 'medium',
            maxCapacity: 150,
            useManualCapacity: false,
            sourceType: 'stream',
            videoFile: null
        }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Custom zones state
    const [customZones, setCustomZones] = useState<string[]>([]);
    const [showCustomZoneInput, setShowCustomZoneInput] = useState<number | null>(null);
    const [newCustomZone, setNewCustomZone] = useState('');

    // Combined zones list (default + custom)
    const allZones = [...defaultZones, ...customZones];

    // Add a new custom zone
    const addCustomZone = (cameraIndex: number) => {
        const trimmedZone = newCustomZone.trim();
        if (trimmedZone && !allZones.includes(trimmedZone)) {
            setCustomZones(prev => [...prev, trimmedZone]);
            updateCamera(cameraIndex, 'zone', trimmedZone);
        }
        setNewCustomZone('');
        setShowCustomZoneInput(null);
    };

    const updateCameraCount = (count: number) => {
        const newCount = Math.max(1, Math.min(5, count));
        setCameraCount(newCount);

        // Adjust cameras array
        if (newCount > cameras.length) {
            const newCameras = [...cameras];
            for (let i = cameras.length; i < newCount; i++) {
                newCameras.push({
                    id: `cam-${i + 1}`,
                    name: `Camera ${i + 1}`,
                    url: '',
                    zone: allZones[i % allZones.length],
                    area: 100,
                    areaUnit: 'sqm',
                    densityLevel: 'medium',
                    maxCapacity: 150,
                    useManualCapacity: false,
                    sourceType: 'stream',
                    videoFile: null
                });
            }
            setCameras(newCameras);
        } else if (newCount < cameras.length) {
            setCameras(cameras.slice(0, newCount));
        }
    };

    const updateCamera = <K extends keyof CameraInput>(index: number, field: K, value: CameraInput[K]) => {
        const newCameras = [...cameras];
        newCameras[index] = { ...newCameras[index], [field]: value } as CameraInput;

        // If area, unit, or density changed, recalculate capacity (unless manual is on)
        if (!newCameras[index].useManualCapacity && (field === 'area' || field === 'areaUnit' || field === 'densityLevel')) {
            newCameras[index].maxCapacity = calculateCapacity(
                newCameras[index].area,
                newCameras[index].areaUnit,
                newCameras[index].densityLevel
            );
        }

        setCameras(newCameras);
    };

    const handleSubmit = async () => {
        // Each source needs either a live stream URL or an uploaded video.
        const invalidCameras = cameras.filter(cam =>
            cam.sourceType === 'stream' ? !cam.url.trim() : !cam.videoFile
        );
        if (invalidCameras.length > 0) {
            setError('Provide a live stream URL or video file for every source');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // First, fetch existing cameras and delete them all
            const existingResponse = await fetch(`${baseUrl}/cameras`);
            if (existingResponse.ok) {
                const { cameras: existingCameras } = await existingResponse.json();
                for (const cam of existingCameras) {
                    await fetch(`${baseUrl}/cameras/${cam.id}`, {
                        method: 'DELETE'
                    });
                }
            }

            // Now add the new cameras
            for (const camera of cameras) {
                let url: string;

                if (camera.sourceType === 'upload' && camera.videoFile) {
                    const formData = new FormData();
                    formData.append('camera_id', camera.id);
                    formData.append('file', camera.videoFile);

                    const uploadResponse = await fetch(`${baseUrl}/cameras/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const uploadData = await uploadResponse.json();
                    if (!uploadResponse.ok) {
                        throw new Error(uploadData.detail || `Failed to upload ${camera.videoFile.name}`);
                    }
                    url = uploadData.url;
                } else {
                    url = camera.url.trim();

                    // Auto-format a DroidCam IP address, while retaining standard RTSP/HTTP URLs.
                    if (!url.startsWith('http') && !url.startsWith('rtsp://')) {
                        url = `http://${url}`;
                    }
                    if (url.startsWith('http') && !url.includes(':4747')) {
                        url = `${url}:4747`;
                    }
                    if (url.includes(':4747') && !url.endsWith('/video')) {
                        url = `${url}/video`;
                    }
                }

                const response = await fetch(`${baseUrl}/cameras`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: camera.id,
                        name: camera.name,
                        url: url,
                        zone: camera.zone,
                        enabled: true,
                        area: camera.area,
                        areaUnit: camera.areaUnit,
                        densityLevel: camera.densityLevel,
                        capacity: camera.maxCapacity
                    })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || `Failed to add ${camera.name}`);
                }
            }

            onComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save cameras');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-brand-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-brand-border bg-gradient-to-r from-brand-red to-brand-red-dark rounded-t-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Logo size="sm" showText={false} variant="light" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Welcome to TRINETRA</h2></div>{onClose && (<button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-auto"><X className="w-5 h-5" /></button>)}
                    <p className="text-brand-text text-sm">Connect live camera streams or upload recorded video for analysis</p>
                </div>

                {/* Step 1: Camera Count */}
                {step === 1 && (
                    <div className="p-6">
                        <div className="text-center mb-8">
                            <Camera className="w-16 h-16 mx-auto text-brand-red mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                How many cameras do you want to use?
                            </h3>
                            <p className="text-gray-500 dark:text-brand-muted text-sm">
                                You can add up to 5 live or recorded video sources
                            </p>
                        </div>

                        <div className="flex items-center justify-center gap-6 mb-8">
                            <button
                                onClick={() => updateCameraCount(cameraCount - 1)}
                                disabled={cameraCount <= 1}
                                className="w-12 h-12 rounded-full bg-gray-100 dark:bg-brand-bg flex items-center justify-center text-gray-600 dark:text-brand-text hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <div className="text-5xl font-bold text-brand-red w-20 text-center">
                                {cameraCount}
                            </div>
                            <button
                                onClick={() => updateCameraCount(cameraCount + 1)}
                                disabled={cameraCount >= 5}
                                className="w-12 h-12 rounded-full bg-gray-100 dark:bg-brand-bg flex items-center justify-center text-gray-600 dark:text-brand-text hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-3 bg-brand-red hover:bg-brand-red text-white font-medium rounded-xl transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 2: Camera Details */}
                {step === 2 && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                Add Video Sources
                            </h3>
                            <p className="text-gray-500 dark:text-brand-muted text-sm flex items-center gap-1">
                                <Wifi className="w-4 h-4" />
                                Use a live RTSP/DroidCam stream or a recorded video file
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4 max-h-[40vh] overflow-auto pr-2">
                            {cameras.map((camera, index) => (
                                <div
                                    key={camera.id}
                                    className="p-4 bg-gray-50 dark:bg-brand-bg/50 rounded-xl border border-gray-200 dark:border-brand-border"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center text-white font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={camera.name}
                                            onChange={(e) => updateCamera(index, 'name', e.target.value)}
                                            className="flex-1 bg-transparent font-medium text-gray-900 dark:text-white focus:outline-none"
                                            placeholder="Camera Name"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-brand-bg">
                                            <button
                                                type="button"
                                                onClick={() => updateCamera(index, 'sourceType', 'stream')}
                                                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${camera.sourceType === 'stream' ? 'bg-brand-red text-white shadow-sm' : 'text-gray-600 dark:text-brand-text'}`}
                                            >
                                                LIVE CAMERA STREAM
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateCamera(index, 'sourceType', 'upload')}
                                                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${camera.sourceType === 'upload' ? 'bg-brand-red text-white shadow-sm' : 'text-gray-600 dark:text-brand-text'}`}
                                            >
                                                UPLOAD VIDEO
                                            </button>
                                        </div>

                                        {/* Source and zone */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">
                                                    {camera.sourceType === 'stream' ? 'Camera URL *' : 'Video File *'}
                                                </label>
                                                {camera.sourceType === 'stream' ? (
                                                    <input
                                                        type="text"
                                                        value={camera.url}
                                                        onChange={(e) => updateCamera(index, 'url', e.target.value)}
                                                        placeholder="rtsp://camera-ip/stream"
                                                        className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-brand-border rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-red font-mono"
                                                    />
                                                ) : (
                                                    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-red/60 bg-white px-3 py-2 text-sm text-zinc-600 transition-colors hover:border-brand-red dark:bg-zinc-800 dark:text-zinc-300">
                                                        <Upload className="h-4 w-4 shrink-0 text-brand-red" />
                                                        <span className="truncate">{camera.videoFile?.name || 'Choose MP4, MOV, AVI, or MKV'}</span>
                                                        <input
                                                            type="file"
                                                            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
                                                            onChange={(e) => updateCamera(index, 'videoFile', e.target.files?.[0] || null)}
                                                            className="sr-only"
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-brand-muted mb-1 block">
                                                    Zone
                                                </label>
                                                {showCustomZoneInput === index ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newCustomZone}
                                                            onChange={(e) => setNewCustomZone(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') addCustomZone(index);
                                                                else if (e.key === 'Escape') {
                                                                    setShowCustomZoneInput(null);
                                                                    setNewCustomZone('');
                                                                }
                                                            }}
                                                            placeholder="New..."
                                                            autoFocus
                                                            className="flex-1 bg-white dark:bg-brand-card border border-brand-red rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={camera.zone}
                                                            onChange={(e) => updateCamera(index, 'zone', e.target.value)}
                                                            className="flex-1 bg-white dark:bg-brand-card border border-gray-300 dark:border-brand-border rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-red"
                                                        >
                                                            {allZones.map((zone: string) => (
                                                                <option key={zone} value={zone}>{zone}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => setShowCustomZoneInput(index)}
                                                            className="px-2 py-2 bg-zinc-100 dark:bg-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-500 text-zinc-700 dark:text-zinc-200 rounded-lg transition-colors"
                                                            title="New Zone"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Area Factor Configuration */}
                                        <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-brand-border">
                                            <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-brand-text font-medium text-xs">
                                                <Calculator className="w-3 h-3 text-brand-red" />
                                                Area & Density Factors
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-500 dark:text-brand-muted mb-1 block">Physical Area</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={camera.area}
                                                        onChange={(e) => updateCamera(index, 'area', parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-brand-border rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 dark:text-brand-muted mb-1 block">Unit</label>
                                                    <select
                                                        value={camera.areaUnit}
                                                        onChange={(e) => updateCamera(index, 'areaUnit', e.target.value as AreaUnit)}
                                                        className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-brand-border rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                                                    >
                                                        <option value="sqm">m²</option>
                                                        <option value="sqft">ft²</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 dark:text-brand-muted mb-1 block">Density</label>
                                                    <select
                                                        value={camera.densityLevel}
                                                        onChange={(e) => updateCamera(index, 'densityLevel', e.target.value as DensityLevel)}
                                                        className="w-full bg-white dark:bg-brand-card border border-gray-300 dark:border-brand-border rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="high">High</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-brand-border flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500 dark:text-brand-muted">Calculated Max Capacity:</span>
                                                    <span className="text-sm font-bold text-brand-red">
                                                        {calculateCapacity(camera.area, camera.areaUnit, camera.densityLevel)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] text-gray-500 dark:text-brand-muted cursor-pointer flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={camera.useManualCapacity}
                                                            onChange={(e) => updateCamera(index, 'useManualCapacity', e.target.checked)}
                                                            className="rounded border-gray-300 dark:border-brand-border text-brand-red focus:ring-brand-red"
                                                        />
                                                        Manual Override
                                                    </label>
                                                </div>
                                            </div>

                                            {camera.useManualCapacity && (
                                                <div className="mt-2 text-center flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={camera.maxCapacity}
                                                        onChange={(e) => updateCamera(index, 'maxCapacity', parseInt(e.target.value) || 0)}
                                                        className="w-full bg-zinc-50 dark:bg-brand-card border border-brand-red/50 rounded-lg px-3 py-1.5 text-sm font-bold text-brand-muted focus:outline-none"
                                                    />
                                                    {camera.maxCapacity === 0 && (
                                                        <span className="text-[10px] font-bold text-red-500 whitespace-nowrap">🚫 NO ENTRY</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-brand-bg text-gray-700 dark:text-brand-text font-medium rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-brand-red hover:bg-brand-red text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Complete Setup
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}




