/* ===================================================================
   MOD STUDIO — Creator Suite  ·  app logic
   - SPA navigation
   - Functional pixel texture editor (tools, palette, layers, undo, export)
   - Block editor with live 3D preview + generated code
   =================================================================== */
'use strict';

/* ---------- DASHBOARD DATA ---------- */
const EDITORS = [
  { id:'block',   icon:'🧊', name:'Block',       desc:'Full blocks, stairs, slabs, ores & more', cat:'world',  accent:'#5fbf4f', ibg:'#1b2a1c' },
  { id:'item',    icon:'⚔',  name:'Item',        desc:'Tools, weapons, food, materials',         cat:'item',   accent:'#e0a93b', ibg:'#2a2316' },
  { id:'entity',  icon:'🐺', name:'Entity',      desc:'Mobs, bosses, animals & AI goals',        cat:'entity', accent:'#9b6cff', ibg:'#241b33' },
  { id:'texture', icon:'🖌',  name:'Texture',     desc:'Pixel-perfect Blockbench-style painter',  cat:'fx',     accent:'#46c7d8', ibg:'#13262a' },
  { id:'recipe',  icon:'📜', name:'Recipe',      desc:'Crafting, smelting, smithing',            cat:'item',   accent:'#d68a4e', ibg:'#2a1f16' },
  { id:'enchant', icon:'✨', name:'Enchantment', desc:'Custom enchants with effects',            cat:'fx',     accent:'#7c8cff', ibg:'#1a1e33' },
  { id:'particle',icon:'✦',  name:'Particle',    desc:'Sparks, glows & ambient FX',              cat:'fx',     accent:'#46c7d8', ibg:'#13262a' },
  { id:'biome',   icon:'🌲', name:'Biome',       desc:'Climate, colors & generation',            cat:'world',  accent:'#5fbf4f', ibg:'#1b2a1c' },
  { id:'structure',icon:'🏰',name:'Structure',   desc:'Dungeons, towers & ruins',                cat:'world',  accent:'#b0895e', ibg:'#272016' },
  { id:'advance', icon:'🏆', name:'Advancement', desc:'Goals, triggers & rewards',               cat:'fx',     accent:'#f5c542', ibg:'#2a2510' },
  { id:'loot',    icon:'🎁', name:'Loot Table',  desc:'Drops, chances & conditions',             cat:'item',   accent:'#e0564b', ibg:'#2a1715' },
  { id:'sound',   icon:'🔊', name:'Sound',       desc:'SFX, music discs & ambience',             cat:'fx',     accent:'#46c7d8', ibg:'#13262a' },
];

const RECENT = [
  { icon:'🧊', name:'Twilight Mazestone', type:'Block', time:'2m ago',  pill:'edited' },
  { icon:'⚔',  name:'Fiery Sword',        type:'Item · Weapon', time:'18m ago', pill:'new' },
  { icon:'🐺', name:'Frost Wolf',          type:'Entity · Monster', time:'1h ago', pill:'edited' },
  { icon:'🖼', name:'aurora_block.png',    type:'Texture · 16×16', time:'3h ago', pill:'exported' },
  { icon:'✨', name:'Chill Aura',          type:'Enchantment', time:'yesterday', pill:'edited' },
];

/* ---------- NAVIGATION ---------- */
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const titleEl = document.getElementById('view-title');
const subEl = document.getElementById('view-sub');
const SUBS = {
  dashboard:'Manage every element of your mod',
  texture:'Paint pixel-perfect textures · Blockbench-style',
  block:'Design blocks with live 3D preview & code generation',
};
function showView(name){
  views.forEach(v=>v.classList.toggle('active', v.id==='view-'+name));
  navItems.forEach(n=>n.classList.toggle('active', n.dataset.view===name && !n.dataset.filter));
  titleEl.textContent = name.charAt(0).toUpperCase()+name.slice(1)+(name==='texture'||name==='block'?' Editor':'');
  subEl.textContent = SUBS[name] || '';
  if(name==='texture') tex.refreshPreview();
}
navItems.forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));

