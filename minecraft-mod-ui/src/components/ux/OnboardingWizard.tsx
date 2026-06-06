/**
 * Onboarding Wizard — Interactive first-mod tutorial (5 steps)
 */
import { useState, type FC } from 'react';
import { Rocket, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';

const templates = [
  { id:'blank',name:'Blank Mod',desc:'Empty project',icon:'📦',color:'#64748b' },
  { id:'magic',name:'Magic Mod',desc:'Enchantments & spells',icon:'✨',color:'#a855f7' },
  { id:'rpg',name:'RPG Mod',desc:'Quests & weapons',icon:'⚔️',color:'#ef4444' },
  { id:'tech',name:'Tech Mod',desc:'Machines & energy',icon:'⚙️',color:'#06b6d4' },
  { id:'decorative',name:'Decorative',desc:'Blocks & furniture',icon:'🎨',color:'#f59e0b' },
  { id:'adventure',name:'Adventure',desc:'Dimensions & biomes',icon:'🌍',color:'#22c55e' },
];

interface Props { isOpen:boolean; onClose:()=>void; onComplete:(d:any)=>void; }

export const OnboardingWizard: FC<Props> = ({ isOpen, onClose, onComplete }) => {
  const [step,setStep] = useState(0);
  const [template,setTemplate] = useState('blank');
  const [modName,setModName] = useState('');
  const [mcVersion,setMcVersion] = useState('1.20.4');
  const [loader,setLoader] = useState<'forge'|'fabric'|'neoforge'>('forge');

  if (!isOpen) return null;
  const next = () => { if(step<4) setStep(step+1); else { onComplete({template,modName,mcVersion,loader}); onClose(); } };
  const prev = () => { if(step>0) setStep(step-1); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-4 pb-2 flex items-center gap-1">{[0,1,2,3,4].map(i=>(<div key={i} className="flex items-center flex-1"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 ${i<step?'bg-green-600 border-green-500 text-white':i===step?'bg-blue-600 border-blue-500 text-white':'border-slate-600 text-slate-500'}`}>{i<step?<Check size={10}/>:i+1}</div>{i<4&&<div className={`flex-1 h-0.5 mx-1 ${i<step?'bg-green-500':'bg-slate-700'}`}/>}</div>))}</div>
        <div className="px-8 py-6 min-h-[320px]">
          {step===0&&<div className="text-center"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-3"><Rocket size={28} className="text-white"/></div><h2 className="text-lg font-bold text-white">Welcome to Minecraft Mod Studio</h2><p className="text-xs text-slate-400 mt-2">Create mods without code. This wizard guides you in 5 steps.</p></div>}
          {step===1&&<div><h2 className="text-lg font-bold text-white mb-3">Choose Template</h2><div className="grid grid-cols-3 gap-2">{templates.map(t=>(<button key={t.id} onClick={()=>setTemplate(t.id)} className={`p-3 rounded-xl border text-left ${template===t.id?'border-blue-500 bg-blue-950/20':'border-slate-700 hover:border-slate-500'}`}><span className="text-xl">{t.icon}</span><div className="text-[10px] font-bold text-slate-200 mt-1">{t.name}</div><div className="text-[8px] text-slate-500">{t.desc}</div></button>))}</div></div>}
          {step===2&&<div><h2 className="text-lg font-bold text-white mb-3">Configure</h2><div className="space-y-3 max-w-md"><div><label className="text-[10px] text-slate-400 uppercase font-bold">Mod Name</label><input value={modName} onChange={e=>setModName(e.target.value)} placeholder="My Mod" className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-slate-400 uppercase font-bold">MC Version</label><select value={mcVersion} onChange={e=>setMcVersion(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"><option>1.21</option><option>1.20.4</option><option>1.20.1</option></select></div><div><label className="text-[10px] text-slate-400 uppercase font-bold">Loader</label><select value={loader} onChange={e=>setLoader(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"><option value="forge">Forge</option><option value="fabric">Fabric</option><option value="neoforge">NeoForge</option></select></div></div></div></div>}
          {step===3&&<div><h2 className="text-lg font-bold text-white mb-3">First Block Created!</h2><div className="bg-slate-900 rounded-xl border border-slate-700 p-4 flex items-center gap-4"><div className="w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-500 rounded-xl flex items-center justify-center text-3xl">💎</div><div><div className="text-sm font-bold text-white">Ruby Ore</div><div className="text-[10px] text-slate-400">Hardness: 3.0 · Drops: Ruby × 1-3</div><div className="text-[9px] text-green-400 mt-1 flex items-center gap-1"><Check size={10}/>Auto-registered</div></div></div></div>}
          {step===4&&<div className="text-center"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center mx-auto mb-3"><Sparkles size={28} className="text-white"/></div><h2 className="text-lg font-bold text-white">Ready to Build!</h2><p className="text-xs text-slate-400 mt-2">Your mod is configured. Click Finish to start editing.</p></div>}
        </div>
        <div className="px-8 py-4 border-t border-slate-700 flex items-center justify-between">
          <button onClick={prev} disabled={step===0} className="flex items-center gap-1 px-4 py-2 text-xs text-slate-400 disabled:opacity-30"><ChevronLeft size={14}/>Back</button>
          <span className="text-[10px] text-slate-500">{step+1}/5</span>
          <button onClick={next} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1">{step===4?'Finish':'Next'}<ChevronRight size={14}/></button>
        </div>
      </div>
    </div>
  );
};
