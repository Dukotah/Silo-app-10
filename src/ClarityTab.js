/**
 * ClarityTab.js — Clarity Clicker Idle Engine UI
 * Layout: offline banner -> boost banner -> stats -> tap orb ->
 *         tap upgrade row -> generator shop -> upgrade shop -> VIP strip
 */

import React from 'react';
import { GENERATORS, TAP_UPGRADES, SHOP_ITEMS, genCost, fmtClarity, calcPassiveRate } from './useClarity.js';

var e        = React.createElement;
var useState = React.useState;
var useRef   = React.useRef;

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
  '@keyframes cl-ring{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.2);opacity:0}}' +
  '@keyframes cl-tap{0%{transform:scale(1)}30%{transform:scale(0.93)}70%{transform:scale(1.06)}100%{transform:scale(1)}}' +
  '@keyframes cl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
  '@keyframes cl-boost{0%,100%{opacity:0.6}50%{opacity:1}}' +
  '@keyframes cl-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}' +
  '@keyframes cl-ping{0%{opacity:1;transform:scale(1) translate(-50%,-50%)}100%{opacity:0;transform:scale(2.5) translate(-50%,-50%)}}';

// --- TAP CORE SVG ------------------------------------------------------------
function TapCore(props) {
  var tapping = props.tapping, boosted = props.boosted;
  var tapPower = props.tapPower, streak = props.streak;
  var color = boosted ? '#22c55e' : '#4a9eff';
  var glow  = boosted ? 'rgba(34,197,94,0.6)' : 'rgba(74,158,255,0.5)';
  var rings = [];
  for (var ri = 0; ri < 4; ri++) {
    rings.push(e('circle',{key:'r'+ri,cx:'100',cy:'100',r:String(52+ri*13),fill:'none',stroke:color,strokeWidth:'0.6',opacity:0.08-ri*0.015,style:{animation:'cl-pulse '+(2+ri*0.6)+'s ease-in-out '+(ri*0.3)+'s infinite'}}));
  }
  rings.push(e('circle',{key:'track',cx:'100',cy:'100',r:'44',fill:'none',stroke:color,strokeWidth:'1.5',opacity:0.12}));
  rings.push(e('circle',{key:'blob', cx:'100',cy:'100',r:'38',fill:color,opacity:0.06,style:{filter:'blur(6px)'}}));
  rings.push(e('circle',{key:'mid',  cx:'100',cy:'100',r:'26',fill:color,opacity:0.12,style:{animation:'cl-pulse 2s ease-in-out infinite'}}));
  rings.push(e('circle',{key:'core', cx:'100',cy:'100',r:'16',fill:color,opacity:0.92,style:{animation:'cl-pulse 1.6s ease-in-out infinite',filter:'drop-shadow(0 0 8px '+color+')'}}));
  if (boosted) {
    rings.push(e('polygon',{key:'boost',points:'100,72 116,100 100,128 84,100',fill:'none',stroke:'#22c55e',strokeWidth:'1.2',opacity:0.35,style:{animation:'cl-boost 1.8s ease-in-out infinite'}}));
  }
  var spokes = Math.min(streak, 12);
  for (var si = 0; si < spokes; si++) {
    var ang = (si/Math.max(spokes,1))*Math.PI*2;
    var x1 = 100+Math.cos(ang)*17, y1 = 100+Math.sin(ang)*17;
    var x2 = 100+Math.cos(ang)*(27+Math.min(streak,20)), y2 = 100+Math.sin(ang)*(27+Math.min(streak,20));
    rings.push(e('line',{key:'sp'+si,x1:x1.toFixed(1),y1:y1.toFixed(1),x2:x2.toFixed(1),y2:y2.toFixed(1),stroke:color,strokeWidth:'1',opacity:0.25}));
  }
  rings.push(e('text',{key:'lbl',x:'100',y:'105',textAnchor:'middle',fontFamily:"'DM Mono',monospace",fontSize:'11',fontWeight:'700',fill:color,opacity:0.85},'TAP'));
  return e('div',{style:{position:'relative',width:'100%',maxWidth:200,margin:'0 auto'}},
    e('svg',{viewBox:'0 0 200 200',xmlns:'http://www.w3.org/2000/svg',style:{width:'100%',display:'block',filter:'drop-shadow(0 0 '+(boosted?22:14)+'px '+glow+')',animation:tapping?'cl-tap 0.22s ease':'cl-float 3.5s ease-in-out infinite',transition:'filter 0.4s ease',cursor:'pointer'}},rings)
  );
}