/* ---------- BUILD DASHBOARD ---------- */
const cardWrap = document.getElementById('editor-cards');
cardWrap.innerHTML = EDITORS.map(e=>`
  <div class="ed-card" data-go="${e.id}" style="--accent:${e.accent};--ibg:${e.ibg};--glow:${e.accent}33">
    <div class="ed-ico" style="color:${e.accent}">${e.icon}</div>
    <h3>${e.name}</h3><p>${e.desc}</p>
    <span class="ed-go">→</span>
  </div>`).join('');
cardWrap.querySelectorAll('.ed-card').forEach(c=>c.addEventListener('click',()=>{
  const go=c.dataset.go;
  if(go==='texture') showView('texture');
  else if(go==='block') showView('block');
  else { showView('block'); flash(`"${EDITORS.find(e=>e.id===go).name}" editor — demo opens Block Editor`); }
}));

document.getElementById('recent-list').innerHTML = RECENT.map(r=>`
  <div class="recent">
    <div class="r-thumb">${r.icon}</div>
    <div><div class="r-name">${r.name}</div><div class="r-type">${r.type}</div></div>
    <span class="tag-pill">${r.pill}</span>
    <span class="r-time">${r.time}</span>
  </div>`).join('');

function flash(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a2029;border:1px solid #36424f;color:#e7edf3;padding:12px 20px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.5);z-index:99;font-size:13px;font-weight:500;transition:.3s';}
  t.textContent=msg; t.style.opacity='1'; t.style.bottom='24px';
  clearTimeout(t._h); t._h=setTimeout(()=>{t.style.opacity='0';t.style.bottom='12px';},2200);
}

/* ===================================================================
   PIXEL TEXTURE EDITOR
   =================================================================== */
const PALETTE = [
  '#000000','#3c3c3c','#7d7d7d','#b8b8b8','#ffffff','#5e3b1e','#9b6a35','#caa472',
  '#7a3b1d','#c0392b','#e0564b','#e0a93b','#f5c542','#3d8b34','#5fbf4f','#7cc14e',
  '#1f6f8b','#46c7d8','#2c4a8c','#5e7ce0','#3a1b6e','#9b6cff','#c060c0','#e08fd0'
];

