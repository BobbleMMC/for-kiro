/**
 * GUI Builder Pro — Container GUIs with drag-and-drop widgets
 */
import { useState, useRef, type FC, type MouseEvent } from 'react';
import { LayoutDashboard, Plus, Trash2, Save, Grid3x3, Download } from 'lucide-react';

type WidgetType = 'slot'|'progressBar'|'energyBar'|'button'|'label';
interface Widget { id:string; type:WidgetType; x:number; y:number; w:number; h:number; label:string; }
const CANVAS_W=176;const CANVAS_H=166;const SCALE=2.5;
const templates:{type:WidgetType;name:string;w:number;h:number}[] = [{type:'slot',name:'Slot',w:18,h:18},{type:'progressBar',name:'Progress',w:24,h:17},{type:'energyBar',name:'Energy',w:14,h:42},{type:'button',name:'Button',w:40,h:16},{type:'label',name:'Label',w:50,h:10}];

const initial:Widget[] = [
  {id:'w1',type:'slot',x:56,y:17,w:18,h:18,label:'Input'},
  {id:'w2',type:'slot',x:56,y:53,w:18,h:18,label:'Fuel'},
  {id:'w3',type:'progressBar',x:80,y:35,w:24,h:17,label:'Progress'},
  {id:'w4',type:'slot',x:116,y:35,w:18,h:18,label:'Output'},
  {id:'w5',type:'energyBar',x:8,y:8,w:14,h:42,label:'Energy'},
];

export const GUIBuilderPro: FC = () => {
  const [widgets,setWidgets] = useState<Widget[]>(initial);
  const [selId,setSelId] = useState<string|null>('w3');
  const [dragId,setDragId] = useState<string|null>(null);
  const [dragOff,setDragOff] = useState({x:0,y:0});
  const ref = useRef<HTMLDivElement>(null);
  const sel = widgets.find(w=>w.id===selId);

  const add = (t:typeof templates[0]) => {const id=`w${Date.now()}`;setWidgets(p=>[...p,{id,type:t.type,x:80,y:80,w:t.w,h:t.h,label:t.name}]);setSelId(id);};
  const onDown = (e:MouseEvent,id:string) => {e.stopPropagation();const r=ref.current?.getBoundingClientRect();if(!r)return;const w=widgets.find(x=>x.id===id);if(!w)return;setDragId(id);setSelId(id);setDragOff({x:e.clientX-r.left-w.x*SCALE,y:e.clientY-r.top-w.y*SCALE});};
  const onMove = (e:MouseEvent) => {if(!dragId)return;const r=ref.current?.getBoundingClientRect();if(!r)return;let x=Math.round(((e.clientX-r.left-dragOff.x)/SCALE)/2)*2;let y=Math.round(((e.clientY-r.top-dragOff.y)/SCALE)/2)*2;x=Math.max(0,Math.min(CANVAS_W-18,x));y=Math.max(0,Math.min(CANVAS_H-18,y));setWidgets(p=>p.map(w=>w.id===dragId?{...w,x,y}:w));};
  const onUp = () => setDragId(null);
  const color = (t:WidgetType) => ({slot:'#64748b',progressBar:'#22c55e',energyBar:'#ef4444',button:'#6366f1',label:'#f59e0b'}[t]);

  return (
    <div className="flex h-full w-full bg-slate-900">
      <div className="w-40 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2"><LayoutDashboard size={14} className="text-indigo-400"/><span className="text-xs font-bold text-slate-200">Widgets</span></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">{templates.map(t=>(<button key={t.type} onClick={()=>add(t)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-slate-700 hover:border-slate-500 text-[9px] text-slate-300"><div className="w-3 h-3 rounded-sm" style={{backgroundColor:color(t.type)}}/>{t.name}</button>))}</div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-slate-950" onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
        <div ref={ref} className="relative border-2 border-slate-600 bg-[#c6c6c6]" style={{width:CANVAS_W*SCALE,height:CANVAS_H*SCALE}} onClick={()=>setSelId(null)}>
          {widgets.map(w=>(<div key={w.id} className={`absolute cursor-move ${selId===w.id?'ring-2 ring-blue-400':''}`} style={{left:w.x*SCALE,top:w.y*SCALE,width:w.w*SCALE,height:w.h*SCALE}} onMouseDown={e=>onDown(e,w.id)}>
            {w.type==='slot'&&<div className="w-full h-full border-2 border-[#8b8b8b] bg-[#8b8b8b]/40"/>}
            {w.type==='progressBar'&&<div className="w-full h-full bg-[#4a4a4a] overflow-hidden"><div className="h-full bg-green-500" style={{width:'60%'}}/></div>}
            {w.type==='energyBar'&&<div className="w-full h-full bg-[#4a4a4a] flex flex-col justify-end"><div className="bg-red-500" style={{height:'75%'}}/></div>}
            {w.type==='button'&&<div className="w-full h-full bg-[#a0a0a0] border-2 border-t-white border-l-white border-r-[#555] border-b-[#555] flex items-center justify-center" style={{fontSize:4*SCALE}}>BTN</div>}
            {w.type==='label'&&<div className="w-full h-full flex items-center text-[#404040]" style={{fontSize:4*SCALE}}>Label</div>}
          </div>))}
        </div>
      </div>
      <div className="w-48 bg-slate-800 border-l border-slate-700 p-3 space-y-2">
        <span className="text-xs font-bold text-slate-200">Properties</span>
        {sel?(<><div><label className="text-[9px] text-slate-500">Type</label><div className="text-[10px] text-slate-300 capitalize mt-0.5">{sel.type}</div></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[9px] text-slate-500">X</label><input type="number" value={Math.round(sel.x)} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"/></div><div><label className="text-[9px] text-slate-500">Y</label><input type="number" value={Math.round(sel.y)} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"/></div></div></>):(<div className="text-[10px] text-slate-500 text-center mt-4">Select widget</div>)}
      </div>
    </div>
  );
};
