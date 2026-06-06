/**
 * Multi-Loader Manager — Forge/Fabric/NeoForge/Quilt/Bedrock
 * Build targets, compatibility analysis, cross-loader code generation
 */
import { useState, type FC } from 'react';
import { Package, Check, AlertTriangle, Download, Globe, Layers, Cpu, Shield, Zap } from 'lucide-react';

type LoaderType = 'forge'|'fabric'|'neoforge'|'quilt'|'bedrock';
interface Loader { id:LoaderType; name:string; icon:string; color:string; version:string; status:'active'|'available'|'incompatible'; mcVersions:string[]; apiStyle:string; features:string[]; }

const loaders: Loader[] = [
  { id:'forge',name:'Forge',icon:'⚒️',color:'#d97706',version:'49.0.31',status:'active',mcVersions:['1.20.4','1.21'],apiStyle:'@SubscribeEvent',features:['Annotations','Capabilities','DataGen'] },
  { id:'fabric',name:'Fabric',icon:'🧵',color:'#8b5cf6',version:'0.15.11',status:'available',mcVersions:['1.20.4','1.21'],apiStyle:'Lambda events',features:['Mixin-first','Lightweight','Fast Updates'] },
  { id:'neoforge',name:'NeoForge',icon:'🔥',color:'#ef4444',version:'20.4.237',status:'available',mcVersions:['1.20.4','1.21'],apiStyle:'Bus events',features:['Modern API','Forge compat','Data Components'] },
  { id:'quilt',name:'Quilt',icon:'🧩',color:'#06b6d4',version:'0.26.4',status:'available',mcVersions:['1.20.4'],apiStyle:'Fabric + QSL',features:['Fabric compat','Enhanced APIs','Better errors'] },
  { id:'bedrock',name:'Bedrock',icon:'🪨',color:'#64748b',version:'1.21.0',status:'incompatible',mcVersions:['1.21'],apiStyle:'JSON + Script API',features:['JSON packs','Molang','Script API'] },
];

const codeExamples: Record<LoaderType,string> = {
  forge: `@Mod.EventBusSubscriber(modid = "mymod", bus = Bus.FORGE)\npublic class ModEvents {\n    @SubscribeEvent\n    public static void onBlockBreak(BlockEvent.BreakEvent e) {\n        Player p = e.getPlayer();\n        if (p != null) p.sendSystemMessage(Component.literal("Break!"));\n    }\n}`,
  fabric: `public class ModEvents implements ModInitializer {\n    @Override\n    public void onInitialize() {\n        PlayerBlockBreakEvents.BEFORE.register((world, player, pos, state, be) -> {\n            player.sendMessage(Text.literal("Break!"));\n            return true;\n        });\n    }\n}`,
  neoforge: `@EventBusSubscriber(modid = "mymod")\npublic class ModEvents {\n    @SubscribeEvent\n    public static void onBlockBreak(BlockEvent.BreakEvent e) {\n        Player p = e.getPlayer();\n        if (p != null) p.sendSystemMessage(Component.literal("Break!"));\n    }\n}`,
  quilt: `public class ModEvents implements ModInitializer {\n    @Override\n    public void onInitialize() {\n        PlayerBlockBreakEvents.BEFORE.register((world, player, pos, state, be) -> {\n            player.sendMessage(Text.literal("Break!")); return true;\n        });\n    }\n}`,
  bedrock: `import { world } from "@minecraft/server";\nworld.beforeEvents.playerBreakBlock.subscribe((e) => {\n    e.player.sendMessage("Break!");\n});`,
};

export const MultiLoaderManager: FC = () => {
  const [selected, setSelected] = useState<LoaderType>('forge');
  const [targets, setTargets] = useState<Set<LoaderType>>(new Set(['forge']));

  const toggle = (id: LoaderType) => setTargets(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const active = loaders.find(l => l.id === selected)!;

  return (
    <div className="flex h-full w-full bg-slate-900">
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2"><Globe size={14} className="text-blue-400"/><span className="text-xs font-bold text-slate-200">Mod Loaders</span></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loaders.map(l => (
            <div key={l.id} onClick={() => setSelected(l.id)} className={`rounded-lg border p-2.5 cursor-pointer ${selected===l.id?'border-blue-500/50 bg-blue-950/20':'border-slate-700 hover:border-slate-600'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{l.icon}</span>
                <div className="flex-1"><div className="text-[11px] font-bold text-slate-200">{l.name} <span className="text-[8px] font-mono px-1 py-0.5 rounded ml-1" style={{backgroundColor:l.color+'20',color:l.color}}>{l.version}</span></div><div className="text-[9px] text-slate-500">{l.apiStyle}</div></div>
                <button onClick={e=>{e.stopPropagation();toggle(l.id);}} className={`w-5 h-5 rounded flex items-center justify-center border ${targets.has(l.id)?'bg-blue-600 border-blue-500':'border-slate-600'}`}>{targets.has(l.id)&&<Check size={10} className="text-white"/>}</button>
              </div>
              {l.status==='active'&&<div className="flex items-center gap-1 mt-1.5 text-[8px] text-green-400"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/>Active</div>}
              {l.status==='incompatible'&&<div className="flex items-center gap-1 mt-1.5 text-[8px] text-yellow-400"><AlertTriangle size={9}/>Limited support</div>}
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-slate-700">
          <button className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-[10px] text-white font-bold flex items-center justify-center gap-1.5"><Package size={11}/>Build {targets.size} target{targets.size!==1?'s':''}</button>
          <div className="flex flex-wrap gap-1 mt-2">{Array.from(targets).map(id=>{const l=loaders.find(x=>x.id===id);return l&&<span key={id} className="text-[8px] px-1.5 py-0.5 rounded" style={{backgroundColor:l.color+'20',color:l.color}}>{l.icon}{l.name}</span>;})}</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <span className="text-lg">{active.icon}</span><span className="text-sm font-bold text-slate-100">{active.name}</span><span className="text-[9px] text-slate-500">v{active.version}</span>
          <div className="flex-1"/>
          {active.status==='active'&&<span className="text-[9px] bg-green-900/50 text-green-300 px-2 py-0.5 rounded flex items-center gap-1"><Check size={9}/>Active</span>}
          {active.status==='available'&&<button className="text-[9px] bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1"><Download size={9}/>Enable</button>}
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/30">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 mb-3"><Layers size={13}/>Cross-Loader Status</h3>
            <div className="grid grid-cols-3 gap-3">
              {[{l:'Events',v:8,s:'All compatible'},{l:'Blocks',v:5,s:'All portable'},{l:'Entities',v:2,s:'1 needs conversion'}].map(x=>(
                <div key={x.l} className="p-2 rounded bg-slate-800 border border-slate-700"><div className="text-[10px] text-slate-400 font-bold">{x.l}</div><div className="text-lg font-bold text-white">{x.v}</div><div className="text-[9px] text-green-400">{x.s}</div></div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/30">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 mb-2"><Shield size={13}/>Features</h3>
            <div className="flex flex-wrap gap-2">{active.features.map(f=><span key={f} className="text-[9px] px-2 py-1 rounded bg-slate-700 text-slate-300 flex items-center gap-1"><Zap size={8}/>{f}</span>)}</div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 mb-2"><Cpu size={13}/>Generated Code</h3>
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between"><span className="text-[9px] text-slate-400 font-mono">ModEvents.java</span><span className="text-[8px] px-1.5 py-0.5 rounded" style={{backgroundColor:active.color+'20',color:active.color}}>{active.name}</span></div>
              <pre className="px-3 py-2 bg-slate-900 text-[9px] font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre">{codeExamples[selected]}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