const tex = (()=>{
  const canvas = document.getElementById('pixelCanvas');
  const ctx = canvas.getContext('2d');
  const SIZE = 16;                 // 16x16 texture
  let cell = 24;                   // px per pixel
  let color = '#7d7d7d';
  let tool = 'pencil';
  let grid = true;
  let drawing = false;
  let start = null;
  // layered grid of hex colors (null = transparent)
  let data = makeBlank();
  let history = []; let future = [];

  function makeBlank(){ return Array.from({length:SIZE},()=>Array(SIZE).fill(null)); }

  // seed a stone-ish default texture so it doesn't open empty
  function seed(){
    const tones=['#6f6f6f','#7d7d7d','#888888','#717171','#828282','#767676'];
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      data[y][x]=tones[Math.floor(Math.random()*tones.length)];
    }
  }

  function resize(){
    canvas.width = SIZE*cell; canvas.height = SIZE*cell;
    canvas.style.width = canvas.width+'px'; canvas.style.height = canvas.height+'px';
    render();
  }

  function render(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      if(data[y][x]){ ctx.fillStyle=data[y][x]; ctx.fillRect(x*cell,y*cell,cell,cell); }
    }
    if(grid){
      ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=1;
      for(let i=0;i<=SIZE;i++){
        ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,canvas.height);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(canvas.width,i*cell);ctx.stroke();
      }
    }
    refreshPreview();
  }

  function pos(e){
    const r=canvas.getBoundingClientRect();
    return { x:Math.floor((e.clientX-r.left)/cell), y:Math.floor((e.clientY-r.top)/cell) };
  }
  function inb(x,y){ return x>=0&&y>=0&&x<SIZE&&y<SIZE; }

  function snapshot(){ history.push(JSON.stringify(data)); if(history.length>60)history.shift(); future=[]; }

  function paint(x,y){
    if(!inb(x,y))return;
    if(tool==='pencil') data[y][x]=color;
    else if(tool==='eraser') data[y][x]=null;
    else if(tool==='picker'){ if(data[y][x]){ setColor(data[y][x]); selectTool('pencil'); } }
    else if(tool==='fill') flood(x,y,data[y][x]);
  }
  function flood(x,y,target){
    if(target===color)return;
    const st=[[x,y]];
    while(st.length){
      const [cx,cy]=st.pop(); if(!inb(cx,cy)||data[cy][cx]!==target)continue;
      data[cy][cx]=color;
      st.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
  }
  function drawLine(x0,y0,x1,y1){
    const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
    let err=dx-dy,x=x0,y=y0;
    while(true){ if(inb(x,y))data[y][x]=color; if(x===x1&&y===y1)break; const e2=2*err;
      if(e2>-dy){err-=dy;x+=sx;} if(e2<dx){err+=dx;y+=sy;} }
  }
  function drawRect(x0,y0,x1,y1){
    const xa=Math.min(x0,x1),xb=Math.max(x0,x1),ya=Math.min(y0,y1),yb=Math.max(y0,y1);
    for(let x=xa;x<=xb;x++){ if(inb(x,ya))data[ya][x]=color; if(inb(x,yb))data[yb][x]=color; }
    for(let y=ya;y<=yb;y++){ if(inb(xa,y))data[y][xa]=color; if(inb(xb,y))data[y][xb]=color; }
  }

  // events
  canvas.addEventListener('mousedown',e=>{
    const p=pos(e); drawing=true; start=p;
    if(tool==='pencil'||tool==='eraser'||tool==='fill'){ snapshot(); paint(p.x,p.y); render(); }
    else if(tool==='picker'){ paint(p.x,p.y); render(); }
    else snapshot(); // line/rect commit on mouseup
  });
  canvas.addEventListener('mousemove',e=>{
    if(!drawing)return; const p=pos(e);
    if(tool==='pencil'||tool==='eraser'){ paint(p.x,p.y); render(); }
    else if(tool==='line'||tool==='rect'){
      const snap=history.length?JSON.parse(history[history.length-1]):makeBlank();
      data=snap.map(r=>r.slice());
      if(tool==='line')drawLine(start.x,start.y,p.x,p.y); else drawRect(start.x,start.y,p.x,p.y);
      render();
    }
  });
  window.addEventListener('mouseup',()=>{ drawing=false; start=null; });

  function setColor(c){ color=c; document.getElementById('colorInput').value=c;
    document.getElementById('activeSwatch').style.background=c;
    document.getElementById('colorHex').textContent=c.toUpperCase();
    document.querySelectorAll('.sw').forEach(s=>s.classList.toggle('active',s.dataset.c===c)); }
  function selectTool(t){ tool=t; document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t)); }

  function refreshPreview(){
    const url=canvas.toDataURL ? toCleanURL() : null;
    if(!url)return;
    ['pc-top','pc-left','pc-right'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.backgroundImage=`url(${url})`;});
    ['bc-top','bc-bottom','bc-front','bc-back','bc-left','bc-right'].forEach(c=>{
      const el=document.querySelector('.'+c); if(el)el.style.backgroundImage=`url(${url})`;});
  }
  // export without grid lines
  function toCleanURL(){
    const o=document.createElement('canvas'); o.width=SIZE;o.height=SIZE;
    const c=o.getContext('2d');
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) if(data[y][x]){c.fillStyle=data[y][x];c.fillRect(x,y,1,1);}
    return o.toDataURL();
  }

  function init(){
    // palette
    const pal=document.getElementById('palette');
    pal.innerHTML=PALETTE.map(c=>`<div class="sw" data-c="${c}" style="background:${c}"></div>`).join('');
    pal.querySelectorAll('.sw').forEach(s=>s.addEventListener('click',()=>setColor(s.dataset.c)));
    // tools
    document.querySelectorAll('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool)));
    document.getElementById('colorInput').addEventListener('input',e=>setColor(e.target.value));
    document.getElementById('zoom').addEventListener('input',e=>{cell=+e.target.value;resize();});
    document.getElementById('gridToggle').addEventListener('click',e=>{grid=!grid;e.target.classList.toggle('primary',grid);render();});
    document.getElementById('clearBtn').addEventListener('click',()=>{snapshot();data=makeBlank();render();flash('Canvas cleared');});
    document.getElementById('undoBtn').addEventListener('click',undo);
    document.getElementById('redoBtn').addEventListener('click',redo);
    document.getElementById('exportBtn').addEventListener('click',()=>{
      const a=document.createElement('a');a.download='texture.png';a.href=toCleanURL();a.click();flash('Exported texture.png');});
    document.getElementById('gridToggle').classList.add('primary');
    // keyboard
    window.addEventListener('keydown',e=>{
      if(document.getElementById('view-texture').classList.contains('active')===false)return;
      if(e.ctrlKey&&e.key==='z'){e.preventDefault();undo();}
      else if(e.ctrlKey&&e.key==='y'){e.preventDefault();redo();}
      else if(e.key==='b')selectTool('pencil'); else if(e.key==='e')selectTool('eraser');
      else if(e.key==='g')selectTool('fill'); else if(e.key==='i')selectTool('picker');
      else if(e.key==='l')selectTool('line'); else if(e.key==='r')selectTool('rect');
    });
    seed(); setColor(color); resize();
  }
  function undo(){ if(!history.length)return; future.push(JSON.stringify(data)); data=JSON.parse(history.pop()); render(); }
  function redo(){ if(!future.length)return; history.push(JSON.stringify(data)); data=JSON.parse(future.pop()); render(); }

  return { init, refreshPreview };
})();
tex.init();

