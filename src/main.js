const $ = (id) => document.getElementById(id);
const showBootError = (err) => { const box=$('bootError'); box.classList.remove('hidden'); box.textContent=`IdleFist boot error:\n${err?.stack||err}`; console.error(err); };
window.addEventListener('error', e=>showBootError(e.error||e.message));
window.addEventListener('unhandledrejection', e=>showBootError(e.reason));

const LANE_Y={upper:118,mid:214,lower:292};
const LANE_LABEL={upper:'UPPER',mid:'MID',lower:'LOW'};
const ENEMIES=[
  {name:'Hall Rat',kind:'crawler',lanes:['lower'],attackLane:'lower',hp:18,power:5,speed:96,range:88,drop:'S'},
  {name:'Knife Rat',kind:'crawler',lanes:['lower'],attackLane:'lower',hp:22,power:6,speed:104,range:84,drop:'S'},
  {name:'Training Drone',kind:'drone',lanes:['mid'],attackLane:'mid',hp:24,power:7,speed:86,range:98,drop:'R'},
  {name:'Punching Dummy',kind:'dummy',lanes:['mid','lower'],attackLane:'mid',hp:34,power:8,speed:62,range:104,drop:'F'},
  {name:'Rolling Turret',kind:'turret',lanes:['mid','lower'],attackLane:'lower',hp:38,power:9,speed:70,range:104,drop:'R'},
];
const BOSSES=[
  {name:'Big Training Drone',kind:'drone',lanes:['mid'],attackLane:'mid',hp:76,power:12,speed:66,range:112,boss:true,drop:'R'},
  {name:'Two-Lane Bruiser',kind:'dummy',lanes:['mid','lower'],attackLane:'mid',hp:92,power:13,speed:58,range:110,boss:true,drop:'F'},
];
const HIT_BOXES={
  punch:{x1:46,x2:92,y1:-82,y2:-50,lane:'mid'}, oneTwo:{x1:48,x2:105,y1:-84,y2:-48,lane:'mid'},
  kick:{x1:52,x2:106,y1:-32,y2:0,lane:'lower'}, sweep:{x1:34,x2:102,y1:10,y2:32,lane:'lower'},
  uppercut:{x1:28,x2:76,y1:-124,y2:-60,lane:'upper'}, jumpKick:{x1:54,x2:108,y1:-138,y2:-98,lane:'upper'},
  hadouken:{x1:72,x2:190,y1:-88,y2:-48,lane:'mid'}
};
const rand=(a,b)=>Math.random()*(b-a)+a, randInt=(a,b)=>Math.floor(rand(a,b+1)), sample=a=>a[randInt(0,a.length-1)], clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const UI={ svg:$('fightSvg'),bg:$('backgroundLayer'),dude:$('dudeGroup'),enemy:$('enemyGroup'),fx:$('fxLayer'),shakeLayer:$('shakeLayer'),floorLabel:$('floorLabel'),moveLabel:$('moveLabel'),stateLabel:$('stateLabel'),fighterProfileSelect:$('fighterProfileSelect'),enemyName:$('enemyName'),heroMeters:$('heroMeters'),enemyMeters:$('enemyMeters'),combatLog:$('combatLog'),buildSummary:$('buildSummary'),runStats:$('runStats'),pauseBtn:$('pauseBtn'),speedBtn:$('speedBtn'),restartBtn:$('restartBtn'),levelModal:$('levelModal'),levelText:$('levelText'),choiceList:$('choiceList'),autoPickBtn:$('autoPickBtn'),autoPowerToggle:$('autoPowerToggle'),manualToggle:$('manualToggle'),manualControls:$('manualControls') };
function assertUI(){ for(const [k,v] of Object.entries(UI)) if(!v) throw new Error(`Missing UI element: ${k}`); }
let currentFighterProfile='default';
let lastFacing=1;
const FIGHTER_PROFILES={default:{label:'Default',line:3.05,joint:2.7,walkSpeed:116},alleyBrawler:{label:'Alley Brawler',line:3.65,joint:3.35,walkSpeed:168}};
const profileHasKi=()=>currentFighterProfile==='alleyBrawler';
const baseBuildForProfile=()=>['Punch','One-Two','Kick','Foot Sweep','Uppercut','Jump Kick','Jump','Duck','Mid Block'].concat(profileHasKi()?['Hadouken [Ki test]']:[]);
function syncProfileUi(){ document.querySelectorAll('[data-profile-only]').forEach(el=>el.classList.toggle('hidden',el.dataset.profileOnly!==currentFighterProfile)); document.querySelectorAll('[data-hotkey-profile-only]').forEach(el=>el.classList.toggle('hidden',el.dataset.hotkeyProfileOnly!==currentFighterProfile)); }
function setFighterProfile(profile,{silent=false}={}){ if(!FIGHTER_PROFILES[profile]) profile='default'; currentFighterProfile=profile; if(state){ state.fighterProfile=profile; state.dude.profile=profile; state.dude.maxX=884; state.dude.minX=54; state.dude.actionInterval=profile==='alleyBrawler'?Math.min(state.dude.actionInterval,.76):state.dude.actionInterval; state.build=baseBuildForProfile(); if(!profileHasKi()){ state.stats.X=0; state.resources.X=0; state.resources.XMax=0; if(state.dude.attack?.move==='hadouken')state.dude.attack=null; } else { state.stats.X=Math.max(1,state.stats.X||1); state.resources.XMax=Math.max(100,state.resources.XMax||100); state.resources.X=Math.max(35,state.resources.X||0); } } if(UI?.fighterProfileSelect) UI.fighterProfileSelect.value=profile; syncProfileUi(); if(!silent) pushLog(`Fighter Profile: ${FIGHTER_PROFILES[profile].label}.`); }
const ns='http://www.w3.org/2000/svg';
const el=(name,attrs={},kids=[])=>{const n=document.createElementNS(ns,name); for(const[k,v]of Object.entries(attrs)) n.setAttribute(k,v); for(const c of kids)n.appendChild(c); return n;};
const line=(x1,y1,x2,y2,cls)=>el('line',{x1,y1,x2,y2,class:cls});
const circle=(cx,cy,r,cls)=>el('circle',{cx,cy,r,class:cls});
const text=(x,y,t,cls='')=>{const n=el('text',{x,y,class:cls,fill:'rgba(255,255,255,.56)','font-size':15,'font-weight':800}); n.textContent=t; return n;};

