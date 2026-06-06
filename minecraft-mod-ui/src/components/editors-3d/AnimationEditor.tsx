/**
 * Keyframe Animation Editor — Blockbench-inspired
 * Multi-track timeline with position/rotation/scale keyframes,
 * easing curves, playback controls
 */
import { useState, useEffect, useRef, type FC } from 'react';
import { Play, Pause, SkipBack, SkipForward, Plus, Trash2, Save, Download, Film, Diamond, Rewind, FastForward } from 'lucide-react';

type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'step';
interface Keyframe { id: string; time: number; value: [number, number, number]; easing: EasingType; }
interface AnimTrack { id: string; boneName: string; channel: string; keyframes: Keyframe[]; visible: boolean; color: string; }
interface Animation { name: string; duration: number; loop: boolean; tracks: AnimTrack[]; }

const mockAnim: Animation = { name: 'Idle Animation', duration: 40, loop: true, tracks: [
  { id: 't1', boneName: 'Head', channel: 'rotation', visible: true, color: '#f59e0b', keyframes: [{ id:'k1',time:0,value:[0,0,0],easing:'easeInOut' },{ id:'k2',time:10,value:[5,0,0],easing:'easeInOut' },{ id:'k3',time:20,value:[0,0,0],easing:'easeInOut' },{ id:'k4',time:30,value:[-5,0,0],easing:'easeInOut' },{ id:'k5',time:40,value:[0,0,0],easing:'easeInOut' }] },
  { id: 't2', boneName: 'Body', channel: 'position', visible: true, color: '#6366f1', keyframes: [{ id:'k6',time:0,value:[0,0,0],easing:'easeInOut' },{ id:'k7',time:20,value:[0,0.05,0],easing:'easeInOut' },{ id:'k8',time:40,value:[0,0,0],easing:'easeInOut' }] },
  { id: 't3', boneName: 'Left Arm', channel: 'rotation', visible: true, color: '#10b981', keyframes: [{ id:'k9',time:0,value:[0,0,5],easing:'linear' },{ id:'k10',time:20,value:[0,0,-5],easing:'linear' },{ id:'k11',time:40,value:[0,0,5],easing:'linear' }] },
  { id: 't4', boneName: 'Right Arm', channel: 'rotation', visible: true, color: '#ef4444', keyframes: [{ id:'k12',time:0,value:[0,0,-5],easing:'linear' },{ id:'k13',time:20,value:[0,0,5],easing:'linear' },{ id:'k14',time:40,value:[0,0,-5],easing:'linear' }] },
]};