/* ===================================================================
   BLOCK EDITOR
   =================================================================== */
(function(){
  const bind=(id,fn)=>{const el=document.getElementById(id);if(el)el.addEventListener('input',fn);};
  const out=document.getElementById('codeOut');

  function regen(){
    const id=document.getElementById('b_id').value||'my_block';
    const hard=document.getElementById('b_hard').value;
    const res=document.getElementById('b_res').value;
    const light=document.getElementById('b_light').value;
    const sound=document.getElementById('b_sound').value.toUpperCase();
    const map=document.getElementById('b_map').value.toUpperCase();
    const emis=document.getElementById('b_emis').checked;
    document.getElementById('hv').textContent=(+hard).toFixed(1);
    document.getElementById('rv').textContent=(+res).toFixed(1);
    document.getElementById('lv').textContent=light;
    document.getElementById('lightChip').textContent='☀ Light '+light;
    // light glow on preview
    const stage=document.getElementById('blockStage');
    const g=light/15;
    stage.style.boxShadow=`inset 0 0 ${40+g*80}px rgba(245,197,66,${g*0.5})`;

    const ID=id.toUpperCase();
    let props=`BlockBehaviour.Properties.of()\n            .mapColor(MapColor.${map})\n            .strength(${(+hard).toFixed(1)}F, ${(+res).toFixed(1)}F)\n            .sound(SoundType.${sound})`;
    if(+light>0) props+=`\n            .lightLevel(s -> ${light})`;
    if(emis) props+=`\n            .emissiveRendering((s,l,p) -> true)`;
    props+=`\n            .requiresCorrectToolForDrops()`;

    const code=
`public static final DeferredBlock<Block> ${ID} =
    register("${id}", () -> new Block(
        ${props}
    ));`;
    out.innerHTML=highlight(code);
  }

  function highlight(s){
    return s
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/\b(public|static|final|new|return)\b/g,'<span class="tok-key">$1</span>')
      .replace(/\b(DeferredBlock|Block|BlockBehaviour|Properties|MapColor|SoundType)\b/g,'<span class="tok-typ">$1</span>')
      .replace(/"([^"]*)"/g,'<span class="tok-str">"$1"</span>')
      .replace(/\b(\d+\.?\d*F?)\b/g,'<span class="tok-num">$1</span>');
  }

  ['b_id','b_hard','b_res','b_light','b_sound','b_map','b_emis'].forEach(id=>bind(id,regen));
  // segmented type
  document.querySelectorAll('#b_type button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#b_type button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); flash(b.textContent+' block type selected');
  }));

  // drag-to-rotate cube
  const cube=document.getElementById('bigCube');
  let rx=-22, ry=-35, down=false, lx, ly;
  const stage=document.getElementById('blockStage');
  stage.addEventListener('mousedown',e=>{down=true;lx=e.clientX;ly=e.clientY;});
  window.addEventListener('mouseup',()=>down=false);
  window.addEventListener('mousemove',e=>{
    if(!down)return; ry+=(e.clientX-lx)*0.5; rx-=(e.clientY-ly)*0.5; lx=e.clientX;ly=e.clientY;
    cube.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;
  });

  regen();
})();
