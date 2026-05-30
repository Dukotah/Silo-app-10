/**
 * ClarityTab.js — Clarity Clicker UI (v4 — prestige system)
 *
 * New in v4:
 *   - Prestige drawer: expandable panel with progress bar + PRESTIGE button
 *   - Echo shop: 5 permanent perk cards (EchoPerkCard component)
 *   - Orb evolution: 7 visual tiers based on echoPerks.orbEvol
 *   - Prestige animation: orb implodes → rebirths on prestige (~1.5s)
 *   - echoMult shown in stats when > 1
 */

import React from 'react';
import { GENERATORS, TAP_UPGRADES, SHOP_ITEMS, ECHO_PERKS, genCost, genMilestoneMult, fmtClarity, calcPrestigeEchoes, calcPrestigeThreshold } from './useClarity.js';

var e         = React.createElement;
var useState  = React.useState;
var useRef    = React.useRef;
var useEffect = React.useEffect;

var BG   = '#131821';
var BG2  = '#0f1420';
var BDR  = '#1d2740';
var BDR2 = '#161f32';
var DIM  = '#3d4d63';
var MID  = '#556070';

function mn(sz, cl, x) {
  return Object.assign({fontFamily:"'DM Mono',monospace",fontSize:sz,color:cl,letterSpacing:'0.08em'},x||{});
}
function row(x) { return Object.assign({display:'flex',alignItems:'center'},x||{}); }

var CLICKER_CSS =
  '@keyframes cl-pulse{0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}' +
  '@keyframes cl-tap{0%{transform:scale(1)}30%{transform:scale(0.93)}70%{transform:scale(1.06)}100%{transform:scale(1)}}' +
  '@keyframes cl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
  '@keyframes cl-boost{0%,100%{opacity:0.6}50%{opacity:1}}' +
  '@keyframes cl-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}' +
  '@keyframes cl-floatup{0%{opacity:1;transform:translateY(0) scale(1)}80%{opacity:0.7}100%{opacity:0;transform:translateY(-52px) scale(0.85)}}' +
  '@keyframes cl-crit{0%{filter:drop-shadow(0 0 14px #fbbf24) brightness(1.6)}50%{filter:drop-shadow(0 0 28px #fbbf24) brightness(2.2)}100%{filter:drop-shadow(0 0 14px #fbbf24) brightness(1.6)}}' +
  '@keyframes cl-burst{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0)}50%{box-shadow:0 0 12px 3px rgba(251,191,36,0.35)}}' +
  '@keyframes cl-charge{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}' +
  '@keyframes cl-implode{0%{transform:scale(1);opacity:1}70%{transform:scale(0.08);opacity:0.7}100%{transform:scale(0);opacity:0}}' +
  '@keyframes cl-rebirth{0%{transform:scale(0);opacity:0}50%{transform:scale(1.3);opacity:0.85}100%{transform:scale(1);opacity:1}}' +
  '@keyframes cl-pulsering{0%,100%{opacity:0.15;transform:scale(1)}50%{opacity:0.35;transform:scale(1.06)}}';

// --- ORB EVOLUTION TIERS -----------------------------------------------------
var ORB_TIERS = [
  { color:'#4a9eff', glow:'rgba(74,158,255,0.5)',   name:'Dormant Core' },
  { color:'#06b6d4', glow:'rgba(6,182,212,0.55)',   name:'Awakened Node' },
  { color:'#22c55e', glow:'rgba(34,197,94,0.6)',    name:'Signal Bloom' },
  { color:'#f59e0b', glow:'rgba(245,158,11,0.65)',  name:'Resonant Prism' },
  { color:'#e11d48', glow:'rgba(225,29,72,0.6)',    name:'Void Fracture' },
  { color:'#8b5cf6', glow:'rgba(139,92,246,0.65)',  name:'Echo Lattice' },
  { color:'#e0e7ff', glow:'rgba(224,231,255,0.75)', name:'Sovereign Form' },
];

