/**
 * SkillTreeTab.js — SILO v10 Psychological Skill Tree (Premium Visual Layer)
 *
 * Pure React.createElement, inline styles, CSS keyframes via <style> tag injection
 * (same pattern as JournalTab's burnOut2 animation). Zero external dependencies.
 *
 * Design language:
 *   - Nodes: SVG diamond polygons (rotated squares) with nested inner core
 *   - Glow:  CSS drop-shadow filter on SVG elements (no SVG filter defs needed)
 *   - Edges: dim background track always visible; dashed teal for available path;
 *            solid glowing line for fully unlocked path
 *   - State: locked = muted; available = slow breathing pulse; active = ambient glow
 *   - Unlock: 2-ring shockwave expanding outward, fading to transparent
 *   - Hover:  1.08x scale snap + SVG tooltip showing title + cost
 *   - Colors: Emerald (#10b981) / Violet (#8b5cf6) / Amber (#f59e0b)
 *
 * Logic contract: reads from useSkillTree hook only. No XP logic here.
 */

import React from 'react';
import { useSkillTree } from './useSkillTree.js';

var e         = React.createElement;
var useState  = React.useState;

var ATTR_COLORS = {
  Fortitude: '#10b981',
  Awareness: '#8b5cf6',
  Release:   '#f59e0b',
};
var ATTR_SUBLABEL = {
  Fortitude: 'RESILIENCE · CONSISTENCY · ENDURANCE',
  Awareness: 'INTROSPECTION · PATTERN · SIGNAL',
  Release:   'CATHARSIS · COMPLETION · CLARITY',
};

var TREE_CSS =
  '@keyframes st-shock1{0%{transform:scale(1);opacity:1}100%{transform:scale(3.8);opacity:0}}' +
  '@keyframes st-shock2{0%{transform:scale(1);opacity:0.55}100%{transform:scale(2.6);opacity:0}}' +
  '@keyframes st-breathe{0%,100%{opacity:0.35}50%{opacity:1}}' +
  '@keyframes st-treein{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}' +
  '@keyframes st-flash{0%{opacity:1}30%{opacity:0.15}60%{opacity:0.9}100%{opacity:1}}';

