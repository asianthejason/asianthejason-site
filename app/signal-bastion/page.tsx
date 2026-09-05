"use client";
/* eslint-disable react-hooks/immutability -- The animation loop intentionally stores mutable game state in a ref. */

import { useCallback, useEffect, useRef, useState } from "react";
import HeaderWithAuth from "../components/HeaderWithAuth";
import { useAuth } from "../../lib/useAuth";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import "./signal-bastion.css";

type TowerKind = "rail" | "arc" | "cryo" | "miner";
type Pad = { id: number; x: number; y: number };
type Tower = { pad: number; kind: TowerKind; level: number; cooldown: number };
type Enemy = { id: number; progress: number; hp: number; maxHp: number; speed: number; reward: number; boss: boolean; slow: number };
type Shot = { x1: number; y1: number; x2: number; y2: number; life: number; color: string };
type GamePhase = "ready" | "playing" | "gameover";
type Snapshot = { wave: number; lives: number; energy: number; scrap: number; killed: number; phase: GamePhase; pads: Pad[]; towers: Tower[]; generatorLevel: number; extractionLevel: number; nextWaveIn: number };
type ScoreRow = { id: number; name: string; waves: number; enemies_defeated: number };

const W = 960, H = 560;
const PATH = [{x:-25,y:105},{x:145,y:105},{x:145,y:255},{x:355,y:255},{x:355,y:90},{x:575,y:90},{x:575,y:355},{x:790,y:355},{x:790,y:465},{x:985,y:465}];
const GENERATOR = {x:455,y:450,radius:38};
const PAD_ENERGY_COST = 45;
const PAD_SCRAP_COST = 20;
const TOWER_DATA: Record<TowerKind,{name:string;cost:number;color:string;range:number;damage:number;rate:number}> = {
  rail:{name:"Railgun",cost:90,color:"#ffbd5a",range:150,damage:24,rate:1.05},
  arc:{name:"Arc Coil",cost:140,color:"#6cf4ff",range:125,damage:13,rate:.62},
  cryo:{name:"Cryo Node",cost:120,color:"#9d8cff",range:135,damage:8,rate:.82},
  miner:{name:"Scrap Harvester",cost:95,color:"#66f2a6",range:0,damage:0,rate:0},
};

const cryoChance=(level:number)=>Math.min(.75,.18+(level-1)*.09);
const minerRate=(level:number)=>.45*Math.pow(1.55,level-1);
const generatorOutput=(level:number)=>3+level;
const extractionMultiplier=(level:number)=>1+level*.18;
const generatorUpgradeCost=(level:number)=>Math.floor(45*Math.pow(1.72,level));
const extractionUpgradeCost=(level:number)=>Math.floor(135*Math.pow(1.68,level));

function pointAt(progress:number) {
  let remaining=progress;
  for(let i=0;i<PATH.length-1;i++){
    const a=PATH[i],b=PATH[i+1],d=Math.hypot(b.x-a.x,b.y-a.y);
    if(remaining<=d) return {x:a.x+(b.x-a.x)*remaining/d,y:a.y+(b.y-a.y)*remaining/d};
    remaining-=d;
  }
  return PATH[PATH.length-1];
}
const pathLength=PATH.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-PATH[i].x,p.y-PATH[i].y),0);

function distanceToSegment(p:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}){
  const dx=b.x-a.x,dy=b.y-a.y,lengthSq=dx*dx+dy*dy;
  const t=lengthSq===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/lengthSq));
  return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
}

function validPadPosition(p:{x:number;y:number},pads:Pad[]){
  if(p.x<32||p.x>W-32||p.y<32||p.y>H-32)return false;
  if(PATH.slice(1).some((point,i)=>distanceToSegment(p,PATH[i],point)<58))return false;
  if(Math.hypot(GENERATOR.x-p.x,GENERATOR.y-p.y)<GENERATOR.radius+34)return false;
  return !pads.some(pad=>Math.hypot(pad.x-p.x,pad.y-p.y)<50);
}

