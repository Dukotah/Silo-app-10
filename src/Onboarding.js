/**
 * Onboarding.js - SILO v10
 * First-launch onboarding modal. 3 slides, swipeable with Next/Skip.
 */

import React from 'react';
var useState = React.useState;
var e = React.createElement;

var STORAGE_KEY = 'silo_onboarded_v1';

export function hasOnboarded() {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch(x) { return false; }
}

function markOnboarded() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch(x) {}
}

var SLIDES = [
  {
    glyph: '◆',
    title: 'SILO is your personal growth system.',
    body: "Check in daily. Build streaks. Write privately. Watch yourself level up over time. Everything stays on your device — always private, always yours.",
    rows: null,
  },
  {
    glyph: null,
    title: null,
    body: null,
    rows: [
      { icon: '◎', label: 'JOURNAL',  desc: 'Write daily entries. Save to track patterns, or release them to clear your head. Every entry earns XP.' },
      { icon: '▪', label: 'TASKS',    desc: 'Build habits and routines. Complete tasks to earn XP and grow your streak.' },
      { icon: '◈', label: 'CLARITY',  desc: 'A gentle idle game that runs in the background. Tap to build, watch it grow.' },
    ],
    footer: 'Your daily mood check-in shapes how much XP you earn — even low days count.',
  },
  {
    glyph: null,
    title: 'Everything compounds.',
    body: "Streaks multiply your XP. Past entries surface when you need them. You level up the more you show up. Even one minute a day adds up.",
    rows: null,
    cta: true,
  },
];

export function Onboarding(props) {
  var onComplete = props.onComplete;
  var stateArr = useState(0);
  var slide = stateArr[0];
  var setSlide = stateArr[1];

  function finish() {
    markOnboarded();
    if (onComplete) onComplete();
  }

  function next() {
    if (slide < 2) setSlide(slide + 1);
    else finish();
  }

  var data = SLIDES[slide];

  var overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 1100,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(12px)',
  };

  var cardStyle = {
    maxWidth: 400,
    width: '100%',
    margin: '0 16px',
    background: 'rgba(8,12,20,0.99)',
    border: '1px solid #1d2740',
    borderRadius: 18,
    padding: '36px 26px 28px',
    animation: 'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    position: 'relative',
    fontFamily: '"DM Mono",monospace',
  };

  // Slide 0 content
  var slide0 = e('div', { style: { textAlign: 'center' } },
    e('div', { style: { fontSize: 48, color: '#4a9eff', marginBottom: 20, lineHeight: 1 } }, '◆'),
    e('div', { style: { fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 14, lineHeight: 1.3 } }, data.title),
    e('div', { style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.7 } }, data.body)
  );

  // Slide 1 content
  var slide1 = e('div', {},
    e('div', { style: { fontSize: 10, color: '#4a9eff', letterSpacing: '0.25em', marginBottom: 20, textAlign: 'center' } }, 'HOW IT WORKS'),
    e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 } },
      (data.rows || []).map(function(row) {
        return e('div', { key: row.label, style: { display: 'flex', alignItems: 'flex-start', gap: 14, background: 'rgba(74,158,255,0.05)', borderRadius: 10, padding: '12px 14px' } },
          e('div', { style: { fontSize: 18, color: '#4a9eff', lineHeight: 1, marginTop: 1, flexShrink: 0 } }, row.icon),
          e('div', {},
            e('div', { style: { fontSize: 11, fontWeight: 700, color: '#4a9eff', letterSpacing: '0.15em', marginBottom: 3 } }, row.label),
            e('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6 } }, row.desc)
          )
        );
      })
    ),
    e('div', { style: { fontSize: 11, color: '#64748b', lineHeight: 1.6, textAlign: 'center', borderTop: '1px solid #1d2740', paddingTop: 14 } }, data.footer)
  );

  // Slide 2 content
  var slide2 = e('div', { style: { textAlign: 'center' } },
    e('div', { style: { fontSize: 10, color: '#4a9eff', letterSpacing: '0.25em', marginBottom: 16 } }, 'YOUR SYSTEM'),
    e('div', { style: { fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 14, lineHeight: 1.3 } }, data.title),
    e('div', { style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.7 } }, data.body)
  );

  var slideContent = slide === 0 ? slide0 : slide === 1 ? slide1 : slide2;

  // Dots
  var dots = e('div', { style: { display: 'flex', gap: 7, justifyContent: 'center', marginTop: 24, marginBottom: 20 } },
    [0, 1, 2].map(function(i) {
      return e('div', {
        key: i,
        style: {
          width: i === slide ? 18 : 7,
          height: 7,
          borderRadius: 4,
          background: i === slide ? '#4a9eff' : '#1d2740',
          transition: 'all 0.3s',
        }
      });
    })
  );

  // Buttons
  var skipBtn = (slide < 2)
    ? e('button', {
        onClick: finish,
        style: { position: 'absolute', top: 18, right: 22, background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: '#475569', letterSpacing: '0.15em', fontFamily: '"DM Mono",monospace', padding: '4px 6px' }
      }, 'SKIP')
    : null;

  var actionBtn = slide === 2
    ? e('button', {
        onClick: finish,
        style: { width: '100%', padding: '14px 0', background: '#4a9eff', border: 'none', borderRadius: 10, color: '#0d1117', fontWeight: 700, fontSize: 13, fontFamily: '"DM Mono",monospace', letterSpacing: '0.15em', cursor: 'pointer' }
      }, "◆ Let's Go")
    : e('button', {
        onClick: next,
        style: { width: '100%', padding: '13px 0', background: 'rgba(74,158,255,0.1)', border: '1px solid #4a9eff44', borderRadius: 10, color: '#4a9eff', fontWeight: 700, fontSize: 12, fontFamily: '"DM Mono",monospace', letterSpacing: '0.15em', cursor: 'pointer' }
      }, 'NEXT →');

  return e('div', { style: overlayStyle },
    e('div', { onClick: function(ev) { ev.stopPropagation(); }, style: cardStyle },
      skipBtn,
      slideContent,
      dots,
      actionBtn
    )
  );
}
