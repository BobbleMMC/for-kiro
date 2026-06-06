/**
 * Notification Center — Build alerts, AI suggestions, updates
 */
import { useState, type FC } from 'react';
import { Bell, Check, X, AlertTriangle, Info, Bot, Clock, CheckCheck } from 'lucide-react';

type NType = 'success'|'error'|'warning'|'info'|'ai';
interface Notif { id:string; type:NType; title:string; msg:string; time:string; read:boolean; action?:string; }

const mock: Notif[] = [
  { id:'n1',type:'success',title:'Build Complete',msg:'Compiled in 4.2s → mymod-1.0.0.jar',time:'2m ago',read:false },
  { id:'n2',type:'ai',title:'AI Suggestion',msg:'onEntityTick runs every tick — add cooldown for +30% TPS',time:'5m ago',read:false,action:'Apply' },
  { id:'n3',type:'warning',title:'Deprecated API',msg:'BlockEvent.BreakEvent deprecated in NeoForge 20.4+',time:'12m ago',read:false },
  { id:'n4',type:'info',title:'Plugin Update',msg:'Ore Gen Pro v2.2.0 available',time:'1h ago',read:true,action:'Update' },
  { id:'n5',type:'error',title:'Build Failed',msg:'Cannot find symbol "CustomBlock" at line 42',time:'2h ago',read:true },
];

const cfg:Record<NType,{icon:typeof Check;color:string;bg:string}> = {
  success:{icon:Check,color:'text-green-400',bg:'bg-green-900/20'},error:{icon:AlertTriangle,color:'text-red-400',bg:'bg-red-900/20'},
  warning:{icon:AlertTriangle,color:'text-yellow-400',bg:'bg-yellow-900/20'},info:{icon:Info,color:'text-blue-400',bg:'bg-blue-900/20'},
  ai:{icon:Bot,color:'text-purple-400',bg:'bg-purple-900/20'},
};

export const NotificationBell: FC<{count?:number;onClick:()=>void}> = ({count=0,onClick}) => (
  <button onClick={onClick} className="relative p-2 hover:bg-slate-700 rounded-lg"><Bell size={16} className="text-slate-400"/>{count>0&&<span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{count}</span>}</button>
);

interface Props { isOpen:boolean; onClose:()=>void; }

export const NotificationCenter: FC<Props> = ({ isOpen, onClose }) => {
  const [notifs,setNotifs] = useState<Notif[]>(mock);
  const unread = notifs.filter(n=>!n.read).length;
  const markAll = () => setNotifs(p=>p.map(n=>({...n,read:true})));
  const dismiss = (id:string) => setNotifs(p=>p.filter(n=>n.id!==id));

  if(!isOpen) return null;

  return (
    <div className="fixed top-12 right-4 z-[90] w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2"><Bell size={13} className="text-slate-400"/><span className="text-xs font-bold text-slate-200">Notifications</span>{unread>0&&<span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">{unread}</span>}</div>
        <div className="flex gap-1"><button onClick={markAll} className="p-1 hover:bg-slate-700 rounded text-slate-400"><CheckCheck size={12}/></button><button onClick={onClose} className="p-1 hover:bg-slate-700 rounded text-slate-400"><X size={12}/></button></div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {notifs.map(n=>{const c=cfg[n.type];const I=c.icon;return(
          <div key={n.id} className={`px-4 py-2.5 border-b border-slate-700/50 ${!n.read?'bg-slate-750':''}`}>
            <div className="flex items-start gap-2.5">
              <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${c.bg}`}><I size={12} className={c.color}/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-slate-200">{n.title}</span>{!n.read&&<div className="w-1.5 h-1.5 rounded-full bg-blue-500"/>}</div>
                <p className="text-[9px] text-slate-400 mt-0.5">{n.msg}</p>
                <div className="flex items-center gap-2 mt-1"><span className="text-[8px] text-slate-500 flex items-center gap-0.5"><Clock size={7}/>{n.time}</span>{n.action&&<button className="text-[8px] px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded">{n.action}</button>}</div>
              </div>
              <button onClick={()=>dismiss(n.id)} className="p-0.5 hover:bg-slate-600 rounded text-slate-500"><X size={10}/></button>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
};
