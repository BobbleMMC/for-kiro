/**
 * Plugin Marketplace — Browse, install, manage community plugins
 */
import { useState, type FC } from 'react';
import { Puzzle, Download, Star, Check, Trash2, Search, Filter, ExternalLink, User, RefreshCw, Code, Palette, Boxes, Zap, Settings } from 'lucide-react';

type PluginStatus = 'installed'|'available'|'update';
type PluginCategory = 'editor'|'generator'|'theme'|'integration'|'utility';
interface Plugin { id:string; name:string; author:string; desc:string; version:string; category:PluginCategory; status:PluginStatus; downloads:number; rating:number; icon:string; tags:string[]; updated:string; }

const plugins: Plugin[] = [
  { id:'p1',name:'Ore Gen Pro',author:'ModDev42',desc:'Advanced custom ore generation with vein shapes and biome-specific distribution.',version:'2.1.0',category:'generator',status:'installed',downloads:12500,rating:4.8,icon:'💎',tags:['worldgen','ore'],updated:'2d ago' },
  { id:'p2',name:'Dark Nether Theme',author:'ThemeStudio',desc:'Beautiful dark red theme inspired by Nether. Custom icons included.',version:'1.3.2',category:'theme',status:'installed',downloads:8200,rating:4.5,icon:'🎨',tags:['theme','dark'],updated:'1w ago' },
  { id:'p3',name:'CurseForge Publisher',author:'CloudMods',desc:'One-click publish to CurseForge and Modrinth with auto-metadata.',version:'3.0.1',category:'integration',status:'available',downloads:25000,rating:4.9,icon:'🚀',tags:['publish','deploy'],updated:'3d ago' },
  { id:'p4',name:'Particle FX Editor',author:'VFXMaster',desc:'Visual particle effect designer with real-time 3D preview.',version:'1.0.5',category:'editor',status:'available',downloads:5600,rating:4.3,icon:'✨',tags:['particle','visual'],updated:'5d ago' },
  { id:'p5',name:'Auto Loot Tables',author:'TableGen',desc:'Generate loot table JSON from entity/block configs with weighted drops.',version:'2.4.0',category:'utility',status:'update',downloads:18900,rating:4.7,icon:'🎲',tags:['loot','json'],updated:'1d ago' },
  { id:'p6',name:'Sound Forge',author:'AudioMods',desc:'Built-in sound editor with OGG converter and sound event mapper.',version:'1.2.0',category:'editor',status:'available',downloads:4200,rating:4.1,icon:'🔊',tags:['sound','audio'],updated:'2w ago' },
  { id:'p7',name:'Git Auto-Commit',author:'DevFlow',desc:'Auto commits on save with smart messages. Branch management.',version:'1.5.3',category:'integration',status:'available',downloads:9800,rating:4.4,icon:'📝',tags:['git','auto'],updated:'4d ago' },
  { id:'p8',name:'Advancement Tree',author:'TreeView',desc:'Advancement tree visualization with drag-and-drop and auto-layout.',version:'1.1.0',category:'editor',status:'available',downloads:3100,rating:4.2,icon:'🌳',tags:['advancement','tree'],updated:'1w ago' },
];

const catCfg: Record<PluginCategory,{icon:typeof Code;label:string;color:string}> = {
  editor:{icon:Code,label:'Editor',color:'#3b82f6'},generator:{icon:Boxes,label:'Generator',color:'#22c55e'},
  theme:{icon:Palette,label:'Theme',color:'#a855f7'},integration:{icon:Zap,label:'Integration',color:'#f59e0b'},
  utility:{icon:Settings,label:'Utility',color:'#6366f1'},
};