function mn(sz, cl, x) {
  return Object.assign({fontFamily:"'DM Mono',monospace",fontSize:sz,color:cl,letterSpacing:'0.08em'},x||{});
}
var card  = {background:'#0a0e1a',border:'1px solid #151e30',borderRadius:16,overflow:'hidden',marginBottom:12};
var cardH = {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 15px',borderBottom:'1px solid #0f1520',background:'#080b12'};

function dp(cx, cy, hw, hh) {
  return cx+','+(cy-hh)+' '+(cx+hw)+','+cy+' '+cx+','+(cy+hh)+' '+(cx-hw)+','+cy;
}

var VW = 340, VH = 470;
var NODE_POS = [
  {x:170, y:55},
  {x:88,  y:170},
  {x:252, y:170},
  {x:252, y:295},
  {x:170, y:415},
];
var EDGES = [[0,1],[0,2],[2,3],[1,4],[3,4]];
var HW = 28, HH = 33;
var HW_I = 11, HH_I = 13;


function SkillTreeSVG(props) {
  var nodes       = props.nodes;
  var attrColor   = props.attrColor;
  var selectedId  = props.selectedId;
  var hoveredId   = props.hoveredId;
  var unlockingId = props.unlockingId;
  var flashId     = props.flashId;
  var canUnlock   = props.canUnlock;
  var onSelect    = props.onSelect;
  var onHover     = props.onHover;

  var all = [];

  EDGES.forEach(function(edge, ei) {
    var fn = nodes[edge[0]], tn = nodes[edge[1]];
    if (!fn || !tn) return;
    var fp = NODE_POS[edge[0]], tp = NODE_POS[edge[1]];
    var lit  = fn.unlocked && tn.unlocked;
    var half = fn.unlocked && !tn.unlocked;

    all.push(e('line', {
      key: 'rail'+ei,
      x1:fp.x, y1:fp.y, x2:tp.x, y2:tp.y,
      stroke:'#131c2e', strokeWidth:1.5, strokeLinecap:'round',
    }));

    if (lit) {
      all.push(e('line', {
        key:'eglow'+ei,
        x1:fp.x, y1:fp.y, x2:tp.x, y2:tp.y,
        stroke:attrColor, strokeWidth:5, strokeLinecap:'round', opacity:0.12,
        style:{filter:'blur(3px)'},
      }));
      all.push(e('line', {
        key:'eline'+ei,
        x1:fp.x, y1:fp.y, x2:tp.x, y2:tp.y,
        stroke:attrColor, strokeWidth:1.5, strokeLinecap:'round', opacity:0.85,
        style:{filter:'drop-shadow(0 0 4px '+attrColor+')'},
      }));
    } else if (half) {
      all.push(e('line', {
        key:'eline'+ei,
        x1:fp.x, y1:fp.y, x2:tp.x, y2:tp.y,
        stroke:attrColor, strokeWidth:1, strokeLinecap:'round', opacity:0.3,
        strokeDasharray:'5 5',
      }));
    }
  });

  nodes.forEach(function(node, ni) {
    var pos = NODE_POS[ni];
    if (!pos) return;

    var isOn    = node.unlocked;
    var canOn   = !isOn && canUnlock(node.id);
    var isSel   = selectedId === node.id;
    var isHov   = hoveredId  === node.id;
    var isShock = unlockingId === node.id;
    var isFlash = flashId     === node.id;

    var nc = [];

    if (isShock) {
      nc.push(e('circle', {
        key:'sw1', cx:pos.x, cy:pos.y, r:HH+2,
        fill:'none', stroke:attrColor, strokeWidth:2.5, opacity:1,
        style:{transformOrigin:pos.x+'px '+pos.y+'px',animation:'st-shock1 0.65s ease-out forwards'},
      }));
      nc.push(e('circle', {
        key:'sw2', cx:pos.x, cy:pos.y, r:HH,
        fill:'none', stroke:attrColor, strokeWidth:1.2, opacity:0.55,
        style:{transformOrigin:pos.x+'px '+pos.y+'px',animation:'st-shock2 0.72s 0.1s ease-out forwards'},
      }));
    }

    if (isOn) {
      nc.push(e('ellipse', {
        key:'blob', cx:pos.x, cy:pos.y, rx:HW+16, ry:HH+14,
        fill:attrColor, opacity:0.055, style:{filter:'blur(8px)'},
      }));
    }

    if (canOn) {
      nc.push(e('polygon', {
        key:'ring', points:dp(pos.x, pos.y, HW+10, HH+10),
        fill:'none', stroke:attrColor, strokeWidth:1, strokeDasharray:'4 3',
        style:{animation:'st-breathe 2.6s ease-in-out infinite',filter:'drop-shadow(0 0 5px '+attrColor+')'},
      }));
    }

    if (isSel) {
      nc.push(e('polygon', {
        key:'selring', points:dp(pos.x, pos.y, HW+7, HH+7),
        fill:'none', stroke:'#e2e8f0', strokeWidth:1.5, opacity:0.55, strokeDasharray:'3 3',
      }));
    }

    nc.push(e('polygon', {
      key:'body',
      points:dp(pos.x, pos.y, HW, HH),
      fill: isOn ? attrColor+'1c' : (canOn ? attrColor+'09' : '#07090f'),
      stroke: isOn ? attrColor : (canOn ? attrColor+'85' : '#1c2640'),
      strokeWidth: isOn ? 2 : (canOn ? 1.5 : 0.8),
      style: Object.assign(
        {transition:'all 0.3s ease'},
        isOn ? {filter:'drop-shadow(0 0 7px '+attrColor+'66)'} : {},
        isFlash ? {animation:'st-flash 0.5s ease'} : {}
      ),
    }));

    if (isOn) {
      nc.push(e('polygon', {
        key:'core', points:dp(pos.x, pos.y, HW_I, HH_I),
        fill:attrColor, opacity:0.92,
        style:{filter:'drop-shadow(0 0 5px '+attrColor+')'},
      }));
    }

    if (isHov && !isOn) {
      nc.push(e('polygon', {
        key:'hoverfill', points:dp(pos.x, pos.y, HW-3, HH-3),
        fill:attrColor, opacity:0.07,
      }));
    }

    if (!isOn) {
      nc.push(e('text', {
        key:'ip', x:pos.x, y:pos.y-HH-7,
        textAnchor:'middle', fontSize:'9', fontWeight:'700',
        fontFamily:"'DM Mono',monospace",
        fill: canOn ? attrColor : '#283044',
        style:{userSelect:'none'},
      }, node.cost+'IP'));
    }

    nc.push(e('text', {
      key:'glyph', x:pos.x, y:pos.y+(isOn?5:4),
      textAnchor:'middle', fontSize:isOn?'12':'9',
      fontFamily:"'DM Mono',monospace",
      fill: isOn ? attrColor : (canOn ? attrColor+'cc' : '#283044'),
      style:{userSelect:'none',filter:isOn?'drop-shadow(0 0 3px '+attrColor+')':'none'},
    }, isOn ? '✓' : (canOn ? '◆' : '◇')));

    var abbr = node.title.split(' ').slice(0,2).map(function(w){return w.slice(0,4);}).join(' ').toUpperCase();
    nc.push(e('text', {
      key:'lbl', x:pos.x, y:pos.y+HH+14,
      textAnchor:'middle', fontSize:'7.5', fontWeight:isOn?'700':'500',
      fontFamily:"'DM Mono',monospace",
      fill: isOn ? attrColor : (canOn ? '#475569' : '#1e2a3a'),
      style:{userSelect:'none',transition:'fill 0.3s ease',filter:isOn?'drop-shadow(0 0 4px '+attrColor+'44)':'none'},
    }, abbr));

    if (isHov && !isOn) {
      var preferLeft = pos.x > VW/2;
      var ttW=90, ttH=38, ttPad=8;
      var ttx = preferLeft ? pos.x-ttW-ttPad : pos.x+ttPad;
      ttx = Math.max(2, Math.min(VW-ttW-2, ttx));
      var tty = pos.y-ttH/2;
      tty = Math.max(2, Math.min(VH-ttH-20, tty));
      nc.push(e('g', {key:'tt'},
        e('rect', {x:ttx-1,y:tty-1,width:ttW+2,height:ttH+2,rx:4,ry:4,fill:attrColor,opacity:0.12,style:{filter:'blur(4px)'}}),
        e('rect', {x:ttx,y:tty,width:ttW,height:ttH,rx:3,ry:3,fill:'#070a10',stroke:attrColor,strokeWidth:0.8,opacity:0.97}),
        e('text', {x:ttx+ttW/2,y:tty+14,textAnchor:'middle',fontSize:'8',fontWeight:'700',fontFamily:"'DM Mono',monospace",fill:attrColor,style:{userSelect:'none'}},
          node.title.split(' ').slice(0,3).join(' ').toUpperCase()),
        e('text', {x:ttx+ttW/2,y:tty+27,textAnchor:'middle',fontSize:'7.5',fontFamily:"'DM Mono',monospace",fill:canOn?'#22c55e':'#475569',style:{userSelect:'none'}},
          canOn ? '◆ '+node.cost+' IP · READY' : '○ '+node.cost+' IP · LOCKED')
      ));
    }

    all.push(e.apply(null, ['g', {
      key: node.id,
      style:{
        cursor:'pointer',
        transform:'scale('+(isHov?1.08:1)+')',
        transformOrigin:pos.x+'px '+pos.y+'px',
        transition:'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
      },
      onClick:      (function(id){return function(){onSelect(id);};})(node.id),
      onMouseEnter: (function(id){return function(){onHover(id);};})(node.id),
      onMouseLeave: function(){onHover(null);},
    }].concat(nc)));
  });

  return e.apply(null, ['svg', {
    viewBox:'0 0 '+VW+' '+VH,
    xmlns:'http://www.w3.org/2000/svg',
    style:{width:'100%',maxWidth:VW,display:'block',margin:'0 auto',animation:'st-treein 0.32s ease',transformOrigin:'center',overflow:'visible'},
  }].concat(all));
}


function LevelBadge(props) {
  var color=props.color, level=props.level, size=props.size||28;
  return e('div', {style:{position:'relative',width:size,height:size,flexShrink:0}},
    e('div', {style:{position:'absolute',inset:3,background:color+'14',border:'1px solid '+color,transform:'rotate(45deg)',borderRadius:2,boxShadow:'0 0 8px '+color+'44, inset 0 0 4px '+color+'22'}}),
    e('div', {style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size<=28?10:12,fontWeight:700,color:color,fontFamily:"'DM Mono',monospace"}}, String(level))
  );
}

