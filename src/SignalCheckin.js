/**
 * SignalCheckin.js - SILO v10.8
 * Daily signal check-in + XP->Clarity bridge + Evolution narrative moments.
 * Import into App.js to add all new features cleanly.
 */

import React from 'react';
var useState  = React.useState;
var useEffect = React.useEffect;
var e         = React.createElement;

// SIGNAL_STATES - maps to the recovery arc
export var SIGNAL_STATES = [
  { id:'flat',       label:'FLAT',       desc:'Signal offline. Holding position.',  color:'#475569', glow:'rgba(71,85,105,0.5)',  xpMult:0.8, clarityMult:0.7  },
  { id:'flickering', label:'FLICKERING', desc:'Weak signal. Something stirs.',       color:'#f97316', glow:'rgba(249,115,22,0.5)', xpMult:1.0, clarityMult:1.0  },
  { id:'steady',     label:'STEADY',     desc:'Signal stable. Core holding.',        color:'#4a9eff', glow:'rgba(74,158,255,0.5)', xpMult:1.2, clarityMult:1.25 },
  { id:'strong',     label:'STRONG',     desc:'Signal clear. Full transmission.',    color:'#22c55e', glow:'rgba(34,197,94,0.5)',  xpMult:1.5, clarityMult:1.5  },
];

// EVOLUTION_NARRATIVE - richer text for each stage transition
export var EVOLUTION_NARRATIVE = {
  Quiescent: { unlock:'Journey begins. The signal is dormant — but it is there.',  flavor:'You went dark. That was the right thing to do.',             what:'First steps. Daily protocol unlocked.' },
  Resonant:  { unlock:'Signal detected. The first transmission has returned.',      flavor:'You showed up. That is everything.',                          what:'Skill Tree unlocked. Begin building your attributes.' },
  Kinetic:   { unlock:'System active. You are generating output.',                  flavor:'The work is compounding. You can feel it.',                   what:'Clarity generators now respond to your streak.' },
  Cascade:   { unlock:'Cascade initiated. Multiple systems firing.',                flavor:'You stopped waiting to feel ready.',                          what:'XP Bridge unlocked. Real-world actions fuel the signal engine.' },
  Sovereign: { unlock:'Sovereignty achieved. Operating from core truth.',           flavor:'You are no longer who the loss told you you were.',            what:'Prestige system unlocked. New run, deeper signal.' },
  Monolithic:{ unlock:'Full signal. The architecture is complete.',                 flavor:'This was always possible. You built it anyway.',              what:'All systems at maximum capacity. You made it.' },
};

// STORAGE
var SK_SIGNAL = 'silo_signal_v1';
function loadSignal() {
  try { return JSON.parse(localStorage.getItem(SK_SIGNAL)) || {lastDate:null,lastState:null,history:[]}; }
  catch(x) { return {lastDate:null,lastState:null,history:[]}; }
}
function saveSignal(d) { localStorage.setItem(SK_SIGNAL, JSON.stringify(d)); }
function todayKey()    { return new Date().toISOString().slice(0,10); }

// HOOK
export function useSignalCheckin() {
  var raw    = loadSignal();
  var today  = todayKey();
  var todayId = raw.lastDate === today ? raw.lastState : null;

  function doCheckin(signalState) {
    var updated = { lastDate:today, lastState:signalState.id, history:[...(raw.history||[]).slice(-59),{date:today,state:signalState.id}] };
    saveSignal(updated);
    return updated;
  }
  function getStateObj(id) { return SIGNAL_STATES.find(function(s){return s.id===id;}) || SIGNAL_STATES[1]; }
  return { todayId, todayObj:todayId?getStateObj(todayId):null, doCheckin, getStateObj, history:raw.history||[] };
}

var SIGNAL_TOOLTIPS = [
  { id:'flat',       color:'#475569', label:'FLAT',       tip:'Heavy, drained, or numb. Signal is down. Still counts — showing up matters most here.' },
  { id:'flickering', color:'#f97316', label:'FLICKERING', tip:'Low energy or foggy but present. Something is stirring. Standard XP day.' },
  { id:'steady',     color:'#4a9eff', label:'STEADY',     tip:'Grounded and functional. Good signal. +20% XP boost today.' },
  { id:'strong',     color:'#22c55e', label:'STRONG',     tip:'Clear, motivated, locked in. Full transmission. +50% XP boost today.' },
];

