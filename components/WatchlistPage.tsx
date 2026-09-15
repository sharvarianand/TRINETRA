'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, Car, Plus, Trash2, ArrowLeft, AlertTriangle, X } from 'lucide-react';

interface Suspect {
  id: string;
  name: string;
  threat_level: 'HIGH' | 'MEDIUM' | 'LOW';
  added_at?: string;
}

interface Plate {
  plate: string;
  reason: string;
}

export default function WatchlistPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'FACES' | 'PLATES'>('FACES');
  const baseUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://localhost:8000';
  
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showPlateModal, setShowPlateModal] = useState(false);
  
  const [faceName, setFaceName] = useState('');
  const [faceThreat, setFaceThreat] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [faceFile, setFaceFile] = useState<File | null>(null);
  
  const [plateNumber, setPlateNumber] = useState('');
  const [plateReason, setPlateReason] = useState('suspicious');

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'FACES') {
        const res = await fetch(`${baseUrl}/watchlist/faces`);
        if (res.ok) { const data = await res.json(); setSuspects(data.faces || []); }
      } else {
        const res = await fetch(`${baseUrl}/watchlist/plates`);
        if (res.ok) { const data = await res.json(); setPlates(data.plates || []); }
      }
    } catch (error) { console.error('Failed to fetch', error); }
    setLoading(false);
  };

  const handleAddFace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceFile) return;
    const formData = new FormData();
    formData.append('name', faceName);
    formData.append('threat_level', faceThreat);
    formData.append('file', faceFile);
    try {
      const res = await fetch(`${baseUrl}/watchlist/faces`, { method: 'POST', body: formData });
      if (res.ok) { setShowFaceModal(false); setFaceName(''); setFaceFile(null); fetchData(); }
    } catch (error) { console.error('Failed to add suspect', error); }
  };

  const handleDeleteFace = async (id: string) => {
    try {
      await fetch(`${baseUrl}/watchlist/faces/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) { console.error('Failed to delete', error); }
  };

  const handleAddPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${baseUrl}/watchlist/plates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate: plateNumber, reason: plateReason }),
      });
      if (res.ok) { setShowPlateModal(false); setPlateNumber(''); fetchData(); }
    } catch (error) { console.error('Failed to add plate', error); }
  };

  const handleDeletePlate = async (plate: string) => {
    try {
      await fetch(`${baseUrl}/watchlist/plates/${plate}`, { method: 'DELETE' });
      fetchData();
    } catch (error) { console.error('Failed to delete', error); }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-mono flex flex-col">
      <header className="border-b border-brand-border/50 bg-black/80 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 backdrop-blur">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-brand-card/20 rounded-lg text-brand-muted"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold tracking-widest text-brand-red flex items-center gap-2"><Shield className="w-5 h-5" /> SUSPECT & VEHICLE WATCHLIST</h1>
          <p className="text-xs text-brand-muted/70 tracking-widest uppercase mt-1">Face Recognition Database // ANPR Hotlist Management</p>
        </div>
      </header>

      <div className="flex border-b border-brand-border/40 px-6">
        <button onClick={() => setActiveTab('FACES')} className={`px-6 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'FACES' ? 'border-cyan-400 text-brand-text' : 'border-transparent text-brand-muted hover:text-brand-red'}`}>
          <Users size={18} /> FACE WATCHLIST
        </button>
        <button onClick={() => setActiveTab('PLATES')} className={`px-6 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'PLATES' ? 'border-cyan-400 text-brand-text' : 'border-transparent text-brand-muted hover:text-brand-red'}`}>
          <Car size={18} /> VEHICLE HOTLIST
        </button>
      </div>

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {activeTab === 'FACES' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => setShowFaceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-bg/50 border border-brand-red text-brand-text rounded hover:bg-brand-card/50 transition-colors">
                <Plus size={18} /> ADD SUSPECT
              </button>
            </div>
            {loading ? (<div className="text-center py-12 text-brand-muted">LOADING DATABASE...</div>
            ) : suspects.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-brand-border/40 rounded-lg text-brand-muted">
                <AlertTriangle size={32} className="mx-auto mb-4 text-brand-muted" />No suspects registered
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {suspects.map((s) => (
                  <div key={s.id} className="border border-brand-border/40 bg-brand-card rounded-lg p-4 relative group hover:border-brand-red/30 transition-colors">
                    <button onClick={() => handleDeleteFace(s.id)} className="absolute top-2 right-2 p-2 text-brand-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    <div className="w-full h-40 bg-brand-bg border border-brand-border/30 rounded mb-4 flex items-center justify-center"><Users size={40} className="text-brand-muted" /></div>
                    <h3 className="font-bold text-lg text-brand-text truncate">{s.name}</h3>
                    <div className="flex justify-between items-center text-xs mt-2">
                      <span className={`px-2 py-1 rounded font-bold ${s.threat_level === 'HIGH' ? 'bg-red-950 text-red-500 border border-red-900/50' : s.threat_level === 'MEDIUM' ? 'bg-amber-950 text-amber-500 border border-amber-900/50' : 'bg-brand-bg text-brand-red border border-brand-border/50'}`}>{s.threat_level}</span>
                      <span className="text-brand-muted">{s.added_at ? new Date(s.added_at).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'PLATES' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => setShowPlateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-bg/50 border border-brand-red text-brand-text rounded hover:bg-brand-card/50 transition-colors">
                <Plus size={18} /> ADD PLATE
              </button>
            </div>
            {loading ? (<div className="text-center py-12 text-brand-muted">LOADING DATABASE...</div>
            ) : plates.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-brand-border/40 rounded-lg text-brand-muted">
                <AlertTriangle size={32} className="mx-auto mb-4 text-brand-muted" />No plates flagged
              </div>
            ) : (
              <div className="overflow-x-auto border border-brand-border/40 rounded-lg bg-brand-card">
                <table className="w-full text-left">
                  <thead className="bg-brand-bg/30 border-b border-brand-border/40">
                    <tr>
                      <th className="p-4 font-semibold text-brand-red">PLATE NUMBER</th>
                      <th className="p-4 font-semibold text-brand-red">REASON</th>
                      <th className="p-4 font-semibold text-brand-red text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plates.map((p, i) => (
                      <tr key={i} className="border-b border-brand-border/20 hover:bg-brand-card/10 transition-colors">
                        <td className="p-4 font-bold text-brand-text">{p.plate}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded border ${p.reason === 'stolen' ? 'bg-red-950 text-red-500 border-red-900/50' : p.reason === 'wanted' ? 'bg-amber-950 text-amber-500 border-amber-900/50' : 'bg-brand-bg text-brand-red border-brand-border/50'}`}>{p.reason.toUpperCase()}</span>
                        </td>
                        <td className="p-4 text-right"><button onClick={() => handleDeletePlate(p.plate)} className="p-2 text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {showFaceModal && (
        <div className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-card border border-brand-red/50 rounded-lg w-full max-w-md shadow-[0_0_15px_rgba(239,51,72,0.15)]">
            <div className="p-4 border-b border-brand-border/40 flex justify-between items-center">
              <h2 className="text-xl font-bold text-brand-text">ADD SUSPECT</h2>
              <button onClick={() => setShowFaceModal(false)} className="text-brand-muted hover:text-brand-text"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddFace} className="p-6 space-y-4">
              <div><label className="block text-sm text-brand-muted mb-1">SUSPECT NAME</label><input required type="text" value={faceName} onChange={(e) => setFaceName(e.target.value)} className="w-full bg-brand-bg border border-brand-border/60 rounded p-2 text-brand-text focus:outline-none focus:border-brand-red" /></div>
              <div><label className="block text-sm text-brand-muted mb-1">THREAT LEVEL</label><select value={faceThreat} onChange={(e) => setFaceThreat(e.target.value as any)} className="w-full bg-brand-bg border border-brand-border/60 rounded p-2 text-brand-text focus:outline-none focus:border-brand-red"><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></div>
              <div><label className="block text-sm text-brand-muted mb-1">PHOTO</label><input required type="file" accept="image/*" onChange={(e) => setFaceFile(e.target.files?.[0] || null)} className="w-full bg-brand-bg border border-brand-border/60 rounded p-2 text-brand-text file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-brand-bg file:text-brand-text" /></div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowFaceModal(false)} className="px-4 py-2 border border-brand-border/60 text-brand-muted rounded hover:bg-brand-card/20">CANCEL</button>
                <button type="submit" className="px-4 py-2 bg-brand-red text-black font-bold rounded hover:bg-brand-red">SAVE SUSPECT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlateModal && (
        <div className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-card border border-brand-red/50 rounded-lg w-full max-w-md shadow-[0_0_15px_rgba(239,51,72,0.15)]">
            <div className="p-4 border-b border-brand-border/40 flex justify-between items-center">
              <h2 className="text-xl font-bold text-brand-text">ADD PLATE TO HOTLIST</h2>
              <button onClick={() => setShowPlateModal(false)} className="text-brand-muted hover:text-brand-text"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPlate} className="p-6 space-y-4">
              <div><label className="block text-sm text-brand-muted mb-1">PLATE NUMBER</label><input required type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value.toUpperCase())} className="w-full bg-brand-bg border border-brand-border/60 rounded p-2 text-brand-text font-bold uppercase focus:outline-none focus:border-brand-red" /></div>
              <div><label className="block text-sm text-brand-muted mb-1">FLAG REASON</label><select value={plateReason} onChange={(e) => setPlateReason(e.target.value)} className="w-full bg-brand-bg border border-brand-border/60 rounded p-2 text-brand-text focus:outline-none focus:border-brand-red"><option value="suspicious">SUSPICIOUS</option><option value="stolen">STOLEN</option><option value="wanted">WANTED</option></select></div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPlateModal(false)} className="px-4 py-2 border border-brand-border/60 text-brand-muted rounded hover:bg-brand-card/20">CANCEL</button>
                <button type="submit" className="px-4 py-2 bg-brand-red text-black font-bold rounded hover:bg-brand-red">SAVE PLATE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