function XPTrack(props) {
  var pct=props.pct, color=props.color, xpInto=props.xpInto, perLevel=props.perLevel, nextLevel=props.nextLevel;
  return e('div', null,
    e('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}},
      e('span', {style:mn(7,'#1e2a3a',{letterSpacing:'0.18em'})}, 'PROTOCOL XP'),
      e('div', {style:{display:'flex',alignItems:'center',gap:8}},
        e('span', {style:{fontSize:9,color:'#2d3748',fontFamily:"'DM Mono',monospace"}}, xpInto+' / '+perLevel),
        e('span', {style:{fontSize:8,color:color,fontFamily:"'DM Mono',monospace",fontWeight:700}}, pct+'%')
      )
    ),
    e('div', {style:{height:3,background:'#0b1020',borderRadius:2,overflow:'visible',position:'relative'}},
      e('div', {style:{position:'absolute',left:0,top:0,bottom:0,width:pct+'%',background:color,borderRadius:2,transition:'width 1.4s cubic-bezier(0.4,0,0.2,1)',boxShadow:'0 0 8px 1px '+color+'88, 0 0 18px 2px '+color+'22'}}),
      pct > 1 && e('div', {style:{position:'absolute',left:'calc('+pct+'% - 4px)',top:'50%',transform:'translateY(-50%)',width:8,height:8,background:color,borderRadius:'50%',transition:'left 1.4s cubic-bezier(0.4,0,0.2,1)',boxShadow:'0 0 10px 3px '+color+', 0 0 4px 1px #fff4',zIndex:1}})
    ),
    e('div', {style:mn(7,'#1e2a3a',{marginTop:4})}, (perLevel-xpInto)+' XP to Lv.'+(nextLevel))
  );
}

