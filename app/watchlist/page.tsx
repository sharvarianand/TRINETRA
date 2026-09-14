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
    <div className="min-h-screen bg-[#0a0d14] text-cyan-50 font-mono flex flex-col">
      <header className="border-b border-cyan-900/50 bg-black/80 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 backdrop-blur">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-cyan-900/20 rounded-lg text-cyan-600"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold tracking-widest text-cyan-500 flex items-center gap-2"><Shield className="w-5 h-5" /> SUSPECT & VEHICLE WATCHLIST</h1>
          <p className="text-xs text-cyan-600/70 tracking-widest uppercase mt-1">Face Recognition Database // ANPR Hotlist Management</p>
        </div>
      </header>

      <div className="flex border-b border-cyan-900/40 px-6">
        <button onClick={() => setActiveTab('FACES')} className={`px-6 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'FACES' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-cyan-700 hover:text-cyan-500'}`}>
          <Users size={18} /> FACE WATCHLIST
        </button>
        <button onClick={() => setActiveTab('PLATES')} className={`px-6 py-3 font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'PLATES' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-cyan-700 hover:text-cyan-500'}`}>
          <Car size={18} /> VEHICLE HOTLIST
        </button>
      </div>

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {activeTab === 'FACES' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => setShowFaceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-950/50 border border-cyan-500 text-cyan-400 rounded hover:bg-cyan-900/50 transition-colors">
                <Plus size={18} /> ADD SUSPECT
              </button>
            </div>
            {loading ? (<div className="text-center py-12 text-cyan-700">LOADING DATABASE...</div>
            ) : suspects.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-cyan-900/40 rounded-lg text-cyan-700">
                <AlertTriangle size={32} className="mx-auto mb-4 text-cyan-800" />No suspects registered
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {suspects.map((s) => (
                  <div key={s.id} className="border border-cyan-900/40 bg-[#0c121b] rounded-lg p-4 relative group hover:border-cyan-500/30 transition-colors">
                    <button onClick={() => handleDeleteFace(s.id)} className="absolute top-2 right-2 p-2 text-cyan-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    <div className="w-full h-40 bg-[#0a0d14] border border-cyan-900/30 rounded mb-4 flex items-center justify-center"><Users size={40} className="text-cyan-900" /></div>
                    <h3 className="font-bold text-lg text-cyan-50 truncate">{s.name}</h3>
                    <div className="flex justify-between items-center text-xs mt-2">
                      <span className={`px-2 py-1 rounded font-bold ${s.threat_level === 'HIGH' ? 'bg-red-950 text-red-500 border border-red-900/50' : s.threat_level === 'MEDIUM' ? 'bg-amber-950 text-amber-500 border border-amber-900/50' : 'bg-cyan-950 text-cyan-500 border border-cyan-900/50'}`}>{s.threat_level}</span>
                      <span className="text-cyan-700">{s.added_at ? new Date(s.added_at).toLocaleDateString() : 'Recently'}</span>
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
              <button onClick={() => setShowPlateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-950/50 border border-cyan-500 text-cyan-400 rounded hover:bg-cyan-900/50 transition-colors">
                <Plus size={18} /> ADD PLATE
              </button>
            </div>
            {loading ? (<div className="text-center py-12 text-cyan-700">LOADING DATABASE...</div>
            ) : plates.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-cyan-900/40 rounded-lg text-cyan-700">
                <AlertTriangle size={32} className="mx-auto mb-4 text-cyan-800" />No plates flagged
              </div>
            ) : (
              <div className="overflow-x-auto border border-cyan-900/40 rounded-lg bg-[#0c121b]">
                <table className="w-full text-left">
                  <thead className="bg-cyan-950/30 border-b border-cyan-900/40">
                    <tr>
                      <th className="p-4 font-semibold text-cyan-500">PLATE NUMBER</th>
                      <th className="p-4 font-semibold text-cyan-500">REASON</th>
                      <th className="p-4 font-semibold text-cyan-500 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plates.map((p, i) => (
                      <tr key={i} className="border-b border-cyan-900/20 hover:bg-cyan-900/10 transition-colors">
                        <td className="p-4 font-bold text-cyan-100">{p.plate}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded border ${p.reason === 'stolen' ? 'bg-red-950 text-red-500 border-red-900/50' : p.reason === 'wanted' ? 'bg-amber-950 text-amber-500 border-amber-900/50' : 'bg-cyan-950 text-cyan-500 border-cyan-900/50'}`}>{p.reason.toUpperCase()}</span>
                        </td>
                        <td className="p-4 text-right"><button onClick={() => handleDeletePlate(p.plate)} className="p-2 text-cyan-700 hover:text-red-500 transition-colors"><Trash2 size={18} /></button></td>
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
        <div className="fixed inset-0 bg-[#0a0d14]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c121b] border border-cyan-500/50 rounded-lg w-full max-w-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <div className="p-4 border-b border-cyan-900/40 flex justify-between items-center">
              <h2 className="text-xl font-bold text-cyan-400">ADD SUSPECT</h2>
              <button onClick={() => setShowFaceModal(false)} className="text-cyan-700 hover:text-cyan-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddFace} className="p-6 space-y-4">
              <div><label className="block text-sm text-cyan-600 mb-1">SUSPECT NAME</label><input required type="text" value={faceName} onChange={(e) => setFaceName(e.target.value)} className="w-full bg-[#0a0d14] border border-cyan-900/60 rounded p-2 text-cyan-100 focus:outline-none focus:border-cyan-500" /></div>
              <div><label className="block text-sm text-cyan-600 mb-1">THREAT LEVEL</label><select value={faceThreat} onChange={(e) => setFaceThreat(e.target.value as any)} className="w-full bg-[#0a0d14] border border-cyan-900/60 rounded p-2 text-cyan-100 focus:outline-none focus:border-cyan-500"><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></div>
              <div><label className="block text-sm text-cyan-600 mb-1">PHOTO</label><input required type="file" accept="image/*" onChange={(e) => setFaceFile(e.target.files?.[0] || null)} className="w-full bg-[#0a0d14] border border-cyan-900/60 rounded p-2 text-cyan-100 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-cyan-950 file:text-cyan-400" /></div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowFaceModal(false)} className="px-4 py-2 border border-cyan-900/60 text-cyan-600 rounded hover:bg-cyan-900/20">CANCEL</button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 text-black font-bold rounded hover:bg-cyan-500">SAVE SUSPECT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlateModal && (
        <div className="fixed inset-0 bg-[#0a0d14]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c121b] border border-cyan-500/50 rounded-lg w-full max-w-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <div className="p-4 border-b border-cyan-900/40 flex justify-between items-center">
              <h2 className="text-xl font-bold text-cyan-400">ADD PLATE TO HOTLIST</h2>
              <button onClick={() => setShowPlateModal(false)} className="text-cyan-700 hover:text-cyan-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPlate} className="p-6 space-y-4">
              <div><label className="block text-sm text-cyan-600 mb-1">PLATE NUMBER</label><input required type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value.toUpperCase())} className="w-full bg-[#0a0d14] border border-cyan-900/60 rounded p-2 text-cyan-100 font-bold uppercase focus:outline-none focus:border-cyan-500" /></div>
              <div><label className="block text-sm text-cyan-600 mb-1">FLAG REASON</label><select value={plateReason} onChange={(e) => setPlateReason(e.target.value)} className="w-full bg-[#0a0d14] border border-cyan-900/60 rounded p-2 text-cyan-100 focus:outline-none focus:border-cyan-500"><option value="suspicious">SUSPICIOUS</option><option value="stolen">STOLEN</option><option value="wanted">WANTED</option></select></div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPlateModal(false)} className="px-4 py-2 border border-cyan-900/60 text-cyan-600 rounded hover:bg-cyan-900/20">CANCEL</button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 text-black font-bold rounded hover:bg-cyan-500">SAVE PLATE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
