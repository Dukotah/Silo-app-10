/**
 * SkillTreeTab.js — SILO v10 Psychological Skill Tree UI
 *
 * Pure React.createElement (no JSX). Inline styles only (matches app pattern).
 * CSS animations reuse keyframes already defined in App.js CSS string.
 *
 * Layout:
 *   ┌─ Insight Points header + node count ──────────────────┐
 *   ├─ Attribute selector (3 cards — click to switch view) ─┤
 *   ├─ Selected attribute: XP bar + diamond SVG tree ────── ┤
 *   └─ Node detail overlay (slides up on node click) ───────┘
 *
 * Tree topology (SVG viewBox 0 0 300 400):
 *   NODE_POS[0] = root       (x:150, y:50)
 *   NODE_POS[1] = left       (x:85,  y:150)
 *   NODE_POS[2] = right      (x:215, y:150)
 *   NODE_POS[3] = right-deep (x:215, y:255)
 *   NODE_POS[4] = bottom     (x:150, y:355)
 *
 * Node ordering within each attribute in skillTreeConfig.js matches these
 * positions exactly (root=0, left=1, right=2, right-deep=3, bottom=4).
 */

import React from 'react';
import { useSkillTree } from './useSkillTree.js';

var e        = React.createElement;
var useState = React.useState;

// ─── STYLE CONSTANTS (mirrors App.js palette) ─────────────────────────────────
var ATTR_COLORS = {
  Fortitude: '#f97316',
  Awareness: '#4a9eff',
  Release:   '#22c55e',
};
var ATTR_GLOWS = {
  Fortitude: 'rgba(249,115,22,0.45)',
  Awareness: 'rgba(74,158,255,0.45)',
  Release:   'rgba(34,197,94,0.45)',
};
var ATTR_DESCS = {
  Fortitude: 'Resilience through consistency',
  Awareness: 'Introspection through journaling',
  Release:   'Catharsis through completion',
};