export function SkillTreeTab(props) {
  var coreState = props.state;
  var st = useSkillTree(coreState);

  var s1=useState('Fortitude'); var activeAttr=s1[0],  setActiveAttr=s1[1];
  var s2=useState(null);        var selectedId=s2[0],   setSelectedId=s2[1];
  var s3=useState(null);        var hoveredId=s3[0],    setHoveredId=s3[1];
  var s4=useState(null);        var unlockingId=s4[0],  setUnlockingId=s4[1];
  var s5=useState(null);        var flashId=s5[0],      setFlashId=s5[1];

  var attrColor   = ATTR_COLORS[activeAttr];
  var attrLevel   = st.levels[activeAttr];
  var attrXP      = st.attrXP[activeAttr];
  var xpIntoLvl   = attrXP % st.XP_PER_LEVEL;
  var xpPct       = Math.min(Math.round((xpIntoLvl/st.XP_PER_LEVEL)*100), 100);
  var attrNodes   = st.nodes.filter(function(n){ return n.attribute===activeAttr; });
  var unlockedAll = st.nodes.filter(function(n){ return n.unlocked; }).length;

  var selectedNode      = selectedId ? st.nodes.find(function(n){ return n.id===selectedId; }) : null;
  var canUnlockSelected = selectedId ? st.canUnlock(selectedId) : false;

  function doUnlock(nodeId) {
    var ok = st.unlockNode(nodeId);
    if (!ok) return;
    setSelectedId(null);
    setUnlockingId(nodeId);
    setTimeout(function(){ setUnlockingId(null); }, 750);
    setFlashId(nodeId);
    setTimeout(function(){ setFlashId(null); }, 550);
  }

  return e('div', {style:{animation:'fadeUp 0.35s ease',paddingBottom:24}},
    e('style', null, TREE_CSS),

    // Masthead
    e('div', {style:{position:'relative',overflow:'hidden',background:'linear-gradient(145deg,#090d18,#0c1120)',border:'1px solid #151e30',borderRadius:14,padding:'15px 18px',marginBottom:12}},
      e('div', {style:{position:'absolute',top:-20,right:-20,width:60,height:60,background:attrColor+'0a',border:'1px solid '+attrColor+'20',transform:'rotate(45deg)',borderRadius:3,transition:'background 0.5s ease,border-color 0.5s ease'}}),
      e('div', {style:{position:'absolute',bottom:-16,left:-16,width:44,height:44,background:attrColor+'06',border:'1px solid '+attrColor+'15',transform:'rotate(45deg)',borderRadius:2,transition:'all 0.5s ease'}}),
      e('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between'}},
        e('div', null,
          e('div', {style:mn(7,'#1e2a3a',{marginBottom:7,letterSpacing:'0.28em'})}, '◆ INSIGHT POINTS'),
          e('div', {style:{display:'flex',alignItems:'baseline',gap:10}},
            e('div', {style:{fontSize:38,fontWeight:700,color:'#e2e8f0',fontFamily:"'DM Mono',monospace",lineHeight:1,textShadow:'0 0 24px rgba(255,255,255,0.07)'}}, String(st.insightPoints)),
            e('div', {style:mn(9,st.insightPoints>0?attrColor:'#1e2a3a',{fontWeight:600,letterSpacing:'0.12em',transition:'color 0.5s ease'})},
              st.insightPoints>0 ? 'AVAILABLE TO SPEND' : 'EARN BY LEVELING ATTRIBUTES')
          )
        ),
        e('div', {style:{textAlign:'right'}},
          e('div', {style:mn(7,'#1e2a3a',{marginBottom:7,letterSpacing:'0.18em'})}, 'NODES ACTIVE'),
          e('div', {style:{fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:unlockedAll>0?attrColor:'#1e2a3a',transition:'color 0.5s ease'}}, unlockedAll+' / '+st.nodes.length),
          e('div', {style:mn(7,'#1e2a3a',{marginTop:3})}, st.totalInsightEarned+' total earned')
        )
      )
    ),

    // Attribute selector
    e('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:12}},
      ['Fortitude','Awareness','Release'].map(function(attr) {
        var color=ATTR_COLORS[attr], lvl=st.levels[attr], xp=st.attrXP[attr];
        var prog=Math.min(Math.round(((xp%st.XP_PER_LEVEL)/st.XP_PER_LEVEL)*100),100);
        var isActive=attr===activeAttr;
        return e('div', {key:attr,
          onClick:function(){setActiveAttr(attr);setSelectedId(null);setHoveredId(null);},
          style:{position:'relative',overflow:'hidden',background:isActive?color+'0d':'#080b12',border:'1px solid '+(isActive?color+'65':'#0d1525'),borderRadius:11,padding:'11px 12px',cursor:'pointer',transition:'all 0.25s ease',boxShadow:isActive?'0 0 16px '+color+'18, inset 0 0 12px '+color+'08':'none'},
        },
          isActive && e('div', {style:{position:'absolute',top:0,left:'20%',right:'20%',height:1.5,background:'linear-gradient(90deg,transparent,'+color+',transparent)'}}),
          e('div', {style:{display:'flex',alignItems:'center',gap:8,marginBottom:7}},
            e(LevelBadge, {color:color,level:lvl}),
            e('div', {style:mn(7,isActive?color:'#283044',{letterSpacing:'0.12em',lineHeight:1.4,transition:'color 0.25s ease'})}, attr.toUpperCase())
          ),
          e('div', {style:{height:1.5,background:'#0b1020',borderRadius:1,overflow:'visible',position:'relative'}},
            e('div', {style:{height:'100%',width:prog+'%',background:isActive?color:color+'55',borderRadius:1,transition:'width 1.2s ease',boxShadow:isActive?'0 0 5px '+color:'none'}}),
            prog>2 && e('div', {style:{position:'absolute',left:'calc('+prog+'% - 2.5px)',top:'50%',transform:'translateY(-50%)',width:5,height:5,background:isActive?color:color+'66',borderRadius:'50%',boxShadow:isActive?'0 0 6px '+color:'none'}})
          )
        );
      })
    ),

    // Tree panel
    e('div', {style:Object.assign({},card,{overflow:'visible'})},
      e('div', {style:cardH},
        e('div', null,
          e('div', {style:{display:'flex',alignItems:'center',gap:9,marginBottom:3}},
            e('div', {style:{width:8,height:8,flexShrink:0,background:attrColor,transform:'rotate(45deg)',boxShadow:'0 0 8px '+attrColor,transition:'background 0.4s ease,box-shadow 0.4s ease'}}),
            e('span', {style:mn(9,'#94a3b8',{fontWeight:700,letterSpacing:'0.2em'})}, activeAttr.toUpperCase()+' PROTOCOL')
          ),
          e('div', {style:mn(7,'#1e2a3a',{letterSpacing:'0.14em'})}, ATTR_SUBLABEL[activeAttr])
        ),
        e('div', {style:{textAlign:'right'}},
          e('div', {style:mn(8,attrColor,{fontWeight:700})}, 'LV.'+attrLevel),
          e('div', {style:mn(7,'#1e2a3a',{marginTop:2})}, attrXP+' XP TOTAL')
        )
      ),
      e('div', {style:{padding:'10px 16px 6px'}},
        e(XPTrack, {pct:xpPct,color:attrColor,xpInto:xpIntoLvl,perLevel:st.XP_PER_LEVEL,nextLevel:attrLevel+1})
      ),
      e('div', {style:{padding:'6px 8px 10px'}},
        e(SkillTreeSVG, {
          nodes:attrNodes, attrColor:attrColor, selectedId:selectedId,
          hoveredId:hoveredId, unlockingId:unlockingId, flashId:flashId,
          canUnlock:st.canUnlock,
          onSelect:function(id){setSelectedId(id===selectedId?null:id);},
          onHover:setHoveredId,
        })
      ),
      e('div', {style:{display:'flex',gap:16,padding:'0 15px 12px',borderTop:'1px solid #0a0d14',paddingTop:9,flexWrap:'wrap'}},
        [{fill:'#07090f',stroke:'#1c2640',dash:false,label:'Locked'},
         {fill:attrColor+'09',stroke:attrColor+'85',dash:true,label:'Available'},
         {fill:attrColor+'1c',stroke:attrColor,dash:false,label:'Active'}
        ].map(function(item,i){
          return e('div', {key:i,style:{display:'flex',alignItems:'center',gap:6}},
            e('div', {style:{width:9,height:9,flexShrink:0,transform:'rotate(45deg)',background:item.fill,border:'1px '+(item.dash?'dashed':'solid')+' '+item.stroke,boxShadow:i===2?'0 0 5px '+attrColor+'55':'none'}}),
            e('span', {style:mn(8,'#2d3748')}, item.label)
          );
        })
      )
    ),

    // Node detail overlay
    selectedNode && e('div', {style:{
      position:'fixed',bottom:84,left:'50%',transform:'translateX(-50%)',
      zIndex:500,width:'calc(100% - 32px)',maxWidth:628,
      background:'linear-gradient(160deg,#0b0f1a,#080c15)',
      border:'1px solid '+(selectedNode.unlocked?ATTR_COLORS[selectedNode.attribute]+'55':canUnlockSelected?ATTR_COLORS[selectedNode.attribute]+'35':'#192036'),
      borderRadius:18,padding:'16px 18px 20px',
      boxShadow:'0 20px 70px rgba(0,0,0,0.88)'+(selectedNode.unlocked||canUnlockSelected?', 0 0 32px '+ATTR_COLORS[selectedNode.attribute]+'18':''),
      animation:'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
    }},
      e('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}},
        e('div', {style:{display:'flex',alignItems:'center',gap:9}},
          e('div', {style:{width:8,height:8,flexShrink:0,background:ATTR_COLORS[selectedNode.attribute],transform:'rotate(45deg)',boxShadow:'0 0 8px '+ATTR_COLORS[selectedNode.attribute]}}),
          e('span', {style:mn(8,ATTR_COLORS[selectedNode.attribute],{fontWeight:700,letterSpacing:'0.22em'})}, selectedNode.attribute.toUpperCase()),
          selectedNode.unlocked && e('span',{style:mn(8,'#475569',{fontWeight:400})},'· ACTIVE')
        ),
        e('button',{onClick:function(){setSelectedId(null);},style:{background:'transparent',border:'none',color:'#475569',fontSize:19,cursor:'pointer',lineHeight:1,padding:'0 4px'}},'×')
      ),
      e('div', {style:{fontSize:15,fontWeight:700,color:'#e2e8f0',fontFamily:"'DM Mono',monospace",marginBottom:7,lineHeight:1.3,textShadow:selectedNode.unlocked?'0 0 14px '+ATTR_COLORS[selectedNode.attribute]+'55':'none'}}, selectedNode.title),
      e('div', {style:{fontSize:13,color:'#475569',lineHeight:1.75,marginBottom:14}}, selectedNode.description),
      e('div', {style:{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}},
        e('div', {style:{background:'#080b12',border:'1px solid #151e30',borderRadius:8,padding:'6px 12px',flexShrink:0}},
          e('div',{style:mn(7,'#2d3748',{marginBottom:3})},'COST'),
          e('div',{style:{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace",color:(canUnlockSelected||selectedNode.unlocked)?ATTR_COLORS[selectedNode.attribute]:'#e2e8f0'}}, selectedNode.cost+' IP')
        ),
        e('div', {style:{background:'#080b12',border:'1px solid #151e30',borderRadius:8,padding:'6px 12px',flexShrink:0}},
          e('div',{style:mn(7,'#2d3748',{marginBottom:3})},'AVAILABLE'),
          e('div',{style:{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace",color:st.insightPoints>=selectedNode.cost?'#22c55e':'#ef4444'}}, st.insightPoints+' IP')
        ),
        selectedNode.dependencies.length>0 && e('div',{style:{background:'#080b12',border:'1px solid #151e30',borderRadius:8,padding:'6px 12px',flex:1,minWidth:130}},
          e('div',{style:mn(7,'#2d3748',{marginBottom:5})},'REQUIRES'),
          e('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
            selectedNode.dependencies.map(function(dep){
              var dn=st.nodes.find(function(n){return n.id===dep;});
              var don=dn&&dn.unlocked;
              return e('span',{key:dep,style:mn(9,don?ATTR_COLORS[selectedNode.attribute]:'#2d3748')},
                (don?'✓ ':'○ ')+(dn?dn.title.split(' ')[0]:dep));
            })
          )
        )
      ),
      selectedNode.unlocked
        ? e('div',{style:{padding:'12px',borderRadius:10,textAlign:'center',background:ATTR_COLORS[selectedNode.attribute]+'0e',border:'1px solid '+ATTR_COLORS[selectedNode.attribute]+'30',fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:'0.2em',color:ATTR_COLORS[selectedNode.attribute],fontWeight:700}},
            '◆ NODE ACTIVE — INTEGRATED INTO PROTOCOL')
        : canUnlockSelected
          ? e('button',{
              onClick:function(){doUnlock(selectedNode.id);},
              style:{width:'100%',padding:'13px',background:ATTR_COLORS[selectedNode.attribute]+'12',border:'1px solid '+ATTR_COLORS[selectedNode.attribute]+'65',borderRadius:10,fontSize:11,color:ATTR_COLORS[selectedNode.attribute],fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:'0.15em',cursor:'pointer',transition:'all 0.15s',boxShadow:'0 0 18px '+ATTR_COLORS[selectedNode.attribute]+'20'},
              onMouseEnter:function(ev){ev.currentTarget.style.background=ATTR_COLORS[selectedNode.attribute]+'22';ev.currentTarget.style.boxShadow='0 0 28px '+ATTR_COLORS[selectedNode.attribute]+'35';},
              onMouseLeave:function(ev){ev.currentTarget.style.background=ATTR_COLORS[selectedNode.attribute]+'12';ev.currentTarget.style.boxShadow='0 0 18px '+ATTR_COLORS[selectedNode.attribute]+'20';},
            }, '◆ UNLOCK NODE · '+selectedNode.cost+' INSIGHT POINT'+(selectedNode.cost>1?'S':''))
          : e('div',{style:{padding:'12px',background:'#080b12',border:'1px solid #0f1520',borderRadius:10,textAlign:'center',fontFamily:"'DM Mono',monospace",fontSize:10,color:'#2d3748',letterSpacing:'0.1em'}},
              st.insightPoints<selectedNode.cost
                ? '◇ INSUFFICIENT POINTS ('+st.insightPoints+' / '+selectedNode.cost+')'
                : '◇ UNLOCK DEPENDENCIES FIRST')
    )
  );
}