// SIGNAL CHECK-IN MODAL
export function SignalCheckinModal(props) {
  var tooltipStateArr = useState(false);
  var showTooltips = tooltipStateArr[0];
  var setShowTooltips = tooltipStateArr[1];

  if (!props.show) return null;
  return e('div',{style:{position:'fixed',inset:0,zIndex:950,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(10px)'}},
    e('div',{onClick:function(ev){ev.stopPropagation();},style:{maxWidth:360,width:'100%',margin:'0 16px',background:'rgba(8,12,20,0.99)',border:'1px solid #1d2740',borderRadius:18,padding:'32px 22px',animation:'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)'}},
      e('div',{style:{textAlign:'center',marginBottom:28}},
        e('div',{style:{fontSize:10,color:'#4a9eff',letterSpacing:'0.25em',fontFamily:'"DM Mono",monospace',marginBottom:12}},'SIGNAL CHECK-IN'),
        e('div',{style:{fontSize:22,fontWeight:700,color:'#e2e8f0',lineHeight:1.3,marginBottom:8}},'How is the signal today?'),
        e('div',{style:{fontSize:12,color:'#475569',lineHeight:1.6}},"Your answer shapes the day's resonance and XP multiplier.")
      ),
      e('div',{style:{marginBottom:12}},
        e('button',{onClick:function(){setShowTooltips(!showTooltips);},style:{background:'none',border:'none',cursor:'pointer',fontSize:9,color:'#475569',letterSpacing:'0.15em',fontFamily:'"DM Mono",monospace',padding:'2px 0',display:'block',marginBottom: showTooltips ? 8 : 0}},
          (showTooltips ? '▾' : '▸') + ' WHAT DO THESE MEAN?'
        ),
        showTooltips ? e('div',{style:{background:'rgba(74,158,255,0.05)',borderRadius:8,padding:'10px 12px',marginBottom:8,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 10px'}},
          SIGNAL_TOOLTIPS.map(function(t){
            return e('div',{key:t.id,style:{display:'flex',flexDirection:'column',gap:3}},
              e('div',{style:{display:'flex',alignItems:'center',gap:5}},
                e('div',{style:{width:7,height:7,borderRadius:'50%',background:t.color,flexShrink:0}}),
                e('span',{style:{fontSize:9,fontWeight:700,color:t.color,fontFamily:'"DM Mono",monospace',letterSpacing:'0.1em'}},t.label)
              ),
              e('div',{style:{fontSize:10,color:'#64748b',lineHeight:1.5}},t.tip)
            );
          })
        ) : null
      ),
      e('div',{style:{display:'flex',flexDirection:'column',gap:9}},
        SIGNAL_STATES.map(function(s){
          return e('button',{key:s.id,onClick:function(){props.onSelect(s);},style:{background:'rgba(13,17,23,0.7)',border:'1px solid '+s.color+'44',borderRadius:10,padding:'13px 16px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',textAlign:'left',width:'100%',transition:'all 0.18s'},
            onMouseEnter:function(ev){ev.currentTarget.style.background=s.color+'18';ev.currentTarget.style.borderColor=s.color+'aa';ev.currentTarget.style.boxShadow='0 0 14px '+s.glow;},
            onMouseLeave:function(ev){ev.currentTarget.style.background='rgba(13,17,23,0.7)';ev.currentTarget.style.borderColor=s.color+'44';ev.currentTarget.style.boxShadow='none';}},
            e('div',{style:{width:10,height:10,borderRadius:'50%',background:s.color,boxShadow:'0 0 8px '+s.glow,flexShrink:0}}),
            e('div',{},
              e('div',{style:{fontSize:12,fontWeight:700,color:s.color,letterSpacing:'0.12em',fontFamily:'"DM Mono",monospace'}},s.label),
              e('div',{style:{fontSize:11,color:'#64748b',marginTop:2}},s.desc)
            ),
            e('div',{style:{marginLeft:'auto',fontSize:10,color:s.color+'99',fontFamily:'"DM Mono",monospace'}},'x'+s.xpMult+' XP')
          );
        })
      )
    )
  );
}

// EVOLUTION REVEAL MODAL
export function EvolutionRevealModal(props) {
  if (!props.tier) return null;
  var narr = EVOLUTION_NARRATIVE[props.tier.title] || {};
  var t    = props.tier;
  return e('div',{onClick:props.onClose,style:{position:'fixed',inset:0,zIndex:920,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)'}},
    e('div',{onClick:function(ev){ev.stopPropagation();},style:{maxWidth:380,width:'100%',margin:'0 16px',background:'linear-gradient(160deg,rgba(8,12,20,0.99),rgba(10,15,26,0.99))',border:'1px solid '+t.color+'66',borderRadius:18,padding:'36px 24px',boxShadow:'0 0 60px '+t.glow+',inset 0 1px 0 rgba(255,255,255,0.05)',animation:'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',textAlign:'center'}},
      e('div',{style:{fontSize:9,letterSpacing:'0.3em',color:t.color,fontFamily:'"DM Mono",monospace',marginBottom:20}},'EVOLUTION EVENT'),
      e('div',{style:{fontSize:28,fontWeight:800,color:t.color,letterSpacing:'0.05em',marginBottom:6,lineHeight:1.2,textShadow:'0 0 20px '+t.glow}},t.title.toUpperCase()),
      e('div',{style:{fontSize:13,color:'#94a3b8',marginBottom:24,lineHeight:1.6}},narr.unlock||t.desc),
      narr.flavor && e('div',{style:{background:'rgba(13,17,23,0.8)',border:'1px solid '+t.color+'33',borderRadius:10,padding:'14px 16px',marginBottom:20,textAlign:'left'}},
        e('div',{style:{fontSize:11,color:'#64748b',lineHeight:1.7,fontStyle:'italic'}},'"'+narr.flavor+'"'),
        narr.what && e('div',{style:{fontSize:11,color:t.color+'cc',marginTop:10,fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}},'-> '+narr.what)
      ),
      e('button',{onClick:props.onClose,style:{padding:'12px 32px',background:'transparent',border:'1px solid '+t.color,borderRadius:8,color:t.color,fontSize:11,fontFamily:'"DM Mono",monospace',letterSpacing:'0.15em',cursor:'pointer'},
        onMouseEnter:function(ev){ev.currentTarget.style.background=t.color+'20';ev.currentTarget.style.boxShadow='0 0 16px '+t.glow;},
        onMouseLeave:function(ev){ev.currentTarget.style.background='transparent';ev.currentTarget.style.boxShadow='none';}
      },'ACKNOWLEDGE TRANSMISSION')
    )
  );
}

// XP -> CLARITY BRIDGE WIDGET
export var XP_BRIDGE_RATE    = 50;
export var XP_BRIDGE_CLARITY = 500;

export function XPBridgeWidget(props) {
  var canConvert = props.totalXP >= XP_BRIDGE_RATE;
  var clarityOut = props.signalObj ? Math.round(XP_BRIDGE_CLARITY * props.signalObj.clarityMult) : XP_BRIDGE_CLARITY;
  var pct        = Math.min(100, Math.round((props.totalXP % XP_BRIDGE_RATE) / XP_BRIDGE_RATE * 100));
  return e('div',{style:{background:'rgba(13,17,23,0.6)',border:'1px solid #1d2740',borderRadius:12,padding:'16px 18px',marginTop:12}},
    e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}},
      e('div',{style:{fontSize:9,letterSpacing:'0.2em',color:'#4a9eff',fontFamily:'"DM Mono",monospace'}},'XP -> CLARITY BRIDGE'),
      e('div',{style:{fontSize:9,color:'#475569',fontFamily:'"DM Mono",monospace'}},XP_BRIDGE_RATE+' XP = '+clarityOut+' CLARITY')
    ),
    e('div',{style:{height:3,background:'#0d1117',borderRadius:2,marginBottom:10,overflow:'hidden'}},
      e('div',{style:{width:(canConvert?100:pct)+'%',height:'100%',background:canConvert?'#4a9eff':'rgba(74,158,255,0.4)',borderRadius:2,transition:'width 0.6s ease',boxShadow:canConvert?'0 0 8px rgba(74,158,255,0.6)':'none'}})
    ),
    e('div',{style:{fontSize:11,color:'#475569',marginBottom:12,lineHeight:1.5}},'Real-world actions generate XP. Convert it into Clarity to fuel your passive generators.'),
    e('button',{onClick:canConvert?props.onConvert:undefined,disabled:!canConvert,
      style:{width:'100%',padding:'10px',background:canConvert?'rgba(74,158,255,0.08)':'transparent',border:'1px solid '+(canConvert?'#4a9eff88':'#1d2740'),borderRadius:8,color:canConvert?'#4a9eff':'#334155',fontSize:11,fontFamily:'"DM Mono",monospace',letterSpacing:'0.12em',cursor:canConvert?'pointer':'not-allowed',transition:'all 0.2s'},
      onMouseEnter:canConvert?function(ev){ev.currentTarget.style.background='rgba(74,158,255,0.15)';}:undefined,
      onMouseLeave:canConvert?function(ev){ev.currentTarget.style.background='rgba(74,158,255,0.08)';}:undefined
    }, canConvert?'CONVERT '+XP_BRIDGE_RATE+' XP -> '+clarityOut+' CLARITY':'EARN MORE XP ('+props.totalXP+'/'+XP_BRIDGE_RATE+')')
  );
}

// SIGNAL PULSE (small indicator for header)
export function SignalPulse(props) {
  var s = props.signalObj;
  return e('div',{onClick:props.onClick,style:{display:'flex',alignItems:'center',gap:8,cursor:props.onClick?'pointer':'default',padding:'4px 10px',background:s?s.color+'12':'transparent',border:'1px solid '+(s?s.color+'55':'#1d274033'),borderRadius:20,transition:'all 0.2s'}},
    e('div',{style:{width:7,height:7,borderRadius:'50%',background:s?s.color:'#1d2740',boxShadow:s?'0 0 6px '+s.glow+',0 0 12px '+s.glow:'none'}}),
    e('span',{style:{fontSize:9,letterSpacing:'0.2em',color:s?s.color:'#334155',fontFamily:'"DM Mono",monospace'}},s?s.label:'CHECK IN')
  );
}