const MOVE_POOL=[
 {stat:'F',name:'Iron Knuckles',description:'Fortitude: +4 Punch damage and +10 Fortitude.',apply:s=>{s.stats.F++;s.dude.punchPower+=4;s.dude.maxHp+=10;s.dude.hp+=10;s.build.push('F: Iron Knuckles')}},
 {stat:'F',name:'Shin Breaker',description:'Fortitude: +5 Kick damage.',apply:s=>{s.stats.F++;s.dude.kickPower+=5;s.build.push('F: Shin Breaker')}},
 {stat:'F',name:'Bruiser Frame',description:'Fortitude: +25 max Fortitude.',apply:s=>{s.stats.F++;s.dude.maxHp+=25;s.dude.hp+=25;s.build.push('F: Bruiser Frame')}},
 {stat:'R',name:'Read The Room',description:'Resourcefulness: better automatic dodge reads and +15 R.',apply:s=>{s.stats.R++;s.dude.timing+=.12;s.resources.RMax+=15;s.resources.R=s.resources.RMax;s.build.push('R: Read The Room')}},
 {stat:'R',name:'Snap Reflex',description:'Resourcefulness: dodge windows last longer and cost less R.',apply:s=>{s.stats.R++;s.dude.jumpWindow+=.1;s.dude.duckWindow+=.1;s.dude.dodgeCost=Math.max(12,s.dude.dodgeCost-3);s.build.push('R: Snap Reflex')}},
 {stat:'S',name:'Combo Tempo',description:'Style: faster actions and +10 S.',apply:s=>{s.stats.S++;s.dude.actionInterval*=.9;s.resources.SMax+=10;s.resources.S=s.resources.SMax;s.build.push('S: Combo Tempo')}},
 {stat:'S',name:'Follow Through',description:'Style: combos spend S for bonus damage.',apply:s=>{s.stats.S++;s.dude.comboDamage+=3;s.build.push('S: Follow Through')}},
 {stat:'S',name:'Clean Footwork',description:'Style: better step-in and recovery.',apply:s=>{s.stats.S++;s.dude.stepSpeed+=30;s.build.push('S: Clean Footwork')}},
];
function initBackground(){ UI.bg.innerHTML=''; for(let x=0;x<980;x+=80)UI.bg.appendChild(line(x,0,x+40,326,'bg-line')); for(const [key,y] of Object.entries(LANE_Y)){ UI.bg.appendChild(el('line',{x1:0,y1:y,x2:960,y2:y,stroke:key==='upper'?'rgba(217,135,255,.18)':'rgba(244,201,93,.26)','stroke-width':1.5,'stroke-dasharray':key==='upper'?'8 7':'none'})); UI.bg.appendChild(text(18,y-8,`${LANE_LABEL[key]} LANE`,key==='upper'?'lane-svg reserved':'lane-svg')); } }
const laneCenter=lanes=>lanes.reduce((s,l)=>s+LANE_Y[l],0)/lanes.length;
function spawnEnemy(floor,forceBoss=false,side='right',slotIndex=0){ const base={...(forceBoss?sample(BOSSES):sample(ENEMIES))}; const scale=1+(floor-1)*(base.boss?.16:.105); const maxHp=Math.round(base.hp*scale); const x=side==='left'?-70-slotIndex*54:1030+slotIndex*54; return {...base,id:`${Date.now()}-${Math.random()}`,hp:maxHp,maxHp,power:Math.round(base.power*scale),speed:Math.round(base.speed*1.38),x,side,y:laneCenter(base.lanes),attackCd:.22+slotIndex*.18,hitFlash:0,attack:null,stagger:0}; }
function rollEnemySide(floor,boss=false){ if(boss)return 'right'; if(floor===1)return Math.random()<.42?'left':'right'; if(floor===2)return Math.random()<.34?'left':'right'; return Math.random()<.45?'left':'right'; }
function enemyCountForFloor(floor,boss=false){ if(boss)return 1; return Math.min(4, 2 + Math.floor((floor-1)/3)); }
function makeEnemyWave(floor,boss=false){ const count=enemyCountForFloor(floor,boss); return Array.from({length:count},(_,i)=>spawnEnemy(floor,boss,rollEnemySide(floor,boss),i)); }
function aliveEnemies(){ return (state.enemySlots||[]).filter(e=>e&&e.hp>0); }
function setActiveEnemy(){ const living=aliveEnemies(); state.enemy=living.length?living.reduce((best,e)=>Math.abs(e.x-state.dude.x)<Math.abs(best.x-state.dude.x)?e:best,living[0]):null; return state.enemy; }
function enemyDir(){const e=state.enemy,d=state.dude;return !e||e.x>=d.x?1:-1;}
function setFacing(dir){dir=dir<0?-1:1;if(state.dude.facing!==dir){state.dude.prevFacing=state.dude.facing||1;state.dude.facing=dir;state.dude.turnLock=.24;setPose('turn',.24);}lastFacing=dir;}
function rollFloorTarget(){return randInt(8,12)}
function createInitialState(){ const s={running:true,speed:1,awaitingChoice:false,fighterProfile:currentFighterProfile,floor:1,floorKills:0,floorTarget:rollFloorTarget(),bossPending:false,level:1,xp:0,kills:0,totalDamage:0,combo:0,ascensions:0,defeated:false,deathTimer:0,autoRestartDelay:3,stats:{F:1,R:1,S:1,X:profileHasKi()?1:0},resources:{R:100,RMax:100,S:100,SMax:100,X:profileHasKi()?35:0,XMax:profileHasKi()?100:0},build:baseBuildForProfile(),pendingChoices:[],fx:[],shake:0,autoPower:true,manual:false,dude:{hp:90,maxHp:90,x:190,baseX:190,minX:54,maxX:884,profile:currentFighterProfile,facing:1,prevFacing:1,turnLock:0,y:LANE_Y.lower,punchPower:12,kickPower:12,actionInterval:.84,actionCd:.15,stepSpeed:92,timing:.58,jumpWindow:.42,duckWindow:.42,dodgeCost:25,counterBonus:0,comboDamage:0,pose:'idle',poseTime:0,invuln:0,attack:null},enemy:null,enemySlots:[],log:['The Dude enters Floor 1. Clear the wave, then punch the miniboss.']}; s.enemySlots=makeEnemyWave(s.floor,false); s.enemy=s.enemySlots.reduce((best,e)=>Math.abs(e.x-s.dude.x)<Math.abs(best.x-s.dude.x)?e:best,s.enemySlots[0]); return s; }
let state=createInitialState(), lastTs=performance.now();
function pushLog(t){state.log.unshift(t);state.log=state.log.slice(0,13)}
function setPose(p,time=.28){state.dude.pose=p;state.dude.poseTime=time}
function addFx(kind,x,y){state.fx.push({kind,x,y,t:.22,max:.22})}
function addTextFx(label,x,y){state.fx.push({kind:'text',label,x,y,t:.55,max:.55})}
function spendR(a){state.resources.R=Math.max(0,state.resources.R-a)} function spendS(a){state.resources.S=Math.max(0,state.resources.S-a)}
function dropReward(e){ const k=e.drop||sample(['F','R','S']); if(k==='F')state.dude.hp=Math.min(state.dude.maxHp,state.dude.hp+14+state.stats.F*2); if(k==='R')state.resources.R=Math.min(state.resources.RMax,state.resources.R+25+state.stats.R*3); if(k==='S')state.resources.S=Math.min(state.resources.SMax,state.resources.S+25+state.stats.S*3); addTextFx(`+${k}`,e.x-20,e.y-90); pushLog(`${e.name} drops a ${k} refill.`); }
function damageEnemy(amount,source){ const e=state.enemy; if(!e||e.hp<=0)return; const bonus=(state.resources.S>=10&&state.dude.comboDamage>0)?Math.min(24,state.combo*state.dude.comboDamage):0; if(bonus)spendS(10); const total=amount+bonus; e.hp-=total; e.hitFlash=.16; e.stagger=.22; state.shake=.12; state.totalDamage+=total; state.combo++; addFx('hit',e.x-32,e.y-24); addTextFx(total,e.x-48,e.y-58); pushLog(`${source} connects for ${total}${bonus?` (${state.combo}x combo, S spent)`:''}.`); if(e.hp<=0)defeatEnemy(source); else setActiveEnemy(); }
function defeatDude(source){ const d=state.dude; if(state.defeated)return; d.hp=0; d.attack=null; d.invuln=0; state.defeated=true; state.deathTimer=0; state.running=false; state.combo=0; setPose('dead',999); state.shake=.18; addFx('hit',d.x,d.y-72); addTextFx('KO',d.x-16,d.y-116); pushLog(`The Dude falls on floor ${state.floor}. ${state.manual?'Manual mode: press Restart when ready.':'Auto-restart in 3 seconds.'}`); }
function damageDude(amount,source){ const d=state.dude; if(state.defeated||d.invuln>0)return; d.hp-=amount; d.invuln=.25; state.combo=0; setPose('hurt',.25); addFx('hit',d.x,d.y-70); pushLog(`${source} hits The Dude for ${amount}.`); if(d.hp<=0)defeatDude(source);}
function startNextEncounter(){ const bossNow=state.bossPending; state.enemySlots=makeEnemyWave(state.floor,bossNow); state.enemy=state.enemySlots.reduce((best,e)=>Math.abs(e.x-state.dude.x)<Math.abs(best.x-state.dude.x)?e:best,state.enemySlots[0]); state.dude.x=clamp(state.dude.x,state.dude.minX,state.dude.maxX); state.dude.attack=null; state.dude.turnLock=.18; state.dude.profile=currentFighterProfile; setFacing(enemyDir()); const leftCount=state.enemySlots.filter(e=>e.side==='left').length; if(leftCount)pushLog(`${leftCount} enemy${leftCount>1?'ies':'y'} rush in from the left.`); if(state.enemySlots.length>1)pushLog(`${state.enemySlots.length} enemies enter the lane.`); if(bossNow)pushLog(`MINIBOSS: ${state.enemy.name} blocks the stairwell.`); }
function ascendTower(){ state.ascensions++; state.floor=1; state.floorKills=0; state.floorTarget=rollFloorTarget(); state.bossPending=false; if(profileHasKi())state.resources.X=Math.min(state.resources.XMax,state.resources.X+25); pushLog(profileHasKi()?'ASCENSION! The tower folds back to Floor 1. Ki stirs.':'ASCENSION! The tower folds back to Floor 1.'); }
function defeatEnemy(source){ const e=state.enemy, defeatedBoss=!!e?.boss; if(!e)return; pushLog(`${e.name} goes down to ${source}.`); dropReward(e); state.kills++; state.xp+=defeatedBoss?2:1; state.combo=0; if(profileHasKi())state.resources.X=Math.min(state.resources.XMax,state.resources.X+(defeatedBoss?12:3)); state.enemySlots=(state.enemySlots||[]).filter(x=>x&&x.hp>0); if(state.enemySlots.length){ setActiveEnemy(); return; } if(defeatedBoss){state.floor++;state.floorKills=0;state.floorTarget=rollFloorTarget();state.bossPending=false;if(state.floor>100)ascendTower();} else {state.floorKills++; if(state.floorKills>=state.floorTarget)state.bossPending=true;} if(state.xp>=3){state.xp=0;state.level++;offerLevelChoices()} else startNextEncounter(); }
function enemyNeedsDodge(e){return e.attackLane==='lower'?'jump':'duck'}
function chooseAttackForEnemy(e){ if(e.lanes.includes('upper'))return state.resources.S>=22?'jumpKick':'uppercut'; if(e.lanes.includes('mid'))return state.combo>0&&state.resources.S>=16?'oneTwo':'punch'; if(e.lanes.includes('lower'))return state.resources.S>=12&&Math.random()<.45?'sweep':'kick'; return 'punch'; }
function chooseAutoMove(e){ const dist=Math.abs(e.x-state.dude.x); if(e.attack&&e.attack.t<e.attack.impact&&Math.random()<state.dude.timing){if(e.attack.lane==='mid'&&Math.random()<.55)return 'block'; if(state.resources.R>=state.dude.dodgeCost)return enemyNeedsDodge(e);} if(profileHasKi()&&state.resources.X>=45&&dist>145&&dist<250&&Math.random()<.22)return 'hadouken'; if(dist<148){setFacing(enemyDir());return chooseAttackForEnemy(e);} return 'advance'; }
function moveSpec(move){ return {punch:{duration:currentFighterProfile==='alleyBrawler'?.44:.38,impacts:[.20],costS:0,label:'Lead Jab'},oneTwo:{duration:currentFighterProfile==='alleyBrawler'?.78:.66,impacts:[.16,.46],costS:14,label:'Jab-Cross'},kick:{duration:currentFighterProfile==='alleyBrawler'?.54:.46,impacts:[.30],costS:0,label:'Side Kick'},sweep:{duration:currentFighterProfile==='alleyBrawler'?.58:.48,impacts:[.30],costS:10,label:'Low Sweep'},uppercut:{duration:currentFighterProfile==='alleyBrawler'?.56:.46,impacts:[.30],costS:8,label:'Rising Upper'},jumpKick:{duration:currentFighterProfile==='alleyBrawler'?.68:.62,impacts:[.36],costS:18,label:'Jump Kick'},hadouken:{duration:.78,impacts:[.46],costS:0,costX:35,label:'Hadouken'}}[move]||{duration:.36,impacts:[.18],costS:0,label:move}; }
function startDudeAttack(move){ const e=state.enemy,d=state.dude;if(!e||d.attack)return; if(move==='hadouken'&&!profileHasKi()){addTextFx('no Ki',d.x+50,d.y-95);pushLog('Ki techniques are not unlocked for this Fighter Profile.');return;} const spec=moveSpec(move); if(spec.costS&&state.resources.S<spec.costS){addTextFx('no S',d.x+50,d.y-95);pushLog(`${spec.label} needs more Style.`);return;} if(spec.costX&&state.resources.X<spec.costX){addTextFx('no Ki',d.x+50,d.y-95);pushLog(`${spec.label} needs more Ki.`);return;} if(spec.costS)spendS(spec.costS); if(spec.costX)state.resources.X=Math.max(0,state.resources.X-spec.costX); d.attack={move,t:0,duration:spec.duration,impacts:spec.impacts.map(t=>({t,done:false})),impact:spec.impacts[0],label:spec.label,hitBox:null,showBox:0}; setPose(move,spec.duration); }
function performDudeAction(move){ const e=state.enemy;if(!e||e.hp<=0)return; if(move==='advance'){setFacing(enemyDir());setPose('run',.28);return} if(move==='block'){state.dude.invuln=Math.max(state.dude.invuln,.18);setPose('block',.42);state.combo=Math.max(0,state.combo-1);pushLog('The Dude covers mid.');return} if(move==='jump'){if(state.resources.R<state.dude.dodgeCost){addTextFx('no R',state.dude.x+45,state.dude.y-90);return} spendR(state.dude.dodgeCost);state.dude.invuln=Math.max(state.dude.invuln,state.dude.jumpWindow);setPose('jump',state.dude.jumpWindow);state.combo=Math.max(0,state.combo-1);pushLog('The Dude jumps the low lane. R spent.');return} if(move==='duck'){if(state.resources.R<state.dude.dodgeCost){addTextFx('no R',state.dude.x+45,state.dude.y-90);return} spendR(state.dude.dodgeCost);state.dude.invuln=Math.max(state.dude.invuln,state.dude.duckWindow);setPose('duck',state.dude.duckWindow);state.combo=Math.max(0,state.combo-1);pushLog('The Dude ducks the mid lane. R spent.');return} if(['punch','oneTwo','kick','sweep','uppercut','jumpKick'].includes(move)||(move==='hadouken'&&profileHasKi()))startDudeAttack(move); }
function startEnemyAttack(target=state.enemy){const e=target;if(!e||e.attack)return;e.attack={t:0,duration:.56,impact:.32,done:false,lane:e.attackLane};pushLog(`${e.name} winds up ${e.attackLane}.`);}
function getEnemyHurtBox(e){const y1=Math.min(...e.lanes.map(l=>LANE_Y[l]-42)),y2=Math.max(...e.lanes.map(l=>LANE_Y[l]+28)),wide=e.lanes.length>1?58:44;return{x1:e.x-wide,x2:e.x+wide,y1,y2};}
function getDudeHitBox(move){const d=state.dude,b=HIT_BOXES[move]; const lift=(d.pose==='jump'||d.pose==='jumpKick')?-48:d.pose==='duck'?23:0; const face=d.facing||enemyDir(); return face>=0?{x1:d.x+b.x1,x2:d.x+b.x2,y1:d.y+lift+b.y1,y2:d.y+lift+b.y2,lane:b.lane}:{x1:d.x-b.x2,x2:d.x-b.x1,y1:d.y+lift+b.y1,y2:d.y+lift+b.y2,lane:b.lane};}
const boxesOverlap=(a,b)=>a.x1<=b.x2&&a.x2>=b.x1&&a.y1<=b.y2&&a.y2>=b.y1;
function attackBaseDamage(move){const d=state.dude; if(move==='punch')return d.punchPower; if(move==='oneTwo')return Math.max(6,Math.floor(d.punchPower*.72)); if(move==='kick')return d.kickPower+2; if(move==='sweep')return Math.max(5,Math.floor(d.kickPower*.72)); if(move==='uppercut')return Math.floor((d.punchPower+d.kickPower)/2)+5; if(move==='jumpKick')return Math.floor((d.punchPower+d.kickPower)/2)+9; if(move==='hadouken')return 18+state.stats.X*4; return 8;}
function processDudeAttack(dt){const d=state.dude,e=state.enemy,a=d.attack;if(!a||!e)return; a.t+=dt; for(const impact of a.impacts){ if(!impact.done&&a.t>=impact.t){impact.done=true; const hitBox=getDudeHitBox(a.move),hurtBox=getEnemyHurtBox(e),laneOk=e.lanes.includes(hitBox.lane); if(a.move==='oneTwo'&&impact.t>.2){hitBox.x1+=14;hitBox.x2+=18;} a.hitBox=hitBox; a.showBox=.13; if(laneOk&&boxesOverlap(hitBox,hurtBox)){damageEnemy(randInt(attackBaseDamage(a.move)-2,attackBaseDamage(a.move)+4)+Math.floor((a.move==='hadouken'?state.stats.X:state.stats.F)*1.5),a.label); if(profileHasKi()&&a.move!=='hadouken')state.resources.X=Math.min(state.resources.XMax,state.resources.X+3);}  else{state.combo=0;pushLog(`${a.label} whiffs${laneOk?'':' the wrong lane'}.`);addTextFx('whiff',d.x+82,d.y-94);}} } if(a.showBox)a.showBox=Math.max(0,a.showBox-dt); if(a.t>=a.duration){d.attack=null;if(d.pose===a.move)d.pose='idle';}}
function processEnemyAttack(dt,target=state.enemy){const e=target,d=state.dude,a=e?.attack;if(!a)return; a.t+=dt; if(!a.done&&a.t>=a.impact){a.done=true; const dist=Math.abs(e.x-d.x);if(dist>e.range+22)return; const blocked=a.lane==='mid'&&d.pose==='block'; const dodged=(a.lane==='lower'&&d.pose==='jump')||(a.lane==='mid'&&d.pose==='duck')||d.invuln>0||blocked; if(dodged){addFx(blocked?'block':'dodge',d.x,d.y-74);addTextFx(blocked?'BLOCK':'DODGE',d.x-20,d.y-112);pushLog(blocked?`The Dude blocks ${e.name}'s mid attack.`:`The Dude dodges ${e.name}'s ${a.lane} attack.`);return;} damageDude(randInt(Math.max(1,e.power-2),e.power+2),e.name);} if(a.t>=a.duration)e.attack=null;}
function update(dt){
 const d=state.dude;
 state.fx.forEach(f=>f.t-=dt); state.fx=state.fx.filter(f=>f.t>0);
 state.shake=Math.max(0,(state.shake||0)-dt);
 if(state.defeated){
  state.deathTimer+=dt; d.pose='dead'; d.poseTime=999;
  if(!state.manual&&state.deathTimer>=state.autoRestartDelay){
   const oldAsc=state.ascensions; state=createInitialState(); state.ascensions=oldAsc;
   pushLog('The Dude shakes it off and starts over.');
  }
  return;
 }
 if(state.awaitingChoice)return;
 if(!state.enemySlots?.length){startNextEncounter();return;}
 setActiveEnemy();
 const e=state.enemy;
 if(!e)return;
 setFacing(enemyDir());
 d.turnLock=Math.max(0,(d.turnLock||0)-dt);
 d.poseTime=Math.max(0,d.poseTime-dt);
 d.invuln=Math.max(0,d.invuln-dt);
 for(const foe of aliveEnemies()){foe.hitFlash=Math.max(0,foe.hitFlash-dt);foe.stagger=Math.max(0,foe.stagger-dt);}
 state.resources.R=Math.min(state.resources.RMax,state.resources.R+(12+state.stats.R*2)*dt);
 state.resources.S=Math.min(state.resources.SMax,state.resources.S+(8+state.stats.S*1.5)*dt);
 if(profileHasKi())state.resources.X=Math.min(state.resources.XMax,state.resources.X+(3+state.stats.X)*dt);
 processDudeAttack(dt);
 if(d.poseTime<=0&&!['idle','run','turn'].includes(d.pose)&&!d.attack)d.pose='idle';
 if(!state.running){
  if(!d.attack&&(d.pose==='run'||d.pose==='turn')&&d.turnLock<=0)d.pose='idle';
  return;
 }
 const desired=e.attack?108:132;
 const profile=FIGHTER_PROFILES[currentFighterProfile]||FIGHTER_PROFILES.default;
 for(const foe of aliveEnemies()){
  const dirToDude=foe.x>=d.x?1:-1;
  const gap=Math.abs(foe.x-d.x);
  const closing=gap>desired+8;
  if(closing){
   const enemyStep=foe.speed*.58*dt;
   foe.x=clamp(foe.x-dirToDude*enemyStep,-90,1050);
  } else {
   const overlap=desired-gap;
   if(overlap>0)foe.x=clamp(foe.x+dirToDude*overlap*.09,-90,1050);
  }
  foe.attackCd-=dt;
  if(foe.attackCd<=0&&!foe.attack&&Math.abs(foe.x-d.x)<foe.range+52){
   foe.attackCd+=foe.boss ? .66 : rand(.54,.86);
   startEnemyAttack(foe);
  }
  processEnemyAttack(dt,foe);
 }
 setActiveEnemy();
 const active=state.enemy;
 const dir=enemyDir();
 const gap=Math.abs(active.x-d.x);
 if(gap>desired+8){
  const dudeStep=(profile.walkSpeed||100)*dt;
  if(!d.attack && d.turnLock<=0){
   d.x=clamp(d.x+dir*dudeStep,d.minX,d.maxX);
   if(!['jump','duck','block','hurt','dead','turn'].includes(d.pose))d.pose='run';
  }
 } else {
  const overlap=desired-gap;
  if(overlap>0 && !d.attack)d.x=clamp(d.x-dir*overlap*.045,d.minX,d.maxX);
  if(!d.attack&&(d.pose==='run'||d.pose==='turn')&&d.turnLock<=0)d.pose='idle';
 }
 d.actionCd-=dt;
 if(!state.manual&&d.actionCd<=0&&!d.attack){
  d.actionCd+=d.actionInterval;
  performDudeAction(chooseAutoMove(active));
 }
}
function phase(){const a=state.dude.attack;if(!a)return 0;if(a.move==='oneTwo'){const second=a.t>=.28,start=second?.28:0,impact=second?.40:.15,end=second?a.duration:.28;if(a.t<=impact)return clamp((a.t-start)/(impact-start),0,1);return 1-clamp((a.t-impact)/(end-impact),0,1)*.35;}const first=a.impact||.18;if(a.t<=first)return a.t/first;return 1-((a.t-first)/(a.duration-first))*.35;}
function limbs(g,pts){for(const p of pts)g.append(line(...p));}
const DUDE_MODEL={headR:11,upperArm:27,foreArm:34,upperLeg:34,lowerLeg:43,jointR:2.7};
const pt=(x,y,deg,len)=>[x+Math.cos(deg*Math.PI/180)*len,y+Math.sin(deg*Math.PI/180)*len];
function chain(g,x,y,a1,l1,a2,l2,cls='dude-line',endCls='dude-line') { const [ex,ey]=pt(x,y,a1,l1), [hx,hy]=pt(ex,ey,a2,l2); g.append(line(x,y,ex,ey,cls)); g.append(line(ex,ey,hx,hy,endCls)); g.append(circle(ex,ey,DUDE_MODEL.jointR,'dude-joint')); g.append(circle(hx,hy,DUDE_MODEL.jointR*.72,'end-cap')); return [hx,hy]; }
function poseAngles(pose,p,t){
 const walk=Math.sin(t/75), step=Math.cos(t/75), breathe=Math.sin(t/300);
 const two=state.dude.attack&&state.dude.attack.t>.30;
 const alley=currentFighterProfile==='alleyBrawler';
 const snap=p>.52;
 if(!alley){
  const base={la:[142+breathe*4,154],ra:[28-breathe*3,36],ll:[112,76+breathe*2],rl:[68,104-breathe*2],lean:breathe*1.5,hip:breathe*1.2};
  if(pose==='turn')return {la:[120,148],ra:[62,86],ll:[98,82],rl:[80,116],lean:-10+18*p,hip:-4+8*p};
  if(pose==='run')return {la:[150+walk*14,152],ra:[28-walk*14,35],ll:[104-walk*22,72+walk*20],rl:[72+walk*22,110-walk*20],lean:5,hip:walk*3};
  if(pose==='punch')return {la:[150,154],ra:[p<.72?-28:0,p<.72?18:0],ll:[108,74],rl:[70,105],lean:7};
  if(pose==='oneTwo')return two?{la:[-8,0],ra:[145,160],ll:[84,96],rl:[60,124],lean:11,hip:8}:{la:[150,154],ra:[-5,2],ll:[112,72],rl:[66,104],lean:5};
  if(pose==='kick')return {la:[150,154],ra:[24,42],ll:[112,76],rl:snap?[-14,-8]:[38,48],lean:-3};
  if(pose==='sweep')return {la:[154,154],ra:[24,52],ll:[124,86],rl:[28,14],lean:7,hip:6};
  if(pose==='uppercut')return {la:[154,154],ra:[-82,-98],ll:[108,74],rl:[70,105],lean:-7};
  if(pose==='jumpKick')return {la:[156,152],ra:[24,46],ll:[140,170],rl:snap?[-12,-8]:[34,28],lean:2};
  if(pose==='jump')return {la:[160,154],ra:[20,28],ll:[130,158],rl:[48,22],lean:0};
  if(pose==='duck')return {la:[160,154],ra:[16,34],ll:[126,46],rl:[54,134],lean:10,hip:13};
  if(pose==='block')return {la:[-88,-34],ra:[-118,-146],ll:[110,76],rl:[68,108],lean:3};
  if(pose==='hurt')return {la:[170,168],ra:[8,16],ll:[116,82],rl:[72,112],lean:-8};
  return base;
 }

 // Alley Brawler: exaggerated, left-to-right fighting-game style pose reads.
 const base={la:[-112+breathe*6,-145],ra:[-58-breathe*4,-104],ll:[114,64+breathe*4],rl:[56,126-breathe*4],lean:7+breathe*3,hip:breathe*2};
 if(pose==='turn')return {la:[-40,-74],ra:[-138,-166],ll:[84,94],rl:[78,128],lean:24-44*p,hip:16-26*p};
 if(pose==='run')return {
  la:[-118+walk*34,-150+walk*8],
  ra:[-42-walk*36,-88-walk*14],
  ll:[96-walk*46,54+walk*34],
  rl:[48+walk*46,138-walk*36],
  lean:15+Math.max(0,step)*4,
  hip:walk*10
 };
 if(pose==='punch')return p<.52
  ?{la:[-130,-166],ra:[-58,-18],ll:[106,62],rl:[56,126],lean:17,hip:7}
  :{la:[-118,-150],ra:[-20,8],ll:[104,62],rl:[54,122],lean:12,hip:5};
 if(pose==='oneTwo')return two
  ?{la:[-38,-6],ra:[-150,-178],ll:[72,116],rl:[24,150],lean:28,hip:26}
  :{la:[-132,-166],ra:[-46,-8],ll:[110,58],rl:[58,124],lean:15,hip:8};
 if(pose==='kick')return snap
  ?{la:[-124,-156],ra:[-72,-108],ll:[122,88],rl:[-18,-8],lean:-14,hip:8}
  :{la:[-118,-148],ra:[-70,-104],ll:[118,80],rl:[24,42],lean:-4,hip:4};
 if(pose==='sweep')return {la:[-88,-126],ra:[-44,-84],ll:[150,92],rl:[4,-2],lean:22,hip:18};
 if(pose==='uppercut')return p<.45
  ?{la:[-126,-156],ra:[-44,-72],ll:[130,54],rl:[44,136],lean:22,hip:14}
  :{la:[-112,-146],ra:[-96,-124],ll:[104,72],rl:[64,116],lean:-18,hip:4};
 if(pose==='jumpKick')return snap
  ?{la:[-138,-162],ra:[-76,-112],ll:[158,178],rl:[-18,-8],lean:4,hip:10}
  :{la:[-128,-152],ra:[-68,-104],ll:[136,164],rl:[24,18],lean:2,hip:6};
 if(pose==='jump')return {la:[-130,-154],ra:[-70,-112],ll:[142,168],rl:[42,18],lean:0,hip:4};
 if(pose==='duck')return {la:[-104,-140],ra:[-66,-108],ll:[138,42],rl:[46,146],lean:18,hip:18};
 if(pose==='block')return {la:[-70,-20],ra:[-118,-158],ll:[110,74],rl:[62,116],lean:8,hip:4};
 if(pose==='hadouken')return p<.45
  ?{la:[-84,-118],ra:[-64,-104],ll:[124,72],rl:[54,128],lean:20,hip:14}
  :{la:[-18,-4],ra:[-18,-4],ll:[112,66],rl:[48,130],lean:24,hip:18};
 if(pose==='hurt')return {la:[176,170],ra:[4,14],ll:[120,84],rl:[74,118],lean:-16,hip:-6};
 return base;
}
function drawDude(){const d=state.dude,g=UI.dude;g.innerHTML='';const profile=FIGHTER_PROFILES[currentFighterProfile]||FIGHTER_PROFILES.default;DUDE_MODEL.jointR=profile.joint;g.style.setProperty('--profile-line',profile.line);const now=performance.now();let y=d.y,bob=(d.pose==='run'||d.pose==='idle')?Math.sin(now/(d.pose==='run'?92:430))*(d.pose==='run'?2.5:1.6):0;if(d.pose==='jump'||d.pose==='jumpKick')y-=48;if(d.pose==='duck')y+=23;const p=phase(),oneTwoSecond=d.attack?.move==='oneTwo'&&d.attack.t>.30,lunge=d.pose==='oneTwo'?(oneTwoSecond?(currentFighterProfile==='alleyBrawler'?32:22):9)*p:(['punch','kick','sweep','uppercut','jumpKick','hadouken'].includes(d.pose)?11*p:0),hurt=d.pose==='hurt'?-8:0;const face=d.facing||1;g.setAttribute('transform',`translate(${d.x+face*(lunge+hurt)} ${y}) scale(${face} 1)`);
 if(d.pose==='dead'){const t=clamp(state.deathTimer/0.75,0,1),rot=82*t;g.setAttribute('transform',`translate(${d.x-8} ${y-8+18*t}) scale(${d.facing||1} 1) rotate(${rot})`);g.setAttribute('opacity',String(1-.25*t));g.append(circle(0,-82,DUDE_MODEL.headR,'dude-head'));g.append(line(0,-68,0,-14,'dude-line'));limbs(g,[[0,-54,-24,-43,'dude-line'],[0,-54,24,-43,'dude-line'],[0,-14,-28,22,'dude-line'],[0,-14,28,22,'dude-line']]);g.append(text(-30,-108,'DUDE'));return;}
 g.setAttribute('opacity','1');const a=poseAngles(d.pose,p,now),neckX=a.lean||0,hipX=a.hip||0,neckY=-70+bob,hipY=-12+bob+(a.hip?2:0);g.append(circle(neckX,-82+bob,DUDE_MODEL.headR,'dude-head'));g.append(line(neckX,neckY,hipX,hipY,'dude-line'));
 const ls=[neckX-5,neckY+15],rs=[neckX+5,neckY+15],lh=[hipX-4,hipY],rh=[hipX+4,hipY];
 chain(g,ls[0],ls[1],a.la[0],DUDE_MODEL.upperArm,a.la[1],DUDE_MODEL.foreArm,'dude-line',(d.pose==='oneTwo'&&a.la[0]<10)||d.pose==='hadouken'?'dude-line strike-limb':'dude-line');
 chain(g,rs[0],rs[1],a.ra[0],DUDE_MODEL.upperArm,a.ra[1],DUDE_MODEL.foreArm,'dude-line',['punch','oneTwo','uppercut','hadouken'].includes(d.pose)?'dude-line strike-limb':'dude-line');
 chain(g,lh[0],lh[1],a.ll[0],DUDE_MODEL.upperLeg,a.ll[1],DUDE_MODEL.lowerLeg,'dude-line','dude-line');
 chain(g,rh[0],rh[1],a.rl[0],DUDE_MODEL.upperLeg,a.rl[1],DUDE_MODEL.lowerLeg,'dude-line',['kick','sweep','jumpKick'].includes(d.pose)?'dude-line strike-limb':'dude-line');
 if(d.pose==='block')g.append(el('path',{d:'M24 -78 C38 -68 39 -45 24 -34 C8 -45 9 -68 24 -78',class:'block-guard'}));
 if(d.pose==='hadouken')g.append(el('circle',{cx:86,cy:-63,r:10+8*p,class:'ki-orb'}));
 if(d.pose==='sweep')g.append(el('path',{d:'M18 34 C42 52 76 50 108 34',class:'sweep-arc'}));
 const atk=d.attack;if(atk?.showBox&&atk.hitBox){const hb=atk.hitBox;g.append(el('rect',{x:(d.facing||1)>=0?hb.x1-(d.x+lunge+hurt):d.x-(hb.x2)-lunge-hurt,y:hb.y1-y,width:hb.x2-hb.x1,height:hb.y2-hb.y1,class:'hitbox'}));} g.append(text(-30,-108,'DUDE'));}
