/**
 * Multiplayer Manager — Packets, permissions, economy, teams
 */
import { useState, type FC } from 'react';
import { Globe, ArrowUpDown, Shield, Coins, Users, Plus, Lock, ChevronRight, Settings } from 'lucide-react';

type Tab = 'packets'|'permissions'|'economy'|'teams';
interface Packet { id:string; name:string; dir:'C2S'|'S2C'|'BOTH'; fields:{name:string;type:string}[]; }
const packets:Packet[] = [{id:'p1',name:'SyncBlockData',dir:'S2C',fields:[{name:'pos',type:'BlockPos'},{name:'data',type:'Tag'}]},{id:'p2',name:'OpenGUI',dir:'S2C',fields:[{name:'id',type:'int'}]},{id:'p3',name:'PlayerAction',dir:'C2S',fields:[{name:'action',type:'String'},{name:'target',type:'Entity'}]}];
const perms = [{name:'admin',level:4},{name:'moderator',level:3},{name:'builder',level:2},{name:'player',level:0}];
const currencies = [{name:'Gold',sym:'🪙',bal:1250},{name:'Gems',sym:'💎',bal:45}];

export const MultiplayerManager: FC = () => {
  const [tab,setTab] = useState<Tab>('packets');
  const [sel,setSel] = useState('p1');
  const pkt = packets.find(p=>p.id===sel);
  return (
    <div className="flex h-full w-full bg-slate-900">
      <div className="w-44 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2"><Globe size={14} className="text-cyan-400"/><span className="text-xs font-bold text-slate-200">Multiplayer</span></div>
        <div className="p-2 space-y-1">{([{t:'packets' as Tab,i:ArrowUpDown,l:'Packets'},{t:'permissions' as Tab,i:Shield,l:'Perms'},{t:'economy' as Tab,i:Coins,l:'Economy'},{t:'teams' as Tab,i:Users,l:'Teams'}]).map(({t,i:I,l})=>(<button key={t} onClick={()=>setTab(t)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] ${tab===t?'bg-blue-600/20 text-blue-200':'text-slate-400 hover:bg-slate-700'}`}><I size={11}/>{l}</button>))}</div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {tab==='packets'&&<div className="space-y-2">{packets.map(p=>(<button key={p.id} onClick={()=>setSel(p.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left ${sel===p.id?'border-blue-500/50 bg-blue-950/15':'border-slate-700 hover:border-slate-600'}`}><span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${p.dir==='C2S'?'bg-green-900/50 text-green-300':'bg-blue-900/50 text-blue-300'}`}>{p.dir}</span><div className="flex-1"><div className="text-[11px] font-medium text-slate-200">{p.name}</div><div className="text-[8px] text-slate-500">{p.fields.length} fields</div></div></button>))}</div>}
        {tab==='permissions'&&<div className="space-y-2">{perms.map((p,i)=>(<div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-700"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${p.level>=4?'bg-red-900/50 text-red-300':p.level>=2?'bg-blue-900/50 text-blue-300':'bg-slate-700 text-slate-400'}`}>{p.level}</div><span className="text-[11px] font-bold text-slate-200 capitalize flex-1">{p.name}</span><Lock size={12} className="text-slate-500"/></div>))}</div>}
        {tab==='economy'&&<div className="grid grid-cols-2 gap-3">{currencies.map((c,i)=>(<div key={i} className="p-4 rounded-xl border border-slate-700 text-center"><span className="text-3xl">{c.sym}</span><div className="text-xs font-bold text-white mt-2">{c.name}</div><div className="text-lg font-bold text-amber-400 mt-1">{c.bal}</div></div>))}</div>}
        {tab==='teams'&&<div className="space-y-2">{[{name:'Red Team',color:'#ef4444',m:8},{name:'Blue Team',color:'#3b82f6',m:6}].map((t,i)=>(<div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-700"><div className="w-4 h-4 rounded-full" style={{backgroundColor:t.color}}/><div className="flex-1"><div className="text-[11px] font-bold text-slate-200">{t.name}</div><div className="text-[9px] text-slate-500">{t.m} members</div></div></div>))}</div>}
      </div>
      {tab==='packets'&&pkt&&<div className="w-52 bg-slate-800 border-l border-slate-700 p-3 space-y-2"><span className="text-xs font-bold text-slate-200">{pkt.name}</span><div className="space-y-1">{pkt.fields.map((f,i)=>(<div key={i} className="flex items-center gap-2 px-2 py-1 bg-slate-700/50 rounded"><span className="text-[9px] text-slate-300">{f.name}</span><span className="text-[8px] text-cyan-400 font-mono ml-auto">{f.type}</span></div>))}</div></div>}
    </div>
  );
};