function mn(sz, cl, x) {
  return Object.assign({fontFamily:"'DM Mono',monospace",fontSize:sz,color:cl,letterSpacing:'0.08em'},x||{});
}
function row(x) { return Object.assign({display:'flex',alignItems:'center'},x||{}); }
var card  = {background:'#0a0e1a',border:'1px solid #151e30',borderRadius:16,overflow:'hidden',marginBottom:12};
var cardH = {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 15px',borderBottom:'1px solid #0f1520',background:'#080b12'};

// ─── TREE GEOMETRY ────────────────────────────────────────────────────────────
var NODE_POS = [
  {x:150, y:50 },   // [0] root
  {x:85,  y:150},   // [1] left branch
  {x:215, y:150},   // [2] right branch
  {x:215, y:255},   // [3] right deep
  {x:150, y:355},   // [4] convergence (bottom)
];
var EDGES = [
  [0,1],  // root → left
  [0,2],  // root → right
  [2,3],  // right → right-deep
  [1,4],  // left → bottom
  [3,4],  // right-deep → bottom
];
var NODE_R = 32;

// ─── SVG TREE ─────────────────────────────────────────────────────────────────
function SkillTreeSVG(props) {
  var attrColor = props.attrColor;
  var nodes     = props.nodes;       // array of 5 nodes for this attribute
  var selectedId  = props.selectedId;
  var onSelect  = props.onSelect;
  var canUnlock = props.canUnlock;

  var svgChildren = [];

  // ── Edges (drawn first, behind nodes) ──────────────────────────────────────
  EDGES.forEach(function(edge, ei) {
    var fromNode = nodes[edge[0]];
    var toNode   = nodes[edge[1]];
    if (!fromNode || !toNode) return;
    var fp  = NODE_POS[edge[0]];
    var tp  = NODE_POS[edge[1]];
    var lit = fromNode.unlocked && toNode.unlocked;
    // Partially lit edge: from node unlocked but to is not yet
    var half = fromNode.unlocked && !toNode.unlocked;
    svgChildren.push(
      e('line', {
        key: 'edge'+ei,
        x1: fp.x, y1: fp.y, x2: tp.x, y2: tp.y,
        stroke: lit ? attrColor : (half ? attrColor : '#1a2535'),
        strokeWidth: lit ? 2 : 1.5,
        strokeLinecap: 'round',
        opacity: lit ? 0.65 : (half ? 0.25 : 0.18),
        strokeDasharray: lit ? 'none' : (half ? '5 4' : 'none'),
        style: {transition:'stroke 0.5s ease,opacity 0.5s ease'},
      })
    );
  });

  // ── Nodes ──────────────────────────────────────────────────────────────────
  nodes.forEach(function(node, ni) {
    var pos    = NODE_POS[ni];
    if (!pos) return;
    var isSel  = selectedId === node.id;
    var isOn   = node.unlocked;
    var canOn  = !isOn && canUnlock(node.id);
    var nc     = [];   // children of the <g> element

    // Outer glow ring (unlocked)
    if (isOn) {
      nc.push(e('circle', {
        key: 'glow',
        cx: pos.x, cy: pos.y, r: NODE_R + 11,
        fill: 'none', stroke: attrColor, strokeWidth: 1, opacity: 0.13,
        style: {animation:'pulse 3.2s ease-in-out infinite'},
      }));
    }

    // Dashed availability ring (can unlock)
    if (canOn) {
      nc.push(e('circle', {
        key: 'avail',
        cx: pos.x, cy: pos.y, r: NODE_R + 8,
        fill: 'none', stroke: attrColor, strokeWidth: 1.5,
        strokeDasharray: '5 3', opacity: 0.45,
        style: {animation:'pulse 1.9s ease-in-out infinite'},
      }));
    }

    // Selection ring
    if (isSel) {
      nc.push(e('circle', {
        key: 'sel',
        cx: pos.x, cy: pos.y, r: NODE_R + 5,
        fill: 'none', stroke: '#e2e8f0', strokeWidth: 1.5, opacity: 0.55,
      }));
    }

    // Main circle body
    nc.push(e('circle', {
      key: 'body',
      cx: pos.x, cy: pos.y, r: NODE_R,
      fill:        isOn ? attrColor + '1a' : '#080b12',
      stroke:      isOn ? attrColor : (canOn ? attrColor + '66' : '#151e30'),
      strokeWidth: isOn ? 2 : (canOn ? 1.5 : 1),
      style: {transition:'all 0.35s ease'},
    }));

    if (isOn) {
      // Inner core dot
      nc.push(e('circle', {
        key: 'core',
        cx: pos.x, cy: pos.y, r: 9,
        fill: attrColor, opacity: 0.9,
        style: {animation:'pulse 2s ease-in-out infinite'},
      }));
      // Check glyph
      nc.push(e('text', {
        key: 'check',
        x: pos.x, y: pos.y + 5,
        textAnchor: 'middle', fontSize: '13', fill: attrColor, opacity: 0.9,
        fontFamily: "'DM Mono',monospace",
        style: {userSelect:'none'},
      }, '✓'));
    } else {
      // Cost badge (top of node)
      nc.push(e('text', {
        key: 'cost',
        x: pos.x, y: pos.y - 13,
        textAnchor: 'middle', fontSize: '9', fontWeight: '700',
        fontFamily: "'DM Mono',monospace",
        fill: canOn ? attrColor : '#2d3748',
        style: {userSelect:'none'},
      }, node.cost + 'IP'));
    }

    // Short title label
    var shortTitle = node.title.split(' ')[0].slice(0, 6).toUpperCase();
    nc.push(e('text', {
      key: 'label',
      x: pos.x,
      y: pos.y + (isOn ? 22 : 8),
      textAnchor: 'middle', fontSize: '8', fontWeight: '600',
      fontFamily: "'DM Mono',monospace",
      fill: isOn ? attrColor : (canOn ? '#475569' : '#1e2a3a'),
      style: {transition:'all 0.35s ease', userSelect:'none'},
    }, shortTitle));

    // Wrap in a <g> with click handler
    svgChildren.push(
      e.apply(null, ['g', {
        key:     node.id,
        onClick: (function(nid) { return function() { onSelect(nid); }; })(node.id),
        style:   {cursor:'pointer'},
      }].concat(nc))
    );
  });

  return e.apply(null, [
    'svg',
    {
      viewBox: '0 0 300 400',
      xmlns:   'http://www.w3.org/2000/svg',
      style:   {width:'100%', maxWidth:300, display:'block', margin:'0 auto'},
    },
  ].concat(svgChildren));
}

// ─── MAIN TAB ─────────────────────────────────────────────────────────────────
export function SkillTreeTab(props) {
  var coreState = props.state;
  var st = useSkillTree(coreState);

  var s1 = useState('Fortitude'); var activeAttr = s1[0], setActiveAttr = s1[1];
  var s2 = useState(null);        var selectedId  = s2[0], setSelectedId  = s2[1];

  var attrColor = ATTR_COLORS[activeAttr];
  var attrLevel = st.levels[activeAttr];
  var attrXP    = st.attrXP[activeAttr];
  var xpIntoLvl = attrXP % st.XP_PER_LEVEL;
  var xpPct     = Math.min(Math.round((xpIntoLvl / st.XP_PER_LEVEL) * 100), 100);

  var attrNodes = st.nodes.filter(function(n) { return n.attribute === activeAttr; });

  var selectedNode       = selectedId ? st.nodes.find(function(n) { return n.id === selectedId; }) : null;
  var canUnlockSelected  = selectedId ? st.canUnlock(selectedId) : false;

  var unlockedCount = st.nodes.filter(function(n) { return n.unlocked; }).length;

  return e('div', {style:{animation:'fadeUp 0.35s ease', paddingBottom: 16}},

    // ── Insight Points header ──────────────────────────────────────────────
    e('div', {style:{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      marginBottom:12, padding:'13px 16px',
      background:'#0a0e1a', border:'1px solid #151e30', borderRadius:14,
    }},
      e('div', null,
        e('div', {style:mn(7,'#2d3748',{marginBottom:5,letterSpacing:'0.2em'})}, 'INSIGHT POINTS'),
        e('div', {style:{display:'flex',alignItems:'baseline',gap:8}},
          e('div', {style:{fontSize:28,fontWeight:700,color:'#e2e8f0',fontFamily:"'DM Mono',monospace",lineHeight:1}},
            String(st.insightPoints)
          ),
          st.insightPoints > 0
            ? e('div', {style:mn(8,'#4a9eff',{fontWeight:600})}, 'available to spend')
            : e('div', {style:mn(8,'#1e2a3a')}, 'earn by leveling attributes')
        )
      ),
      e('div', {style:{textAlign:'right'}},
        e('div', {style:mn(7,'#2d3748',{marginBottom:5})}, 'NODES ACTIVE'),
        e('div', {style:{fontSize:18,fontWeight:700,color:'#475569',fontFamily:"'DM Mono',monospace",lineHeight:1}},
          unlockedCount + ' / ' + st.nodes.length
        )
      )
    ),

    // ── Attribute selector cards ───────────────────────────────────────────
    e('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}},
      ['Fortitude','Awareness','Release'].map(function(attr) {
        var lvl     = st.levels[attr];
        var color   = ATTR_COLORS[attr];
        var xp      = st.attrXP[attr];
        var isActive = attr === activeAttr;
        var progress = Math.min(Math.round(((xp % st.XP_PER_LEVEL) / st.XP_PER_LEVEL) * 100), 100);
        return e('div', {
          key:     attr,
          onClick: function() { setActiveAttr(attr); setSelectedId(null); },
          style: {
            background:  isActive ? color + '0e' : '#080b12',
            border:      '1px solid ' + (isActive ? color + '55' : '#0f1520'),
            borderRadius: 12,
            padding:     '10px 11px',
            cursor:      'pointer',
            transition:  'all 0.2s ease',
          },
        },
          e('div', {style:mn(7, isActive ? color : '#1e2a3a', {marginBottom:4,letterSpacing:'0.15em'})},
            attr.toUpperCase()
          ),
          e('div', {style:{fontSize:14,fontWeight:700,color: isActive ? color : '#2d3748',fontFamily:"'DM Mono',monospace",marginBottom:7,lineHeight:1}},
            'LV.' + lvl
          ),
          e('div', {style:{height:2,background:'#0f1520',borderRadius:1,overflow:'hidden'}},
            e('div', {style:{height:'100%',width:progress+'%',background:color,borderRadius:1,transition:'width 1s ease'}})
          )
        );
      })
    ),

    // ── Tree panel ────────────────────────────────────────────────────────
    e('div', {style:card},
      e('div', {style:cardH},
        e('div', null,
          e('span', {style:mn(9,'#94a3b8',{fontWeight:700})}, activeAttr.toUpperCase() + ' TREE'),
          e('div', {style:mn(8,'#2d3748',{marginTop:3})}, ATTR_DESCS[activeAttr])
        ),
        e('div', {style:{textAlign:'right'}},
          e('div', {style:mn(8, attrColor, {fontWeight:700})}, 'LV.' + attrLevel),
          e('div', {style:mn(7,'#2d3748',{marginTop:2})}, attrXP + ' XP total')
        )
      ),

      // XP progress bar
      e('div', {style:{padding:'8px 15px 2px'}},
        e('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}},
          e('span', {style:mn(7,'#2d3748')}, xpIntoLvl + ' / ' + st.XP_PER_LEVEL + ' XP to Lv.' + (attrLevel + 1)),
          e('span', {style:mn(7, attrColor, {fontWeight:600})}, xpPct + '%')
        ),
        e('div', {style:{height:3,background:'#0f1520',borderRadius:2,overflow:'hidden'}},
          e('div', {style:{
            height:'100%', width:xpPct+'%', background:attrColor,
            borderRadius:2, transition:'width 1.2s ease',
            boxShadow: xpPct > 80 ? '0 0 6px ' + ATTR_GLOWS[activeAttr] : 'none',
          }})
        )
      ),

      // SVG tree
      e('div', {style:{padding:'10px 8px 14px'}},
        e(SkillTreeSVG, {
          nodes:      attrNodes,
          onSelect:   function(id) { setSelectedId(id === selectedId ? null : id); },
          selectedId: selectedId,
          attrColor:  attrColor,
          canUnlock:  st.canUnlock,
        })
      ),

      // Legend
      e('div', {style:{
        display:'flex', gap:16, padding:'0 15px 12px',
        flexWrap:'wrap', borderTop:'1px solid #0a0d14', paddingTop:9,
      }},
        [
          {dot:'#080b12',border:'#151e30',  label:'Locked'},
          {dot:attrColor,border:attrColor+'66', label:'Available',dash:true},
          {dot:attrColor,border:attrColor,  label:'Active'},
        ].map(function(item,i) {
          return e('div', {key:i, style:{display:'flex',alignItems:'center',gap:6}},
            e('div', {style:{
              width:9, height:9, borderRadius:'50%',
              background: item.dot,
              border: '1.5px solid ' + item.border,
              flexShrink:0,
            }}),
            e('span', {style:mn(8,'#2d3748')}, item.label)
          );
        })
      )
    ),

    // ── Node detail overlay ───────────────────────────────────────────────
    selectedNode && e('div', {
      style: {
        position:    'fixed',
        bottom:      84,
        left:        '50%',
        transform:   'translateX(-50%)',
        zIndex:      500,
        width:       'calc(100% - 32px)',
        maxWidth:    628,
        background:  '#0a0e1a',
        border:      '1px solid ' + (
          selectedNode.unlocked
            ? ATTR_COLORS[selectedNode.attribute] + '55'
            : canUnlockSelected
              ? ATTR_COLORS[selectedNode.attribute] + '40'
              : '#1e3a5f'
        ),
        borderRadius: 18,
        padding:     '16px 18px 20px',
        boxShadow:   '0 12px 48px rgba(0,0,0,0.75)',
        animation:   'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
      // Header row
      e('div', {style:row({justifyContent:'space-between',marginBottom:12})},
        e('div', {style:row({gap:8})},
          e('div', {style:{
            width:7, height:7, borderRadius:'50%',
            background: ATTR_COLORS[selectedNode.attribute], flexShrink:0,
          }}),
          e('span', {style:mn(8, ATTR_COLORS[selectedNode.attribute], {fontWeight:700,letterSpacing:'0.2em'})},
            selectedNode.attribute.toUpperCase()
          ),
          selectedNode.unlocked && e('span', {style:mn(8,'#475569')}, '· ACTIVE'),
        ),
        e('button', {
          onClick: function() { setSelectedId(null); },
          style: {background:'transparent',border:'none',color:'#475569',fontSize:19,cursor:'pointer',lineHeight:1,padding:'0 2px'},
        }, '×')
      ),

      // Title + description
      e('div', {style:{
        fontSize:15, fontWeight:700, color:'#e2e8f0',
        fontFamily:"'DM Mono',monospace", marginBottom:7, lineHeight:1.3,
      }}, selectedNode.title),
      e('div', {style:{
        fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:14,
      }}, selectedNode.description),

      // Cost + dependencies row
      e('div', {style:{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}},
        e('div', {style:{
          background:'#080b12', border:'1px solid #151e30', borderRadius:8, padding:'6px 12px', flexShrink:0,
        }},
          e('div', {style:mn(7,'#2d3748',{marginBottom:3})}, 'COST'),
          e('div', {style:{
            fontSize:13, fontWeight:700,
            color: canUnlockSelected || selectedNode.unlocked ? ATTR_COLORS[selectedNode.attribute] : '#e2e8f0',
            fontFamily:"'DM Mono',monospace",
          }}, selectedNode.cost + ' IP')
        ),
        e('div', {style:{
          background:'#080b12', border:'1px solid #151e30', borderRadius:8, padding:'6px 12px', flexShrink:0,
        }},
          e('div', {style:mn(7,'#2d3748',{marginBottom:3})}, 'POINTS AVAILABLE'),
          e('div', {style:{
            fontSize:13, fontWeight:700,
            color: st.insightPoints >= selectedNode.cost ? '#22c55e' : '#ef4444',
            fontFamily:"'DM Mono',monospace",
          }}, st.insightPoints + ' IP')
        ),
        selectedNode.dependencies.length > 0 && e('div', {style:{
          background:'#080b12', border:'1px solid #151e30', borderRadius:8, padding:'6px 12px', flex:1, minWidth:130,
        }},
          e('div', {style:mn(7,'#2d3748',{marginBottom:5})}, 'REQUIRES'),
          e('div', {style:{display:'flex',gap:10,flexWrap:'wrap'}},
            selectedNode.dependencies.map(function(dep) {
              var depNode = st.nodes.find(function(n) { return n.id === dep; });
              var depOn   = depNode && depNode.unlocked;
              return e('span', {
                key: dep,
                style: mn(9, depOn ? ATTR_COLORS[selectedNode.attribute] : '#2d3748'),
              }, (depOn ? '✓ ' : '○ ') + (depNode ? depNode.title.split(' ')[0] : dep));
            })
          )
        )
      ),

      // Action button
      selectedNode.unlocked
        ? e('div', {style:{
            padding:'12px', borderRadius:10, textAlign:'center',
            background: ATTR_COLORS[selectedNode.attribute] + '0d',
            border: '1px solid ' + ATTR_COLORS[selectedNode.attribute] + '30',
            fontFamily:"'DM Mono',monospace", fontSize:10,
            color: ATTR_COLORS[selectedNode.attribute], fontWeight:700, letterSpacing:'0.18em',
          }}, '◆ NODE ACTIVE — INTEGRATED INTO PROTOCOL')

        : canUnlockSelected
          ? e('button', {
              onClick: function() { st.unlockNode(selectedNode.id); setSelectedId(null); },
              style: {
                width:'100%', padding:'13px',
                background: ATTR_COLORS[selectedNode.attribute] + '12',
                border: '1px solid ' + ATTR_COLORS[selectedNode.attribute] + '65',
                borderRadius:10, fontSize:11,
                color: ATTR_COLORS[selectedNode.attribute],
                fontFamily:"'DM Mono',monospace", fontWeight:700, letterSpacing:'0.15em', cursor:'pointer',
                transition:'all 0.15s',
              },
              onMouseEnter: function(ev) {
                ev.currentTarget.style.background = ATTR_COLORS[selectedNode.attribute] + '22';
              },
              onMouseLeave: function(ev) {
                ev.currentTarget.style.background = ATTR_COLORS[selectedNode.attribute] + '12';
              },
            }, '◆ UNLOCK NODE · ' + selectedNode.cost + ' INSIGHT POINT' + (selectedNode.cost > 1 ? 'S' : ''))

          : e('div', {style:{
              padding:'12px', background:'#080b12', border:'1px solid #0f1520',
              borderRadius:10, textAlign:'center',
              fontFamily:"'DM Mono',monospace", fontSize:10, color:'#2d3748', letterSpacing:'0.1em',
            }},
              st.insightPoints < selectedNode.cost
                ? '◇ NOT ENOUGH INSIGHT POINTS  (' + st.insightPoints + ' / ' + selectedNode.cost + ')'
                : '◇ UNLOCK DEPENDENCIES FIRST'
            )
    )
  );
}