export default function SignalBastionPage(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const game=useRef({phase:"ready" as GamePhase,wave:0,lives:20,energy:180,scrap:80,killed:0,pads:[] as Pad[],towers:[] as Tower[],enemies:[] as Enemy[],shots:[] as Shot[],generatorLevel:0,extractionLevel:0,spawnLeft:0,spawnClock:0,nextWave:1.5,id:1,padId:1,last:0});
  const placement=useRef({active:false,dragging:false,x:W/2,y:H/2,valid:false});
  const [snap,setSnap]=useState<Snapshot>({wave:0,lives:20,energy:180,scrap:80,killed:0,phase:"ready",pads:[],towers:[],generatorLevel:0,extractionLevel:0,nextWaveIn:0});
  const [placingPad,setPlacingPad]=useState(false);
  const [selectedPad,setSelectedPad]=useState<number|null>(null);
  const [scores,setScores]=useState<ScoreRow[]>([]);
  const [saveStatus,setSaveStatus]=useState("");
  const {currentUser,userLabel}=useAuth();

  const sync=useCallback(()=>{const g=game.current;setSnap({wave:g.wave,lives:g.lives,energy:Math.floor(g.energy),scrap:Math.floor(g.scrap),killed:g.killed,phase:g.phase,pads:[...g.pads],towers:[...g.towers],generatorLevel:g.generatorLevel,extractionLevel:g.extractionLevel,nextWaveIn:Math.max(0,Math.ceil(g.nextWave))});},[]);
  const loadScores=useCallback(async()=>{
    if(!isSupabaseConfigured){const local=JSON.parse(localStorage.getItem("signalBastionScores")||"[]") as ScoreRow[];setScores(local.slice(0,10));return;}
    const {data}=await supabase.from("signal_bastion_scores").select("id,name,waves,enemies_defeated").order("waves",{ascending:false}).order("enemies_defeated",{ascending:false}).limit(10);
    if(data)setScores(data as ScoreRow[]);
  },[]);
  useEffect(()=>{void loadScores();},[loadScores]);

  const begin=()=>{game.current={phase:"playing",wave:0,lives:20,energy:180,scrap:80,killed:0,pads:[],towers:[],enemies:[],shots:[],generatorLevel:0,extractionLevel:0,spawnLeft:0,spawnClock:0,nextWave:3,id:1,padId:1,last:performance.now()};placement.current={active:false,dragging:false,x:W/2,y:H/2,valid:false};setPlacingPad(false);setSelectedPad(null);setSaveStatus("");sync();};
  const spawnWave=(g:typeof game.current)=>{g.wave++;g.spawnLeft=7+Math.floor(g.wave*1.65);g.spawnClock=0;};

  useEffect(()=>{
    let raf=0; const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;
    const draw=(now:number)=>{
      const g=game.current,dt=Math.min(.04,(now-(g.last||now))/1000);g.last=now;
      if(g.phase==="playing"){
        g.energy=Math.min(9999,g.energy+dt*(4+g.wave*.12+g.generatorLevel*.6));
        if(g.spawnLeft>0){g.spawnClock-=dt;if(g.spawnClock<=0){const boss=g.wave%10===0&&g.spawnLeft===1;const hp=(48+g.wave*15)*Math.pow(1.055,g.wave)*(boss?9:1);g.enemies.push({id:g.id++,progress:0,hp,maxHp:hp,speed:(43+Math.min(g.wave,35)*.7)*(boss?.62:1),reward:(10+g.wave*1.2)*(boss?8:1),boss,slow:0});g.spawnLeft--;g.spawnClock=Math.max(.26,.9-g.wave*.012);}}
        if(g.spawnLeft===0&&g.enemies.length===0){g.nextWave-=dt;if(g.nextWave<=0){spawnWave(g);g.nextWave=2.2;}}
        for(const e of g.enemies){e.slow=Math.max(0,e.slow-dt);e.progress+=e.speed*(e.slow>0?.55:1)*dt;if(e.progress>=pathLength){e.hp=0;g.lives-=e.boss?5:1;}}
        g.enemies=g.enemies.filter(e=>{if(e.hp>0)return true;if(e.progress<pathLength){g.scrap+=e.reward*extractionMultiplier(g.extractionLevel);g.killed++;}return false;});
        for(const t of g.towers){if(t.kind==="miner"){g.scrap+=minerRate(t.level)*dt;continue;}t.cooldown-=dt;if(t.cooldown>0)continue;const p=g.pads.find(pad=>pad.id===t.pad);if(!p)continue;const stats=TOWER_DATA[t.kind];const target=g.enemies.filter(e=>{const q=pointAt(e.progress);return Math.hypot(q.x-p.x,q.y-p.y)<=stats.range*(1+(t.level-1)*.08);}).sort((a,b)=>t.kind==="cryo"?(Number(a.slow>0)-Number(b.slow>0)||b.progress-a.progress):b.progress-a.progress)[0];if(!target)continue;const q=pointAt(target.progress),damage=stats.damage*(1+(t.level-1)*.72);target.hp-=damage;if(t.kind==="cryo"&&target.slow<=0&&Math.random()<cryoChance(t.level))target.slow=1.8;if(t.kind==="arc"){g.enemies.filter(e=>e!==target&&Math.hypot(pointAt(e.progress).x-q.x,pointAt(e.progress).y-q.y)<75).slice(0,2).forEach(e=>e.hp-=damage*.48);}g.shots.push({x1:p.x,y1:p.y,x2:q.x,y2:q.y,life:.13,color:stats.color});t.cooldown=stats.rate/Math.pow(.88,t.level-1);}
        g.shots.forEach(s=>s.life-=dt);g.shots=g.shots.filter(s=>s.life>0);
        if(g.lives<=0){g.lives=0;g.phase="gameover";sync();}
      }
      ctx.clearRect(0,0,W,H);ctx.fillStyle="#061019";ctx.fillRect(0,0,W,H);
      const grd=ctx.createRadialGradient(480,250,30,480,250,600);grd.addColorStop(0,"#102838");grd.addColorStop(1,"#03070c");ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(97,238,228,.055)";ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      ctx.beginPath();PATH.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle="#192d34";ctx.lineWidth=55;ctx.lineJoin="round";ctx.stroke();ctx.strokeStyle="#2b4c4d";ctx.lineWidth=2;ctx.setLineDash([10,14]);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle="#ff6d5a";ctx.shadowColor="#ff4c3b";ctx.shadowBlur=25;ctx.fillRect(936,420,24,90);ctx.shadowBlur=0;
      const generatorPulse=.72+Math.sin(now/180)*.12;ctx.beginPath();ctx.arc(GENERATOR.x,GENERATOR.y,GENERATOR.radius+7,0,Math.PI*2);ctx.fillStyle=`rgba(97,238,222,${.06+generatorPulse*.05})`;ctx.fill();ctx.strokeStyle="rgba(97,238,222,.3)";ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(GENERATOR.x,GENERATOR.y,GENERATOR.radius,0,Math.PI*2);ctx.fillStyle="#0c2528";ctx.fill();ctx.strokeStyle="#61eede";ctx.lineWidth=3;ctx.shadowColor="#61eede";ctx.shadowBlur=16*generatorPulse;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(GENERATOR.x-9,GENERATOR.y-18);ctx.lineTo(GENERATOR.x+5,GENERATOR.y-3);ctx.lineTo(GENERATOR.x-2,GENERATOR.y-3);ctx.lineTo(GENERATOR.x+9,GENERATOR.y+18);ctx.lineTo(GENERATOR.x-8,GENERATOR.y+3);ctx.lineTo(GENERATOR.x,GENERATOR.y+3);ctx.closePath();ctx.fillStyle="#b8fff7";ctx.fill();ctx.font="700 9px monospace";ctx.textAlign="center";ctx.fillStyle="#7bafac";ctx.fillText("GENERATOR",GENERATOR.x,GENERATOR.y+55);
      const selectedTower=g.towers.find(t=>t.pad===selectedPad),selectedTowerPad=g.pads.find(p=>p.id===selectedPad);
      if(selectedTower&&selectedTowerPad&&selectedTower.kind!=="miner"){const stats=TOWER_DATA[selectedTower.kind],range=stats.range*(1+(selectedTower.level-1)*.08);ctx.beginPath();ctx.arc(selectedTowerPad.x,selectedTowerPad.y,range,0,Math.PI*2);ctx.fillStyle=`${stats.color}18`;ctx.fill();ctx.strokeStyle=`${stats.color}aa`;ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([]);}
      g.pads.forEach(p=>{const built=g.towers.find(t=>t.pad===p.id);ctx.beginPath();ctx.arc(p.x,p.y,25,0,Math.PI*2);ctx.fillStyle=built?"#12232d":"rgba(82,133,140,.14)";ctx.fill();ctx.strokeStyle=selectedPad===p.id?"#fff":built?TOWER_DATA[built.kind].color:"#45636a";ctx.lineWidth=selectedPad===p.id?3:2;ctx.stroke();if(built){ctx.fillStyle=TOWER_DATA[built.kind].color;ctx.fillRect(p.x-8,p.y-9,16,18);ctx.font="bold 10px sans-serif";ctx.fillStyle="#fff";ctx.textAlign="center";ctx.fillText(String(built.level),p.x,p.y+4);}else{ctx.fillStyle="#58747a";ctx.font="20px sans-serif";ctx.textAlign="center";ctx.fillText("+",p.x,p.y+7);}});
      if(placement.current.active){const p=placement.current;ctx.beginPath();ctx.arc(p.x,p.y,25,0,Math.PI*2);ctx.fillStyle=p.valid?"rgba(97,238,222,.18)":"rgba(255,92,92,.18)";ctx.fill();ctx.strokeStyle=p.valid?"#61eede":"#ff625d";ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([]);ctx.font="700 10px monospace";ctx.fillStyle=p.valid?"#9afff4":"#ff9c98";ctx.textAlign="center";ctx.fillText(p.valid?"DROP":"BLOCKED",p.x,p.y-34);}
      for(const e of g.enemies){const p=pointAt(e.progress),r=e.boss?18:11;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=e.boss?"#ff4d6d":e.slow>0?"#9d8cff":"#e6f5e9";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=e.boss?18:6;ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#091014";ctx.fillRect(p.x-17,p.y-r-10,34,4);ctx.fillStyle=e.boss?"#ff4d6d":"#66f2bb";ctx.fillRect(p.x-17,p.y-r-10,34*Math.max(0,e.hp/e.maxHp),4);}
      for(const s of g.shots){ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.strokeStyle=s.color;ctx.globalAlpha=Math.min(1,s.life*8);ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1;}
      if(g.phase!=="playing"){ctx.fillStyle="rgba(2,6,12,.72)";ctx.fillRect(0,0,W,H);ctx.textAlign="center";ctx.fillStyle="#f2fbf9";ctx.font="800 34px sans-serif";ctx.fillText(g.phase==="gameover"?"THE BASTION FELL":"SIGNAL BASTION",W/2,235);ctx.font="500 15px sans-serif";ctx.fillStyle="#9bb6b8";ctx.fillText(g.phase==="gameover"?`You survived ${g.wave} waves.`:"Build. Overcharge. Endure.",W/2,270);}
      raf=requestAnimationFrame(draw);
    };raf=requestAnimationFrame(draw);const timer=window.setInterval(sync,250);return()=>{cancelAnimationFrame(raf);clearInterval(timer)};
  },[selectedPad,sync]);

  const canvasPoint=(e:React.PointerEvent<HTMLCanvasElement>)=>{const rect=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};};
  const canvasPointerDown=(e:React.PointerEvent<HTMLCanvasElement>)=>{const g=game.current;if(g.phase!=="playing")return;const {x,y}=canvasPoint(e);if(placement.current.active){e.currentTarget.setPointerCapture(e.pointerId);placement.current={active:true,dragging:true,x,y,valid:validPadPosition({x,y},g.pads)};return;}const pad=g.pads.find(p=>Math.hypot(p.x-x,p.y-y)<34);if(pad){setSelectedPad(pad.id);return;}setSelectedPad(null);if(Math.hypot(GENERATOR.x-x,GENERATOR.y-y)<=GENERATOR.radius+8){g.energy=Math.min(9999,g.energy+generatorOutput(g.generatorLevel));g.shots.push({x1:GENERATOR.x-13,y1:GENERATOR.y,x2:GENERATOR.x+13,y2:GENERATOR.y,life:.12,color:"#b8fff7"});return;}let target:Enemy|undefined,dist=32;for(const enemy of g.enemies){const p=pointAt(enemy.progress),d=Math.hypot(p.x-x,p.y-y);if(d<dist){dist=d;target=enemy;}}if(target&&g.energy>=2){g.energy-=2;target.hp-=12+g.wave*.35;const p=pointAt(target.progress);g.shots.push({x1:x,y1:y,x2:p.x,y2:p.y,life:.12,color:"#fff27a"});}};
  const canvasPointerMove=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!placement.current.active)return;const {x,y}=canvasPoint(e);placement.current={...placement.current,x,y,valid:validPadPosition({x,y},game.current.pads)};};
  const canvasPointerUp=(e:React.PointerEvent<HTMLCanvasElement>)=>{const place=placement.current;if(!place.active||!place.dragging)return;const g=game.current;if(place.valid&&g.energy>=PAD_ENERGY_COST&&g.scrap>=PAD_SCRAP_COST){const pad={id:g.padId++,x:place.x,y:place.y};g.energy-=PAD_ENERGY_COST;g.scrap-=PAD_SCRAP_COST;g.pads.push(pad);setSelectedPad(pad.id);sync();}placement.current={...place,active:false,dragging:false};setPlacingPad(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
  const startPadPlacement=()=>{if(snap.phase!=="playing"||snap.energy<PAD_ENERGY_COST||snap.scrap<PAD_SCRAP_COST)return;setSelectedPad(null);setPlacingPad(true);placement.current={active:true,dragging:false,x:W/2,y:H/2,valid:validPadPosition({x:W/2,y:H/2},game.current.pads)};};
  const cancelPadPlacement=()=>{placement.current.active=false;placement.current.dragging=false;setPlacingPad(false);};
  const build=(kind:TowerKind)=>{if(selectedPad===null)return;const g=game.current;if(g.towers.some(t=>t.pad===selectedPad))return;const cost=TOWER_DATA[kind].cost;if(g.energy<cost)return;g.energy-=cost;g.towers.push({pad:selectedPad,kind,level:1,cooldown:0});sync();};
  const tower=snap.towers.find(t=>t.pad===selectedPad),upgradeCost=tower?Math.floor(TOWER_DATA[tower.kind].cost*(.72+tower.level*.58)):0;
  const upgrade=()=>{if(!tower||game.current.scrap<upgradeCost)return;game.current.scrap-=upgradeCost;const live=game.current.towers.find(t=>t.pad===tower.pad);if(live)live.level++;sync();};
  const sell=()=>{if(!tower)return;const data=TOWER_DATA[tower.kind];game.current.energy+=Math.floor(data.cost*.6);game.current.towers=game.current.towers.filter(t=>t.pad!==tower.pad);sync();};
  const upgradeGenerator=()=>{const g=game.current,cost=generatorUpgradeCost(g.generatorLevel);if(g.scrap<cost)return;g.scrap-=cost;g.generatorLevel++;sync();};
  const upgradeExtraction=()=>{const g=game.current,cost=extractionUpgradeCost(g.extractionLevel);if(g.energy<cost)return;g.energy-=cost;g.extractionLevel++;sync();};
  const saveScore=async()=>{const row={name:userLabel,waves:snap.wave,enemies_defeated:snap.killed};setSaveStatus("Saving…");if(isSupabaseConfigured&&currentUser){const {error}=await supabase.from("signal_bastion_scores").insert({...row,user_id:currentUser.uid});setSaveStatus(error?"Could not save score.":"Score saved.");if(!error)void loadScores();}else{const local=JSON.parse(localStorage.getItem("signalBastionScores")||"[]") as ScoreRow[];const next=[{id:Date.now(),...row},...local].sort((a,b)=>b.waves-a.waves||b.enemies_defeated-a.enemies_defeated).slice(0,10);localStorage.setItem("signalBastionScores",JSON.stringify(next));setScores(next);setSaveStatus(currentUser?"Saved locally.":"Saved locally — sign in for the global board.");}};

  return <main className="sb-page"><HeaderWithAuth/><section className="sb-hero"><p>ENDLESS DEFENSE // ACTIVE CLICKER</p><h1>Signal <span>Bastion</span></h1><div className="sb-rule"/><small>Your clicks power humanity&apos;s last defense. How long can your signal hold?</small></section>
    <section className="sb-shell"><div className="sb-hud"><div><small>WAVE</small><strong>{snap.wave}</strong></div><div><small>CORE</small><strong className="life">{snap.lives}</strong></div><div><small>ENERGY</small><strong>{snap.energy}</strong></div><div><small>SCRAP</small><strong>{snap.scrap}</strong></div><div><small>DEFEATED</small><strong>{snap.killed}</strong></div>{snap.phase==="playing"&&snap.nextWaveIn>0&&<div><small>NEXT SIGNAL</small><strong>{snap.nextWaveIn}s</strong></div>}</div>
      <div className="sb-layout"><div className={`sb-stage ${placingPad?"placing":""}`}><canvas ref={canvasRef} width={W} height={H} onPointerDown={canvasPointerDown} onPointerMove={canvasPointerMove} onPointerUp={canvasPointerUp} onPointerCancel={canvasPointerUp}/>{snap.phase!=="playing"&&<div className="sb-start"><button onClick={begin}>{snap.phase==="gameover"?"REBUILD & RETRY":"BEGIN DEFENSE"}</button>{snap.phase==="gameover"&&<button className="secondary" onClick={saveScore}>SAVE SCORE</button>}<span>{saveStatus}</span></div>}<div className="sb-tip">{placingPad?"Press, drag, and release on clear ground to install the pad":"Click the generator for +3 energy · Click enemies to fire · Select a pad to manage it"}</div></div>
        <aside className="sb-controls"><h2>DEFENSE GRID</h2>
          {selectedPad===null&&!placingPad&&<div className="sb-control-view"><p>Place a platform anywhere outside the enemy route, then install a tower on it.</p><button className="sb-place-pad" onClick={startPadPlacement} disabled={snap.phase!=="playing"||snap.energy<PAD_ENERGY_COST||snap.scrap<PAD_SCRAP_COST}><b>PLACE NEW PAD</b><span>{PAD_ENERGY_COST} ENERGY + {PAD_SCRAP_COST} SCRAP</span></button><small>{snap.pads.length} CUSTOM PAD{snap.pads.length===1?"":"S"} DEPLOYED</small><div className="sb-general"><small>GENERAL UPGRADES</small><button onClick={upgradeGenerator} disabled={snap.phase!=="playing"||snap.scrap<generatorUpgradeCost(snap.generatorLevel)}><span><b>Generator output · LV {snap.generatorLevel}</b><small>+{generatorOutput(snap.generatorLevel)} → +{generatorOutput(snap.generatorLevel+1)} per click, +0.6/s</small></span><strong>{generatorUpgradeCost(snap.generatorLevel)} SCRAP</strong></button><button onClick={upgradeExtraction} disabled={snap.phase!=="playing"||snap.energy<extractionUpgradeCost(snap.extractionLevel)}><span><b>Scrap extraction · LV {snap.extractionLevel}</b><small>+{snap.extractionLevel*18}% → +{(snap.extractionLevel+1)*18}% enemy scrap</small></span><strong>{extractionUpgradeCost(snap.extractionLevel)} ENERGY</strong></button></div></div>}
          {placingPad&&<div className="sb-control-view sb-placement-view"><p>Move onto the battlefield, then press and drag the pad to a clear location. Red areas are blocked.</p><div className="sb-placement-icon">+</div><b>PLACING BUILD PAD</b><button className="sb-cancel" onClick={cancelPadPlacement}>CANCEL PLACEMENT</button></div>}
          {selectedPad!==null&&!tower&&<div className="sb-control-view"><p>Empty pad selected. Choose a tower to construct here.</p>{(Object.keys(TOWER_DATA) as TowerKind[]).map(k=>{const d=TOWER_DATA[k];return <button key={k} className="sb-tower" onClick={()=>build(k)} disabled={snap.energy<d.cost}><i style={{background:d.color}}/><span><b>{d.name}</b><small>{k==="rail"?"Heavy single target":k==="arc"?"Chains nearby targets":k==="cryo"?"Chance to slow targets":"Generates scrap automatically"}</small></span><strong>{d.cost}⚡</strong></button>})}<button className="sb-back" onClick={()=>setSelectedPad(null)}>BACK TO GRID</button></div>}
          {tower&&<TowerStats tower={tower} upgradeCost={upgradeCost} scrap={snap.scrap} onUpgrade={upgrade} onSell={sell} onClose={()=>setSelectedPad(null)}/>}
        </aside></div>
    </section>
    <section className="sb-lower"><article><p>FIELD MANUAL</p><h2>Stay active. Build smart.</h2><div className="sb-manual"><span><b>01</b>Click the battlefield generator to produce energy for your defenses.</span><span><b>02</b>Spend energy and scrap on custom pads, towers, and upgrades.</span><span><b>03</b>Boss signals arrive every 10 waves and cost 5 core integrity.</span></div></article><article className="sb-board"><p>GLOBAL TRANSMISSIONS</p><h2>Top defenders</h2>{scores.length?ol(scores.map((s,i)=><li key={s.id}><b>#{i+1}</b><span>{s.name}</span><strong>WAVE {s.waves}</strong><small>{s.enemies_defeated} defeated</small></li>)):<div className="sb-empty">No signals recorded yet. Be the first.</div>}</article></section>
  </main>;
}

function ol(children:React.ReactNode){return <ol>{children}</ol>}

function TowerStats({tower,upgradeCost,scrap,onUpgrade,onSell,onClose}:{tower:Tower;upgradeCost:number;scrap:number;onUpgrade:()=>void;onSell:()=>void;onClose:()=>void}){
  const data=TOWER_DATA[tower.kind],levelScale=1+(tower.level-1)*.72,range=data.range*(1+(tower.level-1)*.08),isMiner=tower.kind==="miner";
  return <div className="sb-control-view sb-stats"><div className="sb-stats-title"><i style={{background:data.color}}/><div><small>SELECTED TOWER · LEVEL {tower.level}</small><h3>{data.name}</h3></div></div><dl>{isMiner?<><div><dt>SCRAP RATE</dt><dd>{minerRate(tower.level).toFixed(2)}/s</dd></div><div><dt>NEXT LEVEL</dt><dd>{minerRate(tower.level+1).toFixed(2)}/s</dd></div><div><dt>ATTACK</dt><dd>NONE</dd></div><div><dt>PLACEMENT</dt><dd>ANY CLEAR PAD</dd></div></>:<><div><dt>DAMAGE</dt><dd>{Math.round(data.damage*levelScale)}</dd></div><div><dt>RANGE</dt><dd>{Math.round(range)}</dd></div><div><dt>FIRE DELAY</dt><dd>{(data.rate/Math.pow(.88,tower.level-1)).toFixed(2)}s</dd></div><div><dt>SPECIAL</dt><dd>{tower.kind==="rail"?"Armor punch":tower.kind==="arc"?"Chain ×2":`${Math.round(cryoChance(tower.level)*100)}% freeze`}</dd></div></>}</dl><button className="sb-upgrade" onClick={onUpgrade} disabled={scrap<upgradeCost}>UPGRADE TO LV {tower.level+1}<span>{upgradeCost} SCRAP</span></button><button className="sb-sell" onClick={onSell}>SELL TOWER · {Math.floor(data.cost*.6)} ENERGY</button><button className="sb-back" onClick={onClose}>BACK TO GRID</button></div>;
}
