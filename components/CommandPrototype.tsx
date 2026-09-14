'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, CircleDot, Crosshair, Drone, MapPin, Radio, ScanLine, ShieldAlert, UsersRound, Video } from 'lucide-react';

const tourSteps = [
  { title: 'Shared operational picture', body: 'The map is the primary workspace: teams see sectors, tracked activity, sensors and responding assets in one view.' },
  { title: 'Decisions are action-led', body: 'An alert is not just a warning. The operator can verify the feed, task an asset, or escalate it—with every action recorded.' },
  { title: 'Sensor confidence is explicit', body: 'Camera, thermal, radar and communications status stay visible, so a decision is never made from an unknown or stale feed.' },
  { title: 'A clear handoff', body: 'The asset rail shows who is available, where they are, and which response is underway. This prevents parallel, uncoordinated dispatches.' },
];

const assets = [
  { name: 'PATROL-12', role: 'Ground unit', state: 'AVAILABLE', color: 'text-[#c8dba8]' },
  { name: 'UAV-03', role: 'Overwatch drone', state: 'ON STATION', color: 'text-[#9ed4dc]' },
  { name: 'QRF-01', role: 'Quick response', state: 'READY', color: 'text-[#d9bb78]' },
];

export default function CommandPrototype() {
  const [tour, setTour] = useState(0);
  const [tourOpen, setTourOpen] = useState(true);
  const [selected, setSelected] = useState('TRACK 042');
  const [action, setAction] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!tourOpen) return;
      if (event.key === 'Escape') setTourOpen(false);
      if (event.key === 'ArrowRight') setTour((step) => Math.min(step + 1, tourSteps.length - 1));
      if (event.key === 'ArrowLeft') setTour((step) => Math.max(step - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourOpen]);

  const dispatch = (label: string) => setAction(`${label} logged to the incident trail`);

  return (
    <main className="command-prototype min-h-screen bg-[#07080d] p-3 text-[#dff5f7] md:p-5">
      <div className="mx-auto max-w-[1600px] border border-[#4e8f9c]/55 bg-[#0d111a] shadow-2xl shadow-black/60">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#748166]/35 px-4 py-3 md:px-5">
          <div><p className="tactical-kicker">TRINETRA // PROTOTYPE MODE</p><h1 className="mt-1 text-lg font-bold tracking-[.12em]">SECTOR COMMAND // NORTH RIDGE</h1></div>
          <div className="flex items-center gap-3 text-[11px] font-bold tracking-wider"><span className="flex items-center gap-2 text-[#92e8f4]"><i className="h-2 w-2 animate-pulse rounded-full bg-[#53d9e9]" /> ALL SYSTEMS LINKED</span><span className="border-l border-[#4e8f9c]/40 pl-3 text-[#9ab2b9]">WATCH 03 · 19:43 IST</span><button onClick={() => { setTour(0); setTourOpen(true); }} className="border border-[#ff5258]/70 px-3 py-2 text-[#ff7d80] hover:bg-[#ff5258]/10">START TOUR</button><Link href="/" className="text-[#94aab0] hover:text-white">EXIT</Link></div>
        </header>

        <div className="grid min-h-[760px] lg:grid-cols-[270px_minmax(0,1fr)_300px]">
          <aside className="border-b border-[#748166]/30 p-4 lg:border-b-0 lg:border-r">
            <p className="tactical-kicker">Priority queue</p>
            <div className="mt-4 border-l-2 border-[#ff5258] bg-[#301318]/55 p-3"><div className="flex items-center justify-between text-xs font-bold text-[#ff8588]"><span>PRIORITY 2</span><span>19:41</span></div><p className="mt-2 text-sm font-bold">Movement near Fence Line Alpha</p><p className="mt-1 text-xs leading-5 text-[#c2a7a8]">Thermal and camera correlation confirmed. No friendly tag present.</p><div className="mt-3 flex gap-2"><button onClick={() => dispatch('Feed verification')} className="border border-[#ff676b]/60 px-2 py-1.5 text-[10px] font-bold text-[#ff9a9c]">VERIFY FEED</button><button onClick={() => dispatch('Patrol-12 tasking')} className="border border-[#ff676b]/60 px-2 py-1.5 text-[10px] font-bold text-[#ff9a9c]">TASK UNIT</button></div></div>
            <div className="mt-3 border-l-2 border-[#82aab0] bg-[#142326]/50 p-3 text-sm"><span className="text-[10px] font-bold tracking-widest text-[#99cfd7]">INFO · 19:36</span><p className="mt-2">UAV-03 completed sweep of Sector Bravo.</p></div>
            <div className="mt-6 border-t border-[#4e8f9c]/30 pt-4"><p className="tactical-kicker">Recommended response</p><p className="mt-3 text-sm leading-6 text-[#bdd4d7]">Confirm the thermal signature, task PATROL-12 to observation point 4, and retain UAV-03 for overwatch.</p><button onClick={() => dispatch('Response plan approval')} className="mt-4 w-full bg-[#ff5258] px-3 py-3 text-xs font-bold tracking-wider text-[#17090b] hover:bg-[#ff7377]">APPROVE PLAN</button></div>
          </aside>

          <section className="relative min-h-[520px] overflow-hidden border-b border-[#748166]/30 bg-[#182116] p-4 lg:border-b-0">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(197,214,164,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(197,214,164,.16)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_70%,rgba(113,132,76,.5),transparent_23%),radial-gradient(ellipse_at_75%_25%,rgba(64,85,58,.7),transparent_30%),linear-gradient(125deg,transparent_25%,rgba(199,179,105,.13)_26%,transparent_28%)]" />
            <div className="relative flex items-start justify-between"><div><p className="tactical-kicker">Live operational map</p><p className="mt-1 text-xs text-[#a6b39b]">NORTH RIDGE // 5.2 KM MONITORED PERIMETER</p></div><div className="border border-[#8a9a75]/50 bg-[#0d120d]/80 px-3 py-2 text-[10px] tracking-widest"><span className="text-[#c9d9a9]">●</span> LIVE LAYERS: 04</div></div>
            <button onClick={() => setSelected('TRACK 042')} className="absolute left-[45%] top-[45%] z-10 rounded-full border-2 border-[#e4ba6c] bg-[#4b3819]/80 p-2 text-[#f0cf8e] shadow-[0_0_24px_rgba(227,181,92,.75)]"><Crosshair className="h-5 w-5" /><span className="absolute left-8 top-0 w-30 text-left text-[10px] font-bold tracking-widest">TRACK 042<br /><b className="font-normal text-[#e6d6ae]">CONF 87%</b></span></button>
            <button onClick={() => setSelected('PATROL-12')} className="absolute left-[24%] top-[66%] z-10 text-[#cce2ad]"><UsersRound className="h-7 w-7" /><span className="absolute left-8 top-0 w-28 text-left text-[10px] font-bold">PATROL-12</span></button>
            <button onClick={() => setSelected('UAV-03')} className="absolute right-[22%] top-[35%] z-10 text-[#a6dce2]"><Drone className="h-7 w-7" /><span className="absolute right-8 top-0 w-20 text-right text-[10px] font-bold">UAV-03</span></button>
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 border border-[#7b896d]/40 bg-[#0d130d]/85 px-3 py-2 text-[10px] tracking-wider text-[#b5c2a7]"><span><MapPin className="mr-1 inline h-3 w-3 text-[#d4b56d]" />19°43&apos;N 73°02&apos;E</span><span>SELECTED: <b className="text-[#e7edda]">{selected}</b></span><span>MAP DATUM: WGS-84</span></div>
          </section>

          <aside className="p-4 lg:border-l lg:border-[#748166]/30"><p className="tactical-kicker">Sensor fusion</p><div className="mt-4 space-y-2">{[[Video, 'CAM BOP-17', 'OPTICAL / ACTIVE', '98%'], [ScanLine, 'THERMAL-04', 'THERMAL / ACTIVE', '94%'], [Radio, 'RADAR-02', 'GROUND / ACTIVE', '91%'], [CircleDot, 'COMMS RELAY', 'LINK / STABLE', '100%']].map(([Icon, name, detail, score]) => { const Sensor = Icon as typeof Video; return <div key={name as string} className="flex items-center gap-3 border border-[#748166]/30 bg-[#141c13] p-3"><Sensor className="h-4 w-4 text-[#c2d3a5]" /><div className="flex-1"><p className="text-xs font-bold">{name as string}</p><p className="mt-1 text-[10px] text-[#8f9d84]">{detail as string}</p></div><span className="text-[10px] text-[#d4bc7c]">{score as string}</span></div>; })}</div>
            <p className="mt-6 tactical-kicker">Available assets</p><div className="mt-3 space-y-2">{assets.map((asset) => <button key={asset.name} onClick={() => setSelected(asset.name)} className="flex w-full items-center justify-between border border-[#748166]/30 bg-[#141c13] p-3 text-left hover:border-[#c7aa62]/70"><div><p className="text-xs font-bold">{asset.name}</p><p className="mt-1 text-[10px] text-[#8f9d84]">{asset.role}</p></div><span className={`text-[10px] font-bold ${asset.color}`}>{asset.state}</span></button>)}</div>
            {action && <div className="mt-5 flex gap-2 border border-[#b7ca91]/50 bg-[#1d2b19] p-3 text-xs text-[#d9e5c4]"><ShieldAlert className="h-4 w-4 shrink-0" />{action}</div>}
          </aside>
        </div>
      </div>
      {tourOpen && <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl border border-[#c7aa62]/60 bg-[#10170f] p-5 shadow-2xl shadow-black/70 md:inset-x-auto md:bottom-6 md:right-6"><button onClick={() => setTourOpen(false)} className="absolute right-3 top-2 text-xs text-[#9ba98c]">ESC ×</button><p className="tactical-kicker">Guided walkthrough · {tour + 1}/{tourSteps.length}</p><h2 className="mt-2 text-lg font-bold">{tourSteps[tour].title}</h2><p className="mt-2 pr-8 text-sm leading-6 text-[#adb9a1]">{tourSteps[tour].body}</p><div className="mt-4 flex items-center justify-between"><button disabled={tour === 0} onClick={() => setTour(tour - 1)} className="flex items-center gap-1 text-xs disabled:opacity-30"><ChevronLeft className="h-4 w-4" /> BACK</button>{tour === tourSteps.length - 1 ? <button onClick={() => setTourOpen(false)} className="bg-[#c7aa62] px-4 py-2 text-xs font-bold text-[#13180f]">EXPLORE DASHBOARD</button> : <button onClick={() => setTour(tour + 1)} className="flex items-center gap-1 bg-[#b8c69b] px-4 py-2 text-xs font-bold text-[#10150d]">NEXT <ChevronRight className="h-4 w-4" /></button>}</div></div>}
    </main>
  );
}