export const AnimationEditor: FC = () => {
  const [anim, setAnim] = useState<Animation>(mockAnim);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selTrack, setSelTrack] = useState<string|null>('t1');
  const [selKf, setSelKf] = useState<string|null>(null);
  const [zoom, setZoom] = useState(1);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const tw = 12 * zoom;

  useEffect(() => {
    if (playing) { ref.current = setInterval(() => setTime(t => anim.loop ? (t+1)%anim.duration : Math.min(t+1,anim.duration)), 50); }
    else if (ref.current) clearInterval(ref.current);
    return () => { if(ref.current) clearInterval(ref.current); };
  }, [playing, anim.duration, anim.loop]);

  const track = anim.tracks.find(t=>t.id===selTrack);
  const kf = track?.keyframes.find(k=>k.id===selKf);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <Film size={16} className="text-purple-400" />
        <span className="text-sm font-bold text-slate-100">{anim.name}</span>
        <span className="text-[10px] text-slate-500">{anim.duration}t ({(anim.duration/20).toFixed(1)}s)</span>
        <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={anim.loop} onChange={e=>setAnim({...anim,loop:e.target.checked})} className="w-3 h-3"/>Loop</label>
        <div className="flex-1"/>
        <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Save size={14}/></button>
        <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Download size={14}/></button>
      </div>
      <div className="px-4 py-2 border-b border-slate-700 flex items-center gap-2">
        <button onClick={()=>setTime(0)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><SkipBack size={14}/></button>
        <button onClick={()=>setTime(Math.max(0,time-1))} className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Rewind size={14}/></button>
        <button onClick={()=>setPlaying(!playing)} className={`p-2 rounded-lg ${playing?'bg-red-600':'bg-green-600'} text-white`}>{playing?<Pause size={14}/>:<Play size={14}/>}</button>
        <button onClick={()=>setTime(Math.min(anim.duration,time+1))} className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><FastForward size={14}/></button>
        <button onClick={()=>setTime(anim.duration)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><SkipForward size={14}/></button>
        <div className="h-5 w-px bg-slate-700"/>
        <span className="text-xs font-mono text-slate-300">Frame: {time}/{anim.duration}</span>
        <div className="flex-1"/>
        <span className="text-[9px] text-slate-500">Zoom:</span>
        <input type="range" min={0.5} max={3} step={0.1} value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} className="w-20 h-1 accent-blue-500"/>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-44 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="h-6 border-b border-slate-700 px-2 flex items-center text-[9px] text-slate-500 uppercase font-bold">Tracks</div>
          {anim.tracks.map(t=>(
            <div key={t.id} className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-700/50 cursor-pointer ${t.id===selTrack?'bg-blue-900/20':''}`} onClick={()=>setSelTrack(t.id)}>
              <div className="w-2 h-2 rounded-full" style={{backgroundColor:t.color}}/>
              <span className="text-[10px] text-slate-300 flex-1 truncate">{t.boneName}</span>
              <span className="text-[8px] text-slate-500">{t.channel.slice(0,3)}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="h-6 border-b border-slate-700 relative" style={{minWidth:anim.duration*tw}}>
            {Array.from({length:anim.duration+1}).map((_,i)=>(
              <div key={i} className="absolute bottom-0" style={{left:i*tw}} onClick={()=>setTime(i)}>
                {i%5===0&&<span className="text-[7px] text-slate-500 absolute -top-0.5 -translate-x-1/2">{i}</span>}
                <div className={`w-px ${i%5===0?'h-2.5 bg-slate-500':'h-1.5 bg-slate-600'}`}/>
              </div>
            ))}
            <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10" style={{left:time*tw}}/>
          </div>
          {anim.tracks.map(t=>(
            <div key={t.id} className={`relative h-8 border-b border-slate-700/50 ${t.id===selTrack?'bg-slate-800/50':''}`} style={{minWidth:anim.duration*tw}}>
              {t.keyframes.map(k=>(
                <div key={k.id} className={`absolute top-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-transform ${k.id===selKf?'scale-150':''}`} style={{left:k.time*tw-5}} onClick={()=>{setSelKf(k.id);setSelTrack(t.id);}}>
                  <Diamond size={10} style={{color:k.id===selKf?'#fff':t.color}} fill={k.id===selKf?'#3b82f6':t.color}/>
                </div>
              ))}
              {t.keyframes.slice(0,-1).map((k,i)=>{const n=t.keyframes[i+1];return <div key={`l${k.id}`} className="absolute top-1/2 h-px opacity-40" style={{left:k.time*tw,width:(n.time-k.time)*tw,backgroundColor:t.color}}/>;}) }
              <div className="absolute top-0 bottom-0 w-px bg-blue-500/50" style={{left:time*tw}}/>
            </div>
          ))}
        </div>
        <div className="w-52 bg-slate-800 border-l border-slate-700 overflow-y-auto p-3 space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Keyframe</span>
          {kf?(
            <div className="space-y-2">
              <div><label className="text-[9px] text-slate-500">Time</label><input type="number" value={kf.time} readOnly className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white mt-0.5"/></div>
              <div><label className="text-[9px] text-slate-500">Value (X,Y,Z)</label>
                <div className="grid grid-cols-3 gap-1 mt-0.5">{kf.value.map((v,i)=>(<input key={i} type="number" step="0.1" value={v} readOnly className="w-full px-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"/>))}</div>
              </div>
              <div><label className="text-[9px] text-slate-500">Easing</label>
                <select value={kf.easing} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white mt-0.5">
                  {['linear','easeIn','easeOut','easeInOut','step'].map(e=>(<option key={e} value={e}>{e}</option>))}
                </select>
              </div>
              <button className="w-full px-2 py-1.5 bg-red-900/30 border border-red-700/50 rounded text-[10px] text-red-300 flex items-center justify-center gap-1"><Trash2 size={10}/>Delete</button>
            </div>
          ):(<div className="text-[10px] text-slate-500 text-center mt-4"><Diamond size={20} className="mx-auto mb-2 text-slate-600"/><p>Click a keyframe to edit</p></div>)}
          {track&&<button className="w-full mt-3 px-2 py-1.5 bg-blue-900/30 border border-blue-700/50 rounded text-[10px] text-blue-300 flex items-center gap-1 justify-center"><Plus size={10}/>Add at {time}</button>}
        </div>
      </div>
    </div>
  );
};
