/**
 * World Generation Editor — Ore distribution with canvas preview
 */
import { useState, useRef, useEffect, type FC } from 'react';
import { Mountain, Plus } from 'lucide-react';

interface OreConfig { id:string; name:string; veinSize:number; perChunk:number; minY:number; maxY:number; color:string; }
const mockOres:OreConfig[] = [
  { id:'o1',name:'Ruby Ore',veinSize:6,perChunk:8,minY:-64,maxY:16,color:'#ef4444' },
  { id:'o2',name:'Sapphire Ore',veinSize:4,perChunk:5,minY:0,maxY:48,color:'#3b82f6' },
  { id:'o3',name:'Topaz Ore',veinSize:8,perChunk:12,minY:32,maxY:96,color:'#f59e0b' },
];

export const WorldGenEditor: FC = () => {
  const [ores] = useState(mockOres);
  const [selOre,setSelOre] = useState('o1');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = ores.find(o=>o.id===selOre);

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;
    c.width=300;c.height=320;ctx.fillStyle='#1e293b';ctx.fillRect(0,0,300,320);
    ores.forEach(ore=>{
      const top=((320-ore.maxY-64)/384)*320;const bottom=((320-ore.minY-64)/384)*320;
      ctx.fillStyle=ore.color+'30';ctx.fillRect(35,top,260,bottom-top);
      ctx.strokeStyle=ore.color;ctx.lineWidth=1.5;ctx.strokeRect(35,top,260,bottom-top);
      ctx.fillStyle=ore.color;ctx.font='9px sans-serif';ctx.fillText(`${ore.name}`,40,top+12);
      for(let i=0;i<ore.perChunk*2;i++){const x=40+Math.random()*250;const y=top+Math.random()*(bottom-top);ctx.beginPath();ctx.arc(x,y,Math.random()*2+1,0,Math.PI*2);ctx.fill();}
    });
  },[ores]);

  return (
    <div className="flex h-full w-full bg-slate-900">
      <div className="w-48 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2"><Mountain size={14} className="text-emerald-400"/><span className="text-xs font-bold text-slate-200">World Gen</span></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {ores.map(o=>(<button key={o.id} onClick={()=>setSelOre(o.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${selOre===o.id?'bg-slate-700':'hover:bg-slate-700/50'}`}><div className="w-3 h-3 rounded-sm" style={{backgroundColor:o.color}}/><span className="text-[10px] text-slate-300 truncate">{o.name}</span></button>))}
          <button className="w-full py-1.5 border border-dashed border-slate-600 rounded text-[9px] text-slate-500 flex items-center justify-center gap-1"><Plus size={9}/>Add</button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-slate-950"><canvas ref={canvasRef} className="border border-slate-700 rounded-lg"/></div>
      {active&&<div className="w-52 bg-slate-800 border-l border-slate-700 p-3 space-y-2">
        <span className="text-xs font-bold text-slate-200">Properties</span>
        <div><label className="text-[9px] text-slate-500">Name</label><input value={active.name} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"/></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-[9px] text-slate-500">Vein</label><input type="number" value={active.veinSize} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"/></div><div><label className="text-[9px] text-slate-500">Per Chunk</label><input type="number" value={active.perChunk} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"/></div></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-[9px] text-slate-500">Min Y</label><input type="number" value={active.minY} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"/></div><div><label className="text-[9px] text-slate-500">Max Y</label><input type="number" value={active.maxY} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"/></div></div>
      </div>}
    </div>
  );
};