function drawEnemy(){const root=UI.enemy;root.innerHTML='';const foes=aliveEnemies();if(!foes.length)return;for(const e of foes){const g=el('g',{});root.append(g);const recoil=e.stagger>0?10*Math.sin(e.stagger*28):0;const eFace=e.x>=state.dude.x?1:-1;g.setAttribute('transform',`translate(${e.x+eFace*recoil} ${e.y}) scale(${eFace} 1)`);g.setAttribute('opacity',e.hitFlash>0?'.5':'1');g.setAttribute('class',`fighter enemy-fighter ${e.boss?'boss':''}`);const wind=e.attack?clamp(e.attack.t/e.attack.impact,0,1):0;if(e.kind==='drone'){g.append(el('rect',{x:-24,y:-13,width:48,height:26,rx:4,class:'enemy-fill'}));g.append(circle(-42,-18,8,'enemy-line'));g.append(circle(42,-18,8,'enemy-line'));if(e.attack){g.append(line(-20,0,-86+16*wind,6,'enemy-line attack-line'));g.append(line(20,0,-86+16*wind,6,'enemy-line attack-line'))}} if(e.kind==='crawler'){g.append(circle(0,-22,e.boss?23:16,'enemy-fill'));g.append(line(-18,-6,-50,20,'enemy-line'));g.append(line(0,-4,-18,24,'enemy-line'));g.append(line(18,-6,44,20,'enemy-line'));if(e.attack)g.append(line(-18,-8,-88+24*wind,-22,'enemy-line attack-line'));} if(e.kind==='dummy'){const top=-70,bottom=e.lanes.includes('lower')?38:8;g.append(circle(0,top,14,'enemy-fill'));g.append(line(0,top+14,0,bottom-14,'enemy-line'));g.append(line(0,-42,-30,-15,'enemy-line'));g.append(line(0,-42,30,-15,'enemy-line'));g.append(line(0,bottom-14,-28,bottom+12,'enemy-line'));g.append(line(0,bottom-14,28,bottom+12,'enemy-line'));if(e.attack)g.append(line(-8,-38,-86+20*wind,-42,'enemy-line attack-line'));} if(e.kind==='turret'){g.append(el('rect',{x:-34,y:-42,width:68,height:60,rx:8,class:'enemy-fill'}));g.append(circle(-20,28,12,'enemy-line'));g.append(circle(20,28,12,'enemy-line'));if(e.attack)g.append(line(-30,-16,-96+24*wind,44,'enemy-line attack-line'));} if(e===state.enemy)g.append(text(-64,e.lanes.length>1?-92:-48,`${e.name} [${e.lanes.map(l=>LANE_LABEL[l]).join('+')}]`));}}
function drawFx(){UI.fx.innerHTML='';for(const f of state.fx){const k=f.t/f.max;if(f.kind==='text'){const n=text(f.x,f.y-(1-k)*22,String(f.label),'damage-text');n.setAttribute('opacity',k);UI.fx.append(n);continue;}const r=36*(1-k)+5;UI.fx.append(el('circle',{cx:f.x,cy:f.y,r,fill:'none',stroke:f.kind==='dodge'?'#52a9ff':'#f4c95d','stroke-width':4,opacity:k}));UI.fx.append(line(f.x-r*.7,f.y-r*.7,f.x+r*.7,f.y+r*.7,'spark-line'));UI.fx.append(line(f.x-r*.7,f.y+r*.7,f.x+r*.7,f.y-r*.7,'spark-line'));}}
function draw(){drawEnemy();drawDude();drawFx();}
const pct=(a,b)=>clamp(a/b*100,0,100);
function meterRow(k,label,value,max,meta){return `<div class="mini-meter stat-${k}"><div class="mini-meter-head"><b>${k}</b><span>${label}</span><em>${meta}</em></div><div class="mini-meter-track"><div style="width:${pct(value,max)}%"></div></div></div>`}
function renderHeroMeters(){const rows=[['F','Fortitude',state.dude.hp,state.dude.maxHp,`${Math.max(0,Math.round(state.dude.hp))}/${state.dude.maxHp}`],['R','Resourcefulness',state.resources.R,state.resources.RMax,`${Math.round(state.resources.R)}%`],['S','Style',state.resources.S,state.resources.SMax,`${Math.round(state.resources.S)}%`]]; if(profileHasKi())rows.push(['X','Ki',state.resources.X,state.resources.XMax,`${Math.round(state.resources.X)}%`]);return rows.map(r=>meterRow(...r)).join('');}
function renderEnemyMeters(){const slots=[...(state.enemySlots||[])];while(slots.length<4)slots.push(null);return slots.slice(0,4).map((e,i)=>!e?`<div class="enemy-slot empty"><span>Enemy ${i+1}</span><div class="mini-meter-track"><div style="width:0%"></div></div></div>`:`<div class="enemy-slot"><div class="mini-meter-head"><b>${i+1}</b><span>${e.name}</span><em>${Math.max(0,Math.round(e.hp))}/${e.maxHp}</em></div><div class="mini-meter-track ${e.boss?'enemy-purple':'enemy-yellow'}"><div style="width:${pct(e.hp,e.maxHp)}%"></div></div></div>`).join('');}
function render(){if(UI.fighterProfileSelect)UI.fighterProfileSelect.value=currentFighterProfile;UI.floorLabel.textContent=`Floor ${state.floor} / 100 • ${state.bossPending?'Boss':`${state.floorKills}/${state.floorTarget}`}`;UI.moveLabel.textContent=state.dude.attack?state.dude.attack.label:state.dude.pose[0].toUpperCase()+state.dude.pose.slice(1);UI.stateLabel.textContent=state.defeated?(state.manual?'Defeated':'Restarting…'):state.awaitingChoice?'Leveling Up':state.running?'Fighting':'Paused';UI.enemyName.textContent=state.enemy?`Enemies ${aliveEnemies().length}/4 • ${state.enemy.name} (${state.enemy.lanes.map(l=>LANE_LABEL[l]).join('+')})`:'Enemies 0/4';UI.heroMeters.innerHTML=renderHeroMeters();UI.enemyMeters.innerHTML=renderEnemyMeters();UI.combatLog.innerHTML=state.log.map(x=>`<div class="log-entry">${x}</div>`).join('');UI.buildSummary.textContent=state.build.join(' • ');UI.runStats.innerHTML=`<div>Level</div><div>${state.level}</div><div>XP</div><div>${state.xp} / 3</div><div>Floor Wave</div><div>${state.bossPending?'MINIBOSS':`${state.floorKills} / ${state.floorTarget}`}</div><div>Kills</div><div>${state.kills}</div><div>Fortitude</div><div>${state.stats.F}</div><div>Resourcefulness</div><div>${state.stats.R}</div><div>Style</div><div>${state.stats.S}</div>${profileHasKi()?`<div>Ki</div><div>${Math.round(state.resources.X)}%</div>`:''}<div>Combo</div><div>${state.combo}x</div><div>Control</div><div>${state.manual?'Manual':'Auto'}</div>`;UI.pauseBtn.textContent=state.defeated?'Defeated':(state.running?'Pause Enemies':'Resume Enemies');UI.speedBtn.textContent=`${state.speed}x`;if(UI.shakeLayer){const n=state.shake>0?Math.sin(performance.now()/18)*4*state.shake/.12:0;UI.shakeLayer.style.transform=`translate(${n}px,${-n*.35}px)`} UI.autoPowerToggle.checked=!!state.autoPower; UI.manualToggle.checked=!!state.manual; UI.manualControls.classList.toggle('hidden',!state.manual); syncProfileUi(); draw();}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function offerLevelChoices(){const owned=new Set(state.build);const options=shuffle(MOVE_POOL.filter(m=>!owned.has(`${m.stat}: ${m.name}`))).slice(0,3);state.pendingChoices=options.length?options:shuffle(MOVE_POOL).slice(0,3); if(state.autoPower){const pick=sample(state.pendingChoices);pick.apply(state);pushLog(`Auto-learned ${pick.name}.`);startNextEncounter();return;} state.awaitingChoice=true;UI.levelModal.classList.remove('hidden');UI.levelModal.setAttribute('aria-hidden','false');UI.levelText.textContent=`Level ${state.level}. Pick a Fortitude, Resourcefulness, or Style upgrade.`;UI.choiceList.innerHTML='';state.pendingChoices.forEach((move,i)=>{const b=document.createElement('button');b.className=`choice-btn stat-${move.stat}`;b.innerHTML=`<strong>${i+1}. ${move.name} <em>${move.stat}</em></strong><span>${move.description}</span>`;b.onclick=()=>selectMove(move);UI.choiceList.appendChild(b)});}
function selectMove(move){move.apply(state);pushLog(`Learned ${move.name}.`);state.awaitingChoice=false;UI.levelModal.classList.add('hidden');UI.levelModal.setAttribute('aria-hidden','true');startNextEncounter();}
function autoPickMove(){if(state.pendingChoices?.length)selectMove(sample(state.pendingChoices));}
function applyInfluence(action){if(state.awaitingChoice||!state.running)return;if(action==='cheer'){state.dude.punchPower+=1;state.dude.kickPower+=1;if(profileHasKi())state.resources.X=Math.min(state.resources.XMax,state.resources.X+8);pushLog(profileHasKi()?'Cheer adds Punch/Kick +1 and sparks Ki.':'Cheer adds Punch/Kick +1.')} if(action==='heal'){state.dude.hp=Math.min(state.dude.maxHp,state.dude.hp+16);pushLog('Second Wind restores 16 Fortitude.')} if(action==='weaken'){state.enemy.power=Math.max(1,state.enemy.power-2);pushLog(`${state.enemy.name} loses 2 power.`)}}
function bind(){UI.pauseBtn.onclick=()=>{if(!state.defeated&&state.dude.hp>0)state.running=!state.running};UI.speedBtn.onclick=()=>{state.speed=state.speed===1?2:state.speed===2?4:1};UI.restartBtn.onclick=()=>{state=createInitialState();setFighterProfile(currentFighterProfile,{silent:true})};UI.autoPickBtn.onclick=autoPickMove;UI.autoPowerToggle.onchange=()=>{state.autoPower=UI.autoPowerToggle.checked;pushLog(`Auto-pick powers ${state.autoPower?'enabled':'disabled'}.`)};UI.manualToggle.onchange=()=>{state.manual=UI.manualToggle.checked;pushLog(`Manual input ${state.manual?'enabled':'disabled'}.`)};UI.manualControls.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>performDudeAction(b.dataset.move));if(UI.fighterProfileSelect)UI.fighterProfileSelect.onchange=()=>setFighterProfile(UI.fighterProfileSelect.value);document.querySelectorAll('.influence-btn').forEach(b=>b.onclick=()=>applyInfluence(b.dataset.action));document.addEventListener('keydown',e=>{if(state.awaitingChoice){if(e.key==='1'&&state.pendingChoices[0])selectMove(state.pendingChoices[0]);if(e.key==='2'&&state.pendingChoices[1])selectMove(state.pendingChoices[1]);if(e.key==='3'&&state.pendingChoices[2])selectMove(state.pendingChoices[2]);if(e.key.toLowerCase()==='a')autoPickMove();return;} const k=e.key.toLowerCase(); if(state.manual){const keys={'1':'punch','2':'oneTwo','3':'kick','4':'sweep','5':'uppercut','6':'jumpKick',j:'jump',k:'duck',l:'block'}; if(profileHasKi())keys['7']='hadouken'; if(keys[k]){performDudeAction(keys[k]);return;}} if(k==='q')applyInfluence('cheer'); if(k==='w')applyInfluence('heal'); if(k==='e')applyInfluence('weaken');});}
function loop(ts){const dt=Math.min(.05,(ts-lastTs)/1000)*state.speed;lastTs=ts;update(dt);render();requestAnimationFrame(loop)}
function boot(){assertUI();initBackground();bind();setFighterProfile(currentFighterProfile,{silent:true});render();requestAnimationFrame(loop)}
try{boot()}catch(err){showBootError(err)}
