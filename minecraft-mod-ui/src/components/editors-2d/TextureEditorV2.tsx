/**
 * Texture Editor v2 — Layer-based painting with blend modes
 */
import { useState, useCallback, useRef, type FC } from 'react';
import { Layers, Plus, Trash2, Eye, EyeOff, Lock, Unlock, Copy, MoveUp, MoveDown, FlipHorizontal, FlipVertical, Grid3x3, Save, Download, Film, RotateCcw } from 'lucide-react';

type BlendMode = 'normal'|'multiply'|'screen'|'overlay'|'add';
interface Layer { id:string; name:string; visible:boolean; locked:boolean; opacity:number; blendMode:BlendMode; }

const initialLayers: Layer[] = [
  { id:'bg',name:'Background',visible:true,locked:false,opacity:1,blendMode:'normal' },
  { id:'outline',name:'Outline',visible:true,locked:false,opacity:1,blendMode:'normal' },
  { id:'color',name:'Color Fill',visible:true,locked:false,opacity:1,blendMode:'normal' },
  { id:'highlight',name:'Highlights',visible:true,locked:false,opacity:0.7,blendMode:'screen' },
  { id:'shadow',name:'Shadows',visible:true,locked:false,opacity:0.5,blendMode:'multiply' },
];

export const TextureEditorV2: FC = () => {
  const [layers,setLayers] = useState<Layer[]>(initialLayers);
  const [activeId,setActiveId] = useState('color');
  const [showTiling,setShowTiling] = useState(false);
  const [spriteMode,setSpriteMode] = useState(false);
  const idC = useRef(10);

  const addLayer = ()=>{ const id=`l${++idC.current}`; setLayers([{id,name:`Layer ${idC.current}`,visible:true,locked:false,opacity:1,blendMode:'normal'},...layers]); setActiveId(id); };
  const deleteLayer = (id:string)=>{ if(layers.length<=1) return; setLayers(layers.filter(l=>l.id!==id)); if(activeId===id) setActiveId(layers[0]?.id||''); };
  const updateLayer = (id:string,u:Partial<Layer>)=>setLayers(layers.map(l=>l.id===id?{...l,...u}:l));
  const moveLayer = (id:string,dir:'up'|'down')=>{ const i=layers.findIndex(l=>l.id===id); const ni=dir==='up'?i-1:i+1; if(ni<0||ni>=layers.length) return; const a=[...layers]; [a[i],a[ni]]=[a[ni],a[i]]; setLayers(a); };

  const active = layers.find(l=>l.id===activeId);

  return (
    <div className="flex h-full w-full bg-slate-900">
      <div className="w-60 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2"><Layers size={14} className="text-slate-400"/><span className="text-xs font-bold text-slate-200">Layers</span></div>
          <button onClick={addLayer} className="p-1 hover:bg-slate-600 rounded text-slate-400"><Plus size={12}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {layers.map(l=>(
            <div key={l.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer group ${l.id===activeId?'bg-blue-600/20 border border-blue-500/40':'hover:bg-slate-700 border border-transparent'}`} onClick={()=>setActiveId(l.id)}>
              <button onClick={e=>{e.stopPropagation();updateLayer(l.id,{visible:!l.visible});}} className="p-0.5">{l.visible?<Eye size={10} className="text-slate-400"/>:<EyeOff size={10} className="text-slate-600"/>}</button>
              <button onClick={e=>{e.stopPropagation();updateLayer(l.id,{locked:!l.locked});}} className="p-0.5">{l.locked?<Lock size={9} className="text-red-400"/>:<Unlock size={9} className="text-slate-500 opacity-0 group-hover:opacity-100"/>}</button>
              <div className="w-5 h-5 rounded border border-slate-600 bg-slate-700 flex-shrink-0"/>
              <div className="flex-1 min-w-0"><div className="text-[10px] text-slate-200 truncate">{l.name}</div><div className="text-[8px] text-slate-500">{l.blendMode} · {Math.round(l.opacity*100)}%</div></div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                <button onClick={e=>{e.stopPropagation();moveLayer(l.id,'up');}} className="p-0.5 hover:bg-slate-600 rounded"><MoveUp size={9} className="text-slate-400"/></button>
                <button onClick={e=>{e.stopPropagation();moveLayer(l.id,'down');}} className="p-0.5 hover:bg-slate-600 rounded"><MoveDown size={9} className="text-slate-400"/></button>
                <button onClick={e=>{e.stopPropagation();deleteLayer(l.id);}} className="p-0.5 hover:bg-red-900/50 rounded"><Trash2 size={9} className="text-red-400"/></button>
              </div>
            </div>
          ))}
        </div>
        {active&&(
          <div className="p-3 border-t border-slate-700 space-y-2">
            <div><label className="text-[9px] text-slate-500">Name</label><input type="text" value={active.name} onChange={e=>updateLayer(active.id,{name:e.target.value})} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[9px] text-slate-500">Blend</label><select value={active.blendMode} onChange={e=>updateLayer(active.id,{blendMode:e.target.value as BlendMode})} className="w-full px-1 py-1 bg-slate-700 border border-slate-600 rounded text-[9px] text-white mt-0.5">{(['normal','multiply','screen','overlay','add'] as BlendMode[]).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
              <div><div className="flex justify-between"><label className="text-[9px] text-slate-500">Opacity</label><span className="text-[8px] text-slate-400">{Math.round(active.opacity*100)}%</span></div><input type="range" min={0} max={1} step={0.01} value={active.opacity} onChange={e=>updateLayer(active.id,{opacity:parseFloat(e.target.value)})} className="w-full h-1 mt-1.5 accent-blue-500"/></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><FlipHorizontal size={14}/></button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><FlipVertical size={14}/></button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><RotateCcw size={14}/></button>
          <div className="h-5 w-px bg-slate-600"/>
          <button onClick={()=>setShowTiling(!showTiling)} className={`p-1.5 rounded ${showTiling?'bg-blue-600 text-white':'text-slate-400 hover:bg-slate-700'}`}><Grid3x3 size={14}/></button>
          <button onClick={()=>setSpriteMode(!spriteMode)} className={`p-1.5 rounded ${spriteMode?'bg-purple-600 text-white':'text-slate-400 hover:bg-slate-700'}`}><Film size={14}/></button>
          <div className="flex-1"/><span className="text-[10px] text-slate-500">16×16</span>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Save size={14}/></button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Download size={14}/></button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-950 p-8">
          {showTiling?(
            <div className="grid grid-cols-3 gap-px">{Array.from({length:9}).map((_,i)=>(<div key={i} className={`w-24 h-24 border ${i===4?'border-blue-500 bg-slate-600':'border-slate-600 bg-slate-700'} flex items-center justify-center text-[8px] text-slate-500`}>{i===4?'MAIN':'Tile'}</div>))}</div>
          ):(
            <div className="relative border border-slate-700 shadow-2xl" style={{width:320,height:320,background:'repeating-conic-gradient(#1a1a1a 0% 25%,#222 0% 50%) 0 0/20px 20px',imageRendering:'pixelated'}}>
              <div className="absolute bottom-2 right-2 text-[9px] text-slate-500 bg-slate-900/80 px-1.5 py-0.5 rounded">Active: {active?.name||'—'}</div>
            </div>
          )}
        </div>
        {spriteMode&&(
          <div className="h-16 border-t border-slate-700 bg-slate-800 flex items-center px-4 gap-2 overflow-x-auto">
            {[1,2,3,4].map(i=>(<div key={i} className={`flex-shrink-0 w-12 h-12 rounded border-2 ${i===1?'border-blue-500':'border-slate-600'} flex items-center justify-center text-[8px] text-slate-400`}>F{i}</div>))}
            <button className="flex-shrink-0 w-12 h-12 rounded border-2 border-dashed border-slate-600 text-slate-500 flex items-center justify-center"><Plus size={14}/></button>
          </div>
        )}
      </div>
    </div>
  );
};
