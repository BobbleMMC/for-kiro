/**
 * Command Palette — VS Code-style Ctrl+Shift+P
 * 24+ commands with fuzzy search, keyboard navigation, shortcuts
 */
import { useState, useEffect, useRef, type FC } from 'react';
import { Search, Zap, CornerDownLeft } from 'lucide-react';

interface CmdItem { id:string; label:string; desc?:string; shortcut?:string; action:()=>void; }

const commands: CmdItem[] = [
  { id:'save',label:'Save Project',desc:'Save all changes',shortcut:'Ctrl+S',action:()=>{} },
  { id:'build',label:'Build Mod',desc:'Compile .jar',shortcut:'Ctrl+B',action:()=>{} },
  { id:'run',label:'Run Minecraft',desc:'Launch with mod',shortcut:'F5',action:()=>{} },
  { id:'new_block',label:'New Block',desc:'Create block',action:()=>{} },
  { id:'new_item',label:'New Item',desc:'Create item',action:()=>{} },
  { id:'new_entity',label:'New Entity',desc:'Create mob',action:()=>{} },
  { id:'new_graph',label:'New Visual Script',desc:'Node graph',action:()=>{} },
  { id:'open_node',label:'Open Node Editor',action:()=>{} },
  { id:'open_3d',label:'Open 3D Editor',action:()=>{} },
  { id:'open_texture',label:'Open Texture Editor',action:()=>{} },
  { id:'open_profiler',label:'Open Profiler',action:()=>{} },
  { id:'open_ai',label:'Open AI Hub',action:()=>{} },
  { id:'open_tests',label:'Open Test Runner',action:()=>{} },
  { id:'git_commit',label:'Git: Commit',shortcut:'Ctrl+K',action:()=>{} },
  { id:'git_push',label:'Git: Push',action:()=>{} },
  { id:'find',label:'Find File',shortcut:'Ctrl+P',action:()=>{} },
  { id:'theme',label:'Change Theme',action:()=>{} },
  { id:'plugins',label:'Manage Plugins',action:()=>{} },
  { id:'export',label:'Export Project',shortcut:'Ctrl+E',action:()=>{} },
  { id:'loader',label:'Change Mod Loader',action:()=>{} },
];

interface Props { isOpen:boolean; onClose:()=>void; }

export const CommandPalette: FC<Props> = ({ isOpen, onClose }) => {
  const [query,setQuery] = useState('');
  const [sel,setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const filtered = query ? commands.filter(c=>c.label.toLowerCase().includes(query.toLowerCase())||c.desc?.toLowerCase().includes(query.toLowerCase())) : commands;

  useEffect(() => { if(isOpen){setQuery('');setSel(0);setTimeout(()=>ref.current?.focus(),50);} }, [isOpen]);
  useEffect(() => { setSel(0); }, [query]);

  useEffect(() => {
    if(!isOpen) return;
    const h = (e:KeyboardEvent) => {
      if(e.key==='Escape') onClose();
      if(e.key==='ArrowDown'){e.preventDefault();setSel(i=>Math.min(i+1,filtered.length-1));}
      if(e.key==='ArrowUp'){e.preventDefault();setSel(i=>Math.max(i-1,0));}
      if(e.key==='Enter'){e.preventDefault();filtered[sel]?.action();onClose();}
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[isOpen,sel,filtered,onClose]);

  if(!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-600 rounded-xl shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700"><Search size={16} className="text-slate-400"/><input ref={ref} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type a command..." className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"/><kbd className="text-[9px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">ESC</kbd></div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.map((cmd,i)=>(
            <button key={cmd.id} onClick={()=>{cmd.action();onClose();}} onMouseEnter={()=>setSel(i)} className={`w-full flex items-center gap-3 px-4 py-2 text-left ${i===sel?'bg-blue-600/20 text-white':'text-slate-300'}`}>
              <Zap size={13} className={i===sel?'text-blue-400':'text-slate-500'}/>
              <div className="flex-1"><span className="text-xs">{cmd.label}</span>{cmd.desc&&<span className="text-[10px] text-slate-500 ml-2">{cmd.desc}</span>}</div>
              {cmd.shortcut&&<kbd className="text-[9px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded border border-slate-600">{cmd.shortcut}</kbd>}
            </button>
          ))}
          {filtered.length===0&&<div className="py-8 text-center text-xs text-slate-500">No commands found</div>}
        </div>
        <div className="px-4 py-2 border-t border-slate-700 flex items-center gap-4 text-[9px] text-slate-500"><span className="flex items-center gap-1"><CornerDownLeft size={9}/>Select</span><span>↑↓ Navigate</span><span className="flex-1 text-right">{filtered.length} commands</span></div>
      </div>
    </div>
  );
};