// --- TAP CORE SVG ------------------------------------------------------------
function TapCore(props) {
  var tapping      = props.tapping;
  var boosted      = props.boosted;
  var tapPower     = props.tapPower;
  var streak       = props.streak;
  var isCharged    = props.isCharged;
  var isMaxCombo   = props.isMaxCombo;
  var isCrit       = props.isCrit;
  var orbTier      = Math.min(props.orbTier || 0, ORB_TIERS.length - 1);
  var prestigeAnim = props.prestigeAnim;

  var tierData  = ORB_TIERS[orbTier];
  var baseColor = tierData.color;
  var baseGlow  = tierData.glow;

  var color = isCrit ? '#fbbf24' : isCharged ? '#f59e0b' : boosted ? '#22c55e' : isMaxCombo ? '#8b5cf6' : baseColor;
  var glow  = isCrit ? 'rgba(251,191,36,0.7)' : isCharged ? 'rgba(245,158,11,0.65)' : boosted ? 'rgba(34,197,94,0.6)' : isMaxCombo ? 'rgba(139,92,246,0.6)' : baseGlow;

  var rings = [];
  for (var ri = 0; ri < 4; ri++) {
    rings.push(e('circle',{key:'r'+ri,cx:'100',cy:'100',r:String(52+ri*13),fill:'none',stroke:color,strokeWidth:'0.6',opacity:0.08-ri*0.015,style:{animation:'cl-pulsering '+(2+ri*0.6)+'s ease-in-out '+(ri*0.3)+'s infinite'}}));
  }
  rings.push(e('circle',{key:'track',cx:'100',cy:'100',r:'44',fill:'none',stroke:color,strokeWidth:'1.5',opacity:0.12}));
  if (isCharged) {
    rings.push(e('circle',{key:'chring',cx:'100',cy:'100',r:'48',fill:'none',stroke:'#f59e0b',strokeWidth:'2',opacity:0.4,strokeDasharray:'6 4',style:{animation:'cl-charge 1.2s ease-in-out infinite'}}));
  }
  if (orbTier >= 3) {
    rings.push(e('polygon',{key:'geo',points:'100,56 131,80 131,120 100,144 69,120 69,80',fill:'none',stroke:color,strokeWidth:'0.8',opacity:0.18,style:{animation:'cl-pulsering 4s ease-in-out infinite'}}));
  }
  rings.push(e('circle',{key:'blob',cx:'100',cy:'100',r:'38',fill:color,opacity:0.06,style:{filter:'blur(6px)'}}));
  rings.push(e('circle',{key:'mid', cx:'100',cy:'100',r:'26',fill:color,opacity:0.12,style:{animation:'cl-pulse 2s ease-in-out infinite'}}));
  rings.push(e('circle',{key:'core',cx:'100',cy:'100',r:'16',fill:color,opacity:0.92,style:{animation:'cl-pulse 1.6s ease-in-out infinite',filter:'drop-shadow(0 0 8px '+color+')'}}));
  if (boosted && !isCrit) {
    rings.push(e('polygon',{key:'boost',points:'100,72 116,100 100,128 84,100',fill:'none',stroke:'#22c55e',strokeWidth:'1.2',opacity:0.35,style:{animation:'cl-boost 1.8s ease-in-out infinite'}}));
  }
  if (orbTier >= 5) {
    rings.push(e('circle',{key:'outerring',cx:'100',cy:'100',r:'52',fill:'none',stroke:color,strokeWidth:'1',opacity:0.2,strokeDasharray:'4 8',style:{animation:'cl-charge 3s linear infinite'}}));
  }
  var spokes = Math.min(streak, 12);
  for (var si = 0; si < spokes; si++) {
    var ang = (si/Math.max(spokes,1))*Math.PI*2;
    var x1 = 100+Math.cos(ang)*17, y1 = 100+Math.sin(ang)*17;
    var x2 = 100+Math.cos(ang)*(27+Math.min(streak,20)), y2 = 100+Math.sin(ang)*(27+Math.min(streak,20));
    rings.push(e('line',{key:'sp'+si,x1:x1.toFixed(1),y1:y1.toFixed(1),x2:x2.toFixed(1),y2:y2.toFixed(1),stroke:color,strokeWidth:'1',opacity:0.25}));
  }
  rings.push(e('text',{key:'lbl',x:'100',y:'105',textAnchor:'middle',fontFamily:"'DM Mono',monospace",fontSize:'11',fontWeight:'700',fill:color,opacity:0.85},'TAP'));

  var svgAnim;
  if (prestigeAnim === 'implode')      svgAnim = 'cl-implode 0.7s ease-in forwards';
  else if (prestigeAnim === 'rebirth') svgAnim = 'cl-rebirth 0.75s ease-out forwards';
  else if (tapping)                    svgAnim = 'cl-tap 0.22s ease';
  else                                 svgAnim = 'cl-float 3.5s ease-in-out infinite';

  return e('div',{style:{position:'relative',width:'100%',maxWidth:200,margin:'0 auto'}},
    e('svg',{viewBox:'0 0 200 200',xmlns:'http://www.w3.org/2000/svg',style:{
      width:'100%',display:'block',
      filter:isCrit?undefined:'drop-shadow(0 0 '+(isCharged?20:boosted?22:14)+'px '+glow+')',
      animation:svgAnim,
      transition:'filter 0.3s ease',cursor:'pointer',
    }},rings)
  );
}

