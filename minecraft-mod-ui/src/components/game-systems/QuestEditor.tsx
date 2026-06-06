/**
 * Quest Editor — Quest chains with objectives, rewards, NPC dialog
 */
import { useState, type FC } from 'react';
import { Scroll, Sword, Star, Map, MessageSquare, Gift, Flag } from 'lucide-react';

type ObjType = 'kill'|'collect'|'discover'|'craft'|'explore'|'talk';
interface Objective { id:string; type:ObjType; target:string; count:number; current:number; desc:string; }
interface Reward { id:string; type:string; value:string; amount:number; }
interface Quest { id:string; name:string; desc:string; status:'locked'|'available'|'active'|'complete'; objectives:Objective[]; rewards:Reward[]; }

const quests:Quest[] = [
  { id:'q1',name:'Welcome Adventurer',desc:'Speak to the village elder.',status:'complete',objectives:[{id:'o1',type:'talk',target:'Elder Bob',count:1,current:1,desc:'Talk to Elder Bob'}],rewards:[{id:'r1',type:'xp',value:'xp',amount:100}] },
  { id:'q2',name:'Night Watch',desc:'Defend the village.',status:'active',objectives:[{id:'o2',type:'kill',target:'Zombie',count:10,current:6,desc:'Kill 10 Zombies'},{id:'o3',type:'collect',target:'Rotten Flesh',count:5,current:2,desc:'Collect 5 Rotten Flesh'}],rewards:[{id:'r3',type:'xp',value:'xp',amount:500},{id:'r4',type:'item',value:'diamond',amount:3}] },
  { id:'q3',name:'The Lost Mine',desc:'Explore the abandoned mine.',status:'locked',objectives:[{id:'o4',type:'explore',target:'Abandoned Mine',count:1,current:0,desc:'Find the mine'}],rewards:[{id:'r6',type:'item',value:'enchanted_pickaxe',amount:1}] },
];
const icons:Record<ObjType,typeof Sword>={kill:Sword,collect:Star,discover:Map,craft:Gift,explore:Flag,talk:MessageSquare};

export const QuestEditor: FC = () => {
  const [selId,setSelId] = useState('q2');
  const [tab,setTab] = useState<'objectives'|'rewards'>('objectives');
  const sel = quests.find(q=>q.id===selId);
  return (
    <div className="flex h-full w-full bg-slate-900">
      <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2"><Scroll size={14} className="text-amber-400"/><span className="text-xs font-bold text-slate-200">Quests</span></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">{quests.map(q=>(<button key={q.id} onClick={()=>setSelId(q.id)} className={`w-full text-left px-2.5 py-2 rounded-lg border ${selId===q.id?'border-blue-500/50 bg-blue-950/20':'border-slate-700 hover:border-slate-600'}`}><div className="flex items-center gap-2"><span className="text-[10px]">{q.status==='complete'?'✅':q.status==='active'?'🔶':'🔒'}</span><span className="text-[11px] font-medium text-slate-200">{q.name}</span></div></button>))}</div>
      </div>
      <div className="flex-1 flex flex-col">{sel?(<>
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700"><div className="text-sm font-bold text-white">{sel.name}</div><div className="text-[10px] text-slate-400">{sel.desc}</div></div>
        <div className="flex border-b border-slate-700">{(['objectives','rewards'] as const).map(t=>(<button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 text-[10px] font-bold capitalize ${tab===t?'text-blue-400 border-b-2 border-blue-400':'text-slate-400'}`}>{t}</button>))}</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab==='objectives'&&sel.objectives.map(o=>{const I=icons[o.type];return(<div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700"><I size={14} className="text-amber-400"/><div className="flex-1"><div className="text-[11px] text-slate-200">{o.desc}</div></div><div className="text-xs font-bold text-white">{o.current}/{o.count}</div></div>);})}
          {tab==='rewards'&&sel.rewards.map(r=>(<div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700"><Gift size={14} className="text-purple-400"/><span className="text-[11px] text-slate-200 capitalize flex-1">{r.type}: {r.value}</span><span className="text-xs font-bold text-white">×{r.amount}</span></div>))}
        </div>
      </>):(<div className="flex-1 flex items-center justify-center text-slate-500 text-xs">Select a quest</div>)}</div>
    </div>
  );
};
