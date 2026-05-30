/**
 * App.js — SILO v10
 * Shell + all tabs: Home, Journal, Tasks, Signals
 */

import React from 'react';
import {
  CoreProvider, useCoreEngine,
  getTier, getLevelFromXP, getLvlXP,
  TIERS, TASK_CATS, TASK_DIFFS, TASK_FREQS, TASK_TEMPLATES,
  ACHIEVEMENTS, getTaskStreak, XPL,
  getStreakMult, clarityForTask, clarityForEntry,
} from './useCoreEngine.js';
import { parse } from './coreParser.js';
import { ClarityTab } from './ClarityTab.js';
import { useVIP, FREE_JOURNAL_LIMIT } from './useVIP.js';
import { useClarity, fmtClarity } from './useClarity.js';
import { useSignalCheckin, SignalCheckinModal, EvolutionRevealModal, XPBridgeWidget, SignalPulse, XP_BRIDGE_RATE, XP_BRIDGE_CLARITY } from './SignalCheckin.js';
import { JournalTab } from './JournalTab.js';
import { useSkillTree, computeSkillBonuses } from './useSkillTree.js';
import { useSignalIntelligence } from './useSignalIntelligence.js';
import { SignalWeather } from './SignalWeather.js';
import { Onboarding, hasOnboarded } from './Onboarding.js';
import { scheduleTaskReminder, cancelTaskReminder, requestNotifPermission, isAvailable as notifAvailable } from './useNotifications.js';

var e         = React.createElement;
var useState  = React.useState;
var useEffect = React.useEffect;
var useRef    = React.useRef;
var useMemo   = React.useMemo;
function cond(test, el) { return test ? el : null; }
function c2(test, a, b) { return test ? a : b; }

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
var CSS =
  "@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');" +
  "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}" +
  "html,body,#root{height:100%;background:#0d1117}"+
  "body{overscroll-behavior:none;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}" +
  "::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a2d4a;border-radius:2px}" +
  "textarea,input{outline:none}button{cursor:pointer;border:none;background:none;padding:0}" +
  "@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}" +
  "@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}" +
  "@keyframes scaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}" +
  "@keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}" +
  "@keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}" +
  "@keyframes burnOut{0%{opacity:1;transform:scale(1);filter:blur(0)}100%{opacity:0;transform:scale(0.95);filter:blur(6px)}}" +
  "@keyframes burnGlow{0%,100%{opacity:0}50%{opacity:1}}" +
  "@keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}" +
  "@keyframes edgeFlash{0%{opacity:0}15%{opacity:1}100%{opacity:0}}" +
  "@keyframes tremorPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.016)}}";

// ─── STYLE HELPERS ────────────────────────────────────────────────────────────
function mn(sz,cl,x) { return Object.assign({fontFamily:"'DM Mono',monospace",fontSize:sz,color:cl,letterSpacing:'0.08em'},x||{}); }
function row(x)      { return Object.assign({display:'flex',alignItems:'center'},x||{}); }
var card = { background:'#161b27', border:'1px solid #1d2740', borderRadius:16, overflow:'hidden', marginBottom:12 };
var cardH = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 15px', borderBottom:'1px solid #161f32', background:'#11151f' };

// ─── TABS ─────────────────────────────────────────────────────────────────────
var TABS = [
  { id:'HOME',    label:'Home',    glyph:'⬡' },
  { id:'JOURNAL', label:'Journal', glyph:'◎' },
  { id:'TASKS',   label:'Tasks',   glyph:'▪' },
  { id:'SIGNALS', label:'Clarity', glyph:'◈' },
];

// ─── STAT BAR ─────────────────────────────────────────────────────────────────
function StatBar(props) {
  var pct = props.max > 0 ? Math.min((props.val/props.max)*100,100) : 0;
  return e('div',{style:{flex:1}},
    e('div',{style:row({justifyContent:'space-between',marginBottom:4})},
      e('span',{style:mn(8,'#475569')},props.label),
      e('span',{style:mn(8,props.val>0?props.color:'#2d3748')},String(props.val))
    ),
    e('div',{style:{height:3,background:'#0f1520',borderRadius:2,overflow:'hidden'}},
      e('div',{style:{height:'100%',width:pct+'%',background:props.color,borderRadius:2,transition:'width 0.9s ease'}})
    )
  );
}

// ─── CORE ENTITY SVG ──────────────────────────────────────────────────────────
function CoreEntity(props) {
  var lv=props.level, t=props.tier, pct=props.xpPct, isVIP=props.isVIP||false, kids=[];
  var nearLevelUp=props.nearLevelUp||false, withinFive=props.withinFive||false;
  var accent=props.focus||t.color;
  var arcR=44, arcC=2*Math.PI*arcR, off=arcC*(1-Math.min(pct,100)/100);
  var pulseSpeed = withinFive ? 0.38 : nearLevelUp ? 0.62 : 1;
  // VIP: extra slow outer resonance rings
  if (isVIP) {
    kids.push(e('circle',{key:'vip0',cx:'100',cy:'100',r:'88',fill:'none',stroke:t.color,strokeWidth:'0.5',opacity:0.08,style:{animation:'pulse 4.5s ease-in-out 0s infinite'}}));
    kids.push(e('circle',{key:'vip1',cx:'100',cy:'100',r:'96',fill:'none',stroke:accent,strokeWidth:'0.4',opacity:0.06,style:{animation:'pulse 6s ease-in-out 1.2s infinite'}}));
  }
  for (var ri=0;ri<Math.min(lv,6);ri++) {
    kids.push(e('circle',{key:'r'+ri,cx:'100',cy:'100',r:String(52+ri*15),fill:'none',stroke:t.color,strokeWidth:'0.7',opacity:Math.max(0.03,0.1-ri*0.015),style:{animation:'pulse '+((2.2+ri*0.7)*pulseSpeed).toFixed(2)+'s ease-in-out '+(ri*0.35*pulseSpeed).toFixed(2)+'s infinite'}}));
  }
  kids.push(e('circle',{key:'track',cx:'100',cy:'100',r:String(arcR),fill:'none',stroke:t.color,strokeWidth:'2',opacity:0.1}));
  kids.push(e('circle',{key:'arc',cx:'100',cy:'100',r:String(arcR),fill:'none',stroke:t.color,strokeWidth:'3',opacity:0.85,strokeDasharray:String(arcC.toFixed(1)),strokeDashoffset:String(off.toFixed(1)),strokeLinecap:'round',style:{transform:'rotate(-90deg)',transformOrigin:'100px 100px',transition:'stroke-dashoffset 1s ease'}}));
  kids.push(e('circle',{key:'b0',cx:'100',cy:'100',r:'28',fill:t.color,opacity:0.07}));
  kids.push(e('circle',{key:'b1',cx:'100',cy:'100',r:'18',fill:t.color,opacity:0.15,style:{animation:'pulse '+(2*pulseSpeed).toFixed(2)+'s ease-in-out infinite'}}));
  kids.push(e('circle',{key:'b2',cx:'100',cy:'100',r:'8',fill:t.color,opacity:0.9,style:{animation:'pulse '+(1.5*pulseSpeed).toFixed(2)+'s ease-in-out infinite'}}));
  var spokes=Math.min(lv*2,12);
  for (var si=0;si<spokes;si++) {
    var ang=(si/spokes)*Math.PI*2;
    var x1=100+Math.cos(ang)*18, y1=100+Math.sin(ang)*18;
    var x2=100+Math.cos(ang)*(26+lv*2.5+(isVIP?4:0)), y2=100+Math.sin(ang)*(26+lv*2.5+(isVIP?4:0));
    kids.push(e('line',{key:'sp'+si,x1:x1.toFixed(1),y1:y1.toFixed(1),x2:x2.toFixed(1),y2:y2.toFixed(1),stroke:accent,strokeWidth:isVIP?'1.4':'1',opacity:(0.3+lv*0.04)*(isVIP?1.4:1),style:{transition:'stroke 1.2s ease'}}));
  }
  if (lv>=4) {
    var orbs=Math.min(lv-2,8);
    for (var oi=0;oi<orbs;oi++) {
      var oa=(oi/orbs)*Math.PI*2, ox=100+Math.cos(oa)*38, oy=100+Math.sin(oa)*38;
      kids.push(e('circle',{key:'o'+oi,cx:ox.toFixed(1),cy:oy.toFixed(1),r:isVIP?'4':'3',fill:accent,opacity:isVIP?0.8:0.6,style:{animation:'pulse '+((1.5+oi*0.25)*pulseSpeed).toFixed(2)+'s ease-in-out '+(oi*0.18*pulseSpeed).toFixed(2)+'s infinite',transition:'fill 1.2s ease'}}));
    }
  }
  // VIP: second rotating accent ring at 60deg offset
  if (isVIP) {
    var arcR2=50, arcC2=2*Math.PI*arcR2, off2=arcC2*0.72;
    kids.push(e('circle',{key:'arc2',cx:'100',cy:'100',r:String(arcR2),fill:'none',stroke:accent,strokeWidth:'1.5',opacity:0.35,strokeDasharray:String(arcC2.toFixed(1)),strokeDashoffset:String(off2.toFixed(1)),strokeLinecap:'round',style:{transform:'rotate(60deg)',transformOrigin:'100px 100px'}}));
  }
  kids.push(e('text',{key:'lv',x:'100',y:'105',textAnchor:'middle',fontFamily:"'DM Mono',monospace",fontSize:'13',fontWeight:'700',fill:t.color,opacity:0.9},String(lv)));
  var glowBase=isVIP?(18+Math.min(lv,12)*4):(12+Math.min(lv,12)*3);
  var glowStr = nearLevelUp ? glowBase * 1.6 : glowBase;
  var tremorAnim = nearLevelUp ? 'tremorPulse '+(withinFive?0.5:0.85)+'s ease-in-out infinite' : 'none';
  return e('svg',{viewBox:'0 0 200 200',xmlns:'http://www.w3.org/2000/svg',style:{width:'100%',maxWidth:props.size||200,filter:'drop-shadow(0 0 '+glowStr.toFixed(0)+'px '+t.glow+')',transition:'filter 1.2s ease',animation:tremorAnim}},kids);
}

// ─── EVOLUTION MODAL ──────────────────────────────────────────────────────────
function EvolveModal(props) {
  if (!props.tier) return null;
  var t=props.tier;
  return e('div',{onClick:props.onClose,style:{position:'fixed',inset:0,zIndex:800,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,cursor:'pointer'}},
    e('div',{style:{textAlign:'center',maxWidth:380,cursor:'default',animation:'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)'},onClick:function(ev){ev.stopPropagation();}},
      e('div',{style:mn(10,t.color,{letterSpacing:'0.3em',marginBottom:14})},'◆ EVOLUTION EVENT'),
      e('div',{style:{fontSize:26,fontWeight:700,color:'#e2e8f0',marginBottom:10,lineHeight:1.2}},t.title),
      e('div',{style:{fontSize:13,color:'#94a3b8',lineHeight:1.7,marginBottom:24}},t.desc),
      e('button',{onClick:props.onClose,style:{padding:'12px 28px',background:'transparent',border:'1px solid '+t.color,borderRadius:10,fontSize:11,color:t.color,fontFamily:"'DM Mono',monospace",letterSpacing:'0.15em',cursor:'pointer'}},'ACKNOWLEDGE')
    )
  );
}

// ─── XP TOAST ─────────────────────────────────────────────────────────────────
function XPToast(props) {
  if (!props.data) return null;
  var d=props.data;
  return e('div',{style:{position:'fixed',top:'calc(20px + env(safe-area-inset-top, 0px))',right:'calc(20px + env(safe-area-inset-right, 0px))',zIndex:900,background:'#0a0e1a',border:'1px solid '+(d.shiftColor||'#4a9eff'),borderRadius:14,padding:'13px 17px',width:270,boxShadow:'0 0 24px '+(d.shiftColor||'#4a9eff')+'44',animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',fontFamily:"'DM Mono',monospace"}},
    e('div',{style:row({justifyContent:'space-between',marginBottom:9})},
      e('span',{style:mn(10,d.shiftColor||'#4a9eff',{fontWeight:700,letterSpacing:'0.15em'})},c2(d.action==='burn','◈ PURGE COMPLETE','◆ MATRIX UPDATED')),
      e('button',{onClick:props.onClose,style:{background:'transparent',border:'none',color:'#475569',cursor:'pointer',fontSize:16,lineHeight:1,padding:'0 2px'}},'×')
    ),
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}},
      [{l:'WORDS',v:d.wordCount},{l:'SIGNAL',v:d.shiftLabel?d.shiftLabel.split(' / ')[0]:'Ambient'},{l:'XP',v:'+'+d.xp}].map(function(item){
        return e('div',{key:item.l,style:{background:'rgba(255,255,255,0.04)',borderRadius:7,padding:'7px 9px'}},
          e('div',{style:mn(7,'#475569',{marginBottom:3})},item.l),
          e('div',{style:{fontSize:12,fontWeight:700,color:'#e2e8f0'}},String(item.v))
        );
      })
    ),
    cond(d.clarityAwarded>0,
      e('div',{style:row({justifyContent:'center',gap:6,marginTop:9,padding:'6px 0',background:'rgba(6,182,212,0.07)',borderRadius:7})},
        e('span',{style:mn(11,'#06b6d4',{fontWeight:700})},'◈ +'+d.clarityAwarded+' CLARITY')
      )
    )
  );
}