// --- GENERATOR CARD ----------------------------------------------------------
function GenCard(props) {
  var gen = props.gen, owned = props.owned, clarity = props.clarity;
  var streak = props.streak, isVIP = props.isVIP;
  var burstActive    = props.burstActive;
  var marketDiscount = props.marketDiscount || 0;

  var cost         = Math.ceil(genCost(gen, owned) * (1 - marketDiscount));
  var milestoneMet = streak >= gen.milestoneStreak;
  var vipLocked    = gen.vip && !isVIP;
  var canBuy       = milestoneMet && !vipLocked && clarity >= cost && owned < gen.maxCount;
  var maxed        = owned >= gen.maxCount;
  var mileLevel    = owned>=50?4:owned>=25?3:owned>=10?2:owned>=5?1:0;

  var borderColor = burstActive ? '#fbbf24' : owned > 0 ? gen.color+'55' : (canBuy ? gen.color+'30' : BDR);
  var bgColor     = owned > 0 ? gen.color+'0c' : (vipLocked ? '#0e1018' : BG);
  var burstStyle  = burstActive ? {animation:'cl-burst 0.8s ease-in-out infinite'} : {};

  return e('div',{style:Object.assign({background:bgColor,border:'1px solid '+borderColor,borderRadius:12,padding:'11px 13px',transition:'border-color 0.3s ease',position:'relative',overflow:'hidden'},burstStyle)},
    vipLocked && e('div',{style:{position:'absolute',top:0,left:'15%',right:'15%',height:1.5,background:'linear-gradient(90deg,transparent,#e879a0,transparent)'}}),
    burstActive && e('div',{style:{position:'absolute',top:4,right:6,fontSize:7,color:'#fbbf24',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.1em'}},'BURST 5x'),
    e('div',{style:row({justifyContent:'space-between',marginBottom:5})},
      e('div',{style:row({gap:7})},
        e('span',{style:{fontSize:14,lineHeight:1}},gen.icon),
        e('div',null,
          e('div',{style:mn(10,owned>0?gen.color:'#94a3b8',{fontWeight:700,letterSpacing:'0.1em'})},gen.name),
          e('div',{style:mn(8,MID)},gen.rate+'/s'+(mileLevel>0?' · +'+Math.round((genMilestoneMult(owned)-1)*100)+'% bonus':''))
        )
      ),
      e('div',{style:{background:owned>0?gen.color+'22':BG2,border:'1px solid '+(owned>0?gen.color+'55':BDR2),borderRadius:8,padding:'3px 9px',fontSize:11,fontWeight:700,color:owned>0?gen.color:DIM,fontFamily:"'DM Mono',monospace",minWidth:28,textAlign:'center'}},String(owned))
    ),
    e('div',{style:row({gap:3,marginBottom:7})},
      [5,10,25,50].map(function(thr,pi){
        var hit = owned >= thr;
        return e('div',{key:pi,title:'x'+thr+': +'+(pi===0?'10':pi===1?'25':pi===2?'50':'100')+'%',style:{flex:1,height:3,borderRadius:2,background:hit?gen.color:BDR2,transition:'background 0.4s',opacity:hit?1:0.5}});
      })
    ),
    e('div',{style:{fontSize:11,color:MID,lineHeight:1.5,marginBottom:8}},
      vipLocked ? '◈ VIP EXCLUSIVE'
        : (!milestoneMet ? '◇ Requires '+gen.milestoneStreak+'-day streak (you: '+streak+'d)' : gen.desc)
    ),
    vipLocked
      ? e('button',{onClick:props.onNeedVIP,style:{width:'100%',padding:'8px',borderRadius:8,background:'#e879a033',border:'1px solid #e879a066',fontSize:9,color:'#e879a0',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.15em',cursor:'pointer'}},'◈ UNLOCK WITH VIP')
      : (!milestoneMet
          ? e('div',{style:{fontSize:9,color:DIM,fontFamily:"'DM Mono',monospace",letterSpacing:'0.12em',textAlign:'center',padding:'6px 0'}},'STREAK MILESTONE REQUIRED')
          : maxed
            ? e('div',{style:mn(9,gen.color,{textAlign:'center',padding:'6px 0',letterSpacing:'0.1em'})},'MAX')
            : e('button',{onClick:props.onBuy,disabled:!canBuy,style:{width:'100%',padding:'8px',background:canBuy?gen.color+'18':BG2,border:'1px solid '+(canBuy?gen.color+'66':BDR2),borderRadius:8,fontSize:10,color:canBuy?gen.color:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:canBuy?'pointer':'default',transition:'all 0.15s'}},
                (marketDiscount>0?'SALE ':'') + fmtClarity(cost)+' CLARITY'+(marketDiscount>0?' (-'+Math.round(marketDiscount*100)+'%)':''))
        )
  );
}

// --- SHOP CARD ---------------------------------------------------------------
function ShopCard(props) {
  var item = props.item, owned = props.owned, clarity = props.clarity;
  var marketDiscount = props.marketDiscount || 0;
  var cost   = Math.ceil(item.cost * (1 - marketDiscount));
  var canBuy = clarity >= cost && owned < item.maxCount;
  var maxed  = owned >= item.maxCount;
  var borderColor = owned > 0 ? item.color+'55' : (canBuy ? item.color+'30' : BDR);
  return e('div',{style:{background:owned>0?item.color+'0a':BG,border:'1px solid '+borderColor,borderRadius:12,padding:'11px 13px',transition:'all 0.2s'}},
    e('div',{style:row({justifyContent:'space-between',marginBottom:6})},
      e('div',{style:row({gap:7})},
        e('span',{style:{fontSize:14,lineHeight:1,color:item.color}},item.icon),
        e('div',null,
          e('div',{style:mn(10,owned>0?item.color:'#94a3b8',{fontWeight:700,letterSpacing:'0.1em'})},item.name),
          e('div',{style:mn(8,MID)},'+'+Math.round(item.passiveBonus*100)+'% passive')
        )
      ),
      e('div',{style:{background:owned>0?item.color+'22':BG2,border:'1px solid '+(owned>0?item.color+'55':BDR2),borderRadius:8,padding:'3px 9px',fontSize:11,fontWeight:700,color:owned>0?item.color:DIM,fontFamily:"'DM Mono',monospace",minWidth:28,textAlign:'center'}},
        maxed?'MAX':owned+'/'+item.maxCount)
    ),
    e('div',{style:{fontSize:11,color:MID,lineHeight:1.5,marginBottom:8}},item.desc),
    maxed
      ? e('div',{style:mn(9,item.color,{textAlign:'center',padding:'6px 0',letterSpacing:'0.1em'})},'FULLY UPGRADED')
      : e('button',{onClick:props.onBuy,disabled:!canBuy,style:{width:'100%',padding:'8px',background:canBuy?item.color+'18':BG2,border:'1px solid '+(canBuy?item.color+'66':BDR2),borderRadius:8,fontSize:10,color:canBuy?item.color:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:canBuy?'pointer':'default',transition:'all 0.15s'}},
        (marketDiscount>0?'SALE ':'') + fmtClarity(cost)+' CLARITY'+(marketDiscount>0?' (-'+Math.round(marketDiscount*100)+'%)':''))
  );
}

// --- ECHO PERK CARD ----------------------------------------------------------
function EchoPerkCard(props) {
  var perk    = props.perk;
  var level   = props.level || 0;
  var echoes  = props.echoes;
  var onBuy   = props.onBuy;

  var maxed    = level >= perk.maxLevel;
  var nextCost = maxed ? null : perk.costs[level];
  var canBuy   = !maxed && echoes >= nextCost;
  var borderColor = level > 0 ? perk.color+'55' : (canBuy ? perk.color+'30' : BDR);

  return e('div',{style:{background:level>0?perk.color+'0a':BG,border:'1px solid '+borderColor,borderRadius:12,padding:'11px 13px',transition:'all 0.2s'}},
    e('div',{style:row({justifyContent:'space-between',marginBottom:5})},
      e('div',{style:row({gap:7})},
        e('span',{style:{fontSize:14,lineHeight:1,color:perk.color}},perk.icon),
        e('div',null,
          e('div',{style:mn(10,level>0?perk.color:'#94a3b8',{fontWeight:700,letterSpacing:'0.1em'})},perk.name),
          e('div',{style:mn(8,MID)},'Lv.'+level+' / '+perk.maxLevel)
        )
      ),
      e('div',{style:row({gap:3})},
        Array.from({length:perk.maxLevel},function(_,i){
          return e('div',{key:i,style:{width:7,height:7,borderRadius:'50%',background:i<level?perk.color:BDR2,transition:'background 0.3s',boxShadow:i<level?'0 0 4px '+perk.color+'88':'none'}});
        })
      )
    ),
    e('div',{style:{fontSize:11,color:MID,lineHeight:1.5,marginBottom:8}},perk.desc),
    maxed
      ? e('div',{style:mn(9,perk.color,{textAlign:'center',padding:'6px 0',letterSpacing:'0.1em'})},'FULLY EVOLVED')
      : e('button',{onClick:onBuy,disabled:!canBuy,style:{width:'100%',padding:'8px',background:canBuy?perk.color+'18':BG2,border:'1px solid '+(canBuy?perk.color+'66':BDR2),borderRadius:8,fontSize:10,color:canBuy?perk.color:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:canBuy?'pointer':'default',transition:'all 0.15s'}},
        nextCost+' ECHO'+(nextCost>1?'ES':''))
  );
}

// --- BOOST BANNER ------------------------------------------------------------
function BoostBanner(props) {
  if (!props.end || Date.now() >= props.end) return null;
  var remaining = Math.max(0, props.end - Date.now());
  var hrs = Math.floor(remaining/3600000), mins = Math.floor((remaining%3600000)/60000);
  return e('div',{style:{background:'#14532d33',border:'1px solid #22c55e55',borderRadius:10,padding:'9px 13px',marginBottom:10,display:'flex',alignItems:'center',gap:10,animation:'cl-boost 2.5s ease-in-out infinite'}},
    e('span',{style:{fontSize:16}},'✦'),
    e('div',null,
      e('div',{style:mn(9,'#22c55e',{fontWeight:700,letterSpacing:'0.12em'})},'2x JOURNAL BOOST ACTIVE'),
      e('div',{style:mn(8,MID)},hrs+'h '+mins+'m remaining')
    )
  );
}

// --- OFFLINE BANNER ----------------------------------------------------------
function OfflineBanner(props) {
  if (!props.earned || props.earned < 0.1) return null;
  var hrs = Math.floor(props.seconds/3600), mins = Math.floor((props.seconds%3600)/60);
  return e('div',{style:{background:'#0c1628',border:'1px solid #1e3a5f',borderRadius:10,padding:'10px 13px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between',animation:'cl-fadein 0.4s ease'}},
    e('div',null,
      e('div',{style:mn(9,'#4a9eff',{fontWeight:700,letterSpacing:'0.12em',marginBottom:3})},'◆ OFFLINE PROGRESS'),
      e('div',{style:mn(8,MID)},'+'+fmtClarity(props.earned)+' Clarity ('+(hrs>0?hrs+'h ':'')+mins+'m)')
    ),
    e('button',{onClick:props.onDismiss,style:{background:'transparent',border:'none',color:DIM,fontSize:17,cursor:'pointer',lineHeight:1,padding:'0 4px'}},'x')
  );
}

// --- FOCUS MODE --------------------------------------------------------------
function fmtMMSS(secs) {
  var m = Math.floor(secs/60), s = secs%60;
  return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}
function FocusMode(props) {
  var streak = props.streak || 0;
  var DURS = [5,15,25];
  var s1 = useState(25);    var mins     = s1[0], setMins     = s1[1];
  var s2 = useState(0);     var secsLeft = s2[0], setSecsLeft = s2[1];
  var s3 = useState(false); var running  = s3[0], setRunning  = s3[1];
  var s4 = useState(0);     var reward   = s4[0], setReward   = s4[1];
  var tickRef = useRef(null);

  useEffect(function(){
    if (!running) return;
    tickRef.current = setInterval(function(){
      setSecsLeft(function(prev){
        if (prev <= 1) {
          clearInterval(tickRef.current);
          var mult   = 1 + Math.min(streak,30)*0.05;
          var earned = Math.round(mins * 8 * mult);
          props.onReward(earned);
          setReward(earned);
          setRunning(false);
          setTimeout(function(){ setReward(0); }, 7000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return function(){ if (tickRef.current) clearInterval(tickRef.current); };
  }, [running]);

  function start()  { setReward(0); setSecsLeft(mins*60); setRunning(true); }
  function cancel() { if (tickRef.current) clearInterval(tickRef.current); setRunning(false); setSecsLeft(0); }

  var total = mins*60;
  var prog  = total>0 ? (1 - secsLeft/total) : 0;
  var R=52, CIRC=2*Math.PI*R, off=CIRC*(1-prog);
  var COL='#06b6d4';
  var projected = Math.round(mins*8*(1+Math.min(streak,30)*0.05));

  return e('div',{style:{background:'linear-gradient(160deg,'+BG+','+BG2+')',border:'1px solid '+(running?COL+'55':BDR),borderRadius:16,padding:'14px',marginBottom:14,transition:'border-color 0.3s'}},
    e('div',{style:row({justifyContent:'space-between',marginBottom:running?6:10})},
      e('div',null,
        e('div',{style:mn(9,running?COL:'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})},'◈ FOCUS MODE'),
        e('div',{style:mn(7,DIM,{marginTop:2})},'Deep work converts directly to Clarity')
      ),
      reward>0 && e('div',{style:mn(9,'#22c55e',{fontWeight:700})},'+'+reward+' CLARITY')
    ),
    running
      ? e('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'6px 0 2px'}},
          e('div',{style:{position:'relative',width:140,height:140}},
            e('svg',{viewBox:'0 0 120 120',style:{width:'100%',height:'100%',transform:'rotate(-90deg)'}},
              e('circle',{cx:'60',cy:'60',r:String(R),fill:'none',stroke:BDR2,strokeWidth:'6'}),
              e('circle',{cx:'60',cy:'60',r:String(R),fill:'none',stroke:COL,strokeWidth:'6',strokeDasharray:CIRC.toFixed(1),strokeDashoffset:off.toFixed(1),strokeLinecap:'round',style:{transition:'stroke-dashoffset 1s linear'}})
            ),
            e('div',{style:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}},
              e('div',{style:{fontSize:24,fontWeight:700,color:'#e2e8f0',fontFamily:"'DM Mono',monospace"}},fmtMMSS(secsLeft)),
              e('div',{style:mn(7,DIM,{marginTop:3,letterSpacing:'0.14em'})},'STAY PRESENT')
            )
          ),
          e('button',{onClick:cancel,style:{padding:'8px 18px',background:'transparent',border:'1px solid '+BDR,borderRadius:9,fontSize:9,color:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.14em',cursor:'pointer'}},'CANCEL — NO REWARD')
        )
      : e('div',null,
          e('div',{style:row({gap:6,marginBottom:10})},
            DURS.map(function(d){
              var on = mins===d;
              return e('button',{key:d,onClick:function(){setMins(d);},style:{flex:1,padding:'10px 0',background:on?COL+'18':BG2,border:'1px solid '+(on?COL+'66':BDR2),borderRadius:10,fontSize:11,color:on?COL:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.08em',cursor:'pointer',transition:'all 0.15s'}},d+' MIN');
            })
          ),
          e('button',{onClick:start,style:{width:'100%',padding:'12px',background:COL+'18',border:'1px solid '+COL+'66',borderRadius:10,fontSize:11,color:COL,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.13em',cursor:'pointer'}},'◆ BEGIN '+mins+'-MIN FOCUS · +'+projected+' CLARITY')
        )
  );
}

// --- MAIN TAB ----------------------------------------------------------------
export function ClarityTab(props) {
  var cl        = props.clarity;
  var isVIP     = props.isVIP;
  var onNeedVIP = props.onNeedVIP;
  var streak    = (props.state && props.state.streak) || 0;

  var s1 = useState(false); var tapping      = s1[0], setTapping      = s1[1];
  var s2 = useState([]);    var floats       = s2[0], setFloats       = s2[1];
  var s3 = useState(false); var isCrit       = s3[0], setIsCrit       = s3[1];
  var s4 = useState(false); var prestigeAnim = s4[0], setPrestigeAnim = s4[1];
  var s5 = useState(false); var prestigeOpen = s5[0], setPrestigeOpen = s5[1];
  var tapTimer   = useRef(null);
  var floatIdRef = useRef(0);
  var critTimer  = useRef(null);

  function doTap() {
    // Trigger animation immediately so the tap feels instant (keeps INP fast)
    setTapping(true);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(function(){ setTapping(false); }, 220);
    // Defer the actual state mutation out of the click handler so the browser
    // can paint the animation frame before doing the heavy React setState work.
    requestAnimationFrame(function() {
      var result = cl.tap();
      if (result.isCrit) {
        setIsCrit(true);
        if (critTimer.current) clearTimeout(critTimer.current);
        critTimer.current = setTimeout(function(){ setIsCrit(false); }, 450);
      }
      var id   = ++floatIdRef.current;
      var left = (30 + Math.random() * 40);
      setFloats(function(prev){ return prev.concat([{id:id,value:result.earned,isCrit:result.isCrit,left:left}]); });
      setTimeout(function(){ setFloats(function(prev){ return prev.filter(function(f){ return f.id!==id; }); }); }, 850);
    });
  }

  function doPrestige() {
    if (prestigeAnim) return;
    setPrestigeAnim('implode');
    setTimeout(function() {
      var earned = cl.prestige();
      if (!earned) { setPrestigeAnim(false); return; }
      setPrestigeAnim('rebirth');
      setTimeout(function() { setPrestigeAnim(false); }, 750);
    }, 700);
  }

  var totalOwned      = GENERATORS.reduce(function(s,g){ return s+(cl.counts[g.id]||0); }, 0);
  var nextTapUpg      = TAP_UPGRADES[cl.tapLevel];
  var shopMultPct     = Math.round((cl.shopMult - 1) * 100);
  var echoMultPct     = cl.echoMult ? Math.round((cl.echoMult - 1) * 100) : 0;
  var now             = Date.now();
  var comboLocked     = now < cl.comboLockedUntil;
  var comboSecsLeft   = comboLocked ? ((cl.comboLockedUntil - now) / 1000).toFixed(1) : 0;
  var marketActive    = cl.marketUntil > now;
  var marketMinsLeft  = marketActive ? Math.ceil((cl.marketUntil - now) / 60000) : 0;
  var runCount        = cl.runCount || 0;
  var prestigeThresh  = calcPrestigeThreshold(runCount);
  var prestigeEarned  = calcPrestigeEchoes(cl.totalEarned || 0);
  var prestigeProgress = Math.min((cl.totalEarned || 0) / prestigeThresh, 1);
  var canPrestige     = (cl.totalEarned || 0) >= prestigeThresh;
  var orbTier         = Math.min((cl.echoPerks && cl.echoPerks.orbEvol) || 0, ORB_TIERS.length - 1);

  var marketMap = {};
  if (marketActive) {
    (cl.marketItems||[]).forEach(function(mi){ marketMap[mi.id] = mi.discount; });
  }

  return e('div',{style:{animation:'fadeUp 0.35s ease',paddingBottom:24}},
    e('style',null,CLICKER_CSS),
    e(OfflineBanner,{earned:cl.offlineEarned,seconds:cl.offlineSeconds,onDismiss:cl.dismissOffline}),
    e(BoostBanner,{end:cl.journalBoostEnd}),
    e(FocusMode,{streak:streak,onReward:cl.addClarity}),

    // Stats row
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}},
      [{label:'CLARITY',val:fmtClarity(cl.clarity),color:'#4a9eff'},
       {label:'RATE / SEC',val:cl.passiveRate>=1?fmtClarity(cl.passiveRate)+'/s':cl.passiveRate.toFixed(2)+'/s',color:'#22c55e'},
       {label:'TAP POWER',val:'x'+cl.tapPower,color:cl.tapPower>1?'#f59e0b':'#3d4d63'},
      ].map(function(item){
        return e('div',{key:item.label,style:{background:BG,border:'1px solid '+BDR,borderRadius:12,padding:'11px 12px'}},
          e('div',{style:mn(7,DIM,{marginBottom:5,letterSpacing:'0.18em'})},item.label),
          e('div',{style:{fontSize:16,fontWeight:700,color:item.color,fontFamily:"'DM Mono',monospace",lineHeight:1}},item.val)
        );
      })
    ),

    // Echo + run info bar (only after first prestige or if echoes > 0)
    (runCount > 0 || cl.echoes > 0) && e('div',{style:{background:BG,border:'1px solid #e879a022',borderRadius:10,padding:'8px 14px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}},
      e('div',{style:row({gap:12})},
        e('div',{style:mn(8,'#e879a0',{fontWeight:700,letterSpacing:'0.15em'})},'RUN #'+(runCount+1)),
        e('div',{style:mn(8,DIM)},'|'),
        e('div',{style:mn(8,'#e0e7ff',{fontWeight:700})},cl.echoes+' ECHO'+(cl.echoes!==1?'ES':'')+(echoMultPct>0?' · +'+echoMultPct+'% gen':'')),
        ORB_TIERS[orbTier] && e('div',{style:mn(8,ORB_TIERS[orbTier].color,{fontWeight:700})},'· '+ORB_TIERS[orbTier].name)
      ),
      e('button',{onClick:function(){setPrestigeOpen(function(o){return !o;});},style:{background:'transparent',border:'none',color:DIM,fontSize:8,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.1em',cursor:'pointer',padding:'3px 6px'}},'PRESTIGE '+(prestigeOpen?'▲':'▼'))
    ),

    // Central tap orb card
    e('div',{style:{background:'linear-gradient(160deg,'+BG+','+BG2+')',border:'1px solid '+BDR,borderRadius:18,padding:'20px 16px 16px',marginBottom:14,textAlign:'center'}},
      streak > 0 && e('div',{style:mn(8,'#f59e0b',{marginBottom:8,letterSpacing:'0.14em'})},'◆ '+streak+'-DAY STREAK → +'+streak+' BASE TAP POWER'),

      e('div',{onClick:prestigeAnim?undefined:doTap,style:{maxWidth:190,margin:'0 auto',userSelect:'none',position:'relative',cursor:prestigeAnim?'default':'pointer'}},
        e(TapCore,{tapping:tapping,boosted:cl.boosted,tapPower:cl.tapPower,streak:streak,isCharged:cl.isCharged,isMaxCombo:comboLocked,isCrit:isCrit,orbTier:orbTier,prestigeAnim:prestigeAnim}),
        floats.map(function(f){
          return e('div',{key:f.id,style:{position:'absolute',top:'30%',left:f.left+'%',fontSize:f.isCrit?17:12,fontWeight:700,color:f.isCrit?'#fbbf24':'#4a9eff',fontFamily:"'DM Mono',monospace",pointerEvents:'none',whiteSpace:'nowrap',animation:'cl-floatup 0.85s ease-out forwards',zIndex:10,textShadow:f.isCrit?'0 0 8px rgba(251,191,36,0.8)':'none'}},
            (f.isCrit?'★ CRIT +':'+') + f.value
          );
        })
      ),

      e('div',{style:mn(9,cl.boosted?'#22c55e':DIM,{marginTop:12,letterSpacing:'0.14em'})},
        cl.boosted ? '✦ 2x JOURNAL BOOST ACTIVE' : cl.isCharged ? '◈ CHARGED — NEXT TAP 3x' : 'TAP TO GENERATE CLARITY'
      ),
      cl.comboCount > 0 && e('div',{style:{marginTop:6,display:'flex',alignItems:'center',justifyContent:'center',gap:8}},
        e('div',{style:{display:'flex',gap:3}},
          [1,2,3,4,5].map(function(n){
            return e('div',{key:n,style:{width:10,height:10,borderRadius:'50%',background:n<=cl.comboCount?(comboLocked?'#8b5cf6':'#4a9eff'):BDR2,transition:'background 0.15s',boxShadow:n<=cl.comboCount&&comboLocked?'0 0 6px #8b5cf6':'none'}});
          })
        ),
        e('div',{style:mn(8,comboLocked?'#8b5cf6':'#4a9eff',{fontWeight:700})},
          comboLocked ? 'LOCKED x5 — '+comboSecsLeft+'s' : 'x'+cl.comboCount+' COMBO'
        )
      ),
      e('div',{style:mn(7,DIM,{marginTop:4,letterSpacing:'0.1em'})},
        fmtClarity(cl.totalEarned)+' TOTAL EARNED · '+totalOwned+' GENERATORS'
      ),

      // Tap upgrade row
      e('div',{style:{marginTop:14,borderTop:'1px solid '+BDR2,paddingTop:12}},
        e('div',{style:row({justifyContent:'space-between',marginBottom:8})},
          e('div',null,
            e('div',{style:mn(8,'#94a3b8',{fontWeight:700,letterSpacing:'0.18em',marginBottom:2})},'TAP UPGRADE'),
            e('div',{style:mn(7,DIM)},
              cl.tapLevel >= TAP_UPGRADES.length
                ? 'APEX REACHED — +'+cl.tapBonusTotal+' bonus/tap'
                : 'LV.'+cl.tapLevel+' (+'+cl.tapBonusTotal+' bonus/tap)'+(nextTapUpg?' · next: '+nextTapUpg.desc:'')
            )
          ),
          cl.tapLevel < TAP_UPGRADES.length
            ? e('button',{onClick:cl.upgradeTap,disabled:!nextTapUpg||cl.clarity<nextTapUpg.cost,style:{padding:'8px 14px',background:nextTapUpg&&cl.clarity>=nextTapUpg.cost?'rgba(74,158,255,0.12)':BG2,border:'1px solid '+(nextTapUpg&&cl.clarity>=nextTapUpg.cost?'#4a9eff66':BDR2),borderRadius:9,fontSize:9,color:nextTapUpg&&cl.clarity>=nextTapUpg.cost?'#4a9eff':DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:nextTapUpg&&cl.clarity>=nextTapUpg.cost?'pointer':'default',transition:'all 0.15s',flexShrink:0}},
              nextTapUpg?fmtClarity(nextTapUpg.cost)+' — '+nextTapUpg.name:'MAXED')
            : e('div',{style:mn(9,'#f59e0b',{padding:'8px 14px',fontWeight:700})},'◆ APEX')
        ),
        e('div',{style:row({gap:5,justifyContent:'center'})},
          TAP_UPGRADES.map(function(u){
            return e('div',{key:u.level,title:u.name+': '+u.desc,style:{width:28,height:6,borderRadius:3,background:cl.tapLevel>=u.level?'#4a9eff':BDR2,transition:'background 0.3s'}});
          })
        )
      )
    ),

    // Generator shop
    e('div',{style:{background:BG,border:'1px solid '+BDR,borderRadius:16,overflow:'hidden',marginBottom:12}},
      e('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid '+BDR2,background:BG2}},
        e('div',null,
          e('div',{style:mn(9,'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})},'PASSIVE GENERATORS'),
          e('div',{style:mn(7,DIM,{marginTop:2})},'Milestone bonuses at 5 / 10 / 25 / 50 owned')
        ),
        cl.passiveRate > 0 && e('div',{style:{background:'#22c55e18',border:'1px solid #22c55e44',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:700,color:'#22c55e',fontFamily:"'DM Mono',monospace"}},fmtClarity(cl.passiveRate)+'/s')
      ),
      e('div',{style:{padding:'12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        GENERATORS.map(function(gen){
          return e(GenCard,{key:gen.id,gen:gen,owned:cl.counts[gen.id]||0,clarity:cl.clarity,streak:streak,isVIP:isVIP,burstActive:cl.burstGenId===gen.id,marketDiscount:marketMap[gen.id]||0,onBuy:function(){cl.buyGenerator(gen.id,marketMap[gen.id]||0);},onNeedVIP:onNeedVIP});
        })
      )
    ),

    // Passive upgrade shop
    e('div',{style:{background:BG,border:'1px solid '+BDR,borderRadius:16,overflow:'hidden',marginBottom:12}},
      e('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid '+BDR2,background:BG2}},
        e('div',null,
          e('div',{style:mn(9,'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})},'PASSIVE UPGRADES'),
          e('div',{style:mn(7,DIM,{marginTop:2})},'Permanent multipliers — stack for massive output')
        ),
        shopMultPct > 0 && e('div',{style:{background:'rgba(139,92,246,0.12)',border:'1px solid #8b5cf644',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:700,color:'#8b5cf6',fontFamily:"'DM Mono',monospace"}},'+'+shopMultPct+'% bonus')
      ),
      e('div',{style:{padding:'12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        SHOP_ITEMS.map(function(item){
          return e(ShopCard,{key:item.id,item:item,owned:(cl.shopCounts&&cl.shopCounts[item.id])||0,clarity:cl.clarity,marketDiscount:marketMap[item.id]||0,onBuy:function(){cl.buyShopItem(item.id,marketMap[item.id]||0);}});
        })
      )
    ),

    // Black market
    e('div',{style:{background:BG,border:'1px solid '+(marketActive?'#f59e0b55':BDR),borderRadius:16,overflow:'hidden',marginBottom:12,transition:'border-color 0.3s'}},
      e('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid '+BDR2,background:BG2}},
        e('div',null,
          e('div',{style:mn(9,marketActive?'#f59e0b':'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})},marketActive?'◆ BLACK MARKET — ACTIVE':'BLACK MARKET'),
          e('div',{style:mn(7,DIM,{marginTop:2})},marketActive?marketMinsLeft+'m left — discounted items below':'Roll 2 random discounts · lasts 10 min')
        ),
        e('button',{onClick:cl.rollMarket,disabled:cl.clarity<500,style:{padding:'7px 12px',background:cl.clarity>=500?'rgba(245,158,11,0.12)':BG2,border:'1px solid '+(cl.clarity>=500?'#f59e0b66':BDR2),borderRadius:9,fontSize:9,color:cl.clarity>=500?'#f59e0b':DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:cl.clarity>=500?'pointer':'default',transition:'all 0.15s',whiteSpace:'nowrap'}},
          marketActive?'RE-ROLL 500':'ROLL 500')
      ),
      e('div',{style:{padding:'10px 14px'}},
        marketActive && (cl.marketItems||[]).length > 0
          ? e('div',{style:{display:'flex',flexDirection:'column',gap:6}},
              (cl.marketItems||[]).map(function(mi,idx){
                var isGen  = mi.type === 'gen';
                var entity = isGen ? GENERATORS.find(function(g){return g.id===mi.id;}) : SHOP_ITEMS.find(function(s){return s.id===mi.id;});
                if (!entity) return null;
                var ownedCount = isGen ? (cl.counts[mi.id]||0) : ((cl.shopCounts&&cl.shopCounts[mi.id])||0);
                var baseCost = isGen ? genCost(entity, ownedCount) : entity.cost;
                var saleCost = Math.ceil(baseCost * (1 - mi.discount));
                var canBuy   = cl.clarity >= saleCost && (!isGen || (streak >= entity.milestoneStreak && !entity.vip));
                return e('div',{key:idx,style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:entity.color+'0c',border:'1px solid '+entity.color+'44',borderRadius:10}},
                  e('div',{style:row({gap:9})},
                    e('span',{style:{fontSize:13,color:entity.color}},entity.icon),
                    e('div',null,
                      e('div',{style:mn(10,entity.color,{fontWeight:700})},(isGen?'GEN: ':'UPG: ')+entity.name),
                      e('div',{style:mn(8,MID)},Math.round(mi.discount*100)+'% off · was '+fmtClarity(baseCost))
                    )
                  ),
                  e('button',{onClick:function(){isGen?cl.buyGenerator(mi.id,mi.discount):cl.buyShopItem(mi.id,mi.discount);},disabled:!canBuy,style:{padding:'7px 12px',background:canBuy?entity.color+'22':BG2,border:'1px solid '+(canBuy?entity.color+'66':BDR2),borderRadius:8,fontSize:10,color:canBuy?entity.color:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,cursor:canBuy?'pointer':'default',whiteSpace:'nowrap'}},fmtClarity(saleCost)+' CL')
                );
              })
            )
          : e('div',{style:{textAlign:'center',padding:'12px 0',color:DIM,fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:'0.1em'}},
              marketActive ? 'No items — re-roll for new deals.' : 'Market closed — spend 500 Clarity to reveal deals.'
            )
      )
    ),

    // Prestige system drawer
    e('div',{style:{background:BG,border:'1px solid '+(canPrestige?'#e879a066':BDR),borderRadius:16,overflow:'hidden',marginBottom:12,transition:'border-color 0.5s'}},
      e('div',{onClick:function(){setPrestigeOpen(function(o){return !o;});},style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',cursor:'pointer',background:BG2,borderBottom:prestigeOpen?'1px solid '+BDR2:'none'}},
        e('div',null,
          e('div',{style:mn(9,canPrestige?'#e879a0':'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})},
            canPrestige ? '◈ PRESTIGE READY — RESET & TRANSCEND' : '◇ PRESTIGE SYSTEM'
          ),
          e('div',{style:mn(7,DIM,{marginTop:2})},
            'Run #'+(runCount+1)+' · '+cl.echoes+' Echo'+(cl.echoes!==1?'es':'')+' · Next at '+fmtClarity(prestigeThresh)+' total'
          )
        ),
        e('div',{style:mn(8,canPrestige?'#e879a0':DIM,{fontWeight:700})},prestigeOpen?'▲':'▼')
      ),

      prestigeOpen && e('div',{style:{padding:'14px'}},
        // Progress bar
        e('div',{style:{marginBottom:14}},
          e('div',{style:row({justifyContent:'space-between',marginBottom:6})},
            e('div',{style:mn(8,DIM)},'Progress'),
            e('div',{style:mn(8,canPrestige?'#e879a0':'#94a3b8',{fontWeight:700})},
              fmtClarity(cl.totalEarned)+' / '+fmtClarity(prestigeThresh)
            )
          ),
          e('div',{style:{height:7,background:BDR2,borderRadius:4,overflow:'hidden'}},
            e('div',{style:{height:'100%',width:Math.min(prestigeProgress*100,100)+'%',background:canPrestige?'linear-gradient(90deg,#8b5cf6,#e879a0)':'#4a9eff',borderRadius:4,transition:'width 1s ease',boxShadow:canPrestige?'0 0 10px #e879a066':'none'}})
          ),
          canPrestige && e('div',{style:mn(8,'#e879a0',{marginTop:5,fontWeight:700,letterSpacing:'0.1em'})},'◈ Ready — you will earn +'+prestigeEarned+' Echo'+(prestigeEarned!==1?'es':''))
        ),

        // Prestige button
        canPrestige && e('div',{style:{background:'linear-gradient(135deg,#1a0d2288,#180e2a88)',border:'1px solid #e879a044',borderRadius:12,padding:'12px 14px',marginBottom:14}},
          e('div',{style:mn(8,MID,{marginBottom:10,lineHeight:1.6})},'All Clarity, generators, tap upgrades, and shop items reset.'+(cl.tapLevel>0&&(cl.echoPerks&&cl.echoPerks.tapMem)?(' Tap Memory carries ~'+Math.round([25,50,75][(cl.echoPerks.tapMem||1)-1])+'% of tap upgrades.'):'')+(cl.echoPerks&&cl.echoPerks.seed?' Clarity Seed starts you with bonus Clarity.':'')),
          e('button',{onClick:doPrestige,disabled:!!prestigeAnim,style:{width:'100%',padding:'13px',background:'linear-gradient(135deg,rgba(139,92,246,0.18),rgba(232,121,160,0.18))',border:'1px solid #e879a088',borderRadius:10,fontSize:12,color:'#e879a0',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.18em',cursor:prestigeAnim?'default':'pointer',boxShadow:'0 0 20px #e879a033',transition:'all 0.2s'}},'◈ PRESTIGE — TRANSCEND')
        ),

        // Echo shop
        e('div',{style:{borderTop:'1px solid '+BDR2,paddingTop:12}},
          e('div',{style:row({justifyContent:'space-between',marginBottom:8})},
            e('div',null,
              e('div',{style:mn(9,'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})},'ECHO SHOP'),
              e('div',{style:mn(7,DIM,{marginTop:2})},'Permanent — survives every reset')
            ),
            e('div',{style:{background:'#e879a018',border:'1px solid #e879a044',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:700,color:'#e879a0',fontFamily:"'DM Mono',monospace"}},cl.echoes+' ECHO'+(cl.echoes!==1?'ES':''))
          ),
          e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
            ECHO_PERKS.map(function(perk){
              return e(EchoPerkCard,{key:perk.id,perk:perk,level:(cl.echoPerks&&cl.echoPerks[perk.id])||0,echoes:cl.echoes,onBuy:function(){cl.buyEchoPerk(perk.id);}});
            })
          )
        )
      )
    ),

    // VIP upsell
    !isVIP && e('div',{onClick:onNeedVIP,style:{background:'linear-gradient(135deg,#1a0d22,#180e2a)',border:'1px solid #8b5cf633',borderRadius:14,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'border-color 0.2s'},onMouseEnter:function(ev){ev.currentTarget.style.borderColor='#8b5cf666';},onMouseLeave:function(ev){ev.currentTarget.style.borderColor='#8b5cf633';}},
      e('div',null,
        e('div',{style:mn(9,'#8b5cf6',{fontWeight:700,letterSpacing:'0.18em',marginBottom:3})},'◈ VIP EXPANSION'),
        e('div',{style:mn(8,MID)},'Unlock Sovereign Engine · remove journal limit · premium themes')
      ),
      e('div',{style:mn(9,'#8b5cf6',{fontWeight:700})},'UPGRADE →')
    )
  );
}
