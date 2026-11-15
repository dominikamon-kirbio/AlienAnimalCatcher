(() => {
  "use strict";
  const get = id => document.getElementById(id);
  const canvas = get("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, ground = 515;
  const courses = [
    {name:"Dächer bei Nacht", sky:["#29234d","#5b557e"], width:2420,
      towers:[[440,100,148],[960,140,235],[1570,90,180],[2020,115,222]],
      animals:[[255,0],[735,1],[1250,0],[1805,2],[2240,0]], enemies:[]},
    {name:"Nebel über dem Moor", sky:["#172d44","#426b72"], width:2870,
      towers:[[345,90,222],[675,90,288],[1120,150,191],[1510,100,287],[1900,180,232],[2450,120,282]],
      animals:[[210,2],[550,0],[940,2],[1385,1],[1755,0],[2250,2],[2670,1]],
      gates:[[822,145,100,92],[2185,110,114,139]],
      enemies:[["drone",760,160,46],["drone",1750,325,68]],
      hint:"Patrouillendrohnen kreuzen den Flugweg. Weiche nach oben oder unten aus."},
    {name:"Mondhafen", sky:["#341e49","#80536f"], width:3350,
      towers:[[390,105,280],[730,120,200],[1100,120,295],[1520,155,250],[1950,115,292],[2305,155,229],[2790,120,300]],
      animals:[[250,1],[610,0],[965,2],[1370,0],[1790,1],[2185,0],[2600,2],[3080,1]],
      gates:[[555,118,105,166],[920,106,103,175],[1330,110,110,156],[2540,117,112,174],[3005,105,114,170]],
      enemies:[["drone",1460,353,38],["jammer",1790,389,114],["jammer",3080,389,108]],
      hint:"Violette Felder stören den Fangstrahl. Warte auf eine Lücke im Signal."},
    {name:"Sternenweide", sky:["#182642","#5f637e"], width:3070,
      towers:[[390,100,170],[850,110,245],[1380,145,207],[1920,100,294],[2450,120,234]],
      gates:[[625,123,102,170],[1150,116,105,154],[1680,102,115,164],[2190,135,110,169],[2710,111,100,158]],
      animals:[[260,1],[690,0],[1100,2],[1310,1],[1620,1],[2115,0],[2370,2],[2825,1]],
      enemies:[["drone",780,348,40],["jammer",1310,389,104],["turret",1890,464,330],["drone",2615,311,44]],
      hint:"Geschütztürme verfolgen dich mit einer Ziellinie. Beweg dich, sobald sie aufblinkt."},
    {name:"Polarstation", sky:["#1c2344","#546d83"], width:3470,
      towers:[[420,120,275],[890,110,228],[1350,130,298],[1915,135,244],[2460,125,288],[2935,110,275]],
      gates:[[645,110,122,171],[1100,115,124,170],[1580,112,132,178],[2180,104,118,161],[2675,116,128,176],[3170,111,120,177]],
      animals:[[245,0],[685,2],[825,1],[1155,0],[1280,2],[1670,2],[2240,0],[2720,1],[3280,1]],
      enemies:[["drone",795,340,47],["turret",1070,464,350],["jammer",1670,389,110],["drone",2290,331,50],["turret",2875,464,340]],
      hint:"Drohnen, Störfelder und Geschütztürme sichern die Polarstation."},
    {name:"Riss im Sternenmeer", sky:["#201633","#52416f"], width:3650,
      towers:[[400,110,260],[900,135,224],[1420,110,292],[1920,126,257],[2520,145,290],[3100,113,270]],
      gates:[[620,113,110,153],[1130,111,126,166],[1640,110,120,159],[2155,110,118,181],[2795,109,112,164],[3330,113,118,175]],
      animals:[[255,0],[690,1],[820,2],[1190,0],[1330,1],[1700,2],[2230,1],[2410,0],[2860,2],[3430,1]],
      enemies:[["drone",760,350,45],["jammer",1190,389,120],["turret",1365,464,315],["drone",1820,326,58],["turret",2370,464,320],["jammer",2860,389,123],["drone",3267,337,30]],
      hint:"Im Sternenriss greifen alle drei Gegnertypen an. Nutze die Pausen zwischen ihren Angriffen."}
  ];
  const bosses = [
    {name:"Der Sternenjäger",hp:44,sky:["#291939","#684054"],swing:120,cadence:1.95,
      intro:"Weiche den Salven aus und schieß zurück.",phaseHint:"Schnellere Salven"},
    {name:"Die Rache der Kuh",hp:50,sky:["#1a3044","#426b61"],swing:73,cadence:2.34,
      intro:"Weiche aus, sobald ihre Beamstrahlen aufleuchten.",phaseHint:"Mehr Beamstrahlen"},
    {name:"Vexa, das Schattenalien",hp:58,sky:["#221432","#4b3678"],swing:105,cadence:2.4,
      intro:"Weiche aus den violetten Kreisen und halte das Feuer auf Vexas Kern.",phaseHint:"Vexa öffnet weitere Portale"}
  ];
  const keys = new Set();
  const controls = new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyW","KeyA","KeyS","KeyD","KeyF","Space","Enter","Escape"]);
  const stars = Array.from({length:125}, (_,i) => [noise(i*3)*W,noise(i*3+1)*465,noise(i*3+2)]);
  const hud = document.querySelector(".hud");
  const layout = document.querySelector("main");
  let state = "title", level = 0, course = courses[0], animals = [], ship, particles = [];
  let camera = 0, saved = 0, hull = 3, invulnerable = 0, previous = 0, runningTime = 0;
  let beam = false, noticeTime = 0, mute = false, audio, padId = null, padA = false, padStart = false;
  let boss = null, bossIndex = 0, shots = [], hazards = [], fireDelay = 0;
  let effects = [], destruction = null;
  let patrols = [], solids = [], courseTime = 0, jammed = false, maxHull = 3;
  let selection = 0, selectFrom = "title", padB = false, padY = false, padDirection = 0;
  let padView = false;
  let nativePad = null;
  const touch = {x:0,y:0,action:false};
  const stick = get("touch-stick"), touchAction = get("touch-action");
  const android = navigator.userAgent.includes(" AlienAnimalCatcherAndroid");
  if(android) document.body.classList.add("android-app");
  const missions = courses.flatMap((data,index)=>{
    const courseMission={data,index,kind:"course"};
    if(index%2===0) return [courseMission];
    const encounter=Math.floor(index/2);
    return [courseMission,{data:bosses[encounter],index:encounter,kind:"boss"}];
  });
  const levelButtons = missions.map(({data,index,kind}, position) => {
    const button = document.createElement("button");
    const number = document.createElement("span");
    number.textContent = kind==="course" ? String(index + 1).padStart(2,"0") : "BOSS "+(index+1);
    if(kind==="boss") button.classList.add("boss-option");
    button.append(number, data.name);
    button.addEventListener("click",()=>launch(position));
    get("levels").append(button);
    return button;
  });

  function noise(n) {
    const x = Math.sin(n * 71.731 + 19.21) * 43758.5453;
    return x - Math.floor(x);
  }
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const wrap = (n,size) => ((n % size) + size) % size;
  function rect(x,y,w,h,color,r=0) {
    ctx.fillStyle = color;
    if (!r) {ctx.fillRect(x,y,w,h); return;}
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
    ctx.fill();
  }
  function oval(x,y,rx,ry,color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    ctx.fill();
  }
  function outline(x,y,r,color,width) {
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.stroke();
  }
  function path(points,color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath();
    ctx.fill();
  }
  function text(label,x,y,color,font) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillText(label,x,y);
  }
  function cloud(x,y,s) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(s,s);
    rect(-48,-14,97,32,"#8e91ad66",16);
    oval(-9,-14,27,21,"#9295b36b");
    for(let i=0;i<5;i++) {
      const row = i < 2 ? -21 : -5, col = i < 2 ? -17+i*17 : -26+(i-2)*17;
      rect(col+2,row+3,15,14,"#242c4b62",3);
      rect(col,row,15,14,i%2 ? "#a2a7c0" : "#8189ac",3);
      rect(col+2,row+1,10,2,"#c4c6d5",1);
    }
    ctx.restore();
  }
  function skyline(x,base,w,h,seed,foreground=false) {
    const y = base-h;
    rect(x,y,w,h,foreground?"#29243a":"#2c2b49");
    rect(x-4,y,w+8,6,foreground?"#51425a":"#3e3957");
    rect(x+w*.52,y-13,w*.25,13,"#312b46");
    rect(x+w*.63,y-35,2,22,"#403650");
    rect(x+w*.63-7,y-28,16,2,"#403650");
    for(let row=0;row<Math.floor((h-21)/24);row++) {
      for(let col=0;col<Math.floor((w-12)/20);col++) {
        const px=x+11+col*20, py=y+16+row*24, n=noise(seed+row*13+col*29);
        rect(px+2,py+3,12,14,"#181629",2);
        rect(px,py,12,14,n>.77?"#483e58":foreground?"#f4c365":"#a38173",2);
        if(n<.77) rect(px+2,py+1,8,2,foreground?"#ffe89b":"#b6958b",1);
      }
    }
  }
  function background(offset,scene) {
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,scene.sky[0]); sky.addColorStop(.89,scene.sky[1]);
    sky.addColorStop(1,"#777487");
    rect(0,0,W,H,sky);
    const moon = 1010-offset*.045;
    const halo = ctx.createRadialGradient(moon,141,18,moon,141,125);
    halo.addColorStop(0,"#ffd7af44"); halo.addColorStop(1,"#ffd7af00");
    rect(moon-125,16,250,250,halo);
    oval(moon,141,55,55,"#d5a8bc"); oval(moon+14,129,51,51,scene.sky[0]);
    stars.forEach(([x,y,n]) => {
      const sx = wrap(x-offset*.08,W);
      if(n>.94) {
        rect(sx-4,y,9,1,"#e9cee7"); rect(sx,y-4,1,9,"#e9cee7");
      } else oval(sx,y,n>.8?1.6:1,n>.8?1.6:1,n>.6?"#fbdfcfb0":"#ddd3fa54");
    });
    for(let i=0;i<7;i++) cloud(wrap(113+i*181-offset*.19,W+210)-75,105+noise(i+50)*223,.65+noise(i+160)*.6);
    for(let i=0;i<17;i++) {
      const x=wrap(i*84-offset*.26,1428)-100;
      skyline(x,ground,44+noise(i+320)*39,45+noise(i+77)*140,i*28);
    }
    rect(0,ground,W,H-ground,"#191928");
    rect(0,ground,W,4,"#53445b");
    for(let i=0;i<36;i++) {
      const x=wrap(i*37-offset,1332)-15, y=ground+13+noise(i+180)*71;
      path([[x,y],[x-3,y-7],[x+1,y-5],[x+4,y-9],[x+4,y]],i%4?"#555366":"#b4a363");
    }
  }
  function ufo(x,y,scale,tilt,t) {
    ctx.save();
    ctx.translate(x,y); ctx.rotate(tilt); ctx.scale(scale,scale);
    oval(0,18,56,15,"#5d365e");
    oval(0,23,32,8,"#b964a0");
    ctx.save();
    ctx.beginPath();ctx.ellipse(0,-10,46,39,0,0,Math.PI*2);ctx.clip();
    rect(-49,-52,98,84,"#95d2cf");
    oval(-19,-36,40,37,"#b4e4d9");
    oval(0,-20,15,19,"#b9cf68");
    oval(-6,-21,3,6,"#343748"); oval(6,-21,3,6,"#343748");
    oval(25,-33,8,8,"#f7f4d6bb"); oval(34,-22,3,3,"#f7f4d6bb");
    ctx.restore();
    rect(-3,-57,6,10,"#ae5c99",2);
    oval(0,-58,5,5,"#f6adcc");
    rect(-64,-3,128,25,"#b7639c",13);
    rect(-64,-7,128,22,"#e28ab9",11);
    for(let i=0;i<8;i++) {
      const row = i%2, px=-52+Math.floor(i/2)*29, py=-4+row*9;
      rect(px+1,py+1,22,7,"#975383",2);
      rect(px,py,22,7,i===Math.floor(t*5)%8?"#ffe390":"#f2a9cc",2);
    }
    rect(-13,20,26,5,"#f5cd83",2);
    ctx.restore();
  }
  function critter(x,y,kind,scale,t,lift=0) {
    ctx.save();
    ctx.translate(x,y+Math.sin(t*5+x)*Math.min(3,lift));
    ctx.scale(scale,scale);
    const fur=["#eee0df","#dfad84","#e9a8b8"][kind], head=["#51445f","#a86f50","#d2869f"][kind];
    for(let i=0;i<4;i++) rect(-15+i*8,-5,4,9,head,2);
    oval(-4,-8,19,12,fur);
    if(kind===0) for(let i=0;i<7;i++) oval(-18+i*5,-16+Math.sin(i*2)*2,6,6,fur);
    if(kind===1) {oval(-12,-9,6,5,head);rect(13,-25,3,7,fur,1);rect(21,-23,3,6,fur,1);}
    oval(15,-13,9,8,head);
    oval(12,-20,4,kind===2?8:4,head);
    oval(19,-14,1.5,1.5,"#fff1de");
    if(kind===2) oval(22,-11,4,3,"#efb2be");
    ctx.restore();
  }
  function ray(x,y,end,width,t) {
    if(end<=y) return;
    const fade=ctx.createLinearGradient(0,y,0,end);
    fade.addColorStop(0,"#ffee8cbb"); fade.addColorStop(1,"#f7dc5438");
    path([[x-12,y],[x+12,y],[x+width,end],[x-width,end]],fade);
    path([[x-5,y],[x+5,y],[x+width*.57,end],[x-width*.57,end]],"#ffed6e32");
    oval(x,end,width,Math.max(4,width*.11),"#ffe28253");
    for(let i=0;i<13;i++) {
      const p=wrap(noise(i+201)-t*(.24+noise(i+307)*.38),1);
      const radius=11+(width-11)*p;
      oval(x+(noise(i+590)-.5)*1.8*radius,y+p*(end-y),2+noise(i+195)*3,2+noise(i+195)*3,"#ffea9c8d");
    }
  }
  function drawTitle(t) {
    background(0,courses[0]);
    skyline(570,ground,126,200,302,true);
    skyline(1010,ground,112,239,720,true);
    skyline(1143,ground,100,160,304,true);
    const y=217+Math.sin(t*1.8)*7;
    ray(842,y+48,ground-4,117,t);
    critter(842,409+Math.sin(t*2.5)*10,0,2.05,t,1);
    ufo(842,y,2.22,Math.sin(t*1.4)*.035,t);
  }
  function startBoss(index) {
    bossIndex=index;
    boss={hp:bosses[index].hp,x:970,y:265,phase:1,time:0,motion:0,nextAttack:1.5,attack:0,flash:0,warning:0};
    fireDelay=0; shots=[]; hazards=[]; particles=[];
    effects=[]; destruction=null;
    camera=0; hull=maxHull=5; invulnerable=0; beam=false;
    ship={x:175,y:285,vx:0,vy:0};
    enterPlay(); updateHud();
    announce(bosses[index].intro,4);
    beep(145,.45,"triangle",450);
  }
  function drawBoss(t) {
    background(0,bosses[bossIndex]);
    skyline(1050,ground,105,136,500,true);
    skyline(20,ground,85,120,503,true);
    for(const hazard of hazards) {
      if(hazard.kind==="orb") {
        oval(hazard.x,hazard.y,hazard.r+5,hazard.r+5,bossIndex===2?"#bd69fb66":"#ff507254");
        oval(hazard.x,hazard.y,hazard.r,hazard.r,bossIndex===2?"#d99dfe":"#ff89a4");
        oval(hazard.x-2,hazard.y-2,3,3,"#ffecd8");
        continue;
      }
      const live=hazard.age>=hazard.warning;
      if(hazard.kind==="pulse") {
        const {x,y,size}=hazard;
        oval(x,y,size,size,live?"#bb69f888":"#c38bf23d");
        outline(x,y,size,live?"#f9dbff":"#d8a0fa",live?5:2);
        const radius=live?size*.27:size*(1-.76*hazard.age/hazard.warning);
        outline(x,y,radius,"#edbeff",2);
        continue;
      }
      const color=live?"#bfef8270":"#f5d97034", edge=live?"#efffb4":"#f9dc76";
      const span=hazard.size;
      if(hazard.kind==="row") {
        rect(0,hazard.y-span,930,span*2,color);
        rect(0,hazard.y-(live?3:1),930,live?6:2,edge);
        if(live) path([[boss.x-18,boss.y-29],[boss.x-20,boss.y-17],[930,hazard.y+3],[930,hazard.y-3]],edge);
      } else {
        rect(hazard.x-span,100,span*2,ground-100,color);
        rect(hazard.x-(live?3:1),100,live?6:2,ground-100,edge);
        if(live) path([[boss.x,boss.y+27],[boss.x,boss.y+34],[hazard.x-3,100],[hazard.x+3,100]],"#efffb480");
      }
    }
    for(const shot of shots) {
      rect(shot.x-17,shot.y-4,23,8,"#7fe6d95c",4);
      rect(shot.x-9,shot.y-2,15,4,"#baffeb",2);
    }
    if(destruction?.target!=="boss") {
      ctx.save();
      ctx.translate(boss.x,boss.y);
      drawEnemy(t);
      ctx.restore();
    }
    if(destruction?.target!=="ship"&&(invulnerable<=0||Math.floor(t*14)%2===0))
      ufo(ship.x,ship.y,.56,clamp(ship.vx/1000,-.22,.22),t);
  }
  function drawEnemy(t) {
    if(bossIndex===0) {
      const body=boss.flash>0?"#ffacbe":"#8e598d";
      path([[-78,2],[-37,-26],[28,-23],[49,-59],[74,-54],[61,-8],[83,15],[40,32],[-36,24]],body);
      path([[-56,2],[-11,-18],[29,-10],[39,8],[-13,14]],"#bea1d3");
      rect(-10,-15,29,20,"#de918f",10); oval(2,-7,8,6,"#ffcd89");
      rect(-55,14,20,8,boss.warning>0?"#fff2a6":"#e58d9f",4);
      rect(-50,-17,20,8,boss.warning>0?"#fff2a6":"#e58d9f",4);
      for(let i=0;i<3;i++) rect(60,2+i*8,18+Math.sin(t*40+i)*4,4,"#ffab83",3);
    } else if(bossIndex===1) {
      oval(0,28,71,19,"#58394c");
      oval(0,25,68,12,"#c58e98");
      for(let i=0;i<6;i++) rect(-52+i*19,21,11,6,i===Math.floor(t*8)%6?"#fff4b5":"#f2adba",3);
      const fur=boss.flash>0?"#ffb2c2":"#eee0d8";
      path([[-35,-36],[-46,-57],[-26,-50]],"#f5d49c");
      path([[28,-39],[40,-56],[45,-40]],"#f5d49c");
      oval(-39,-27,17,8,"#db9ca1"); oval(40,-28,16,8,"#db9ca1");
      oval(0,-19,42,38,fur);
      oval(16,-35,16,12,"#54455a"); oval(-23,-10,12,13,"#605163");
      const glow=hazards.some(h=>h.kind!=="orb");
      for(const x of [-15,15]) oval(x,-23,5,7,glow?"#f5ff9a":"#423548");
      oval(-2,3,32,16,"#df9ca8");
      oval(-14,2,4,3,"#79495e"); oval(10,2,4,3,"#79495e");
      oval(0,31,19,5,glow?"#f3f69c":"#f0ab9d");
    } else {
      const glow=boss.warning>0?"#f9bcff":"#9469d1";
      outline(0,0,64,"#7d55bc80",3);
      for(let i=0;i<6;i++) {
        const angle=t*.9+i*Math.PI/3;
        const x=Math.cos(angle)*67,y=Math.sin(angle)*67;
        path([[x,y-9],[x+6,y],[x,y+9],[x-6,y]],glow);
      }
      path([[-66,19],[-38,-20],[-26,-49],[-11,-32],[28,-40],[64,18],[36,40],[-37,34]],
        boss.flash>0?"#eab7fc":"#503774");
      oval(0,-7,29,27,"#a584cc");
      path([[-24,-12],[-6,-4],[-13,3],[-23,-2]],"#382536");
      path([[24,-12],[6,-4],[13,3],[23,-2]],"#382536");
      oval(0,18,16,9,glow);
      oval(0,16,7,4,"#f6ebff");
    }
  }
  function bossAttack() {
    boss.attack++;
    if(bossIndex===0) {
      const aimed=Math.atan2(ship.y-boss.y,boss.x-ship.x);
      const count=boss.phase===1?3:boss.phase===2?5:7;
      const speed=220+boss.phase*38;
      for(let i=0;i<count;i++) {
        const angle=aimed+(i-(count-1)/2)*.17;
        hazards.push({kind:"orb",x:boss.x-50,y:boss.y,vx:-Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7});
      }
      if(boss.phase>=2&&boss.attack%2===0)
        hazards.push({kind:"orb",x:boss.x-52,y:boss.y-22,vx:-370,vy:0,r:11});
    } else if(bossIndex===1) {
      const warning=boss.phase===3?.64:.83;
      if(boss.attack%2===1||boss.phase===3)
        hazards.push({kind:"row",y:ship.y,size:boss.phase===1?19:26,age:0,warning});
      if(boss.attack%2===0||boss.phase===3)
        hazards.push({kind:"column",x:ship.x,size:boss.phase===1?27:35,age:0,warning:warning+.13});
    } else {
      const warning=boss.phase===3?.68:.9;
      hazards.push({kind:"pulse",x:ship.x,y:ship.y,size:boss.phase===3?70:56,age:0,warning});
      if(boss.phase===3) {
        const flank=ship.y<290?100:-100;
        hazards.push({kind:"pulse",x:clamp(ship.x+80,55,810),y:ship.y+flank,size:63,age:0,warning:warning+.24});
      }
      if(boss.phase>=2) {
        const y=boss.attack%2?104:480;
        const speed=boss.phase===2?175:218;
        for(let i=0;i<5;i++) {
          const x=125+i*150+(boss.attack%3)*29;
          hazards.push({kind:"orb",x,y,vx:(i%2?1:-1)*28,vy:y===104?speed:-speed,r:9});
        }
      }
    }
    beep(bossIndex===0?190:260,.18,"triangle",bossIndex===0?115:480);
  }
  function updateBoss(dt,dx,dy,firing) {
    boss.time+=dt;
    boss.motion+=dt*(.82+boss.phase*.24);
    boss.flash=Math.max(0,boss.flash-dt);
    boss.y=270+Math.sin(boss.motion)*bosses[bossIndex].swing;
    boss.x=975+Math.sin(boss.time*1.32)*45;
    ship.vx+=(dx*325-ship.vx)*Math.min(1,dt*10);
    ship.vy+=(dy*305-ship.vy)*Math.min(1,dt*10);
    ship.x=clamp(ship.x+ship.vx*dt,45,815);
    ship.y=clamp(ship.y+ship.vy*dt,105,480);
    invulnerable=Math.max(0,invulnerable-dt);
    fireDelay-=dt;
    if(firing&&fireDelay<=0) {
      fireDelay=.19;
      shots.push({x:ship.x+31,y:ship.y+1});
      beep(640,.08,"sine",385);
    }
    shots=shots.filter(shot=>{
      shot.x+=dt*790;
      if(Math.abs(shot.x-boss.x)<(bossIndex===0?57:48)&&Math.abs(shot.y-boss.y)<(bossIndex===0?32:45)) {
        boss.hp=Math.max(0,boss.hp-1); boss.flash=.08;
        updateHud();
        return false;
      }
      return shot.x<W+20;
    });
    if(!boss.hp) {
      hazards=[]; shots=[];
      destroy("boss",boss.x,boss.y,1.55,completeMission);
      return;
    }
    const health=boss.hp/bosses[bossIndex].hp;
    const phase=health>2/3?1:health>1/3?2:3;
    if(phase!==boss.phase) {
      boss.phase=phase;
      announce("Phase "+phase+" · "+bosses[bossIndex].phaseHint,1.8);
      updateHud();
    }
    boss.nextAttack-=dt;
    boss.warning=Math.max(0,.35-boss.nextAttack);
    if(boss.nextAttack<=0) {
      bossAttack();
      boss.nextAttack=bosses[bossIndex].cadence-boss.phase*.28;
    }
    hazards=hazards.filter(hazard=>{
      let hit=false;
      if(hazard.kind==="orb") {
        hazard.x+=dt*hazard.vx; hazard.y+=dt*hazard.vy;
        hit=Math.abs(hazard.x-ship.x)<24+hazard.r&&Math.abs(hazard.y-ship.y)<13+hazard.r;
        if(hazard.x< -25||hazard.y<55||hazard.y>ground+15) return false;
      } else {
        hazard.age+=dt;
        if(hazard.age>hazard.warning+.32) return false;
        if(hazard.age>=hazard.warning) {
          if(hazard.kind==="pulse") hit=Math.hypot(hazard.x-ship.x,hazard.y-ship.y)<hazard.size+12;
          else if(hazard.kind==="row") hit=Math.abs(hazard.y-ship.y)<hazard.size+10;
          else hit=Math.abs(hazard.x-ship.x)<hazard.size+19;
        }
      }
      if(hit&&!invulnerable) {
        hull--; invulnerable=1.15; updateHud();
        beep(130,.26,"triangle",52);
        return hazard.kind!=="orb";
      }
      return true;
    });
    if(!hull) {
      hazards=[]; shots=[];
      destroy("ship",ship.x,ship.y,.95,()=>
        screen("lost","SCHILD ERSCHÖPFT","Abgeschossen",bosses[bossIndex].name+" blockiert noch den Heimweg.","Boss erneut versuchen"));
    }
    if(noticeTime>0&&(noticeTime-=dt)<=0) announce("");
  }
  function drawGame(t) {
    if(boss) { drawBoss(t); return; }
    background(camera,course);
    for(const [x,w,h] of course.towers) if(x-camera<W+15&&x+w>camera-15)
      skyline(x-camera,ground,w,h,x,true);
    for(const [x,y,w,h] of course.gates||[]) {
      const left=x-camera;
      if(left<-w||left>W) continue;
      rect(left,y,w,h,"#392c49",9);
      rect(left+5,y+5,w-10,h-10,"#624763",6);
      for(let i=12;i<w-10;i+=20) rect(left+i,y+h-13,10,6,"#efb279",2);
    }
    drawPatrols(t);
    const exit = course.width-76-camera;
    rect(exit-30,ground-72,60,72,"#272338",12);
    rect(exit-25,ground-67,50,62,saved===animals.length?"#a3e1cd":"#b9789c",9);
    rect(exit-20,ground-62,40,53,"#222037",7);
    text(saved===animals.length?"✓":"•",exit,ground-26,"#fff2c1","bold 24px Segoe UI");
    text("AUSGANG",exit,ground-82,"#fff2c1","bold 12px Segoe UI");
    if(beam) ray(ship.x-camera,ship.y+13,ground-1,beamWidth(),t);
    for(const animal of animals) {
      if(animal.saved) continue;
      const x=animal.x-camera, y=ground-5-animal.lift;
      if(x<-30||x>W+30) continue;
      if(!animal.lift) {
        oval(x,ground,24,4,"#ad85b6");
        if(Math.abs(x-(ship.x-camera))<170) text("▼",x,y-33,"#f5d67d","bold 11px Segoe UI");
      }
      critter(x,y,animal.kind,1,t,animal.lift);
    }
    for(const p of particles) {
      ctx.globalAlpha=Math.min(1,p.life*2);
      oval(p.x-camera,p.y,p.r,p.r,p.color);
    }
    ctx.globalAlpha=1;
    if(destruction?.target!=="ship"&&(invulnerable<=0||Math.floor(t*14)%2===0))
      ufo(ship.x-camera,ship.y,.56,clamp(ship.vx/1000,-.22,.22),t);
    if(jammed) text("STRAHL GESTÖRT",ship.x-camera,ship.y-43,"#f3b9ff","bold 12px Segoe UI");
  }

  function drawPatrols(t) {
    for(const enemy of patrols) {
      const {kind,y,range}=enemy;
      const x=enemy.x-camera;
      if(x < -range || x > W+range) continue;
      if(kind==="drone") {
        oval(x,y+10,25,7,"#432d49");
        path([[x-30,y-2],[x-13,y-16],[x+13,y-16],[x+30,y-2],[x+17,y+9],[x-17,y+9]],"#98495f");
        rect(x-15,y-6,30,7,"#36243e",3);
        oval(x+Math.sin(t*5)*8,y-3,5,4,"#ffd086");
      } else if(kind==="jammer") {
        if(enemy.warning||enemy.active) {
          const field=enemy.active?"#b25bee34":"#ca80eb1d";
          rect(x-range,y-155,range*2,ground-y+155,field,15);
          rect(x-range,y-155,2,ground-y+155,enemy.active?"#e29cf9":"#b174c6");
          rect(x+range-2,y-155,2,ground-y+155,enemy.active?"#e29cf9":"#b174c6");
          for(let i=0;i<4;i++) rect(x-range+5,y-146+wrap(t*75+i*67,ground-y+140),range*2-10,1,"#f5baff56");
        }
        path([[x-19,ground],[x-7,y+15],[x+7,y+15],[x+19,ground]],"#55406c");
        outline(x,y,17,"#bb85dc",2);
        oval(x,y,10,10,enemy.active?"#f8c9fa":"#a567c2");
      } else {
        if(enemy.aim) {
          ctx.strokeStyle="#ffc177b3";
          ctx.lineWidth=2;
          ctx.setLineDash([8,8]);
          ctx.beginPath();
          ctx.moveTo(x,y);
          ctx.lineTo(enemy.aim.x-camera,enemy.aim.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        rect(x-18,y+13,36,ground-y-13,"#5d4357",4);
        oval(x,y,19,16,"#946457");
        oval(x,y,8,8,enemy.aim?"#fff2ad":"#d99170");
      }
    }
    for(const shot of hazards) {
      const x=shot.x-camera;
      oval(x,shot.y,10,10,"#fb9b6950");
      oval(x,shot.y,5,5,"#ffd78a");
    }
  }

  function damageCourse(message) {
    if(invulnerable) return;
    hull--; invulnerable=1.25;
    burst(ship.x,ship.y,"#f6a1bf"); beep(160,.23,"triangle",55); updateHud();
    if(hull) announce(message,1.5);
    else destroy("ship",ship.x,ship.y,.95,()=>
      screen("lost","SCHILD ERSCHÖPFT","Bruchlandung",saved+" von "+animals.length+" Tieren sind an Bord.","Parcours wiederholen"));
  }

  function updatePatrols(dt) {
    let inField=false;
    for(const enemy of patrols) {
      const offset=courseTime+enemy.offset;
      if(enemy.kind==="drone") {
        const speed=1.1+level*.12;
        enemy.x=enemy.baseX+Math.sin(offset*speed)*enemy.range;
        enemy.y=enemy.baseY+Math.cos(offset*speed*1.7)*24;
        if(Math.abs(enemy.x-ship.x)<46&&Math.abs(enemy.y-ship.y)<27) damageCourse("Patrouillendrohne hat deinen Schild getroffen.");
      } else if(enemy.kind==="jammer") {
        const cycle=offset%4.8;
        enemy.warning=cycle>=2.75&&cycle<3.35;
        enemy.active=cycle>=3.35;
        if(enemy.active&&Math.abs(enemy.x-ship.x)<enemy.range&&ship.y>enemy.y-155) inField=true;
      } else if(enemy.aim) {
        enemy.aim.remaining-=dt;
        if(enemy.aim.remaining<=0) {
          const angle=Math.atan2(enemy.aim.y-enemy.y,enemy.aim.x-enemy.x);
          const speed=335+level*16;
          hazards.push({x:enemy.x,y:enemy.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1.9});
          enemy.aim=null;
          enemy.cooldown=level===5?1.95:2.35;
          if(Math.abs(enemy.x-ship.x)<500) beep(260,.14,"triangle",128);
        }
      } else {
        enemy.cooldown-=dt;
        if(enemy.cooldown<=0&&Math.hypot(enemy.x-ship.x,enemy.y-ship.y)<enemy.range)
          enemy.aim={x:ship.x,y:ship.y,remaining:.78};
      }
      if(state==="ending") return;
    }
    jammed=beam&&inField;
    if(jammed) beam=false;
    hazards=hazards.filter(shot=>{
      shot.x+=shot.vx*dt; shot.y+=shot.vy*dt; shot.life-=dt;
      if(shot.life<=0||shot.y<60||shot.y>ground) return false;
      if(solids.some(([x,y,w,h])=>shot.x>=x&&shot.x<=x+w&&shot.y>=y&&shot.y<=y+h)) return false;
      if(Math.abs(shot.x-ship.x)<28&&Math.abs(shot.y-ship.y)<18) {
        damageCourse("Geschützturm hat deinen Schild getroffen.");
        return false;
      }
      return true;
    });
  }

  function destroy(target,x,y,duration,finish) {
    state="ending"; beam=false; jammed=false;
    hideTouch();
    announce("");
    destruction={target,remaining:duration,finish};
    effects.push({kind:"explosion",x,y,age:0,duration,scale:target==="boss"?1.65:1});
    beep(135,.6,"triangle",33);
  }
  function drawEffects() {
    for(const effect of effects) {
      const progress=effect.age/effect.duration;
      ctx.save();
      ctx.translate(effect.x-camera,effect.y);
      if(effect.kind==="heart") {
        const size=Math.min(1.18,progress*8)*22;
        ctx.translate(Math.sin(progress*4)*10,-62*progress);
        ctx.scale(size,size);
        ctx.globalAlpha=Math.min(1,(1-progress)*3);
        ctx.fillStyle="#fb87bc";
        ctx.beginPath();
        ctx.moveTo(0,.65);
        ctx.bezierCurveTo(-.32,.38,-.94,-.02,-.74,-.43);
        ctx.bezierCurveTo(-.59,-.73,-.22,-.74,0,-.44);
        ctx.bezierCurveTo(.22,-.74,.59,-.73,.74,-.43);
        ctx.bezierCurveTo(.94,-.02,.32,.38,0,.65);
        ctx.fill();
        oval(-.39,-.34,.12,.075,"#ffd4e5");
      } else {
        ctx.scale(effect.scale,effect.scale);
        const spread=1-(1-progress)**2;
        ctx.globalAlpha=(1-progress)*.64;
        ctx.strokeStyle="#ffd487";
        ctx.lineWidth=3*(1-progress)+1;
        ctx.beginPath(); ctx.arc(0,0,12+spread*101,0,Math.PI*2); ctx.stroke();
        for(let i=0;i<28;i++) {
          const angle=noise(i+90)*Math.PI*2, distance=(25+noise(i+195)*105)*spread;
          const x=Math.cos(angle)*distance, y=Math.sin(angle)*distance;
          ctx.globalAlpha=(1-progress)**1.4;
          oval(x,y+progress*progress*34,2+noise(i+311)*4,2+noise(i+311)*4,
            ["#ffe6a6","#ff9c79","#e975b7"][i%3]);
        }
        if(progress<.35) {
          ctx.globalAlpha=1-progress/.35;
          oval(0,0,17+spread*57,17+spread*57,"#f6a86a");
          oval(0,0,9+spread*33,9+spread*33,"#fff2c1");
        }
      }
      ctx.restore();
    }
  }

  function beep(freq,duration,type="sine",end=freq) {
    if(mute||!audio||audio.state!=="running") return;
    const oscillator=audio.createOscillator(), gain=audio.createGain(), now=audio.currentTime;
    oscillator.type=type; oscillator.frequency.setValueAtTime(freq,now);
    oscillator.frequency.exponentialRampToValueAtTime(end,now+duration);
    gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(.08,now+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(now+duration);
  }
  function enableAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if(mute||!Audio) return;
    try {
      audio ||= new Audio();
      if(audio.state==="suspended") audio.resume().catch(()=>{});
    } catch {}
  }
  function updateHud() {
    get("course").textContent=boss ? "Boss "+(bossIndex+1) : String(level+1).padStart(2,"0")+" / "+String(courses.length).padStart(2,"0")+" · "+course.name;
    get("count").parentElement.hidden=!!boss;
    get("count").textContent=saved+" / "+animals.length;
    get("shield").textContent="◆".repeat(hull)+"◇".repeat(maxHull-hull);
    if(boss) {
      get("boss-name").textContent=bosses[bossIndex].name+" · Phase "+boss.phase;
      get("boss-health").max=bosses[bossIndex].hp;
      get("boss-health").value=boss.hp;
    }
  }
  function announce(message,seconds=2.5) {
    get("notice").textContent=message;
    noticeTime=seconds;
  }
  function start(index) {
    boss=null;
    level=index; course=courses[index];
    animals=course.animals.map(([x,kind])=>({x,kind,lift:0,saved:false}));
    ship={x:90,y:315,vx:0,vy:0};
    saved=0; hull=maxHull=3+Math.floor(index/2); camera=0; invulnerable=0; particles=[]; beam=false;
    effects=[]; destruction=null;
    patrols=course.enemies.map(([kind,x,y,range],position)=>({
      kind,x,y,range,baseX:x,baseY:y,offset:position*.73,cooldown:.5
    }));
    solids=course.towers.map(([x,w,h])=>[x,ground-h,w,h]).concat(course.gates||[]);
    hazards=[]; courseTime=0; jammed=false;
    enterPlay();
    updateHud();
    announce(course.hint||"Fang alle Tiere und flieg zum Ausgang.",4.5);
    beep(240,.28,"triangle",520);
  }
  function screen(next,kicker,title,brief,button) {
    state=next; beam=false;
    get("kicker").textContent=kicker;
    get("title").replaceChildren(title);
    get("brief").textContent=brief;
    get("action-label").textContent=button;
    get("panel").hidden=false;
    hud.hidden=true; get("boss-hud").hidden=true;
    hideTouch();
    get("menu").textContent=padId?"Y · Levelauswahl":"Levelauswahl";
    announce("");
  }
  function togglePause() {
    if(state==="play") screen("pause","FLUG UNTERBROCHEN","Pause","Dein UFO wartet auf dich.","Weiterfliegen");
    else if(state==="pause") action();
  }
  function action() {
    enableAudio();
    if(state==="pause") {
      enterPlay();
    } else if(state==="next") launch(currentMission()+1);
    else if(state==="lost") boss ? startBoss(bossIndex) : start(level);
    else if(state==="title"||state==="win") start(0);
    else if(state==="select") launch(selection);
  }
  function enterPlay() {
    state="play"; get("panel").hidden=true; get("select").hidden=true;
    hud.hidden=false; get("boss-hud").hidden=!boss;
    get("touch-controls").hidden=false;
    touchAction.textContent=boss?"Schießen":"Beamen";
  }
  function launch(index) {
    enableAudio();
    document.activeElement?.blur();
    const mission=missions[index];
    if(mission.kind==="course") start(mission.index);
    else startBoss(mission.index);
  }
  function currentMission() {
    return missions.findIndex(mission=>boss
      ? mission.kind==="boss"&&mission.index===bossIndex
      : mission.kind==="course"&&mission.index===level);
  }
  function completeMission() {
    const next=missions[currentMission()+1];
    if(!next) {
      screen("win","MISSION ERFÜLLT","Heimflug frei!","Vexa ist besiegt. Dein UFO kann nach Hause fliegen.","Neue Mission");
    } else if(next.kind==="boss") {
      screen("next","FEINDKONTAKT","Alle gerettet!",saved+" Tiere sind an Bord. Vor dir wartet "+next.data.name+".","Zum Bosskampf");
    } else if(boss) {
      screen("next","BOSS BESIEGT","Weg frei!","Dein nächster Einsatz führt dich nach "+next.data.name+".","Nächster Parcours");
    } else {
      screen("next","PARCOURS GESCHAFFT","Alle gerettet!",saved+" Tiere sind sicher an Bord. Nächster Halt: "+next.data.name+".","Nächster Parcours");
    }
  }
  function menu() {
    if(state==="play"||state==="ending"||state==="select") return;
    selectFrom=state; state="select";
    selection=selectFrom==="title"?0:currentMission();
    get("panel").hidden=true; get("select").hidden=false;
    get("home").hidden=selectFrom==="title";
    get("home").textContent=padId?"Y · Hauptmenü":"Hauptmenü";
    levelButtons[selection].focus();
  }
  function back() {
    if(state!=="select") return;
    state=selectFrom; get("select").hidden=true; get("panel").hidden=false;
    get("menu").focus();
  }
  function moveSelection(direction) {
    selection=wrap(selection+direction,missions.length);
    levelButtons[selection].focus();
  }
  function home() {
    get("select").hidden=true;
    const headline=document.createElement("em");
    headline.textContent="Catcher";
    screen("title","EINSATZ 01 / 06","Alien Animal","Rette Tiere in sechs Nachtparcours und stell dich drei Bossen.","Einsatz starten");
    get("title").append(document.createElement("br"),headline);
    get("action").focus();
  }
  function burst(x,y,color) {
    for(let i=0;i<20;i++) {
      const a=noise(i+runningTime)*Math.PI*2, speed=40+noise(i+313)*120;
      particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.38+noise(i+14)*.46,r:1+noise(i+4)*3,color});
    }
  }
  function beamWidth() {return 23+(ground-ship.y)*.115;}
  function pollPad() {
    let pad;
    try {pad=nativePad||Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected&&p.mapping==="standard");} catch {}
    if((pad?.id??null)!==padId) {
      padId=pad?.id??null;
      const status=get("controller");
      status.replaceChildren(document.createElement("i"),pad?"Controller verbunden":"Tastatur bereit");
      get("fly-key").textContent=pad?"Linker Stick / D-Pad":"WASD / ↑↓←→";
      get("beam-key").textContent=pad?"A / RT":"Leertaste";
      get("shot-key").textContent=pad?"X / RB":"F";
      get("pause-key").textContent=pad?"Menü":"Esc";
      get("prompt").textContent=pad?"A":"↵";
      get("menu").textContent=pad?"Y · Levelauswahl":"Levelauswahl";
      updateFullscreen();
    }
    const a=!!pad?.buttons[0]?.pressed, startButton=!!pad?.buttons[9]?.pressed;
    const b=!!pad?.buttons[1]?.pressed, y=!!pad?.buttons[3]?.pressed;
    const view=!!pad?.buttons[8]?.pressed;
    const xAxis=pad?.axes[0]||0, yAxis=pad?.axes[1]||0;
    const direction=pad?.buttons[12]?.pressed||yAxis<-.6?-3:pad?.buttons[13]?.pressed||yAxis>.6?3:
      pad?.buttons[14]?.pressed||xAxis<-.6?-1:pad?.buttons[15]?.pressed||xAxis>.6?1:0;
    if(state==="select"&&direction&&direction!==padDirection) moveSelection(direction);
    if(a&&!padA&&state!=="play") action();
    if(startButton&&!padStart) togglePause();
    if(b&&!padB) back();
    if(y&&!padY) {
      if(state==="select"&&selectFrom!=="title") home();
      else menu();
    }
    if(view&&!padView) toggleFullscreen();
    padView=view;
    padA=a; padStart=startButton; padB=b; padY=y; padDirection=direction;
    return pad;
  }
  function updateFullscreen() {
    const active=document.fullscreenElement===layout||layout.classList.contains("expanded");
    get("fullscreen").textContent=(active?"Vollbild verlassen":"Vollbild")+" · "+(padId?"View":"V");
    get("fullscreen").setAttribute("aria-pressed",String(active));
  }
  async function toggleFullscreen() {
    if(document.fullscreenElement===layout) {
      await document.exitFullscreen();
    } else if(layout.classList.contains("expanded")) {
      layout.classList.remove("expanded");
    } else {
      try {
        if(!layout.requestFullscreen) throw new Error("Fullscreen unavailable");
        await layout.requestFullscreen();
      } catch {
        layout.classList.add("expanded");
      }
    }
    updateFullscreen();
  }
  function update(dt,pad) {
    const down=(...codes)=>codes.some(code=>keys.has(code));
    const button=index=>+!!pad?.buttons[index]?.pressed;
    const axis=index=>Math.abs(pad?.axes[index]||0)>.19?pad.axes[index]:0;
    let dx=clamp(touch.x+axis(0)+button(15)-button(14)+down("ArrowRight","KeyD")-down("ArrowLeft","KeyA"),-1,1);
    let dy=clamp(touch.y+axis(1)+button(13)-button(12)+down("ArrowDown","KeyS")-down("ArrowUp","KeyW"),-1,1);
    const magnitude=Math.max(1,Math.hypot(dx,dy));
    dx/=magnitude; dy/=magnitude;
    if(boss) {
      updateBoss(dt,dx,dy,touch.action||down("KeyF")||button(2)||button(5));
      return;
    }
    beam=touch.action||down("Space")||padA||button(7)>0||(pad?.buttons[7]?.value??0)>.3;
    ship.vx+=(dx*305-ship.vx)*Math.min(1,dt*8);
    ship.vy+=(dy*280-ship.vy)*Math.min(1,dt*8);
    const oldX=ship.x, oldY=ship.y;
    ship.x=clamp(ship.x+ship.vx*dt,42,course.width-39);
    ship.y=clamp(ship.y+ship.vy*dt,101,ground-31);
    invulnerable=Math.max(0,invulnerable-dt);
    const overlap=([x,y,w,h])=>ship.x+29>x&&ship.x-29<x+w&&ship.y+13>y&&ship.y-22<y+h;
    if(solids.some(overlap)) {
      ship.x=oldX; ship.y=oldY; ship.vx=0; ship.vy=0;
      damageCourse("Kollision! Schild beschädigt.");
      if(state==="ending") return;
    }
    courseTime+=dt;
    updatePatrols(dt);
    if(state==="ending") return;
    camera+= (clamp(ship.x-W*.4,0,course.width-W)-camera)*Math.min(1,dt*5);
    for(const a of animals) {
      if(a.saved) continue;
      const needed=ground-5-(ship.y+14);
      const width=beamWidth()-(beamWidth()-12)*clamp(a.lift/Math.max(needed,1),0,1);
      if(beam&&Math.abs(a.x-ship.x)<width) {
        a.x+=(ship.x-a.x)*Math.min(1,dt*2.7);
        a.lift+=dt*185;
        if(a.lift>=needed) {
          a.saved=true; saved++; updateHud();
          burst(ship.x,ship.y+14,"#ffe28e"); beep(460,.32,"triangle",970);
          effects.push({kind:"heart",x:ship.x,y:ship.y-29,age:0,duration:1.05});
          if(saved===animals.length) announce("Alle Tiere an Bord! Zum Ausgang →",4);
        }
      } else a.lift=Math.max(0,a.lift-dt*230);
    }
    if(Math.abs(ship.x-(course.width-76))<55) {
      if(saved!==animals.length) {
        if(noticeTime<=0) announce("Es fehlen noch "+(animals.length-saved)+" Tiere.");
      } else if(ship.y>345) {
        beep(400,.5,"sine",1100);
        completeMission();
      } else if(noticeTime<=0) announce("Zum Ausgang sinken ↓");
    }
    for(const p of particles) {p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=70*dt; p.life-=dt;}
    particles=particles.filter(p=>p.life>0);
    if(noticeTime>0&&(noticeTime-=dt)<=0) announce("");
  }
  function frame(now) {
    const dt=Math.min(.028,(now-(previous||now))/1000);
    previous=now;
    const pad=pollPad();
    if(state==="play"||state==="ending") {
      for(const effect of effects) effect.age+=dt;
      effects=effects.filter(effect=>effect.age<effect.duration);
    }
    if(state==="ending") {
      runningTime+=dt;
      destruction.remaining-=dt;
      if(destruction.remaining<=0) destruction.finish();
    }
    if(state==="play") {runningTime+=dt; update(dt,pad);}
    if(state==="title"||(state==="select"&&selectFrom==="title")) drawTitle(now/1000);
    else {drawGame(runningTime); drawEffects();}
    requestAnimationFrame(frame);
  }
  window.addEventListener("keydown",event=>{
    if(event.code==="KeyV"&&!event.altKey&&!event.ctrlKey&&!event.metaKey) {
      event.preventDefault();
      if(!event.repeat) toggleFullscreen();
      return;
    }
    if(event.code==="Escape"&&layout.classList.contains("expanded")) {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
    if(!controls.has(event.code)||event.altKey||event.ctrlKey||event.metaKey) return;
    if(state==="select") {
      const direction={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}[event.code];
      if(direction) {event.preventDefault(); moveSelection(direction);}
      if(event.code==="Escape") {event.preventDefault(); back();}
      return;
    }
    if(event.target instanceof HTMLButtonElement&&event.target.id!=="action"&&["Space","Enter"].includes(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
    if(!event.repeat) {
      enableAudio();
      if(event.code==="Enter"||(event.code==="Space"&&state!=="play")) action();
      if(event.code==="Escape") togglePause();
    }
  });
  window.addEventListener("keyup",event=>keys.delete(event.code));
  window.addEventListener("blur",()=>{keys.clear(); if(state==="play") togglePause();});
  get("action").addEventListener("click",()=>{action(); get("action").blur();});
  get("menu").addEventListener("click",menu);
  get("back").addEventListener("click",back);
  get("home").addEventListener("click",home);
  get("fullscreen").addEventListener("click",toggleFullscreen);
  document.addEventListener("fullscreenchange",updateFullscreen);
  get("sound").addEventListener("click",()=>{
    mute=!mute;
    get("sound").textContent=mute?"Ton aus":"Ton an";
    get("sound").setAttribute("aria-pressed",String(!mute));
    get("sound").blur();
    if(!mute) {enableAudio(); beep(440,.16);}
  });
  let stickPointer = null, actionPointer = null;
  function centerStick() {
    stickPointer=null;
    touch.x=touch.y=0;
    stick.style.setProperty("--stick-x","0px");
    stick.style.setProperty("--stick-y","0px");
  }
  function releaseAction() {
    actionPointer=null;
    touch.action=false;
    touchAction.setAttribute("aria-pressed","false");
  }
  function hideTouch() {
    centerStick(); releaseAction();
    get("touch-controls").hidden=true;
  }
  function moveStick(event) {
    if(event.pointerId!==stickPointer) return;
    const bounds=stick.getBoundingClientRect(), radius=bounds.width*.32;
    const x=event.clientX-bounds.left-bounds.width/2, y=event.clientY-bounds.top-bounds.height/2;
    const divisor=Math.max(Math.hypot(x,y),radius,1);
    touch.x=x/divisor; touch.y=y/divisor;
    stick.style.setProperty("--stick-x",touch.x*radius+"px");
    stick.style.setProperty("--stick-y",touch.y*radius+"px");
  }
  stick.addEventListener("pointerdown",event=>{
    if(stickPointer!==null) return;
    stickPointer=event.pointerId;
    stick.setPointerCapture(stickPointer);
    moveStick(event);
  });
  stick.addEventListener("pointermove",moveStick);
  touchAction.addEventListener("pointerdown",event=>{
    if(actionPointer!==null) return;
    actionPointer=event.pointerId;
    touchAction.setPointerCapture(actionPointer);
    touch.action=true;
    touchAction.setAttribute("aria-pressed","true");
    enableAudio();
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]) {
    stick.addEventListener(type,event=>{if(event.pointerId===stickPointer) centerStick();});
    touchAction.addEventListener(type,event=>{if(event.pointerId===actionPointer) releaseAction();});
  }
  get("touch-pause").addEventListener("click",togglePause);
  if(android) window.alienAndroid={
    controller(x,y,buttons,trigger) {
      nativePad={id:"Android Gamepad",axes:[x,y],buttons:Array.from({length:17},(_,index)=>({
        pressed:(buttons&(1<<index))!==0,value:index===7?trigger:0
      }))};
    },
    disconnect(){nativePad=null;},
    suspend(){nativePad=null; if(state==="play") togglePause();},
    back(){
      if(state==="title") return false;
      if(state==="select") back();
      else if(state==="play") togglePause();
      else if(state!=="ending") home();
      return true;
    }
  };
  requestAnimationFrame(frame);
})();