// --- GENERATOR CARD ----------------------------------------------------------
function GenCard(props) {
  var gen = props.gen, owned = props.owned, clarity = props.clarity;
  var streak = props.streak, isVIP = props.isVIP;
  var cost = genCost(gen, owned);
  var milestoneMet = streak >= gen.milestoneStreak;
  var vipLocked    = gen.vip && !isVIP;
  var canBuy       = milestoneMet && !vipLocked && clarity >= cost && owned < gen.maxCount;
  var maxed        = owned >= gen.maxCount;
  var borderColor  = owned > 0 ? gen.color+'55' : (canBuy ? gen.color+'30' : BDR);
  var bgColor      = owned > 0 ? gen.color+'0c' : (vipLocked ? '#0e1018' : BG);
  return e('div',{style:{background:bgColor,border:'1px solid '+borderColor,borderRadius:12,padding:'11px 13px',transition:'all 0.2s ease',position:'relative',overflow:'hidden'}},
    vipLocked && e('div',{style:{position:'absolute',top:0,left:'15%',right:'15%',height:1.5,background:'linear-gradient(90deg,transparent,#e879a0,transparent)'}}),
    e('div',{style:row({justifyContent:'space-between',marginBottom:6})},
      e('div',{style:row({gap:7})},
        e('span',{style:{fontSize:14,lineHeight:1}},gen.icon),
        e('div',null,
          e('div',{style:mn(10,owned>0?gen.color:'#94a3b8',{fontWeight:700,letterSpacing:'0.1em'})},gen.name),
          e('div',{style:mn(8,MID)},gen.rate+'/s each')
        )
      ),
      e('div',{style:{background:owned>0?gen.color+'22':BG2,border:'1px solid '+(owned>0?gen.color+'55':BDR2),borderRadius:8,padding:'3px 9px',fontSize:11,fontWeight:700,color:owned>0?gen.color:DIM,fontFamily:"'DM Mono',monospace",minWidth:28,textAlign:'center'}},String(owned))
    ),
    e('div',{style:{fontSize:11,color:MID,lineHeight:1.5,marginBottom:8}},
      vipLocked ? '◈ VIP EXCLUSIVE' : (!milestoneMet ? '◇ Requires '+gen.milestoneStreak+'-day streak (you: '+streak+'d)' : gen.desc)
    ),
    vipLocked
      ? e('button',{onClick:props.onNeedVIP,style:{width:'100%',padding:'8px',borderRadius:8,background:'#e879a033',border:'1px solid #e879a066',fontSize:9,color:'#e879a0',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.15em',cursor:'pointer'}},'◈ UNLOCK WITH VIP')
      : (!milestoneMet
          ? e('div',{style:{fontSize:9,color:DIM,fontFamily:"'DM Mono',monospace",letterSpacing:'0.12em',textAlign:'center',padding:'6px 0'}},'STREAK MILESTONE REQUIRED')
          : maxed
            ? e('div',{style:mn(9,gen.color,{textAlign:'center',padding:'6px 0',letterSpacing:'0.1em'})},'MAX')
            : e('button',{onClick:props.onBuy,disabled:!canBuy,style:{width:'100%',padding:'8px',background:canBuy?gen.color+'18':BG2,border:'1px solid '+(canBuy?gen.color+'66':BDR2),borderRadius:8,fontSize:10,color:canBuy?gen.color:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:canBuy?'pointer':'default',transition:'all 0.15s'}},fmtClarity(cost)+' CLARITY')
        )
  );
}

// --- SHOP CARD ---------------------------------------------------------------
function ShopCard(props) {
  var item = props.item, owned = props.owned, clarity = props.clarity;
  var canBuy  = clarity >= item.cost && owned < item.maxCount;
  var maxed   = owned >= item.maxCount;
  var borderColor = owned > 0 ? item.color+'55' : (canBuy ? item.color+'30' : BDR);
  var bgColor     = owned > 0 ? item.color+'0a' : BG;
  return e('div',{style:{background:bgColor,border:'1px solid '+borderColor,borderRadius:12,padding:'11px 13px',transition:'all 0.2s ease'}},
    e('div',{style:row({justifyContent:'space-between',marginBottom:6})},
      e('div',{style:row({gap:7})},
        e('span',{style:{fontSize:14,lineHeight:1,color:item.color}},item.icon),
        e('div',null,
          e('div',{style:mn(10,owned>0?item.color:'#94a3b8',{fontWeight:700,letterSpacing:'0.1em'})},item.name),
          e('div',{style:mn(8,MID)},'+'+Math.round(item.passiveBonus*100)+'% passive')
        )
      ),
      e('div',{style:{background:owned>0?item.color+'22':BG2,border:'1px solid '+(owned>0?item.color+'55':BDR2),borderRadius:8,padding:'3px 9px',fontSize:11,fontWeight:700,color:owned>0?item.color:DIM,fontFamily:"'DM Mono',monospace",minWidth:28,textAlign:'center'}},
        maxed ? 'MAX' : owned+'/'+item.maxCount
      )
    ),
    e('div',{style:{fontSize:11,color:MID,lineHeight:1.5,marginBottom:8}},item.desc),
    maxed
      ? e('div',{style:mn(9,item.color,{textAlign:'center',padding:'6px 0',letterSpacing:'0.1em'})},'FULLY UPGRADED')
      : e('button',{onClick:props.onBuy,disabled:!canBuy,style:{width:'100%',padding:'8px',background:canBuy?item.color+'18':BG2,border:'1px solid '+(canBuy?item.color+'66':BDR2),borderRadius:8,fontSize:10,color:canBuy?item.color:DIM,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:canBuy?'pointer':'default',transition:'all 0.15s'}},fmtClarity(item.cost)+' CLARITY')
  );
}

// --- BOOST BANNER ------------------------------------------------------------
function BoostBanner(props) {
  if (!props.end || Date.now() >= props.end) return null;
  var remaining = Math.max(0, props.end - Date.now());
  var hrs  = Math.floor(remaining / 3600000);
  var mins = Math.floor((remaining % 3600000) / 60000);
  return e('div',{style:{background:'#14532d33',border:'1px solid #22c55e55',borderRadius:10,padding:'9px 13px',marginBottom:10,display:'flex',alignItems:'center',gap:10,animation:'cl-boost 2.5s ease-in-out infinite'}},
    e('span',{style:{fontSize:16}},'✦'),
    e('div',null,
      e('div',{style:mn(9,'#22c55e',{fontWeight:700,letterSpacing:'0.12em'})},'2× JOURNAL BOOST ACTIVE'),
      e('div',{style:mn(8,MID)},hrs+'h '+mins+'m remaining')
    )
  );
}

// --- OFFLINE BANNER ----------------------------------------------------------
function OfflineBanner(props) {
  if (!props.earned || props.earned < 0.1) return null;
  var hrs  = Math.floor(props.seconds / 3600);
  var mins = Math.floor((props.seconds % 3600) / 60);
  var timeStr = hrs > 0 ? hrs+'h '+mins+'m' : mins+'m';
  return e('div',{style:{background:'#0c1628',border:'1px solid #1e3a5f',borderRadius:10,padding:'10px 13px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between',animation:'cl-fadein 0.4s ease'}},
    e('div',null,
      e('div',{style:mn(9,'#4a9eff',{fontWeight:700,letterSpacing:'0.12em',marginBottom:3})},'◆ OFFLINE PROGRESS'),
      e('div',{style:mn(8,MID)},'+'+fmtClarity(props.earned)+' Clarity earned while away ('+timeStr+')')
    ),
    e('button',{onClick:props.onDismiss,style:{background:'transparent',border:'none',color:DIM,fontSize:17,cursor:'pointer',lineHeight:1,padding:'0 4px'}},'x')
  );
}

// --- MAIN TAB ----------------------------------------------------------------
export function ClarityTab(props) {
  var cl      = props.clarity;
  var isVIP   = props.isVIP;
  var onNeedVIP = props.onNeedVIP;
  var streak  = (props.state && props.state.streak) || 0;

  var s1 = useState(false); var tapping = s1[0], setTapping = s1[1];
  var tapTimer = useRef(null);

  function doTap() {
    cl.tap();
    setTapping(true);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(function() { setTapping(false); }, 220);
  }

  var totalOwned = GENERATORS.reduce(function(s,g){ return s+(cl.counts[g.id]||0); }, 0);
  var nextTapUpg = TAP_UPGRADES[cl.tapLevel];   // undefined when maxed
  var shopMultPct = Math.round((cl.shopMult - 1) * 100);

  return e('div',{style:{animation:'fadeUp 0.35s ease',paddingBottom:24}},
    e('style',null,CLICKER_CSS),

    e(OfflineBanner,{earned:cl.offlineEarned,seconds:cl.offlineSeconds,onDismiss:cl.dismissOffline}),
    e(BoostBanner,{end:cl.journalBoostEnd}),

    // Stats row
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}},
      [
        {label:'CLARITY',   val:fmtClarity(cl.clarity),  color:'#4a9eff'},
        {label:'RATE / SEC',val:cl.passiveRate>=1?fmtClarity(cl.passiveRate)+'/s':cl.passiveRate.toFixed(2)+'/s', color:'#22c55e'},
        {label:'TAP POWER', val:'x'+cl.tapPower, color:cl.tapPower>1?'#f59e0b':'#3d4d63'},
      ].map(function(item){
        return e('div',{key:item.label,style:{background:BG,border:'1px solid '+BDR,borderRadius:12,padding:'11px 12px'}},
          e('div',{style:mn(7,DIM,{marginBottom:5,letterSpacing:'0.18em'})},item.label),
          e('div',{style:{fontSize:16,fontWeight:700,color:item.color,fontFamily:"'DM Mono',monospace",lineHeight:1}},item.val)
        );
      })
    ),

    // Central tap orb card
    e('div',{style:{background:'linear-gradient(160deg,'+BG+','+BG2+')',border:'1px solid '+BDR,borderRadius:18,padding:'20px 16px 16px',marginBottom:14,textAlign:'center'}},
      streak > 0 && e('div',{style:mn(8,'#f59e0b',{marginBottom:8,letterSpacing:'0.14em'})},'◆ '+streak+'-DAY STREAK → +'+streak+' BASE TAP POWER'),
      e('div',{onClick:doTap,style:{maxWidth:190,margin:'0 auto',userSelect:'none'}},
        e(TapCore,{tapping:tapping,boosted:cl.boosted,tapPower:cl.tapPower,streak:streak})
      ),
      e('div',{style:mn(9,cl.boosted?'#22c55e':DIM,{marginTop:12,letterSpacing:'0.14em'})},
        cl.boosted ? '✦ 2x JOURNAL BOOST ACTIVE' : 'TAP TO GENERATE CLARITY'
      ),
      e('div',{style:mn(7,DIM,{marginTop:4,letterSpacing:'0.1em'})},
        fmtClarity(cl.totalEarned)+' TOTAL EARNED · '+totalOwned+' GENERATORS'
      ),

      // Tap upgrade row (inside orb card, below sub-label)
      e('div',{style:{marginTop:14,borderTop:'1px solid '+BDR2,paddingTop:12}},
        e('div',{style:row({justifyContent:'space-between',marginBottom:8})},
          e('div',null,
            e('div',{style:mn(8,'#94a3b8',{fontWeight:700,letterSpacing:'0.18em',marginBottom:2})},'TAP UPGRADE'),
            e('div',{style:mn(7,DIM)},
              cl.tapLevel >= TAP_UPGRADES.length
                ? 'APEX LEVEL REACHED (+'+cl.tapBonusTotal+' bonus/tap)'
                : 'LV.'+cl.tapLevel+' — '+cl.tapBonusTotal+' bonus/tap'+(nextTapUpg ? ' · next: '+nextTapUpg.desc : '')
            )
          ),
          cl.tapLevel < TAP_UPGRADES.length
            ? e('button',{
                onClick:cl.upgradeTap,
                disabled: !nextTapUpg || cl.clarity < nextTapUpg.cost,
                style:{
                  padding:'8px 14px',
                  background: nextTapUpg && cl.clarity>=nextTapUpg.cost ? 'rgba(74,158,255,0.12)' : BG2,
                  border:'1px solid '+(nextTapUpg&&cl.clarity>=nextTapUpg.cost?'#4a9eff66':BDR2),
                  borderRadius:9,fontSize:9,
                  color: nextTapUpg&&cl.clarity>=nextTapUpg.cost ? '#4a9eff' : DIM,
                  fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',
                  cursor: nextTapUpg&&cl.clarity>=nextTapUpg.cost ? 'pointer' : 'default',
                  transition:'all 0.15s',flexShrink:0,
                },
              }, nextTapUpg ? fmtClarity(nextTapUpg.cost)+' — '+nextTapUpg.name : 'MAXED')
            : e('div',{style:mn(9,'#f59e0b',{padding:'8px 14px',fontWeight:700})},'◆ APEX')
        ),
        // Tap upgrade progress pips
        e('div',{style:row({gap:5,justifyContent:'center'})},
          TAP_UPGRADES.map(function(u){
            var done = cl.tapLevel >= u.level;
            return e('div',{key:u.level,title:u.name+': '+u.desc,style:{
              width:28,height:6,borderRadius:3,
              background: done ? '#4a9eff' : BDR2,
              transition:'background 0.3s',
              position:'relative',
            }});
          })
        )
      )
    ),

    // Generator shop
    e('div',{style:{background:BG,border:'1px solid '+BDR,borderRadius:16,overflow:'hidden',marginBottom:12}},
      e('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid '+BDR2,background:BG2}},
        e('div',null,
          e('div',{style:mn(9,'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})},'PASSIVE GENERATORS'),
          e('div',{style:mn(7,DIM,{marginTop:2})},'Spend Clarity — earn automatically every second')
        ),
        cl.passiveRate > 0 && e('div',{style:{background:'#22c55e18',border:'1px solid #22c55e44',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:700,color:'#22c55e',fontFamily:"'DM Mono',monospace"}},fmtClarity(cl.passiveRate)+'/s')
      ),
      e('div',{style:{padding:'12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        GENERATORS.map(function(gen){
          return e(GenCard,{key:gen.id,gen:gen,owned:cl.counts[gen.id]||0,clarity:cl.clarity,streak:streak,isVIP:isVIP,onBuy:function(){cl.buyGenerator(gen.id);},onNeedVIP:onNeedVIP});
        })
      )
    ),

    // Upgrade shop (shop items — passive multipliers)
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
          return e(ShopCard,{key:item.id,item:item,owned:(cl.shopCounts&&cl.shopCounts[item.id])||0,clarity:cl.clarity,onBuy:function(){cl.buyShopItem(item.id);}});
        })
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
