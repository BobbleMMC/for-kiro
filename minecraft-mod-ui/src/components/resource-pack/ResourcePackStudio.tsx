/**
 * Resource Pack Studio — Browse vanilla assets, override textures, manage sounds
 */
import { useState, type FC } from 'react';
import { Package, Image, Volume2, FileJson, Type, Search, Upload, Check, Eye } from 'lucide-react';

type AssetCategory = 'textures'|'models'|'sounds'|'lang'|'blockstates';
interface VanillaAsset { id:string; path:string; name:string; category:AssetCategory; overridden:boolean; }

const categories = [
  { cat:'textures' as AssetCategory, label:'Textures', icon:Image, count:2048, items:[
    {id:'t1',path:'textures/block/stone.png',name:'stone.png',category:'textures' as AssetCategory,overridden:false},
    {id:'t2',path:'textures/block/dirt.png',name:'dirt.png',category:'textures' as AssetCategory,overridden:true},
    {id:'t3',path:'textures/block/diamond_ore.png',name:'diamond_ore.png',category:'textures' as AssetCategory,overridden:true},
    {id:'t4',path:'textures/item/diamond.png',name:'diamond.png',category:'textures' as AssetCategory,overridden:false},
    {id:'t5',path:'textures/item/iron_sword.png',name:'iron_sword.png',category:'textures' as AssetCategory,overridden:true},
    {id:'t6',path:'textures/entity/zombie.png',name:'zombie.png',category:'textures' as AssetCategory,overridden:false},
  ]},
  { cat:'models' as AssetCategory, label:'Models', icon:Package, count:1024, items:[
    {id:'m1',path:'models/block/stone.json',name:'stone.json',category:'models' as AssetCategory,overridden:false},
    {id:'m2',path:'models/item/diamond_sword.json',name:'diamond_sword.json',category:'models' as AssetCategory,overridden:true},
  ]},
  { cat:'sounds' as AssetCategory, label:'Sounds', icon:Volume2, count:512, items:[
    {id:'s1',path:'sounds/block/stone_break.ogg',name:'stone_break.ogg',category:'sounds' as AssetCategory,overridden:false},
  ]},
  { cat:'lang' as AssetCategory, label:'Languages', icon:Type, count:64, items:[
    {id:'l1',path:'lang/en_us.json',name:'en_us.json',category:'lang' as AssetCategory,overridden:true},
  ]},
  { cat:'blockstates' as AssetCategory, label:'Blockstates', icon:FileJson, count:256, items:[
    {id:'b1',path:'blockstates/stone.json',name:'stone.json',category:'blockstates' as AssetCategory,overridden:false},
  ]},
];

export const ResourcePackStudio: FC = () => {
  const [activeCat,setActiveCat] = useState<AssetCategory>('textures');
  const [search,setSearch] = useState('');
  const [selected,setSelected] = useState<VanillaAsset|null>(null);
  const [overridesOnly,setOverridesOnly] = useState(false);

  const cat = categories.find(c=>c.cat===activeCat);
  const items = cat?.items.filter(i=>{
    if(search&&!i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if(overridesOnly&&!i.overridden) return false;
    return true;
  })||[];

  return (
    <div className="flex h-full w-full bg-slate-900">
      <div className="w-48 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700"><div className="flex items-center gap-2"><Package size={14} className="text-emerald-400"/><span className="text-xs font-bold text-slate-200">Resource Pack</span></div></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map(c=>{const I=c.icon;const a=c.cat===activeCat;const ov=c.items.filter(i=>i.overridden).length;return(
            <button key={c.cat} onClick={()=>setActiveCat(c.cat)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left ${a?'bg-blue-600/20 border border-blue-500/40 text-blue-200':'text-slate-300 hover:bg-slate-700 border border-transparent'}`}>
              <I size={13} className={a?'text-blue-400':'text-slate-400'}/><div className="flex-1"><div className="text-[10px] font-medium">{c.label}</div><div className="text-[8px] text-slate-500">{c.count}</div></div>
              {ov>0&&<span className="text-[8px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">{ov}</span>}
            </button>
          );})}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <div className="flex-1 relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500"/></div>
          <button onClick={()=>setOverridesOnly(!overridesOnly)} className={`px-2 py-1.5 rounded text-[10px] font-medium ${overridesOnly?'bg-green-600 text-white':'bg-slate-700 text-slate-400'}`}>Overrides</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {items.map(i=>(
            <div key={i.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${selected?.id===i.id?'bg-blue-900/20 border border-blue-500/40':'hover:bg-slate-800 border border-transparent'}`} onClick={()=>setSelected(i)}>
              {i.category==='textures'?<Image size={13} className="text-pink-400"/>:i.category==='sounds'?<Volume2 size={13} className="text-blue-400"/>:<FileJson size={13} className="text-yellow-400"/>}
              <div className="flex-1 min-w-0"><div className="text-[11px] text-slate-200 truncate">{i.name}</div><div className="text-[9px] text-slate-500 truncate">{i.path}</div></div>
              {i.overridden&&<span className="text-[8px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Check size={8}/>Override</span>}
            </div>
          ))}
          {items.length===0&&<div className="text-center py-8 text-slate-500 text-xs"><Search size={24} className="mx-auto mb-2"/>No assets found</div>}
        </div>
      </div>
      <div className="w-56 bg-slate-800 border-l border-slate-700 flex flex-col p-3">
        <span className="text-xs font-bold text-slate-200 mb-3">Inspector</span>
        {selected?(
          <div className="space-y-3">
            <div className="w-full aspect-square bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center">{selected.category==='textures'?<div className="w-16 h-16 bg-slate-600 border border-slate-500"/>:<FileJson size={24} className="text-slate-500"/>}</div>
            <div className="text-[10px] text-slate-300 font-medium">{selected.name}</div>
            <div className="text-[8px] text-slate-500 truncate">{selected.path}</div>
            <button className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-[10px] text-white font-medium flex items-center justify-center gap-1"><Upload size={10}/>Override Asset</button>
            <button className="w-full px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300 flex items-center justify-center gap-1"><Eye size={10}/>Preview</button>
          </div>
        ):(<div className="text-[10px] text-slate-500 text-center mt-8"><Package size={24} className="mx-auto mb-2 text-slate-600"/>Select an asset</div>)}
      </div>
    </div>
  );
};