export const PluginMarketplace: FC = () => {
  const [list,setList] = useState(plugins);
  const [search,setSearch] = useState('');
  const [catFilter,setCatFilter] = useState<PluginCategory|'all'>('all');
  const [sel,setSel] = useState<Plugin|null>(null);
  const [tab,setTab] = useState<'browse'|'installed'>('browse');

  const filtered = list.filter(p => {
    if(tab==='installed'&&p.status!=='installed'&&p.status!=='update') return false;
    if(catFilter!=='all'&&p.category!==catFilter) return false;
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const install = (id:string) => setList(l=>l.map(p=>p.id===id?{...p,status:'installed' as PluginStatus}:p));
  const uninstall = (id:string) => setList(l=>l.map(p=>p.id===id?{...p,status:'available' as PluginStatus}:p));
  const instCount = list.filter(p=>p.status==='installed'||p.status==='update').length;

  return (
    <div className="flex h-full w-full bg-slate-900">
      {/* Sidebar */}
      <div className="w-48 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2"><Puzzle size={14} className="text-indigo-400"/><span className="text-xs font-bold text-slate-200">Plugins</span></div>
        <div className="flex border-b border-slate-700">
          <button onClick={()=>setTab('browse')} className={`flex-1 py-1.5 text-[10px] ${tab==='browse'?'text-blue-400 border-b-2 border-blue-400':'text-slate-400'}`}>Browse</button>
          <button onClick={()=>setTab('installed')} className={`flex-1 py-1.5 text-[10px] ${tab==='installed'?'text-blue-400 border-b-2 border-blue-400':'text-slate-400'}`}>Installed ({instCount})</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button onClick={()=>setCatFilter('all')} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] ${catFilter==='all'?'bg-blue-600/20 text-blue-200':'text-slate-400 hover:bg-slate-700'}`}><Filter size={10}/>All</button>
          {Object.entries(catCfg).map(([c,cfg])=>{const I=cfg.icon;return <button key={c} onClick={()=>setCatFilter(c as PluginCategory)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] ${catFilter===c?'bg-blue-600/20 text-blue-200':'text-slate-400 hover:bg-slate-700'}`}><I size={10} style={{color:cfg.color}}/>{cfg.label}</button>;})}
        </div>
      </div>
      {/* Grid */}
      <div className="flex-1 flex flex-col">
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex gap-2">
          <div className="flex-1 relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500"/></div>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><RefreshCw size={13}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(p=>(
            <div key={p.id} onClick={()=>setSel(p)} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer ${sel?.id===p.id?'border-blue-500/50 bg-blue-950/10':'border-slate-700 hover:border-slate-600'}`}>
              <span className="text-2xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-slate-200">{p.name}</span><span className="text-[8px] px-1 bg-slate-700 text-slate-400 rounded">v{p.version}</span>{p.status==='update'&&<span className="text-[8px] px-1 bg-orange-900/50 text-orange-300 rounded">Update</span>}</div>
                <p className="text-[9px] text-slate-400 mt-0.5 truncate">{p.desc}</p>
                <div className="flex items-center gap-3 mt-1"><span className="text-[8px] text-slate-500 flex items-center gap-0.5"><User size={8}/>{p.author}</span><span className="text-[8px] text-slate-500 flex items-center gap-0.5"><Download size={8}/>{(p.downloads/1000).toFixed(1)}k</span><span className="text-[8px] text-yellow-400 flex items-center gap-0.5"><Star size={8} fill="currentColor"/>{p.rating}</span></div>
              </div>
              {p.status==='installed'&&<span className="text-[9px] bg-green-900/40 text-green-300 px-2 py-1 rounded flex items-center gap-1"><Check size={9}/>OK</span>}
              {p.status==='available'&&<button onClick={e=>{e.stopPropagation();install(p.id);}} className="text-[9px] bg-blue-600 text-white px-2 py-1 rounded"><Download size={9}/></button>}
              {p.status==='update'&&<button className="text-[9px] bg-orange-600 text-white px-2 py-1 rounded"><RefreshCw size={9}/></button>}
            </div>
          ))}
        </div>
      </div>
      {/* Details */}
      <div className="w-56 bg-slate-800 border-l border-slate-700 p-3 flex flex-col">
        <span className="text-xs font-bold text-slate-200 mb-3">Details</span>
        {sel?(
          <div className="space-y-3">
            <div className="text-center"><span className="text-4xl block mb-2">{sel.icon}</span><div className="text-sm font-bold text-slate-200">{sel.name}</div><div className="text-[9px] text-slate-500">{sel.author} · v{sel.version}</div></div>
            <div className="flex items-center justify-center gap-3 text-[9px]"><span className="text-yellow-400 flex items-center gap-0.5"><Star size={10} fill="currentColor"/>{sel.rating}</span><span className="text-slate-400"><Download size={10}/> {(sel.downloads/1000).toFixed(1)}k</span></div>
            <p className="text-[10px] text-slate-400">{sel.desc}</p>
            <div className="flex flex-wrap gap-1">{sel.tags.map(t=><span key={t} className="text-[8px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">#{t}</span>)}</div>
            {sel.status==='installed'?<button onClick={()=>uninstall(sel.id)} className="w-full px-2 py-1.5 bg-red-900/30 border border-red-700/50 rounded text-[10px] text-red-300 flex items-center justify-center gap-1"><Trash2 size={10}/>Uninstall</button>
            :<button onClick={()=>install(sel.id)} className="w-full px-2 py-1.5 bg-blue-600 rounded text-[10px] text-white flex items-center justify-center gap-1"><Download size={10}/>Install</button>}
            <button className="w-full px-2 py-1.5 bg-slate-700 rounded text-[10px] text-slate-300 flex items-center justify-center gap-1"><ExternalLink size={10}/>Source</button>
          </div>
        ):(<div className="text-center mt-8 text-[10px] text-slate-500"><Puzzle size={24} className="mx-auto mb-2 text-slate-600"/>Select a plugin</div>)}
      </div>
    </div>
  );
};
