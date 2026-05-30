/**
 * SignalWeather.js — SILO v10 30-Day Signal Terrain Visualization
 */

import React from 'react';
var e        = React.createElement;
var useState = React.useState;

var STATE_COLORS = { flat:'#475569', flickering:'#f97316', steady:'#4a9eff', strong:'#22c55e' };

function mn(sz, cl, x) { return Object.assign({ fontFamily:"'DM Mono',monospace", fontSize:sz, color:cl, letterSpacing:'0.08em' }, x||{}); }

export function SignalWeather(props) {
  var grid = props.grid || [];
  var s1 = useState(null); var hovered = s1[0], setHovered = s1[1];

  if (!grid.length) return null;

  return e('div', { style:{ marginBottom:14 } },
    e('div', { style:mn(8,'#2d3748',{marginBottom:8,letterSpacing:'0.12em'}) }, '30-DAY SIGNAL TERRAIN'),
    e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:3 } },
      grid.map(function(day) {
        var col = day.state ? STATE_COLORS[day.state] : '#1a2230';
        var isToday = day.isToday;
        return e('div', {
          key: day.date,
          onMouseEnter: function() { setHovered(day); },
          onMouseLeave: function() { setHovered(null); },
          style: {
            position: 'relative',
            height: 26,
            background: day.state ? col + '22' : '#0a0d14',
            border: '1px solid ' + (isToday ? col : col + '55'),
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'default',
            boxShadow: isToday ? '0 0 6px ' + col + '66' : 'none',
          }
        },
          day.state && e('div', { style:{ width:5, height:5, borderRadius:'50%', background:col, opacity:0.9 } }),
          day.hasJournal && e('div', { style:{ position:'absolute', top:2, right:2, width:3, height:3, borderRadius:'50%', background:'#a78bfa' } }),
          day.taskCount > 0 && e('div', { style:{ position:'absolute', bottom:2, right:2, width:3, height:3, borderRadius:'50%', background:'#22c55e66' } }),
          isToday && e('div', { style:{ position:'absolute', bottom:1, left:'50%', transform:'translateX(-50%)', width:3, height:3, borderRadius:'50%', background:'#e2e8f0', opacity:0.7 } })
        );
      })
    ),
    hovered && e('div', { style:{ marginTop:5, padding:'5px 9px', background:'#0a0e1a', border:'1px solid #1d2740', borderRadius:7 } },
      e('span', { style:mn(8,'#94a3b8') }, hovered.date),
      e('span', { style:mn(8,'#3d4d63') }, ' · '),
      e('span', { style:mn(8, hovered.state ? STATE_COLORS[hovered.state] : '#475569') }, hovered.state || 'no check-in'),
      hovered.hasJournal ? e('span', { style:mn(8,'#a78bfa') }, ' · ' + hovered.journalCount + 'j') : null,
      hovered.taskCount > 0 ? e('span', { style:mn(8,'#22c55e') }, ' · ' + hovered.taskCount + 't') : null
    ),
    e('div', { style:{ display:'flex', gap:10, marginTop:5 } },
      [['flat','#475569'],['flickering','#f97316'],['steady','#4a9eff'],['strong','#22c55e']].map(function(pair) {
        return e('div', { key:pair[0], style:{ display:'flex', alignItems:'center', gap:3 } },
          e('div', { style:{ width:5, height:5, borderRadius:'50%', background:pair[1] } }),
          e('span', { style:mn(7,'#3d4d63') }, pair[0])
        );
      })
    )
  );
}