// ─── ACHIEVEMENT TOAST ────────────────────────────────────────────────────────
function AchievementToast(props) {
  if (!props.data) return null;
  var d=props.data;
  return e('div',{style:{position:'fixed',bottom:'calc(100px + env(safe-area-inset-bottom, 0px))',left:'50%',transform:'translateX(-50%)',zIndex:950,background:'#0a0e1a',border:'1px solid '+d.color,borderRadius:14,padding:'14px 20px',minWidth:260,maxWidth:320,boxShadow:'0 0 32px '+d.color+'55',animation:'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',fontFamily:"'DM Mono',monospace",textAlign:'center',cursor:'pointer'},onClick:props.onClose},
    e('div',{style:mn(9,d.color,{letterSpacing:'0.25em',marginBottom:6})},'◆ ACHIEVEMENT UNLOCKED'),
    e('div',{style:{fontSize:22,marginBottom:4}},d.icon),
    e('div',{style:{fontSize:13,fontWeight:700,color:'#e2e8f0',marginBottom:4}},d.title),
    e('div',{style:{fontSize:11,color:'#475569',lineHeight:1.5}},d.desc)
  );
}

// ─── VIP MODAL ────────────────────────────────────────────────────────────────
function VIPModal(props) {
  if (!props.open) return null;
  var onClose   = props.onClose;
  var onUpgrade = props.onUpgrade;
  var onRestore = props.onRestore;
  var features  = [
    { icon:'◎', label:'Unlimited Journal Entries',   desc:'Free users capped at '+FREE_JOURNAL_LIMIT+' entries per day' },
    { icon:'◈', label:'Sovereign Engine Generator',  desc:'25 Clarity/s passive idle engine — highest yield tier' },
    { icon:'◇', label:'Signal Analytics Dashboard',  desc:'7-day mood history, signal state map, task breakdown' },
    { icon:'⬡', label:'Core Entity Resonance',       desc:'Enhanced entity visuals — dual accent rings and deep-field resonance effects' },
    { icon:'✦', label:'Journal Boost Activation',    desc:'Each journal commit triggers 24h double passive Clarity generation' },
  ];
  return e('div', { onClick:onClose, style:{ position:'fixed', inset:0, zIndex:900, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 } },
    e('div', { onClick:function(ev){ev.stopPropagation();}, style:{ width:'100%', maxWidth:420, animation:'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' } },
      // Card
      e('div', { style:{ background:'linear-gradient(155deg,#160d22,#1a0e2e)', border:'1px solid #8b5cf666', borderRadius:20, padding:'22px 22px 26px', boxShadow:'0 0 60px rgba(139,92,246,0.2)' } },
        // Header
        e('div', { style:{ textAlign:'center', marginBottom:20 } },
          e('div', { style:mn(9,'#8b5cf6',{ letterSpacing:'0.28em', marginBottom:8 }) }, '◈ VIP SELF-DEVELOPMENT EXPANSION'),
          e('div', { style:{ fontSize:22, fontWeight:700, color:'#e2e8f0', fontFamily:"'DM Mono',monospace", lineHeight:1.2, marginBottom:6 } }, 'Unlock Full Protocol'),
          e('div', { style:{ fontSize:12, color:'#556070', lineHeight:1.6 } }, 'Everything free users have, plus these exclusive features:')
        ),
        // Feature list
        e('div', { style:{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 } },
          features.map(function(f) {
            return e('div', { key:f.label, style:{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', background:'rgba(139,92,246,0.07)', border:'1px solid #8b5cf622', borderRadius:10 } },
              e('span', { style:{ fontSize:16, flexShrink:0, color:'#8b5cf6' } }, f.icon),
              e('div', null,
                e('div', { style:{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:2 } }, f.label),
                e('div', { style:{ fontSize:10, color:'#556070' } }, f.desc)
              )
            );
          })
        ),
        // CTA button
        e('button', {
          onClick:function(){ onUpgrade(); onClose(); },
          style:{
            width:'100%', padding:'14px',
            background:'linear-gradient(135deg,#7c3aed,#8b5cf6)',
            border:'none', borderRadius:12,
            fontSize:12, color:'#fff',
            fontFamily:"'DM Mono',monospace",
            fontWeight:700, letterSpacing:'0.15em',
            cursor:'pointer',
            boxShadow:'0 0 24px rgba(139,92,246,0.4)',
          },
        }, '◈ ACTIVATE VIP — UNLOCK EVERYTHING'),
        onRestore && e('button', {
          onClick:function(){ onRestore(); onClose(); },
          style:{ display:'block', width:'100%', marginTop:10, background:'transparent', border:'none', fontSize:10, color:'#8b5cf6', fontFamily:"'DM Mono',monospace", letterSpacing:'0.1em', cursor:'pointer', textDecoration:'underline' },
        }, 'RESTORE PREVIOUS PURCHASE'),
        e('button', {
          onClick:onClose,
          style:{ display:'block', width:'100%', marginTop:8, background:'transparent', border:'none', fontSize:10, color:'#3d4d63', fontFamily:"'DM Mono',monospace", letterSpacing:'0.1em', cursor:'pointer' },
        }, 'CONTINUE AS FREE USER')
      )
    )
  );
}

// ─── ACHIEVEMENTS MODAL ───────────────────────────────────────────────────────
function AchievementsModal(props) {
  if (!props.open) return null;
  var unlocked=props.unlocked||[];
  return e('div',{onClick:props.onClose,style:{position:'fixed',inset:0,zIndex:800,background:'rgba(0,0,0,0.94)',display:'flex',flexDirection:'column',overflow:'auto',padding:'24px 16px 40px'}},
    e('div',{style:{maxWidth:640,margin:'0 auto',width:'100%'},onClick:function(ev){ev.stopPropagation();}},
      e('div',{style:row({justifyContent:'space-between',marginBottom:20})},
        e('div',null,
          e('div',{style:mn(10,'#94a3b8',{letterSpacing:'0.25em',marginBottom:4})},'SYSTEM UNLOCKS'),
          e('div',{style:{fontSize:13,color:'#475569'}},unlocked.length+' / '+ACHIEVEMENTS.length+' acquired')
        ),
        e('button',{onClick:props.onClose,style:{background:'transparent',border:'1px solid #151e30',borderRadius:8,padding:'8px 14px',fontSize:10,color:'#475569',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em',cursor:'pointer'}},'CLOSE')
      ),
      e('div',{style:{display:'flex',flexDirection:'column',gap:6}},
        ACHIEVEMENTS.map(function(ach){
          var isOn=unlocked.indexOf(ach.id)!==-1;
          return e('div',{key:ach.id,style:{display:'flex',alignItems:'center',gap:14,padding:'12px 14px',background:isOn?'#0a0e1a':'#070a10',border:'1px solid '+(isOn?ach.color+'40':'#0f1520'),borderRadius:12,transition:'all 0.2s'}},
            e('div',{style:{width:36,height:36,borderRadius:10,background:isOn?ach.color+'18':'#080b12',border:'1px solid '+(isOn?ach.color+'50':'#151e30'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,filter:isOn?'none':'grayscale(1)',opacity:isOn?1:0.3}},ach.icon),
            e('div',{style:{flex:1,minWidth:0}},
              e('div',{style:{fontSize:12,fontWeight:700,color:isOn?'#e2e8f0':'#2d3748',fontFamily:"'DM Mono',monospace",marginBottom:2}},ach.title),
              e('div',{style:{fontSize:11,color:isOn?'#475569':'#1e2a3a',lineHeight:1.4}},ach.desc)
            ),
            cond(isOn,e('div',{style:{fontSize:10,color:ach.color,fontFamily:"'DM Mono',monospace",fontWeight:700,flexShrink:0}},'✓'))
          );
        })
      )
    )
  );
}

// ─── TASK CREATE MODAL ────────────────────────────────────────────────────────
function TaskCreateModal(props) {
  // ALL hooks unconditionally at top — React rules of hooks
  var s1=useState('NEW TASK');   var name=s1[0],setName=s1[1];
  var s2=useState('body');       var cat=s2[0],setCat=s2[1];
  var s3=useState('daily');      var freq=s3[0],setFreq=s3[1];
  var s4=useState(1);            var diff=s4[0],setDiff=s4[1];
  var s5=useState(50);           var xp=s5[0],setXp=s5[1];
  var s6=useState(false);        var showLib=s6[0],setShowLib=s6[1];
  var s7=useState(false);        var reminderOn=s7[0],setReminderOn=s7[1];
  var s8=useState('08:00');      var reminderTime=s8[0],setReminderTime=s8[1];

  // Reset form when modal opens
  useEffect(function() {
    if (props.open) { setName('NEW TASK'); setCat('body'); setFreq('daily'); setDiff(1); setXp(50); setShowLib(false); setReminderOn(false); setReminderTime('08:00'); }
  }, [props.open]);

  // Conditional return AFTER all hooks
  if (!props.open) return null;

  var existingIds=(props.existingIds||[]);
  var availableTemplates=TASK_TEMPLATES.filter(function(t){ return existingIds.indexOf(t.id)===-1; });
  var showNotifOption = notifAvailable();

  function doCreate() {
    if (!name.trim()) return;
    var taskDef = { name:name.trim(), cat:cat, freq:freq, diff:diff, xp:xp, desc:'', reminderTime: reminderOn ? reminderTime : null };
    var taskId = props.onCreate(taskDef);
    if (reminderOn && reminderTime && taskId) {
      requestNotifPermission().then(function(granted) {
        if (granted) scheduleTaskReminder(taskId, name.trim(), reminderTime, freq);
      });
    }
    props.onClose();
  }
  function addTemplate(tmpl) {
    props.onCreate(Object.assign({},tmpl));
    if (availableTemplates.length<=1) props.onClose();
  }

  var selBtn = function(active) { return { padding:'8px 0', flex:1, background:active?'#0a1628':'transparent', border:'1px solid '+(active?'#1e3a5f':'#0f1520'), borderRadius:8, fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:'0.08em', cursor:'pointer', transition:'all 0.15s' }; };

  return e('div',{onClick:props.onClose,style:{position:'fixed',inset:0,zIndex:850,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'flex-end',justifyContent:'center'}},
    e('div',{onClick:function(ev){ev.stopPropagation();},style:{width:'100%',maxWidth:640,background:'#0a0e1a',borderRadius:'20px 20px 0 0',border:'1px solid #151e30',borderBottom:'none',padding:'20px 20px 40px',animation:'slideUp 0.3s ease'}},
      // Header
      e('div',{style:row({justifyContent:'space-between',marginBottom:20})},
        e('div',{style:row({gap:10})},
          e('button',{onClick:function(){setShowLib(false);},style:{padding:'6px 14px',background:!showLib?'#0a1628':'transparent',border:'1px solid '+((!showLib)?'#1e3a5f':'#0f1520'),borderRadius:8,fontSize:9,color:(!showLib)?'#4a9eff':'#475569',fontFamily:"'DM Mono',monospace",cursor:'pointer'}},'CUSTOM'),
          e('button',{onClick:function(){setShowLib(true);},style:{padding:'6px 14px',background:showLib?'#0a1628':'transparent',border:'1px solid '+(showLib?'#1e3a5f':'#0f1520'),borderRadius:8,fontSize:9,color:showLib?'#4a9eff':'#475569',fontFamily:"'DM Mono',monospace",cursor:'pointer'}},'FROM LIBRARY '+c2(availableTemplates.length,'('+availableTemplates.length+')',''))
        ),
        e('button',{onClick:props.onClose,style:{background:'transparent',border:'none',color:'#475569',cursor:'pointer',fontSize:20,lineHeight:1}},'×')
      ),

      cond(!showLib,
        e('div',{style:{display:'flex',flexDirection:'column',gap:14}},
          // Name
          e('div',null,
            e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'TASK NAME'),
            e('input',{value:name,onChange:function(ev){setName(ev.target.value.toUpperCase());},onFocus:function(ev){if(ev.target.value==='NEW TASK')setName('');},style:{width:'100%',background:'#080b12',border:'1px solid #1e3a5f',borderRadius:10,padding:'12px 14px',fontSize:13,color:'#e2e8f0',fontFamily:"'DM Mono',monospace",letterSpacing:'0.05em'}})
          ),
          // Category
          e('div',null,
            e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'CATEGORY'),
            e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}},
              ['body','mind','soul'].map(function(c){
                var on=cat===c, tc=TASK_CATS[c];
                return e('button',{key:c,onClick:function(){setCat(c);},style:{padding:'10px 0',background:on?tc.color+'18':'#080b12',border:'1px solid '+(on?tc.color:'#0f1520'),borderRadius:10,fontSize:10,color:on?tc.color:'#2d3748',fontFamily:"'DM Mono',monospace",fontWeight:on?700:400,cursor:'pointer',transition:'all 0.15s'}},tc.label);
              })
            )
          ),
          // Frequency
          e('div',null,
            e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'FREQUENCY'),
            e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}},
              ['daily','weekly','once'].map(function(f){
                var on=freq===f;
                return e('button',{key:f,onClick:function(){setFreq(f);},style:Object.assign(selBtn(on),{color:on?'#4a9eff':'#2d3748'})},TASK_FREQS[f].label.toUpperCase());
              })
            )
          ),
          // Difficulty
          e('div',null,
            e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'DIFFICULTY'),
            e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}},
              [1,2,3].map(function(d){
                var on=diff===d, td=TASK_DIFFS[d];
                return e('button',{key:d,onClick:function(){setDiff(d);setXp(on?xp:Math.round(50*td.mult));},style:{padding:'10px 0',background:on?td.color+'18':'#080b12',border:'1px solid '+(on?td.color:'#0f1520'),borderRadius:10,fontSize:9,color:on?td.color:'#2d3748',fontFamily:"'DM Mono',monospace",cursor:'pointer',transition:'all 0.15s'}},td.label.toUpperCase()+'\n×'+td.mult);
              })
            )
          ),
          // XP
          e('div',null,
            e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'BASE XP REWARD'),
            e('div',{style:row({gap:10})},
              e('input',{type:'range',min:10,max:200,step:5,value:xp,onChange:function(ev){setXp(Number(ev.target.value));},style:{flex:1,accentColor:'#4a9eff'}}),
              e('div',{style:{minWidth:40,textAlign:'right',fontSize:13,fontWeight:700,color:'#4a9eff',fontFamily:"'DM Mono',monospace"}},xp+' XP')
            )
          ),
          // Reminder
          cond(showNotifOption,
            e('div',null,
              e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'REMINDER'),
              e('div',{style:{display:'flex',alignItems:'center',gap:10}},
                e('button',{
                  onClick:function(){setReminderOn(!reminderOn);},
                  style:{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:reminderOn?'rgba(74,158,255,0.1)':'#080b12',border:'1px solid '+(reminderOn?'#4a9eff':'#0f1520'),borderRadius:10,cursor:'pointer',flex:1,transition:'all 0.15s'}
                },
                  e('div',{style:{width:16,height:16,borderRadius:4,background:reminderOn?'#4a9eff':'#1d2740',border:'1px solid '+(reminderOn?'#4a9eff':'#2d3748'),display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',flexShrink:0}},
                    reminderOn ? e('div',{style:{width:8,height:8,background:'#0d1117',borderRadius:2}}) : null
                  ),
                  e('span',{style:{fontSize:10,color:reminderOn?'#4a9eff':'#475569',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em'}},reminderOn?'NOTIFY ME':'NO REMINDER')
                ),
                cond(reminderOn,
                  e('input',{
                    type:'time',
                    value:reminderTime,
                    onChange:function(ev){setReminderTime(ev.target.value);},
                    style:{padding:'10px 12px',background:'#080b12',border:'1px solid #1e3a5f',borderRadius:10,fontSize:13,color:'#e2e8f0',fontFamily:"'DM Mono',monospace",minWidth:110,colorScheme:'dark'}
                  })
                )
              )
            )
          ),
          // Create button
          e('button',{onClick:doCreate,style:{padding:'14px',background:'#0a1628',border:'1px solid #1e3a5f',borderRadius:12,fontSize:11,color:'#4a9eff',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.15em',cursor:'pointer',width:'100%',marginTop:4}},'◆ ADD TO PROTOCOL')
        )
      ),

      cond(showLib,
        e('div',{style:{display:'flex',flexDirection:'column',gap:6}},
          availableTemplates.length===0
            ? e('div',{style:{padding:'24px',textAlign:'center',color:'#2d3748',fontFamily:"'DM Mono',monospace",fontSize:11}},'All library tasks already added.')
            : availableTemplates.map(function(tmpl){
                var tc=TASK_CATS[tmpl.cat];
                return e('button',{key:tmpl.id,onClick:function(){addTemplate(tmpl);},style:{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'#080b12',border:'1px solid #0f1520',borderRadius:12,cursor:'pointer',textAlign:'left',transition:'all 0.15s'},
                  onMouseEnter:function(ev){ev.currentTarget.style.borderColor=tc.color+'55';ev.currentTarget.style.background='#0a0e1a';},
                  onMouseLeave:function(ev){ev.currentTarget.style.borderColor='#0f1520';ev.currentTarget.style.background='#080b12';}
                },
                  e('div',{style:{width:8,height:8,borderRadius:'50%',background:tc.color,flexShrink:0}}),
                  e('div',{style:{flex:1,minWidth:0}},
                    e('div',{style:{fontSize:12,color:'#94a3b8',fontWeight:600,marginBottom:2}},tmpl.name),
                    e('div',{style:mn(8,tc.color)},tc.label+' · '+TASK_FREQS[tmpl.freq].label+' · '+tmpl.xp+' XP')
                  ),
                  e('div',{style:{fontSize:12,color:'#2d3748',fontFamily:"'DM Mono',monospace",flexShrink:0}},'+')
                );
              })
        )
      )
    )
  );
}

// ─── TASK EDIT MODAL ──────────────────────────────────────────────────────────
function TaskEditModal(props) {
  var task=props.task;
  var s1=useState('');       var name=s1[0],setName=s1[1];
  var s2=useState('body');   var cat=s2[0],setCat=s2[1];
  var s3=useState('daily');  var freq=s3[0],setFreq=s3[1];
  var s4=useState(1);        var diff=s4[0],setDiff=s4[1];
  var s5=useState(50);       var xp=s5[0],setXp=s5[1];
  var s6=useState(false);    var reminderOn=s6[0],setReminderOn=s6[1];
  var s7=useState('08:00');  var reminderTime=s7[0],setReminderTime=s7[1];

  useEffect(function() {
    if (task) {
      setName(task.name||'');
      setCat(task.cat||'body');
      setFreq(task.freq||'daily');
      setDiff(task.diff||1);
      setXp(task.xp||50);
      setReminderOn(!!task.reminderTime);
      setReminderTime(task.reminderTime||'08:00');
    }
  }, [task && task.id]);

  if (!props.open || !task) return null;

  var showNotifOption = notifAvailable();

  function doSave() {
    var patch = { name:name.trim()||task.name, cat:cat, freq:freq, diff:diff, xp:xp, reminderTime: reminderOn ? reminderTime : null };
    props.onSave(task.id, patch);
    // Reschedule notification if reminder changed
    if (reminderOn && reminderTime) {
      requestNotifPermission().then(function(granted) {
        if (granted) scheduleTaskReminder(task.id, patch.name, reminderTime, freq);
      });
    } else {
      cancelTaskReminder(task.id);
    }
    props.onClose();
  }

  var selBtn = function(active) { return { padding:'8px 0', flex:1, background:active?'#0a1628':'transparent', border:'1px solid '+(active?'#1e3a5f':'#0f1520'), borderRadius:8, fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:'0.08em', cursor:'pointer', transition:'all 0.15s' }; };

  return e('div',{onClick:props.onClose,style:{position:'fixed',inset:0,zIndex:850,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'flex-end',justifyContent:'center'}},
    e('div',{onClick:function(ev){ev.stopPropagation();},style:{width:'100%',maxWidth:640,background:'#0a0e1a',borderRadius:'20px 20px 0 0',border:'1px solid #151e30',borderBottom:'none',padding:'20px 20px 40px',animation:'slideUp 0.3s ease'}},
      // Header
      e('div',{style:row({justifyContent:'space-between',marginBottom:20})},
        e('div',{style:{fontSize:10,color:'#4a9eff',fontFamily:"'DM Mono',monospace",letterSpacing:'0.2em',fontWeight:700}},'EDIT TASK'),
        e('button',{onClick:props.onClose,style:{background:'transparent',border:'none',color:'#475569',cursor:'pointer',fontSize:20,lineHeight:1}},'×')
      ),
      e('div',{style:{display:'flex',flexDirection:'column',gap:14}},
        // Name
        e('div',null,
          e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'TASK NAME'),
          e('input',{value:name,onChange:function(ev){setName(ev.target.value.toUpperCase());},style:{width:'100%',background:'#080b12',border:'1px solid #1e3a5f',borderRadius:10,padding:'12px 14px',fontSize:13,color:'#e2e8f0',fontFamily:"'DM Mono',monospace",letterSpacing:'0.05em',boxSizing:'border-box'}})
        ),
        // Category
        e('div',null,
          e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'CATEGORY'),
          e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}},
            ['body','mind','soul'].map(function(c){
              var on=cat===c, tc=TASK_CATS[c];
              return e('button',{key:c,onClick:function(){setCat(c);},style:{padding:'10px 0',background:on?tc.color+'18':'#080b12',border:'1px solid '+(on?tc.color:'#0f1520'),borderRadius:10,fontSize:10,color:on?tc.color:'#2d3748',fontFamily:"'DM Mono',monospace",fontWeight:on?700:400,cursor:'pointer',transition:'all 0.15s'}},tc.label);
            })
          )
        ),
        // Frequency
        e('div',null,
          e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'FREQUENCY'),
          e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}},
            ['daily','weekly','once'].map(function(f){
              var on=freq===f;
              return e('button',{key:f,onClick:function(){setFreq(f);},style:Object.assign(selBtn(on),{color:on?'#4a9eff':'#2d3748'})},TASK_FREQS[f].label.toUpperCase());
            })
          )
        ),
        // Difficulty
        e('div',null,
          e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'DIFFICULTY'),
          e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}},
            [1,2,3].map(function(d){
              var on=diff===d, td=TASK_DIFFS[d];
              return e('button',{key:d,onClick:function(){setDiff(d);setXp(Math.round(50*td.mult));},style:{padding:'10px 0',background:on?td.color+'18':'#080b12',border:'1px solid '+(on?td.color:'#0f1520'),borderRadius:10,fontSize:9,color:on?td.color:'#2d3748',fontFamily:"'DM Mono',monospace",cursor:'pointer',transition:'all 0.15s'}},td.label.toUpperCase()+'\n×'+td.mult);
            })
          )
        ),
        // XP
        e('div',null,
          e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'BASE XP REWARD'),
          e('div',{style:row({gap:10})},
            e('input',{type:'range',min:10,max:200,step:5,value:xp,onChange:function(ev){setXp(Number(ev.target.value));},style:{flex:1,accentColor:'#4a9eff'}}),
            e('div',{style:{minWidth:40,textAlign:'right',fontSize:13,fontWeight:700,color:'#4a9eff',fontFamily:"'DM Mono',monospace"}},xp+' XP')
          )
        ),
        // Reminder
        cond(showNotifOption,
          e('div',null,
            e('div',{style:mn(9,'#475569',{marginBottom:6,letterSpacing:'0.15em'})},'REMINDER'),
            e('div',{style:{display:'flex',alignItems:'center',gap:10}},
              e('button',{
                onClick:function(){setReminderOn(!reminderOn);},
                style:{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:reminderOn?'rgba(74,158,255,0.1)':'#080b12',border:'1px solid '+(reminderOn?'#4a9eff':'#0f1520'),borderRadius:10,cursor:'pointer',flex:1,transition:'all 0.15s'}
              },
                e('div',{style:{width:16,height:16,borderRadius:4,background:reminderOn?'#4a9eff':'#1d2740',border:'1px solid '+(reminderOn?'#4a9eff':'#2d3748'),display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',flexShrink:0}},
                  reminderOn ? e('div',{style:{width:8,height:8,background:'#0d1117',borderRadius:2}}) : null
                ),
                e('span',{style:{fontSize:10,color:reminderOn?'#4a9eff':'#475569',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em'}},reminderOn?'NOTIFY ME':'NO REMINDER')
              ),
              cond(reminderOn,
                e('input',{
                  type:'time',
                  value:reminderTime,
                  onChange:function(ev){setReminderTime(ev.target.value);},
                  style:{padding:'10px 12px',background:'#080b12',border:'1px solid #1e3a5f',borderRadius:10,fontSize:13,color:'#e2e8f0',fontFamily:"'DM Mono',monospace",minWidth:110,colorScheme:'dark'}
                })
              )
            )
          )
        ),
        // Save button
        e('button',{onClick:doSave,style:{padding:'14px',background:'#0a1628',border:'1px solid #1e3a5f',borderRadius:12,fontSize:11,color:'#4a9eff',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.15em',cursor:'pointer',width:'100%',marginTop:4}},'◆ SAVE CHANGES')
      )
    )
  );
}

// ─── TASK ITEM ────────────────────────────────────────────────────────────────
function TaskItem(props) {
  var task=props.task, done=props.done, onLog=props.onLog, onDelete=props.onDelete, onEdit=props.onEdit;
  var streak=getTaskStreak(task.id, props.taskLog, task.freq);
  var tc=TASK_CATS[task.cat]||TASK_CATS.body;
  var td=TASK_DIFFS[task.diff]||TASK_DIFFS[1];
  var xpAward=Math.round(task.xp*td.mult);
  var s1=useState(false); var hover=s1[0],setHover=s1[1];
  return e('div',{
    style:{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:done?'#06090f':'#080b12',borderBottom:'1px solid #0a0d14',borderLeft:'3px solid '+(done?'#0f1520':tc.color),opacity:done?0.45:1,transition:'all 0.2s'},
    onMouseEnter:function(){setHover(true);},
    onMouseLeave:function(){setHover(false);}
  },
    // Main info
    e('div',{style:{flex:1,minWidth:0}},
      e('div',{style:row({gap:7,marginBottom:4})},
        e('span',{style:{fontSize:12,color:done?'#2d3748':'#94a3b8',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},task.name),
        cond(task.reminderTime&&!done,
          e('span',{title:'Reminder: '+task.reminderTime,style:{fontSize:9,color:'#4a9eff88',fontFamily:"'DM Mono',monospace",flexShrink:0}},'◷ '+task.reminderTime)
        )
      ),
      e('div',{style:row({gap:8})},
        e('span',{style:mn(8,tc.color)},tc.label),
        e('span',{style:mn(8,td.color)},td.label.toUpperCase()),
        e('span',{style:mn(8,'#2d3748')},'+'+xpAward+' XP'),
        cond(streak>0&&!done,e('span',{style:mn(8,'#f97316',{fontWeight:700})},streak+(task.freq==='weekly'?' wk':' day')+' streak'))
      )
    ),
    // Action buttons (visible on hover or always on touch)
    cond(hover&&!done,
      e('div',{style:{display:'flex',gap:4,flexShrink:0}},
        cond(!!onEdit,
          e('button',{
            onClick:function(ev){ev.stopPropagation();onEdit(task);},
            style:{background:'transparent',border:'1px solid #1e3a5f',borderRadius:6,color:'#475569',fontSize:10,cursor:'pointer',padding:'4px 8px',fontFamily:"'DM Mono',monospace",lineHeight:1,letterSpacing:'0.05em',transition:'all 0.15s'},
            onMouseEnter:function(ev){ev.currentTarget.style.color='#4a9eff';ev.currentTarget.style.borderColor='#4a9eff44';},
            onMouseLeave:function(ev){ev.currentTarget.style.color='#475569';ev.currentTarget.style.borderColor='#1e3a5f';}
          },'EDIT')
        ),
        cond(!!onDelete,
          e('button',{
            onClick:function(ev){ev.stopPropagation();onDelete(task.id);},
            style:{background:'transparent',border:'1px solid #1e3a5f',borderRadius:6,color:'#475569',fontSize:10,cursor:'pointer',padding:'4px 8px',fontFamily:"'DM Mono',monospace",lineHeight:1,letterSpacing:'0.05em',transition:'all 0.15s'},
            onMouseEnter:function(ev){ev.currentTarget.style.color='#ef4444';ev.currentTarget.style.borderColor='#ef444444';},
            onMouseLeave:function(ev){ev.currentTarget.style.color='#475569';ev.currentTarget.style.borderColor='#1e3a5f';}
          },'DEL')
        )
      )
    ),
    // Complete button
    e('button',{
      onClick:function(){if(!done)onLog(task);},
      style:{width:32,height:32,borderRadius:'50%',background:done?'#14532d':'#0a0d14',border:'1px solid '+(done?'#22c55e':'#1e3a5f'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:done?'#22c55e':'#1e3a5f',cursor:done?'default':'pointer',flexShrink:0,transition:'all 0.2s',animation:done?'checkPop 0.25s ease':'none'},
      onMouseEnter:function(ev){if(!done)ev.currentTarget.style.borderColor='#22c55e';},
      onMouseLeave:function(ev){if(!done)ev.currentTarget.style.borderColor='#1e3a5f';}
    },done?'✓':'○')
  );
}

// ─── SIGNAL ANALYTICS (VIP) ───────────────────────────────────────────────────
var MOOD_COLORS={CLEAR:'#22c55e',REFLECTIVE:'#4a9eff',HEAVY:'#f97316',HEAT:'#ef4444'};
var SIGNAL_COLORS={flat:'#475569',flickering:'#f97316',steady:'#4a9eff',strong:'#22c55e'};
function SignalAnalytics(props) {
  var entries=props.entries||[], taskLog=props.taskLog||[], signalHistory=props.signalHistory||[];
  var skillBonuses=props.skillBonuses||{taskXPMult:1,journalXPMult:1};
  var weatherGrid=props.weatherGrid||[];

  // Last 7 journal entries — mood dots
  var recentEntries=entries.slice(0,7);
  // Last 14 signal days
  var recentSignal=signalHistory.slice(-14);
  // Task breakdown by category over last 30 days
  var cutoff30=new Date();cutoff30.setDate(cutoff30.getDate()-30);
  var cutStr=cutoff30.toISOString().slice(0,10);
  var catCounts={body:0,mind:0,soul:0};
  taskLog.forEach(function(l){if(l.date>=cutStr&&catCounts[l.cat]!==undefined)catCounts[l.cat]++;});
  var totalTasks=catCounts.body+catCounts.mind+catCounts.soul||1;

  return e('div',{style:Object.assign({},card,{background:'linear-gradient(145deg,#0a0e1a,#0d1220)'})},
    e('div',{style:cardH},
      e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'SIGNAL ANALYTICS'),
      e('span',{style:mn(9,'#8b5cf6',{fontWeight:700})},'◈ VIP')
    ),
    e('div',{style:{padding:'14px'}},

      // 30-day terrain grid
      weatherGrid.length>0 && e(SignalWeather, { grid:weatherGrid }),

      // Mood history — last 7 entries
      recentEntries.length>0 && e('div',{style:{marginBottom:14}},
        e('div',{style:mn(8,'#2d3748',{marginBottom:8,letterSpacing:'0.12em'})},'RECENT TRANSMISSIONS'),
        e('div',{style:{display:'flex',gap:5}},
          recentEntries.map(function(en,i){
            var col=MOOD_COLORS[en.mood]||'#475569';
            return e('div',{key:en.id||i,title:(en.mood||'AMBIENT')+' · '+en.date+' · +'+en.xp+' XP',style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}},
              e('div',{style:{width:'100%',height:28,background:col+'22',border:'1px solid '+col+'55',borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center'}},
                e('div',{style:{width:7,height:7,borderRadius:'50%',background:col,boxShadow:'0 0 6px '+col}})
              ),
              e('div',{style:{fontSize:7,color:col+'99',fontFamily:"'DM Mono',monospace"}},en.date?en.date.slice(5):'')
            );
          })
        )
      ),

      // Signal state map — last 14 check-ins
      recentSignal.length>0 && e('div',{style:{marginBottom:14}},
        e('div',{style:mn(8,'#2d3748',{marginBottom:8,letterSpacing:'0.12em'})},'SIGNAL HISTORY · 14 DAYS'),
        e('div',{style:{display:'flex',gap:3,flexWrap:'wrap'}},
          recentSignal.map(function(h,i){
            var col=SIGNAL_COLORS[h.state]||'#2d3748';
            return e('div',{key:h.date||i,title:h.state+' · '+h.date,style:{width:18,height:18,borderRadius:3,background:col+'33',border:'1px solid '+col+'66',boxShadow:'0 0 4px '+col+'44'}});
          })
        )
      ),

      // Task breakdown — last 30 days
      totalTasks>1 && e('div',{style:{marginBottom:14}},
        e('div',{style:mn(8,'#2d3748',{marginBottom:8,letterSpacing:'0.12em'})},'30-DAY TASK BREAKDOWN'),
        e('div',{style:{display:'flex',gap:8}},
          [{k:'body',c:'#22c55e',l:'BODY'},{k:'mind',c:'#4a9eff',l:'MIND'},{k:'soul',c:'#f97316',l:'SOUL'}].map(function(cat){
            var pct=Math.round(catCounts[cat.k]/totalTasks*100);
            return e('div',{key:cat.k,style:{flex:1,background:cat.c+'12',border:'1px solid '+cat.c+'33',borderRadius:8,padding:'8px 10px'}},
              e('div',{style:mn(7,cat.c,{marginBottom:4,fontWeight:700})},cat.l),
              e('div',{style:{fontSize:13,fontWeight:700,color:'#e2e8f0',fontFamily:"'DM Mono',monospace"}},String(catCounts[cat.k])),
              e('div',{style:{fontSize:9,color:'#475569',fontFamily:"'DM Mono',monospace"}},pct+'%')
            );
          })
        )
      ),

      // Skill bonuses active
      (skillBonuses.taskXPMult>1||skillBonuses.journalXPMult>1) && e('div',{style:{background:'rgba(139,92,246,0.06)',border:'1px solid #8b5cf622',borderRadius:8,padding:'10px 12px'}},
        e('div',{style:mn(8,'#8b5cf6',{marginBottom:6,letterSpacing:'0.12em'})},'ACTIVE SKILL BONUSES'),
        e('div',{style:{display:'flex',gap:10}},
          skillBonuses.taskXPMult>1 && e('div',{style:{fontSize:10,color:'#e2e8f0',fontFamily:"'DM Mono',monospace"}},
            e('span',{style:{color:'#f97316'}},'FORT '),'+'+Math.round((skillBonuses.taskXPMult-1)*100)+'% task XP'
          ),
          skillBonuses.journalXPMult>1 && e('div',{style:{fontSize:10,color:'#e2e8f0',fontFamily:"'DM Mono',monospace"}},
            e('span',{style:{color:'#4a9eff'}},'AWARE '),'+'+Math.round((skillBonuses.journalXPMult-1)*100)+'% journal XP'
          )
        )
      )
    )
  );
}

// ─── PATTERN ALERT CARD ───────────────────────────────────────────────────────
var ALERT_COLORS = { critical:'#ef4444', warning:'#f97316', positive:'#22c55e', insight:'#4a9eff' };
function PatternAlertCard(props) {
  var alert    = props.alert;
  var onAction = props.onAction || function(){};
  if (!alert) return null;
  var col = ALERT_COLORS[alert.severity] || '#475569';
  return e('div', { style:Object.assign({}, card, { borderColor:col+'55', marginBottom:12 }) },
    e('div', { style:Object.assign({}, cardH, { borderBottomColor:col+'22' }) },
      e('span', { style:mn(9,col,{fontWeight:700}) }, '◈ PATTERN ALERT'),
      e('span', { style:mn(8,col,{opacity:0.7,letterSpacing:'0.15em'}) }, alert.severity.toUpperCase())
    ),
    e('div', { style:{ padding:'12px 15px' } },
      e('div', { style:{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:6, fontFamily:"'DM Mono',monospace" } }, alert.title),
      e('div', { style:{ fontSize:11, color:'#94a3b8', lineHeight:1.6, marginBottom: alert.action ? 10 : 0 } }, alert.body),
      alert.action && e('button', {
        onClick: function() { onAction(alert.action); },
        style:{ padding:'7px 14px', background:col+'18', border:'1px solid '+col+'55', borderRadius:8, fontSize:9, color:col, fontFamily:"'DM Mono',monospace", fontWeight:700, letterSpacing:'0.12em', cursor:'pointer' }
      }, alert.action === 'OPEN_JOURNAL' ? 'OPEN JOURNAL' : 'OPEN TASKS')
    )
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab(props) {
  var s=props.state, engine=props.engine;
  var isVIP=props.isVIP||false;
  var onNeedVIP=props.onNeedVIP||function(){};
  var signalObj=props.signalObj||null;
  var onBridgeXP=props.onBridgeXP||function(){};
  var clarityRate=props.clarityRate||0;
  var signalHistory=props.signalHistory||[];
  var skillBonuses=props.skillBonuses||{taskXPMult:1,journalXPMult:1};
  var intelligence=props.intelligence||null;
  var nearLevelUp=props.nearLevelUp||false;
  var withinFive=props.withinFive||false;
  var onNavigate=props.onNavigate||function(){};
  var level=getLevelFromXP(s.totalXP||0), lvlXP=getLvlXP(s.totalXP||0);
  var pct=Math.round((lvlXP/props.XPL)*100), tier=getTier(level);
  var stats={body:s.bodyScore||0,mind:s.mindScore||0,soul:s.soulScore||0};
  var mx=Math.max(stats.body,stats.mind,stats.soul,1);
  var totalScore=stats.body+stats.mind+stats.soul;
  var FOCUS_META={body:{c:'#22c55e',l:'BODY-LEANED'},mind:{c:'#4a9eff',l:'MIND-LEANED'},soul:{c:'#f97316',l:'SOUL-LEANED'}};
  var focusKey=totalScore===0?null:(stats.body>=stats.mind&&stats.body>=stats.soul?'body':(stats.mind>=stats.soul?'mind':'soul'));
  var focusColor=focusKey?FOCUS_META[focusKey].c:null;
  var streak=s.streak||0;
  var streakMultPct=Math.round((getStreakMult(streak)-1)*100);
  var lastEntry=(s.journalEntries||[])[0]||null;
  var MOODS={CLEAR:{c:'#22c55e',l:'POSITIVE'},REFLECTIVE:{c:'#4a9eff',l:'REFLECTIVE'},HEAVY:{c:'#f97316',l:'HEAVY'},HEAT:{c:'#ef4444',l:'TURBULENT'}};
  var lastMood=lastEntry&&lastEntry.mood?MOODS[lastEntry.mood]:null;
  var nextMil=null;
  var milestones=[{days:1,label:'First Hold'},{days:3,label:'3-Day Lock'},{days:7,label:'One Week'},{days:14,label:'Fortnight'},{days:30,label:'30-Day Protocol'},{days:60,label:'Signal Silence'}];
  for (var i=0;i<milestones.length;i++){if(milestones[i].days>streak){nextMil=milestones[i];break;}}
  var todayTasks=Object.keys(s.completedToday||{}).length;
  var unlocked=s.unlockedAchievements||[];
  var weekStart=(function(){var d=new Date();var day=d.getDay();var mon=new Date(d);mon.setDate(d.getDate()-(day===0?6:day-1));return mon.toISOString().slice(0,10);})();
  var weekXP=0;
  (s.taskLog||[]).forEach(function(l){if(l.date>=weekStart)weekXP+=l.xp||0;});
  (s.log||[]).forEach(function(l){if(l.date>=weekStart)weekXP+=l.xp||0;});
  var weekTarget=500+level*100;
  var weekPct=Math.min(Math.round((weekXP/weekTarget)*100),100);
  var daysLeft=7-((new Date().getDay()+6)%7);
  var todayKey2=new Date().toISOString().slice(0,10);
  var dailyTasks=(s.tasks||[]).filter(function(t){return t.freq==='daily';});
  var dailyLeft=dailyTasks.length-dailyTasks.filter(function(t){return (s.completedToday||{})[t.id];}).length;
  var journaledToday=(s.journalEntries||[]).some(function(j){return j.date===todayKey2;});
  var directive=dailyLeft>0
    ? {label:'Daily Protocol',msg:dailyLeft+' task'+(dailyLeft>1?'s':'')+" left in today's protocol.",cta:'GO TO TASKS',tab:'TASKS',color:'#22c55e'}
    : !journaledToday
      ? {label:'Vent Canvas',msg:'No transmission logged today — clear your signal.',cta:'OPEN JOURNAL',tab:'JOURNAL',color:'#4a9eff'}
      : {label:'Aligned',msg:'All protocols clear. Channel momentum into Clarity.',cta:'ENTER CLARITY',tab:'SIGNALS',color:'#06b6d4'};
  var s1=useState(false); var showAch=s1[0],setShowAch=s1[1];

  return e('div',{style:{display:'flex',flexDirection:'column',animation:'fadeUp 0.35s ease'}},
    e(AchievementsModal,{open:showAch,onClose:function(){setShowAch(false);},unlocked:unlocked}),

    // Pattern Alert — highest-priority actionable insight
    intelligence && e(PatternAlertCard,{ alert:intelligence.activeAlert, onAction:function(action){onNavigate(action==='OPEN_JOURNAL'?'JOURNAL':'TASKS');} }),

    // Core Entity hero
    e('div',{style:Object.assign({},card,{background:'linear-gradient(145deg,#0a0e1a,#0d1220)'})},
      e('div',{style:cardH},
        e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'CORE ENTITY'),
        e('span',{style:mn(9,tier.color,{fontWeight:700})},tier.title.toUpperCase())
      ),
      e('div',{style:{padding:'20px 16px',display:'flex',alignItems:'center',gap:16}},
        e('div',{style:{width:160,flexShrink:0}},e(CoreEntity,{level:level,tier:tier,xpPct:pct,focus:focusColor,isVIP:isVIP,nearLevelUp:nearLevelUp,withinFive:withinFive})),
        e('div',{style:{flex:1,minWidth:0}},
          e('div',{style:{fontSize:17,fontWeight:700,color:'#e2e8f0',marginBottom:3,fontFamily:"'DM Mono',monospace"}},'Level '+level),
          cond(focusKey&&isVIP,
            e('div',{style:row({gap:6,marginBottom:8})},
              e('div',{style:{width:7,height:7,borderRadius:'50%',background:focusColor,boxShadow:'0 0 6px '+focusColor}}),
              e('span',{style:mn(8,focusColor,{fontWeight:700})},(FOCUS_META[focusKey] ? FOCUS_META[focusKey].l : ''))
            )
          ),
          e('div',{style:{fontSize:12,color:'#475569',marginBottom:14,lineHeight:1.5}},tier.desc),
          e('div',{style:{marginBottom:12}},
            e('div',{style:row({justifyContent:'space-between',marginBottom:4})},e('span',{style:mn(8,'#2d3748')},'FORM XP'),e('span',{style:mn(8,tier.color)},lvlXP+'/'+props.XPL)),
            e('div',{style:{height:5,background:'#0f1520',borderRadius:3,overflow:'hidden'}},
              e('div',{style:{height:'100%',width:pct+'%',background:tier.color,borderRadius:3,transition:'width 1s ease',boxShadow:'0 0 8px '+tier.glow}})
            ),
            e('div',{style:mn(8,'#2d3748',{marginTop:3})},level<24?(props.XPL-lvlXP)+' XP to next level':'MAXIMUM FORM')
          ),
          e('div',{style:{position:'relative'}},
            e('div',{style:{display:'flex',gap:8,filter:isVIP?'none':'blur(4px)',userSelect:isVIP?'auto':'none',pointerEvents:isVIP?'auto':'none',transition:'filter 0.3s'}},
              e(StatBar,{label:'BODY',val:stats.body,max:mx,color:'#22c55e'}),
              e(StatBar,{label:'MIND',val:stats.mind,max:mx,color:'#4a9eff'}),
              e(StatBar,{label:'SOUL',val:stats.soul,max:mx,color:'#f97316'})
            ),
            !isVIP && e('div',{onClick:onNeedVIP,style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}},
              e('div',{style:{padding:'4px 10px',background:'rgba(139,92,246,0.15)',border:'1px solid #8b5cf655',borderRadius:8,fontSize:9,color:'#8b5cf6',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.1em'}},'◈ VIP — UNLOCK ANALYTICS')
            )
          )
        )
      )
    ),

    // Directive — the single most impactful next action, cross-module
    e('div',{style:Object.assign({},card,{borderColor:directive.color+'44'})},
      e('div',{style:cardH},
        e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'DIRECTIVE'),
        e('span',{style:mn(9,directive.color,{fontWeight:700})},directive.label.toUpperCase())
      ),
      e('div',{style:{padding:'14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
        e('div',{style:{flex:1,minWidth:0,fontSize:13,color:'#cbd5e1',lineHeight:1.5}},directive.msg),
        e('button',{onClick:function(){onNavigate(directive.tab);},style:{flexShrink:0,padding:'10px 14px',background:directive.color+'18',border:'1px solid '+directive.color+'66',borderRadius:10,fontSize:9,color:directive.color,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.12em',cursor:'pointer'}},directive.cta)
      )
    ),

    // Status strip
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}},
      [{label:'STREAK',val:streak+'d',color:'#f97316'},{label:'TASKS TODAY',val:todayTasks,color:'#22c55e'},{label:'TOTAL XP',val:s.totalXP||0,color:tier.color}].map(function(item){
        return e('div',{key:item.label,style:{background:'#0a0e1a',border:'1px solid #151e30',borderRadius:12,padding:'12px 14px'}},
          e('div',{style:mn(7,'#2d3748',{marginBottom:5})},item.label),
          e('div',{style:{fontSize:15,fontWeight:700,color:item.color,fontFamily:"'DM Mono',monospace",lineHeight:1}},String(item.val))
        );
      })
    ),

    // Signal summary — live cross-module snapshot
    e('div',{style:card},
      e('div',{style:cardH},
        e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'SIGNAL SUMMARY'),
        e('span',{style:mn(9,streakMultPct>0?'#f97316':'#2d3748',{fontWeight:700})},streakMultPct>0?'STREAK ×'+(getStreakMult(streak)).toFixed(2):'NO STREAK BONUS')
      ),
      e('div',{style:{padding:'12px 14px'}},
        e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}},
          [{label:'CLARITY RATE',val:(clarityRate>=1?clarityRate.toFixed(1):clarityRate.toFixed(2))+'/s',color:'#4a9eff'},
           {label:'STREAK BONUS',val:'+'+streakMultPct+'%',color:'#f97316'},
           {label:'TASKS TODAY',val:String(Object.keys(s.completedToday||{}).length),color:'#22c55e'},
           {label:'ENTRIES',val:String((s.journalEntries||[]).length),color:'#a78bfa'},
          ].map(function(item){
            return e('div',{key:item.label,style:{background:'#0a0e1a',border:'1px solid #151e30',borderRadius:10,padding:'10px 12px'}},
              e('div',{style:mn(7,'#2d3748',{marginBottom:5})},item.label),
              e('div',{style:{fontSize:14,fontWeight:700,color:item.color,fontFamily:"'DM Mono',monospace",lineHeight:1}},item.val)
            );
          })
        ),
        e('div',{style:row({justifyContent:'space-between',padding:'10px 12px',background:'#080b12',border:'1px solid #0f1520',borderRadius:10})},
          e('span',{style:mn(8,'#475569')},'LAST TRANSMISSION'),
          lastEntry
            ? e('div',{style:row({gap:8})},
                e('div',{style:{width:7,height:7,borderRadius:'50%',background:lastMood?lastMood.c:'#94a3b8'}}),
                e('span',{style:mn(8,lastMood?lastMood.c:'#94a3b8',{fontWeight:700})},lastMood?lastMood.l:'AMBIENT'),
                e('span',{style:mn(8,'#2d3748')},lastEntry.date)
              )
            : e('span',{style:mn(8,'#2d3748')},'NONE YET')
        )
      )
    ),

    // Weekly momentum — every module feeds one shared weekly goal
    e('div',{style:card},
      e('div',{style:cardH},
        e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'WEEKLY MOMENTUM'),
        e('span',{style:mn(9,weekPct>=100?'#22c55e':'#2d3748',{fontWeight:700})},weekPct>=100?'GOAL MET ◆':daysLeft+'d LEFT')
      ),
      e('div',{style:{padding:'12px 14px'}},
        e('div',{style:row({justifyContent:'space-between',marginBottom:7})},
          e('span',{style:{fontSize:14,fontWeight:700,color:'#e2e8f0',fontFamily:"'DM Mono',monospace"}},weekXP+' / '+weekTarget+' XP'),
          e('span',{style:mn(9,weekPct>=100?'#22c55e':'#4a9eff')},weekPct+'%')
        ),
        e('div',{style:{height:6,background:'#0f1520',borderRadius:3,overflow:'hidden'}},
          e('div',{style:{height:'100%',width:weekPct+'%',background:weekPct>=100?'#22c55e':'#4a9eff',borderRadius:3,transition:'width 1s ease',boxShadow:weekPct>=100?'0 0 8px rgba(34,197,94,0.5)':'none'}})
        ),
        e('div',{style:mn(8,'#2d3748',{marginTop:7,lineHeight:1.5})},'Every task and journal entry this week feeds your momentum.')
      )
    ),

    // Evolution track
    e('div',{style:card},
      e('div',{style:cardH},e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'EVOLUTION TRACK')),
      e('div',{style:{padding:'12px 14px',display:'flex',gap:5}},
        TIERS.map(function(t2,i){
          var reached=level>=t2.min, current=tier.title===t2.title;
          return e('div',{key:i,style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}},
            e('div',{style:{width:'100%',height:32,background:reached?t2.color+'18':'#080b12',border:'1px solid '+(reached?t2.color:'#0f1520'),borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:current?'0 0 10px '+t2.glow:'none',transition:'all 0.4s'}},
              e('div',{style:{width:7,height:7,borderRadius:'50%',background:reached?t2.color:'#151e30',opacity:current?1:0.55}})
            ),
            e('div',{style:mn(6,reached?t2.color:'#2d3748',{textAlign:'center',lineHeight:1.3})},t2.title.split(' ')[0].toUpperCase())
          );
        })
      )
    ),

    // Next milestone
    e('div',{style:Object.assign({},card,{padding:'13px 15px'})},
      e('div',{style:row({justifyContent:'space-between',marginBottom:8})},
        e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'NEXT MILESTONE'),
        e('span',{style:mn(9,'#2d3748')},streak+'d streak')
      ),
      nextMil
        ? e('div',null,
            e('div',{style:{fontSize:14,fontWeight:700,color:'#e2e8f0',marginBottom:5}},nextMil.label),
            e('div',{style:{height:4,background:'#0f1520',borderRadius:2,overflow:'hidden'}},
              e('div',{style:{height:'100%',width:Math.min((streak/nextMil.days)*100,100)+'%',background:'#4a9eff',borderRadius:2,transition:'width 1s ease'}})
            ),
            e('div',{style:mn(9,'#2d3748',{marginTop:4})},(nextMil.days-streak)+' days away')
          )
        : e('div',{style:{fontSize:13,color:'#22c55e'}},'All milestones reached.')
    ),

    // Achievements card
    e('div',{style:card},
      e('div',{style:cardH},
        e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},'SYSTEM UNLOCKS'),
        e('button',{onClick:function(){setShowAch(true);},style:{background:'transparent',border:'none',fontSize:9,color:'#4a9eff',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em',cursor:'pointer'}},unlocked.length+'/'+ACHIEVEMENTS.length+' · VIEW ALL')
      ),
      e('div',{style:{padding:'12px 14px'}},
        e('div',{style:{height:4,background:'#0f1520',borderRadius:2,overflow:'hidden',marginBottom:12}},
          e('div',{style:{height:'100%',width:Math.round((unlocked.length/ACHIEVEMENTS.length)*100)+'%',background:'#4a9eff',borderRadius:2,transition:'width 1s ease'}})
        ),
        unlocked.length===0
          ? e('div',{style:{textAlign:'center',padding:'8px 0',color:'#1e2a3a',fontFamily:"'DM Mono',monospace",fontSize:10}},'Complete actions to unlock achievements.')
          : e('div',{style:{display:'flex',flexWrap:'wrap',gap:6}},
              unlocked.slice(-10).reverse().map(function(id){
                var ach=ACHIEVEMENTS.find(function(a){return a.id===id;});
                if(!ach) return null;
                return e('div',{key:id,title:ach.title,style:{width:34,height:34,borderRadius:9,background:ach.color+'18',border:'1px solid '+ach.color+'50',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}},ach.icon);
              })
            ),
    e(XPBridgeWidget,{totalXP:s.totalXP||0,onConvert:onBridgeXP,signalObj:signalObj})
      )
    ),

    // Signal analytics — VIP only
    isVIP
      ? e(SignalAnalytics,{entries:s.journalEntries||[],taskLog:s.taskLog||[],signalHistory:signalHistory,skillBonuses:skillBonuses,weatherGrid:intelligence&&intelligence.weatherGrid||[]})
      : e('div',{onClick:onNeedVIP,style:Object.assign({},card,{cursor:'pointer',border:'1px solid #8b5cf622'})},
          e('div',{style:{padding:'16px',display:'flex',alignItems:'center',gap:12}},
            e('div',{style:{fontSize:22,opacity:0.4}},'◇'),
            e('div',null,
              e('div',{style:{fontSize:12,fontWeight:700,color:'#e2e8f0',marginBottom:3}},'Signal Analytics'),
              e('div',{style:{fontSize:11,color:'#475569'}},'7-day mood map, signal history, skill bonuses — VIP only')
            ),
            e('div',{style:{marginLeft:'auto',padding:'6px 12px',background:'#8b5cf618',border:'1px solid #8b5cf644',borderRadius:8,fontSize:9,color:'#8b5cf6',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.1em'}},'◈ VIP')
          )
        )
  );
}

// ─── JOURNAL VALIDATION ───────────────────────────────────────────────────────
function validateJournalEntry(text) {
  var t=text.trim();
  if(t.length<150) return {valid:false,reason:'Need at least 150 characters ('+t.length+'/150).'};
  var words=t.split(/\s+/).filter(function(w){return w.length>0;});
  if(words.length<20) return {valid:false,reason:'Need at least 20 words ('+words.length+'/20).'};
  if(/(.)\1{4,}/i.test(t)) return {valid:false,reason:'Pattern detected — please write authentically.'};
  var uc={};for(var ci=0;ci<t.length;ci++)uc[t[ci].toLowerCase()]=1;
  if(Object.keys(uc).length<8) return {valid:false,reason:'Low diversity detected — write something real.'};
  return {valid:true,reason:''};
}

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab(props) {
  var engine=props.engine, state=props.state;
  var onClarityReward=props.onClarityReward||function(){};
  var signalXPMult=props.signalXPMult||1;
  var skillTaskMult=props.skillTaskMult||1;
  var tasks=state.tasks||[];
  var completedToday=state.completedToday||{};
  var completedWeek=state.completedWeek||{};
  var completedOnce=state.completedOnce||{};
  var taskLog=state.taskLog||[];
  var s1=useState(false); var showModal=s1[0],setShowModal=s1[1];
  var s2=useState(null);  var toastTask=s2[0],setToastTask=s2[1];
  var s3=useState(0);     var toastClarity=s3[0],setToastClarity=s3[1];
  var s4=useState(null);  var editTask=s4[0],setEditTask=s4[1];
  var timerRef=useRef(null);
  useEffect(function(){return function(){if(timerRef.current)clearTimeout(timerRef.current);};},[]);

  function doLog(task){
    var clr=Math.round(clarityForTask(task)*getStreakMult(state.streak||0)*signalXPMult);
    engine.logTask(task, signalXPMult * skillTaskMult);
    onClarityReward(clr);
    // Cancel reminder for once-type tasks on completion (daily reminders keep firing)
    if (task.reminderTime && task.freq === 'once') cancelTaskReminder(task.id);
    if(timerRef.current)clearTimeout(timerRef.current);
    setToastClarity(clr);
    setToastTask(task);
    timerRef.current=setTimeout(function(){setToastTask(null);},2200);
  }

  var dailyTasks  = tasks.filter(function(t){ return t.freq==='daily';  });
  var weeklyTasks = tasks.filter(function(t){ return t.freq==='weekly'; });
  var onceTasks   = tasks.filter(function(t){ return t.freq==='once';   });

  var doneToday   = dailyTasks.filter(function(t){ return completedToday[t.id]; }).length;
  var totalDaily  = dailyTasks.length;
  var doneWeekly  = weeklyTasks.filter(function(t){ return completedWeek[t.id]; }).length;

  var todayXP = taskLog
    .filter(function(l){ return l.date===new Date().toISOString().slice(0,10); })
    .reduce(function(s,l){ return s+l.xp; }, 0);

  var existingIds = tasks.map(function(t){ return t.id; });

  function section(title, items, compMap, badge) {
    if (!items.length) return null;
    var doneCount = items.filter(function(t){ return compMap[t.id]; }).length;
    return e('div',{style:card},
      e('div',{style:cardH},
        e('div',{style:row({gap:8})},
          e('span',{style:mn(9,'#94a3b8',{fontWeight:700})},title),
          cond(badge, e('span',{style:{fontSize:9,fontFamily:"'DM Mono',monospace",color:'#2d3748'}},badge))
        ),
        e('span',{style:mn(9,doneCount===items.length&&items.length>0?'#22c55e':'#2d3748')},doneCount+'/'+items.length)
      ),
      e('div',null,
        items.map(function(task){
          var done=!!(compMap[task.id]);
          return e(TaskItem,{key:task.id,task:task,done:done,taskLog:taskLog,onLog:doLog,
            onEdit:function(t){setEditTask(t);},
            onDelete:function(id){
              var t=(tasks||[]).find(function(x){return x.id===id;});
              if(t&&t.reminderTime) cancelTaskReminder(id);
              engine.deleteTask(id);
            }
          });
        })
      )
    );
  }

  return e('div',{style:{animation:'fadeUp 0.35s ease'}},
    e(TaskCreateModal,{open:showModal,onClose:function(){setShowModal(false);},onCreate:engine.createTask,existingIds:existingIds}),
    e(TaskEditModal,{open:!!editTask,task:editTask,onClose:function(){setEditTask(null);},onSave:engine.updateTask}),

    // Header stats
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}},
      [{label:'TODAY XP',val:'+'+todayXP,color:'#4a9eff'},{label:'DAILY',val:doneToday+'/'+totalDaily,color:'#22c55e'},{label:'WEEKLY',val:doneWeekly+'/'+weeklyTasks.length,color:'#f97316'}].map(function(item){
        return e('div',{key:item.label,style:{background:'#0a0e1a',border:'1px solid #151e30',borderRadius:12,padding:'12px 14px'}},
          e('div',{style:mn(7,'#2d3748',{marginBottom:5})},item.label),
          e('div',{style:{fontSize:15,fontWeight:700,color:item.color,fontFamily:"'DM Mono',monospace",lineHeight:1}},item.val)
        );
      })
    ),

    // Progress bar (daily)
    cond(totalDaily>0,
      e('div',{style:Object.assign({},card,{padding:'12px 15px',marginBottom:12})},
        e('div',{style:row({justifyContent:'space-between',marginBottom:6})},
          e('span',{style:mn(8,'#2d3748',{letterSpacing:'0.15em'})},'DAILY PROTOCOL COMPLETION'),
          e('span',{style:mn(8,doneToday===totalDaily?'#22c55e':'#475569')},Math.round((doneToday/totalDaily)*100)+'%')
        ),
        e('div',{style:{height:5,background:'#0f1520',borderRadius:3,overflow:'hidden'}},
          e('div',{style:{height:'100%',width:Math.round((doneToday/totalDaily)*100)+'%',background:'#22c55e',borderRadius:3,transition:'width 0.8s ease',boxShadow:doneToday===totalDaily?'0 0 8px rgba(34,197,94,0.5)':'none'}})
        )
      )
    ),

    section('DAILY PROTOCOL', dailyTasks, completedToday),
    section('WEEKLY QUESTS', weeklyTasks, completedWeek),
    section('ONE-TIME OPS', onceTasks, completedOnce),

    // Add task button
    e('button',{
      onClick:function(){setShowModal(true);},
      style:{width:'100%',padding:'14px',background:'#080b12',border:'1px dashed #1e3a5f',borderRadius:14,fontSize:10,color:'#1e3a5f',fontFamily:"'DM Mono',monospace",letterSpacing:'0.15em',cursor:'pointer',transition:'all 0.2s',marginBottom:12},
      onMouseEnter:function(ev){ev.currentTarget.style.borderColor='#4a9eff';ev.currentTarget.style.color='#4a9eff';},
      onMouseLeave:function(ev){ev.currentTarget.style.borderColor='#1e3a5f';ev.currentTarget.style.color='#1e3a5f';}
    },'+ ADD TASK'),

    // Task completion toast
    cond(toastTask!==null,
      e('div',{style:{position:'fixed',top:20,right:20,zIndex:900,background:'#0a0e1a',border:'1px solid '+((TASK_CATS[toastTask&&toastTask.cat]||TASK_CATS.body).color),borderRadius:14,padding:'12px 16px',boxShadow:'0 0 24px '+((TASK_CATS[toastTask&&toastTask.cat]||TASK_CATS.body).glow),animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',fontFamily:"'DM Mono',monospace"}},
        e('div',{style:mn(10,(TASK_CATS[toastTask&&toastTask.cat]||TASK_CATS.body).color,{fontWeight:700,marginBottom:5,letterSpacing:'0.15em'})},'▪ TASK COMPLETE'),
        e('div',{style:{fontSize:13,color:'#e2e8f0',marginBottom:3}},toastTask?toastTask.name:''),
        e('div',{style:mn(9,'#22c55e')},'+'+Math.round((toastTask?toastTask.xp:0)*((TASK_DIFFS[toastTask&&toastTask.diff]||TASK_DIFFS[1]).mult)*getStreakMult(state.streak||0))+' XP · +'+toastClarity+' CLARITY')
      )
    )
  );
}

// ─── 30-DAY LINE CHART ────────────────────────────────────────────────────────
function LineChart30(props) {
  var ws=props.weeklyShifts||{};
  var days=[];
  for (var di=29;di>=0;di--) {
    var d=new Date(); d.setDate(d.getDate()-di);
    var key=d.toISOString().slice(0,10);
    var data=ws[key]||{HEAVY:0,HEAT:0,CLEAR:0,REFLECTIVE:0};
    days.push({key:key,total:data.HEAVY+data.HEAT+data.CLEAR+data.REFLECTIVE});
  }
  var mx=Math.max.apply(null,days.map(function(d){return d.total;}))||1;
  var W=300,H=56;
  if (days.filter(function(d){return d.total>0;}).length<2) {
    return e('div',{style:{height:H,display:'flex',alignItems:'center',justifyContent:'center',color:'#1e2a3a',fontFamily:"'DM Mono',monospace",fontSize:10}},'Not enough data for 30-day view yet.');
  }
  var pts=days.map(function(d,i){
    var x=(i/(days.length-1))*W;
    var y=H-(d.total/mx)*H*0.85;
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  var fillPts='0,'+H+' '+pts+' '+W+','+H;
  // Week labels
  var wkLabels=[];
  days.forEach(function(d,i){
    var dow=new Date(d.key).getDay();
    if(dow===1&&i>0){
      var x=(i/(days.length-1))*W;
      var lbl=new Date(d.key).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      wkLabels.push({x:x,lbl:lbl});
    }
  });
  return e('svg',{viewBox:'0 0 '+W+' '+(H+20),style:{width:'100%',overflow:'visible'}},
    e('defs',null,
      e('linearGradient',{id:'lg30',x1:'0',y1:'0',x2:'0',y2:'1'},
        e('stop',{offset:'0%',stopColor:'#4a9eff',stopOpacity:'0.35'}),
        e('stop',{offset:'100%',stopColor:'#4a9eff',stopOpacity:'0'})
      )
    ),
    e('polygon',{points:fillPts,fill:'url(#lg30)'}),
    e('polyline',{points:pts,fill:'none',stroke:'#4a9eff',strokeWidth:'1.5',strokeLinecap:'round',strokeLinejoin:'round',opacity:0.85}),
    wkLabels.map(function(wl,wi){
      return e('g',{key:wi},
        e('line',{x1:wl.x.toFixed(1),y1:'0',x2:wl.x.toFixed(1),y2:String(H),stroke:'#0f1520',strokeWidth:'1',strokeDasharray:'3,3'}),
        e('text',{x:wl.x.toFixed(1),y:String(H+14),textAnchor:'middle',fontSize:'6',fontFamily:"'DM Mono',monospace",fill:'#2d3748'},wl.lbl)
      );
    })
  );
}

// ─── SIGNALS TAB → replaced by ClarityTab ────────────────────────────────────

// ─── URGE RESCUE MODAL ────────────────────────────────────────────────────────
var URGE_KEY='silo_urge_v1';
function getUrgeLastUsed(){try{return parseInt(localStorage.getItem(URGE_KEY)||'0',10);}catch(x){return 0;}}
function setUrgeLastUsed(){try{localStorage.setItem(URGE_KEY,String(Date.now()));}catch(x){}}

function UrgeModal(props) {
  var isVIP=props.isVIP||false;
  var onClose=props.onClose||function(){};
  var canUse=props.canUse||false;
  var s1=useState(0);     var phase=s1[0],setPhase=s1[1];
  var s2=useState(false); var started=s2[0],setStarted=s2[1];
  var s3=useState(0);     var elapsed=s3[0],setElapsed=s3[1];
  var tickRef=useRef(null);
  var PHASES=['INHALE','HOLD','EXHALE','HOLD'];
  var SECS=[4,4,4,4];
  var PCOLORS=['#4a9eff','#8b5cf6','#22c55e','#8b5cf6'];
  useEffect(function(){
    if(!started){if(tickRef.current)clearInterval(tickRef.current);return;}
    tickRef.current=setInterval(function(){
      setElapsed(function(prev){
        if(prev+1>=SECS[phase]){setPhase(function(p){return (p+1)%4;});return 0;}
        return prev+1;
      });
    },1000);
    return function(){if(tickRef.current)clearInterval(tickRef.current);};
  },[started,phase]);
  if(!props.open)return null;
  var pColor=PCOLORS[phase], pLabel=PHASES[phase], pSec=SECS[phase];
  var circ=Math.PI*2*60, pct=elapsed/pSec;
  var GROUNDS=['Name 5 things you can see.','Name 4 things you can touch.','Name 3 things you can hear.','Name 2 things you can smell.','Name 1 thing you can taste.'];
  return e('div',{onClick:onClose,style:{position:'fixed',inset:0,zIndex:950,background:'rgba(0,0,0,0.96)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}},
    e('div',{onClick:function(ev){ev.stopPropagation();},style:{width:'100%',maxWidth:360,textAlign:'center'}},
      e('div',{style:mn(9,'#4a9eff',{letterSpacing:'0.28em',marginBottom:6})},'◈ URGE RESCUE'),
      e('div',{style:{fontSize:16,fontWeight:700,color:'#e2e8f0',marginBottom:4,fontFamily:"'DM Mono',monospace"}},'Emergency Protocol'),
      !canUse
        ? e('div',{style:{background:'#1a0d22',border:'1px solid #8b5cf655',borderRadius:14,padding:'22px',margin:'20px 0'}},
            e('div',{style:{fontSize:13,color:'#8b5cf6',fontWeight:700,fontFamily:"'DM Mono',monospace",marginBottom:8}},'24h Limit Reached'),
            e('div',{style:{fontSize:11,color:'#556070',lineHeight:1.6,marginBottom:14}},'Free users get 1 emergency use every 24 hours. Upgrade for unlimited access.'),
            e('button',{onClick:props.onNeedVIP,style:{padding:'10px 22px',background:'#8b5cf622',border:'1px solid #8b5cf666',borderRadius:10,fontSize:10,color:'#8b5cf6',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.1em',cursor:'pointer'}},'UPGRADE TO VIP')
          )
        : e('div',null,
            e('div',{style:{position:'relative',width:148,height:148,margin:'20px auto',display:'flex',alignItems:'center',justifyContent:'center'}},
              e('svg',{viewBox:'0 0 148 148',style:{position:'absolute',inset:0,width:'100%',height:'100%',transform:'rotate(-90deg)'}},
                e('circle',{cx:'74',cy:'74',r:'60',fill:'none',stroke:'#0f1520',strokeWidth:'8'}),
                e('circle',{cx:'74',cy:'74',r:'60',fill:'none',stroke:pColor,strokeWidth:'8',strokeDasharray:circ.toFixed(1),strokeDashoffset:(circ*(1-pct)).toFixed(1),strokeLinecap:'round',style:{transition:'stroke-dashoffset 0.95s linear,stroke 0.4s ease'}})
              ),
              e('div',{style:{textAlign:'center',zIndex:1}},
                started
                  ? e('div',null,e('div',{style:mn(18,pColor,{fontWeight:700,display:'block'})},pLabel),e('div',{style:mn(12,'#475569',{marginTop:3})},(pSec-elapsed)+'s'))
                  : e('div',{style:mn(10,'#2d3748')},'TAP START')
              )
            ),
            !started && e('button',{
              onClick:function(){setStarted(true);setUrgeLastUsed();props.onMarkUsed&&props.onMarkUsed();},
              style:{padding:'13px 30px',background:'rgba(74,158,255,0.08)',border:'1px solid #4a9eff44',borderRadius:12,fontSize:11,color:'#4a9eff',fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.15em',cursor:'pointer',marginBottom:16}
            },'BEGIN BREATHING'),
            isVIP && e('div',{style:{fontSize:9,color:'#8b5cf6',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em',marginBottom:12}},'◈ VIP — UNLIMITED ACCESS'),
            e('div',{style:{background:'#0a0e1a',border:'1px solid #1d2740',borderRadius:12,padding:'13px 15px',textAlign:'left',marginTop:4}},
              e('div',{style:mn(8,'#2d3748',{marginBottom:8,letterSpacing:'0.15em'})},'5-4-3-2-1 GROUNDING'),
              GROUNDS.map(function(g,gi){return e('div',{key:gi,style:{fontSize:11,color:'#2d3748',padding:'5px 0',borderBottom:gi<4?'1px solid #0a0d14':'none'}},g);})
            )
          ),
      e('button',{onClick:onClose,style:{display:'block',margin:'18px auto 0',background:'transparent',border:'none',fontSize:10,color:'#2d3748',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em',cursor:'pointer'}},'CLOSE')
    )
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function Shell() {
  var engine=useCoreEngine();
  var vip=useVIP();
  useEffect(function(){ vip.initialize(); },[]);
  var signal=useSignalCheckin();
  var skillTree=useSkillTree(engine.state);
  var skillBonuses=computeSkillBonuses(skillTree.effectFlags);
  var s_checkin=useState(true); var showCheckin=s_checkin[0],setShowCheckin=s_checkin[1];
  var s_evreveal=useState(null); var evReveal=s_evreveal[0],setEvReveal=s_evreveal[1];
  useEffect(function(){if(engine.evolution)setEvReveal(engine.evolution);},[engine.evolution&&engine.evolution.title]);
  var s1=useState('HOME');  var tab=s1[0],setTab=s1[1];
  var s2=useState(false);   var offline=s2[0],setOffline=s2[1];
  var s3=useState(false);   var showVIP=s3[0],setShowVIP=s3[1];
  var s4=useState(false);   var showUrge=s4[0],setShowUrge=s4[1];
  var s5=useState(false);   var edgeFlash=s5[0],setEdgeFlash=s5[1];
  var s6=useState(false);   var showResetConfirm=s6[0],setShowResetConfirm=s6[1];
  var s7=useState(function(){return !hasOnboarded();}); var showOnboarding=s7[0],setShowOnboarding=s7[1];
  var intelligence=useSignalIntelligence(signal.history, engine.state?engine.state.journalEntries:[], engine.state?engine.state.taskLog:[]);
  var clarity=useClarity(engine.state, vip.isVIP, intelligence.clarityMod);
  var signalXPMult=(signal.todayObj ? signal.todayObj.xpMult : 1) * (signal.todayObj ? 1 + skillBonuses.signalBoost : 1);
  function urgeCanUse(){return vip.isVIP||(Date.now()-getUrgeLastUsed()>skillBonuses.urgeCooldownMs);}
  function openUrge(){setShowUrge(true);}
  function markUrgeUsed(){/* timestamp already set in UrgeModal on BEGIN click */}

  useEffect(function(){
    function goOff(){setOffline(true);}
    function goOn(){setOffline(false);}
    window.addEventListener('offline',goOff);
    window.addEventListener('online',goOn);
    setOffline(!navigator.onLine);
    return function(){window.removeEventListener('offline',goOff);window.removeEventListener('online',goOn);};
  },[]);

  var loaded=engine.loaded, state=engine.state;
  var level=state?getLevelFromXP(state.totalXP||0):1;
  var tier=getTier(level);
  var xp=state?(state.totalXP||0):0;
  var streak=state?(state.streak||0):0;

  // Threshold tremor
  var lvlXPShell=state?getLvlXP(state.totalXP||0):0;
  var xpToNext=engine.XPL-lvlXPShell;
  var nearLevelUp=xpToNext<=15&&level<24;
  var withinFive=xpToNext<=5&&level<24;

  // Temporal presence
  var timeOfDay=useMemo(function(){var h=new Date().getHours();if(h>=5&&h<9)return 'morning';if(h>=21||h<4)return 'night';return 'day';},[]);
  var temporalConfigs={morning:{bg:'#0f0e14',title:'MORNING PROTOCOL'},night:{bg:'#08090f',title:'DEEP SIGNAL'},day:{bg:'#0d1117',title:'SILO'}};
  var temporalConfig=temporalConfigs[timeOfDay];

  // Edge flash on level-up
  var levelRef=useRef(level);
  useEffect(function(){
    if(level>levelRef.current){setEdgeFlash(true);setTimeout(function(){setEdgeFlash(false);},1200);}
    levelRef.current=level;
  },[level]);

  if (!loaded) {
    return e('div',{style:{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}},
      e('style',null,CSS),
      e('div',{style:{width:10,height:10,borderRadius:'50%',background:'#4a9eff',animation:'pulse 1s ease-in-out infinite'}}),
      e('div',{style:mn(9,'#2d3748',{letterSpacing:'0.2em',marginTop:8})},'CORE INITIALIZING')
    );
  }

  var bridgeCostXP = skillBonuses.bridgeHalfCost ? Math.floor(XP_BRIDGE_RATE/2) : XP_BRIDGE_RATE;
  var bridgeClarity = XP_BRIDGE_CLARITY + skillBonuses.bridgeBonusClarity;

  var pageContent;
  if (tab==='HOME') pageContent=e(HomeTab, {
    state:state, engine:engine, XPL:engine.XPL, isVIP:vip.isVIP,
    onNeedVIP:function(){setShowVIP(true);},
    onNavigate:function(t){setTab(t);},
    signalObj:signal.todayObj, signalHistory:signal.history,
    clarityRate:clarity.passiveRate, clarityTotal:clarity.clarity,
    skillBonuses:skillBonuses,
    intelligence:intelligence,
    nearLevelUp:nearLevelUp,
    withinFive:withinFive,
    onBridgeXP:function(){
      var txp=engine.state.totalXP||0;
      if(txp>=bridgeCostXP){
        clarity.receiveXPBridge(bridgeCostXP, bridgeClarity, signal.todayObj);
        engine.spendXP(bridgeCostXP);
      }
    },
  });
  else if (tab==='JOURNAL') pageContent=e(JournalTab, {
    state:state, engine:engine, isVIP:vip.isVIP,
    onNeedVIP:function(){setShowVIP(true);},
    onJournalCommit:clarity.activateJournalBoost,
    onClarityReward:clarity.addClarity,
    skillJournalMult:skillBonuses.journalXPMult,
    signalXPMult:signalXPMult,
  });
  else if (tab==='TASKS') pageContent=e(TasksTab, {
    state:state, engine:engine,
    onClarityReward:clarity.addClarity,
    signalXPMult:signalXPMult,
    skillTaskMult:skillBonuses.taskXPMult,
  });
  else pageContent=e(ClarityTab, {state:state,engine:engine,clarity:clarity,isVIP:vip.isVIP,onNeedVIP:function(){setShowVIP(true);}});

  return e('div',{style:{minHeight:'100vh',background:temporalConfig.bg,color:'#e2e8f0',fontFamily:"'DM Sans',sans-serif",transition:'background 3s ease'}},
    e('style',null,CSS),
    // First-launch onboarding
    showOnboarding && e(Onboarding,{onComplete:function(){setShowOnboarding(false);}}),
    // Edge-flash overlay on level up
    edgeFlash && e('div',{style:{position:'fixed',inset:0,zIndex:9999,pointerEvents:'none',background:'radial-gradient(ellipse at center, '+tier.color+'22 0%, transparent 70%)',border:'2px solid '+tier.color+'66',animation:'edgeFlash 1.2s ease-out forwards'},key:'ef'}),
    // Reset confirmation modal
    showResetConfirm && e('div',{onClick:function(){setShowResetConfirm(false);},style:{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}},
      e('div',{onClick:function(ev){ev.stopPropagation();},style:{width:'100%',maxWidth:340,background:'#0a0e1a',border:'1px solid #1d2740',borderRadius:16,padding:'24px 22px',animation:'scaleIn 0.25s ease'}},
        e('div',{style:mn(10,'#ef4444',{fontWeight:700,letterSpacing:'0.2em',marginBottom:10})},'⚠ RESET ALL DATA'),
        e('div',{style:{fontSize:13,color:'#94a3b8',lineHeight:1.6,marginBottom:20}},'This permanently erases all XP, journal entries, tasks, Clarity, and progress. This cannot be undone.'),
        e('div',{style:{display:'flex',gap:10}},
          e('button',{onClick:function(){setShowResetConfirm(false);},style:{flex:1,padding:'12px',background:'transparent',border:'1px solid #1d2740',borderRadius:10,fontSize:11,color:'#475569',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em',cursor:'pointer'}},'CANCEL'),
          e('button',{onClick:function(){engine.resetAll();setShowResetConfirm(false);},style:{flex:1,padding:'12px',background:'rgba(239,68,68,0.12)',border:'1px solid #ef444466',borderRadius:10,fontSize:11,color:'#ef4444',fontFamily:"'DM Mono',monospace",letterSpacing:'0.1em',fontWeight:700,cursor:'pointer'}},'RESET')
        )
      )
    ),
    e(VIPModal,{open:showVIP,onClose:function(){setShowVIP(false);},onUpgrade:vip.upgrade,onRestore:vip.restorePurchases}),
    e(UrgeModal,{open:showUrge,onClose:function(){setShowUrge(false);},isVIP:vip.isVIP,canUse:urgeCanUse(),onNeedVIP:function(){setShowUrge(false);setShowVIP(true);},onMarkUsed:markUrgeUsed}),
      e(SignalCheckinModal,{show:!showOnboarding&&showCheckin&&!signal.todayId,onSelect:function(s){signal.doCheckin(s);setShowCheckin(false);}}),
      e(EvolutionRevealModal,{tier:evReveal,onClose:function(){setEvReveal(null);}}),
    e(EvolveModal,{tier:engine.evolution,onClose:engine.dismissEvolution}),
    e(AchievementToast,{data:engine.newAchievement,onClose:engine.dismissAchievement}),

    // Offline banner
    cond(offline,
      e('div',{style:{background:'#161b27',borderBottom:'1px solid #1d2740',padding:'5px 20px',textAlign:'center',fontFamily:"'DM Mono',monospace",fontSize:9,color:'#475569',letterSpacing:'0.12em'}},'OFFLINE — ALL DATA LOCAL')
    ),

    // Header
    e('header',{style:{position:'sticky',top:0,zIndex:100,background:'rgba(13,17,23,0.96)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderBottom:'1px solid #1d2740'}},
      e('div',{style:{maxWidth:680,margin:'0 auto',padding:'0 16px',height:52,display:'flex',alignItems:'center',justifyContent:'space-between'}},
        e('div',{style:row({gap:9})},
          e('div',{style:{width:26,height:26,background:'rgba(74,158,255,0.07)',border:'1px solid '+tier.color+'33',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}},
            e('div',{style:{width:6,height:6,borderRadius:'50%',background:tier.color,animation:'pulse 2s ease-in-out infinite'}})
          ),
          e('span',{style:mn(14,'#e2e8f0',{fontWeight:700,letterSpacing:'0.18em'})},temporalConfig.title),
          vip.isVIP && e('span',{style:{fontSize:8,fontFamily:"'DM Mono',monospace",color:'#8b5cf6',fontWeight:700,letterSpacing:'0.15em',marginLeft:4}},'VIP'),
          e(SignalPulse,{signalObj:signal.todayObj,onClick:function(){setShowCheckin(true);}})
        ),
        e('div',{style:row({gap:6})},
          e('div',{title:'Total Clarity — earned across every tab',style:{padding:'4px 9px',background:'rgba(6,182,212,0.07)',border:'1px solid #0e4a55',borderRadius:7}},
            e('span',{style:mn(10,'#06b6d4',{fontWeight:600})},'◈ '+fmtClarity(clarity.clarity))
          ),
          cond(streak>0,
            e('div',{title:streak+'-day streak · +'+Math.round((getStreakMult(streak)-1)*100)+'% to all gains',style:{padding:'4px 9px',background:'rgba(249,115,22,0.08)',border:'1px solid #f9731633',borderRadius:7}},
              e('span',{style:mn(10,'#f97316',{fontWeight:600})},'◉ '+streak+'d')
            )
          ),
          e('div',{title:fmtClarity(xp)+' total XP',style:{padding:'4px 9px',background:'rgba(74,158,255,0.06)',border:'1px solid #1e3a5f',borderRadius:7}},
            e('span',{style:mn(10,'#4a9eff',{fontWeight:600})},fmtClarity(xp)+' XP')
          ),
          e('div',{style:{padding:'4px 9px',background:'#11151f',border:'1px solid #1d2740',borderRadius:7}},
            e('span',{style:mn(10,tier.color,{fontWeight:600})},'LV.'+level)
          ),
          e('button',{onClick:function(){setShowResetConfirm(true);},title:'Settings / Reset',style:{width:30,height:30,background:'#11151f',border:'1px solid #1d2740',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'#2d3748',fontSize:13,minWidth:30}},'⚙')
        )
      )
    ),

    // Content
    e('div',{style:{maxWidth:680,margin:'0 auto',padding:'0 16px 100px'}},
      // Tab nav
      e('nav',{style:{display:'flex',gap:2,margin:'12px 0 18px',background:'#161b27',border:'1px solid #1d2740',borderRadius:12,padding:3}},
        TABS.map(function(tb){
          var on=tab===tb.id;
          return e('button',{key:tb.id,onClick:function(){setTab(tb.id);},style:{flex:1,padding:'9px 4px',background:on?'#0a1628':'transparent',border:'1px solid '+(on?'#1e3a5f':'transparent'),borderRadius:10,fontSize:8,fontWeight:on?700:400,color:on?'#4a9eff':'#2d3748',letterSpacing:'0.1em',fontFamily:"'DM Mono',monospace",display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',transition:'all 0.2s',minHeight:44}},
            e('span',{style:{fontSize:14}},tb.glyph),
            tb.label.toUpperCase()
          );
        })
      ),
      pageContent,
      e('div',{style:{marginTop:20,textAlign:'center',fontFamily:"'DM Mono',monospace",fontSize:8,color:'#1d2740',letterSpacing:'0.12em'}},'SILO v10 · PRIVATE · ZERO-KNOWLEDGE · ALL DATA LOCAL')
    ),

    // Floating SOS button
    e('button',{onClick:openUrge,title:'Urge Rescue — Emergency Protocol',style:{position:'fixed',bottom:'calc(82px + env(safe-area-inset-bottom, 0px))',right:'calc(14px + env(safe-area-inset-right, 0px))',zIndex:150,width:46,height:46,borderRadius:'50%',background:'rgba(13,17,23,0.92)',border:'1.5px solid rgba(239,68,68,0.5)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,cursor:'pointer',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',boxShadow:'0 0 0 0 rgba(239,68,68,0.4)',animation:'sos-pulse 2.8s ease-in-out infinite',transition:'border-color 0.2s,box-shadow 0.2s'},
      onMouseEnter:function(ev){ev.currentTarget.style.borderColor='rgba(239,68,68,0.9)';ev.currentTarget.style.boxShadow='0 0 18px rgba(239,68,68,0.4)';},
      onMouseLeave:function(ev){ev.currentTarget.style.borderColor='rgba(239,68,68,0.5)';ev.currentTarget.style.boxShadow='0 0 0 0 rgba(239,68,68,0.4)';}
    },
      e('style',null,'@keyframes sos-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.35)}60%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}'),
      e('div',{style:{width:6,height:6,borderRadius:'50%',background:'#ef4444',boxShadow:'0 0 6px rgba(239,68,68,0.8)',animation:'pulse 1.4s ease-in-out infinite'}}),
      e('span',{style:{fontSize:7,fontWeight:700,color:'#ef4444',fontFamily:"'DM Mono',monospace",letterSpacing:'0.12em',lineHeight:1}},'SOS')
    ),

    // Fixed bottom nav
    e('nav',{style:{position:'fixed',bottom:0,left:0,right:0,zIndex:200,background:'rgba(13,17,23,0.97)',borderTop:'1px solid #1d2740',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',paddingBottom:'env(safe-area-inset-bottom,0px)'}},
      e('div',{style:{maxWidth:680,margin:'0 auto',display:'flex',padding:'8px 8px 10px'}},
        TABS.map(function(tb){
          var on=tab===tb.id;
          return e('button',{key:tb.id,onClick:function(){setTab(tb.id);},style:{flex:1,padding:'8px 4px 4px',background:'transparent',border:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer',minHeight:44}},
            e('span',{style:{fontSize:18,filter:on?'drop-shadow(0 0 6px #4a9eff)':'none',transition:'filter 0.2s'}},tb.glyph),
            e('span',{style:mn(8,on?'#4a9eff':'#2d3748',{fontWeight:on?700:400,transition:'color 0.2s'})},tb.label.toUpperCase()),
            cond(on,e('div',{style:{width:16,height:2,background:'#4a9eff',borderRadius:1,marginTop:2}}))
          );
        })
      )
    )
  );
}

export default function App() {
  return e(CoreProvider,null,e(Shell,null));
}
