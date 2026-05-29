/**
 * JournalTab.js — SILO v10 Enhanced Journal
 * Prompts, mood tracking, clarity check-in, AI reflection, progressive modes.
 */

import React from 'react';
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
import { getStreakMult, clarityForEntry } from './useCoreEngine.js';
import { FREE_JOURNAL_LIMIT } from './useVIP.js';
import { parse } from './coreParser.js';

var e = React.createElement;

// ─── STYLE HELPERS ────────────────────────────────────────────────────────────
function mn(sz, cl, x) { return Object.assign({ fontFamily:"'DM Mono',monospace", fontSize:sz, color:cl, letterSpacing:'0.08em' }, x||{}); }
function row(x) { return Object.assign({ display:'flex', alignItems:'center' }, x||{}); }
var card = { background:'#161b27', border:'1px solid #1d2740', borderRadius:16, overflow:'hidden', marginBottom:12 };
var cardH = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 15px', borderBottom:'1px solid #161f32', background:'#11151f' };

// ─── DAILY REFLECTION PROMPTS ─────────────────────────────────────────────────
var PROMPTS = {
  core: [
    { id:'p1', text:"What's weighing on you right now? Don't filter it.", color:'#f97316' },
    { id:'p2', text:"What would make today feel like a signal, not noise?", color:'#4a9eff' },
    { id:'p3', text:"Name one thing you're avoiding. Why?", color:'#22c55e' },
    { id:'p4', text:"What did you learn about yourself this week?", color:'#a78bfa' },
    { id:'p5', text:"Describe your current mental state like a weather report.", color:'#06b6d4' },
    { id:'p6', text:"What's one belief you're ready to let go of?", color:'#ec4899' },
    { id:'p7', text:"Who are you becoming? What evidence do you have?", color:'#f59e0b' },
  ],
  deepDive: [
    { id:'d1', text:"What pattern keeps repeating in your life? What is it trying to show you?", color:'#8b5cf6' },
    { id:'d2', text:"If you could send a message to your future self one year from now, what would it say?", color:'#4a9eff' },
    { id:'d3', text:"What are you tolerating that you shouldn't be? What would it cost to stop?", color:'#ef4444' },
  ],
  gratitude: [
    { id:'g1', text:"Name 3 things in your life you'd miss if they were gone.", color:'#22c55e' },
    { id:'g2', text:"What small moment today deserves to be remembered?", color:'#22c55e' },
  ],
  signal: [
    { id:'s1', text:"Drop everything. What's the loudest signal your mind is broadcasting right now?", color:'#06b6d4' },
    { id:'s2', text:"What are you really trying to say right now? Skip the preamble.", color:'#06b6d4' },
  ]
};

// ─── JOURNAL MODES (progressive unlocks) ─────────────────────────────────────
var JOURNAL_MODES = [
  { id:'vent',      label:'VENT CANVAS',    icon:'◈', desc:'Freeform. No structure. Just transmit.', unlockAt:0 },
  { id:'daily',     label:'DAILY SIGNAL',   icon:'◆', desc:'Guided daily reflection with mood check-in.', unlockAt:1 },
  { id:'deep',      label:'DEEP DIVE',      icon:'◉', desc:'Structured deep reflection. High XP.', unlockAt:3 },
  { id:'gratitude', label:'GRATITUDE SCAN', icon:'◇', desc:'Rewire toward signal. Gratitude as clarity.', unlockAt:5 },
  { id:'signal',    label:'SIGNAL BURST',   icon:'⬡', desc:'Raw, unfiltered transmission. Max XP.', unlockAt:7 },
];

// ─── MOOD OPTIONS ─────────────────────────────────────────────────────────────
var MOODS = [
  { id:'clear',      label:'Clear',      icon:'◆', color:'#22c55e', shift:'CLEAR'      },
  { id:'heavy',      label:'Heavy',      icon:'◈', color:'#f97316', shift:'HEAVY'      },
  { id:'heat',       label:'Turbulent',  icon:'◉', color:'#ef4444', shift:'HEAT'       },
  { id:'reflective', label:'Reflective', icon:'◎', color:'#4a9eff', shift:'REFLECTIVE' },
  { id:'drained',    label:'Drained',    icon:'◇', color:'#94a3b8', shift:null         },
  { id:'hopeful',    label:'Hopeful',    icon:'⬡', color:'#a78bfa', shift:'CLEAR'      },
];

// ─── MENTAL CLARITY LEVELS ────────────────────────────────────────────────────
var CLARITY_LEVELS = [
  { val:1, label:'Scattered', color:'#ef4444' },
  { val:2, label:'Foggy',     color:'#f97316' },
  { val:3, label:'Present',   color:'#f59e0b' },
  { val:4, label:'Focused',   color:'#22c55e' },
  { val:5, label:'Locked In', color:'#4a9eff' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getDailyPrompt(pool, seed) {
  var day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return pool[(day + (seed || 0)) % pool.length];
}

function getPromptPool(mode) {
  return PROMPTS[mode === 'deep' ? 'deepDive' : mode === 'gratitude' ? 'gratitude' : mode === 'signal' ? 'signal' : 'core'];
}

function generateReflection(text, mood) {
  var reflections = {
    CLEAR: [
      "Signal is strong. Whatever clarity you've found — hold it. What's the next intentional move?",
      "You're operating from a clear frequency. What would it look like to sustain this tomorrow?",
    ],
    HEAVY: [
      "Weight acknowledged. You don't have to carry all of this at once. What's the one thing you can set down today?",
      "The act of naming what's heavy already reduces its mass. What's the smallest move forward?",
    ],
    HEAT: [
      "High signal detected. That energy is information — what is it actually telling you about what you need?",
      "Turbulence logged. What would you say to someone you love who was feeling exactly this way?",
    ],
    REFLECTIVE: [
      "Deep scan complete. You're processing something important. What's the insight you're circling but haven't landed?",
      "Keep going — you're closer to clarity than you think. What do you already know here?",
    ],
    default: [
      "Transmission logged. Every entry is a data point on who you're becoming. What did writing this reveal?",
      "You showed up. That's the whole game. What do you need most right now?",
    ],
  };
  var pool = reflections[mood] || reflections.default;
  return pool[Math.floor(Date.now() / 60000) % pool.length];
}

// ─── TRANSMISSION LOG ─────────────────────────────────────────────────────────
function TransmissionLog(props) {
  var entries = props.entries || [];
  var s1 = useState(null); var expanded = s1[0], setExpanded = s1[1];
  var s2 = useState('all'); var filter = s2[0], setFilter = s2[1];

  var SHIFT_COLORS = { CLEAR:'#22c55e', HEAVY:'#f97316', HEAT:'#ef4444', REFLECTIVE:'#4a9eff' };
  var filtered = filter === 'all' ? entries : entries.filter(function(en) { return (en.mood||en.primaryShift||'') === filter; });
  var totalWords = entries.reduce(function(s, en) { return s + (en.wordCount || 0); }, 0);
  var totalXP = entries.reduce(function(s, en) { return s + (en.xp || 0); }, 0);
  var daysActive = Object.keys(entries.reduce(function(acc, en) { if (en.date) acc[en.date] = 1; return acc; }, {})).length;

  return e('div', { style:card },
    e('div', { style:cardH },
      e('span', { style:mn(9,'#94a3b8',{fontWeight:700}) }, '◎ TRANSMISSION LOG'),
      e('span', { style:mn(9,'#2d3748') }, entries.length + ' ENTRIES')
    ),
    entries.length > 0 && e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, borderBottom:'1px solid #0f1520', background:'#080c14' } },
      [{ l:'ENTRIES', v:entries.length, c:'#4a9eff' }, { l:'WORDS', v:totalWords.toLocaleString(), c:'#22c55e' },
       { l:'DAYS', v:daysActive, c:'#a78bfa' }, { l:'XP', v:'+'+totalXP, c:'#f59e0b' }
      ].map(function(item) {
        return e('div', { key:item.l, style:{ padding:'10px 12px', background:'#0b0f17' } },
          e('div', { style:mn(7,'#3d4d63',{marginBottom:4}) }, item.l),
          e('div', { style:{ fontSize:13, fontWeight:700, color:item.c, fontFamily:"'DM Mono',monospace" } }, String(item.v))
        );
      })
    ),
    entries.length > 0 && e('div', { style:{ padding:'8px 12px', borderBottom:'1px solid #0f1520', display:'flex', gap:5, flexWrap:'wrap' } },
      ['all','CLEAR','HEAVY','HEAT','REFLECTIVE'].map(function(f) {
        var fc = { all:'#94a3b8', CLEAR:'#22c55e', HEAVY:'#f97316', HEAT:'#ef4444', REFLECTIVE:'#4a9eff' }[f];
        return e('button', { key:f, onClick:function(){setFilter(f);}, style:{ padding:'3px 9px', background:filter===f?fc+'22':'transparent', border:'1px solid '+(filter===f?fc+'88':'#1e2a3a'), borderRadius:20, fontSize:8, color:filter===f?fc:'#3d4d63', fontFamily:"'DM Mono',monospace", letterSpacing:'0.1em', cursor:'pointer' } }, f);
      })
    ),
    filtered.length === 0
      ? e('div', { style:{ padding:'28px 18px', textAlign:'center', color:'#2d3748', fontFamily:"'DM Mono',monospace", fontSize:11 } },
          entries.length === 0 ? 'No transmissions logged yet. Begin your first entry.' : 'No entries match this filter.')
      : e('div', null, filtered.map(function(en, i) {
          var isOpen = expanded === en.id;
          var mc = SHIFT_COLORS[en.mood || en.primaryShift] || '#94a3b8';
          return e('div', { key:en.id, style:{ borderBottom:i < filtered.length-1 ? '1px solid #0a0d14' : 'none' } },
            e('div', {
              onClick:function(){ setExpanded(isOpen ? null : en.id); },
              style:{ padding:'11px 15px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' },
              onMouseEnter:function(ev){ ev.currentTarget.style.background='#0d1117'; },
              onMouseLeave:function(ev){ ev.currentTarget.style.background='transparent'; }
            },
              e('div', { style:row({ gap:10, flex:1, minWidth:0 }) },
                e('div', { style:{ width:7, height:7, borderRadius:'50%', background:mc, flexShrink:0, boxShadow:'0 0 6px '+mc+'66' } }),
                e('div', { style:{ minWidth:0, flex:1 } },
                  e('div', { style:{ fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } },
                    en.text ? en.text.slice(0,65)+(en.text.length>65?'...':'') : '[purged]'
                  ),
                  e('div', { style:{ display:'flex', gap:8, marginTop:3 } },
                    e('span', { style:mn(7,'#2d3748') }, en.date + (en.time?' '+en.time:'')),
                    e('span', { style:mn(7,'#2d3748') }, '·'),
                    e('span', { style:mn(7,'#2d3748') }, (en.wordCount||0) + 'w'),
                    en.mood && e('span', { style:mn(7,mc) }, '· ' + en.mood),
                    e('span', { style:mn(7,'#f59e0b') }, '· +' + (en.xp||0) + ' XP'),
                    en.mode && e('span', { style:mn(7,'#3d4d63') }, '· ' + en.mode.toUpperCase())
                  )
                )
              ),
              e('span', { style:{ color:'#2d3748', fontSize:12, flexShrink:0, marginLeft:8, fontFamily:"'DM Mono',monospace" } }, isOpen ? '▲' : '▼')
            ),
            isOpen && e('div', { style:{ padding:'0 16px 16px', borderTop:'1px solid #0a0d14' } },
              en.text && e('div', { style:{ marginTop:12, fontSize:13, color:'#64748b', lineHeight:1.8, whiteSpace:'pre-wrap', borderLeft:'2px solid '+mc+'44', paddingLeft:12 } }, en.text),
              en.promptText && e('div', { style:{ marginTop:10, padding:'8px 12px', background:'#0a0e1a', borderRadius:8, border:'1px solid #151e30' } },
                e('div', { style:mn(7,'#2d3748',{marginBottom:4}) }, 'PROMPT'),
                e('div', { style:{ fontSize:11, color:'#475569', fontFamily:"'DM Sans',sans-serif", fontStyle:'italic' } }, en.promptText)
              ),
              en.reflection && e('div', { style:{ marginTop:10, padding:'10px 12px', background:'rgba(74,158,255,0.06)', borderRadius:8, border:'1px solid rgba(74,158,255,0.2)' } },
                e('div', { style:mn(7,'#4a9eff',{marginBottom:6,letterSpacing:'0.15em'}) }, '◈ SILO REFLECTION'),
                e('div', { style:{ fontSize:12, color:'#4a9eff', fontFamily:"'DM Sans',sans-serif", lineHeight:1.7, opacity:0.85 } }, en.reflection)
              ),
              en.clarityLevel && e('div', { style:{ marginTop:10, display:'flex', gap:8 } },
                e('div', { style:{ padding:'4px 10px', background:'#0a0e1a', borderRadius:20, border:'1px solid #151e30' } },
                  e('span', { style:mn(8,'#475569') }, 'CLARITY: '),
                  (function() {
                    var cl = CLARITY_LEVELS.find(function(c) { return c.val === en.clarityLevel; });
                    return e('span', { style:mn(8, cl ? cl.color : '#94a3b8') }, cl ? cl.label : String(en.clarityLevel));
                  })()
                )
              )
            )
          );
        }))
  );
}

// ─── MAIN JOURNAL TAB ─────────────────────────────────────────────────────────
export function JournalTab(props) {
  var engine = props.engine, state = props.state;
  var isVIP = props.isVIP || false;
  var onNeedVIP = props.onNeedVIP || function(){};
  var onJournalCommit = props.onJournalCommit || function(){};
  var onClarityReward = props.onClarityReward || function(){};

  var entries = state.journalEntries || [];
  var streak = state.streak || 0;
  var today = new Date().toISOString().slice(0, 10);
  var todayEntries = entries.filter(function(en) { return en.date === today; });

  // Entry limit grows with streak: base 3, +1 per day returned (capped at 10)
  var entryLimit = isVIP ? Infinity : Math.min(3 + Math.floor(streak), 10);
  var atLimit = !isVIP && todayEntries.length >= entryLimit;

  // Mode unlock check
  function isModeUnlocked(mode) {
    var def = JOURNAL_MODES.find(function(m) { return m.id === mode; });
    if (!def) return false;
    return streak >= def.unlockAt;
  }

  // State
  var s1 = useState('daily');           var activeMode = s1[0], setActiveMode = s1[1];
  var s2 = useState('');                var text = s2[0], setText = s2[1];
  var s3 = useState(null);              var selectedMood = s3[0], setSelectedMood = s3[1];
  var s4 = useState(null);              var clarityLevel = s4[0], setClarityLevel = s4[1];
  var s5 = useState(false);             var burning = s5[0], setBurning = s5[1];
  var s6 = useState(null);              var warnMsg = s6[0], setWarnMsg = s6[1];
  var s7 = useState(null);              var toast = s7[0], setToast = s7[1];
  var s8 = useState(false);             var aiLoading = s8[0], setAiLoading = s8[1];
  var s9 = useState(null);              var todayPrompt = s9[0], setTodayPrompt = s9[1];
  var s10 = useState(false);            var promptDone = s10[0], setPromptDone = s10[1];

  var textareaRef = useRef(null);
  var timerRef = useRef(null);

  useEffect(function() {
    return function() { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Update today's prompt when mode or entries change
  useEffect(function() {
    var pool = getPromptPool(activeMode);
    if (!pool) { setTodayPrompt(null); setPromptDone(false); return; }
    var prompt = getDailyPrompt(pool, entries.length);
    setTodayPrompt(prompt);
    var done = entries.some(function(en) { return en.date === today && en.promptId === prompt.id; });
    setPromptDone(done);
  }, [activeMode, entries.length]);

  function showToast(data) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(data);
    timerRef.current = setTimeout(function() { setToast(null); }, 5000);
  }

  var wordCount = text.trim() ? text.trim().split(/\s+/).filter(function(w){ return w.length>0; }).length : 0;
  var hasText = text.trim().length > 0;
  var canSubmit = hasText && !burning && !atLimit;
  var activeModeData = JOURNAL_MODES.find(function(m) { return m.id === activeMode; }) || JOURNAL_MODES[0];
  var moodObj = selectedMood ? MOODS.find(function(m) { return m.id === selectedMood; }) : null;

  function doCommit() {
    if (!canSubmit) return;
    if (atLimit) { onNeedVIP(); return; }
    if (text.trim().length < 30) { setWarnMsg('Need at least 30 characters.'); setTimeout(function(){ setWarnMsg(null); }, 3000); return; }
    if (text.trim().split(/\s+/).length < 5) { setWarnMsg('Need at least 5 words.'); setTimeout(function(){ setWarnMsg(null); }, 3000); return; }
    setWarnMsg(null);

    var r = parse(text, 'commit');
    // Override mood with user selection if provided
    if (moodObj) { r.primaryShift = moodObj.shift || r.primaryShift; r.shiftLabel = moodObj.label; r.shiftColor = moodObj.color; }
    // Prompt bonus XP
    var promptBonus = (todayPrompt && !promptDone && activeMode !== 'vent') ? 25 : 0;
    r.xp = (r.xp || 0) + promptBonus;
    var clr = Math.round(clarityForEntry(r) * getStreakMult(streak));
    r.clarityAwarded = clr;
    // Store extra metadata  
    r.clarityLevel = clarityLevel;
    r.mode = activeMode;
    r.promptId = todayPrompt ? todayPrompt.id : null;
    r.promptText = todayPrompt ? todayPrompt.text : null;
    r.mood = moodObj ? moodObj.shift || r.primaryShift : r.primaryShift;

    engine.commitEntry(r);
    onJournalCommit();
    onClarityReward(clr);

    var toastData = Object.assign({}, r);
    setText(''); setSelectedMood(null); setClarityLevel(null);
    setAiLoading(true);
    showToast(Object.assign({}, toastData, { processing: true }));

    // Generate AI reflection asynchronously (local, free)
    setTimeout(function() {
      var reflection = generateReflection(text, r.mood || r.primaryShift);
      setAiLoading(false);
      showToast(Object.assign({}, toastData, { reflection: reflection, processing: false }));
      // Store reflection in the most recent entry
      // (The engine has already stored the entry without reflection;
      //  we update it via a second commitEntry-style update — handled via a side-effect)
      engine.setState && engine.setState(function(prev) {
        if (!prev || !prev.journalEntries || !prev.journalEntries.length) return prev;
        var updated = prev.journalEntries.slice();
        updated[0] = Object.assign({}, updated[0], { reflection: reflection });
        return Object.assign({}, prev, { journalEntries: updated });
      });
    }, 800);

    if (textareaRef.current) textareaRef.current.focus();
  }

  function doBurn() {
    if (!canSubmit) return;
    var r = parse(text, 'burn');
    var clr = Math.round(clarityForEntry(r) * getStreakMult(streak));
    r.clarityAwarded = clr;
    setBurning(true);
    setTimeout(function() {
      engine.commitEntry(r);
      onClarityReward(clr);
      setText(''); setSelectedMood(null); setClarityLevel(null);
      setBurning(false);
      showToast(Object.assign({}, r, { burned: true }));
      if (textareaRef.current) textareaRef.current.focus();
    }, 720);
  }

  var placeholder = todayPrompt && activeMode !== 'vent'
    ? todayPrompt.text + '\n\nBegin your transmission...'
    : 'Begin transmission. Write anything — this space is entirely private and local.\nCommit to save analytics. Burn to vaporize completely.';

  return e('div', { style:{ animation:'fadeUp 0.35s ease' } },
    e('style', null,
      "@keyframes burnOut2{0%{opacity:1;transform:scale(1);filter:blur(0)}100%{opacity:0;transform:scale(0.95);filter:blur(6px)}}" +
      "@keyframes burnGlow2{0%,100%{opacity:0}50%{opacity:1}}" +
      "@keyframes siloSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}" +
      "@keyframes siloPulse{0%,100%{opacity:0.5}50%{opacity:1}}" +
      ".silo-mode-btn:hover{background:#0d1525!important;}" +
      ".silo-mood-btn:hover{filter:brightness(1.15);}"
    ),

    // ── TOAST ──
    toast && e('div', { style:{ position:'fixed', top:20, right:20, zIndex:900, background:'#0a0e1a', border:'1px solid '+(toast.burned?'#ef444466':'#4a9eff44'), borderRadius:14, padding:'12px 16px', boxShadow:'0 0 24px '+(toast.burned?'rgba(239,68,68,0.2)':'rgba(74,158,255,0.2)'), animation:'siloSlideIn 0.3s ease', fontFamily:"'DM Mono',monospace", minWidth:220, maxWidth:320, zIndex:9999 } },
      e('div', { style:mn(10, toast.burned?'#ef4444':'#4a9eff', {fontWeight:700, marginBottom:6, letterSpacing:'0.15em'}) }, toast.burned ? '◈ BURNED & PURGED' : '◆ TRANSMISSION LOGGED'),
      !toast.burned && e('div', { style:{ fontSize:12, color:'#e2e8f0', marginBottom:4 } }, '+' + (toast.xp||0) + ' XP · +' + (toast.clarityAwarded||0) + ' CLARITY'),
      toast.processing && e('div', { style:{ fontSize:10, color:'#4a9eff', opacity:0.7, animation:'siloPulse 1.5s ease infinite', fontFamily:"'DM Sans',sans-serif" } }, '◈ SILO reflecting...'),
      toast.reflection && e('div', { style:{ marginTop:8, padding:'8px 10px', background:'rgba(74,158,255,0.06)', borderRadius:8, fontSize:12, color:'#4a9eff', lineHeight:1.6, fontFamily:"'DM Sans',sans-serif", borderLeft:'2px solid #4a9eff44' } }, toast.reflection)
    ),

    // ── MODE SELECTOR ──
    e('div', { style:card },
      e('div', { style:Object.assign({}, cardH, {borderBottom:'none', paddingBottom:8}) },
        e('span', { style:mn(9,'#94a3b8',{fontWeight:700}) }, '◎ JOURNAL MODE'),
        e('div', { style:row({gap:8}) },
          streak > 0 && e('span', { style:mn(8,'#f59e0b') }, streak + 'd STREAK'),
          e('span', { style:mn(8,'#2d3748') }, todayEntries.length + '/' + (isVIP ? '∞' : entryLimit) + ' TODAY')
        )
      ),
      e('div', { style:{ padding:'0 12px 12px', display:'flex', gap:6, flexWrap:'wrap' } },
        JOURNAL_MODES.map(function(mode) {
          var unlocked = isModeUnlocked(mode.id), active = activeMode === mode.id;
          return e('button', {
            key:mode.id, className:'silo-mode-btn',
            onClick:function(){ if (unlocked) setActiveMode(mode.id); },
            title:unlocked ? mode.desc : 'Unlock at ' + mode.unlockAt + '-day streak',
            style:{ padding:'6px 12px', background:active?'#0d1a2e':'transparent', border:'1px solid '+(active?'#4a9eff66':unlocked?'#1e2a3a':'#0f1520'), borderRadius:8, fontSize:9, color:active?'#4a9eff':unlocked?'#475569':'#2d3748', fontFamily:"'DM Mono',monospace", letterSpacing:'0.1em', cursor:unlocked?'pointer':'not-allowed', transition:'all 0.15s', opacity:unlocked?1:0.4, display:'flex', alignItems:'center', gap:5 }
          },
            e('span', null, mode.icon), e('span', null, mode.label),
            !unlocked && e('span', { style:{ fontSize:7, color:'#2d3748' } }, '(' + mode.unlockAt + 'd)')
          );
        })
      )
    ),

    // ── DAILY PROMPT ──
    todayPrompt && activeMode !== 'vent' && e('div', { style:Object.assign({}, card, { border: promptDone?'1px solid #22c55e33':'1px solid '+todayPrompt.color+'33' }) },
      e('div', { style:{ padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:12 } },
        e('span', { style:{ fontSize:20, flexShrink:0, marginTop:2 } }, '◎'),
        e('div', { style:{ flex:1 } },
          e('div', { style:mn(7, promptDone?'#22c55e':todayPrompt.color, {marginBottom:6,letterSpacing:'0.15em'}) }, promptDone ? "✓ TODAY'S PROMPT COMPLETE" : "TODAY'S " + activeModeData.label + " PROMPT"),
          e('div', { style:{ fontSize:14, color:promptDone?'#475569':'#cbd5e1', lineHeight:1.6, fontFamily:"'DM Sans',sans-serif", fontStyle:'italic' } }, todayPrompt.text),
          !promptDone && e('div', { style:mn(8,'#2d3748',{marginTop:8}) }, 'Complete for +25 BONUS XP')
        )
      )
    ),

    // ── CURRENT STATE (mood + clarity) ──
    e('div', { style:card },
      e('div', { style:cardH },
        e('span', { style:mn(9,'#94a3b8',{fontWeight:700}) }, '◈ CURRENT STATE'),
        moodObj && e('span', { style:mn(9, moodObj.color) }, moodObj.label)
      ),
      e('div', { style:{ padding:'4px 12px 12px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 } },
        MOODS.map(function(mood) {
          var active = selectedMood === mood.id;
          return e('button', { key:mood.id, className:'silo-mood-btn',
            onClick:function(){ setSelectedMood(active ? null : mood.id); },
            style:{ padding:'8px 6px', background:active?mood.color+'22':'#080c14', border:'1px solid '+(active?mood.color+'88':'#0f1520'), borderRadius:10, cursor:'pointer', transition:'all 0.15s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }
          },
            e('span', { style:{ fontSize:16, color:mood.color } }, mood.icon),
            e('span', { style:mn(8, active?mood.color:'#475569') }, mood.label)
          );
        })
      ),
      e('div', { style:{ padding:'0 12px 12px', borderTop:'1px solid #0a0d14' } },
        e('div', { style:mn(8,'#2d3748',{padding:'8px 0 8px'}) }, 'MENTAL CLARITY LEVEL'),
        e('div', { style:{ display:'flex', gap:4 } },
          CLARITY_LEVELS.map(function(cl) {
            var active = clarityLevel === cl.val;
            return e('button', { key:cl.val,
              onClick:function(){ setClarityLevel(active ? null : cl.val); },
              style:{ flex:1, padding:'6px 4px', background:active?cl.color+'22':'#080c14', border:'1px solid '+(active?cl.color+'88':'#0f1520'), borderRadius:8, cursor:'pointer', transition:'all 0.15s', fontSize:8, fontFamily:"'DM Mono',monospace", color:active?cl.color:'#2d3748', letterSpacing:'0.05em' }
            },
              e('div', { style:{ fontWeight:700, fontSize:12, marginBottom:2, color:active?cl.color:'#3d4d63' } }, cl.val),
              cl.label
            );
          })
        )
      )
    ),

    // ── VENT CANVAS ──
    e('div', { style:card },
      e('div', { style:cardH },
        e('span', { style:mn(9,'#94a3b8',{fontWeight:700}) }, activeModeData.label),
        e('div', { style:row({gap:8}) },
          e('span', { style:mn(9,'#3d4d63',{opacity:hasText?1:0,transition:'opacity 0.2s'}) }, wordCount + ' WORDS'),
          !isVIP && e('span', { style:mn(8, atLimit?'#8b5cf6':'#3d4d63') }, todayEntries.length + '/' + entryLimit)
        )
      ),
      atLimit && e('div', { style:{ padding:'10px 14px', background:'#1a0d22', borderBottom:'1px solid #8b5cf633', display:'flex', alignItems:'center', justifyContent:'space-between' } },
        e('div', null,
          e('div', { style:mn(9,'#8b5cf6',{fontWeight:700,letterSpacing:'0.12em',marginBottom:2}) }, '◈ DAILY LIMIT REACHED'),
          e('div', { style:mn(8,'#556070') }, streak > 0 ? 'Come back tomorrow — limit grows with streak (' + streak + 'd = ' + entryLimit + '/day)' : 'Return tomorrow to write again. Your limit grows each day.')
        ),
        !isVIP && e('button', { onClick:onNeedVIP, style:{ padding:'7px 13px', background:'#8b5cf622', border:'1px solid #8b5cf666', borderRadius:8, fontSize:9, color:'#8b5cf6', fontFamily:"'DM Mono',monospace", fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' } }, 'UPGRADE')
      ),
      e('div', { style:{ position:'relative', animation:burning?'burnOut2 0.72s ease-out forwards':'none' } },
        e('div', { style:{ position:'absolute', inset:0, zIndex:2, background:'linear-gradient(135deg,rgba(239,68,68,0.18),rgba(249,115,22,0.12))', pointerEvents:'none', opacity:burning?1:0, animation:burning?'burnGlow2 0.72s ease-out forwards':'none' } }),
        e('textarea', {
          ref:textareaRef, value:text, disabled:atLimit,
          onChange:function(ev){ setText(ev.target.value); },
          onKeyDown:function(ev){ if ((ev.ctrlKey||ev.metaKey) && ev.key==='Enter') { ev.preventDefault(); doCommit(); } },
          placeholder:placeholder,
          style:{ position:'relative', zIndex:1, width:'100%', minHeight:180, padding:'16px 18px', background:'transparent', border:'none', resize:'none', outline:'none', fontSize:14, color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", lineHeight:1.8, boxSizing:'border-box', caretColor:'#4a9eff', borderLeft:'2px solid transparent' }
        })
      ),
      warnMsg && e('div', { style:{ margin:'0 16px 8px', padding:'8px 12px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, fontSize:10, color:'#ef4444', fontFamily:"'DM Mono',monospace", letterSpacing:'0.06em', lineHeight:1.4 } }, '⚠ ' + warnMsg),
      e('div', { style:{ padding:'6px 18px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' } },
        e('span', { style:mn(8,'#1e2a3a') }, text.length + ' CHARS · CTRL+ENTER TO COMMIT'),
        aiLoading && e('span', { style:mn(8,'#4a9eff',{animation:'siloPulse 1.5s ease infinite'}) }, '◈ REFLECTING...')
      ),
      e('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, borderTop:'1px solid #0f1520' } },
        e('button', { onClick:doCommit, disabled:!canSubmit, style:{ padding:'14px 16px', background:canSubmit?'#0a1628':'#11151f', borderRight:'1px solid #161f32', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:3, transition:'all 0.15s', cursor:canSubmit?'pointer':'default', minHeight:52, border:'none', borderRight:'1px solid #161f32' } },
          e('span', { style:mn(10, canSubmit?'#4a9eff':'#1a2535', {fontWeight:700,letterSpacing:'0.15em'}) }, todayPrompt&&!promptDone ? '◆ COMMIT + DAILY' : '◆ COMMIT'),
          e('span', { style:mn(8,'#2a3750',{letterSpacing:'0.08em'}) }, todayPrompt&&!promptDone ? 'SAVE + BONUS XP · REFLECTION' : 'SAVE ANALYTICS · GRANT XP · REFLECTION')
        ),
        e('button', { onClick:doBurn, disabled:!canSubmit, style:{ padding:'14px 16px', background:canSubmit?'#150806':'#080b12', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:3, transition:'all 0.15s', cursor:canSubmit?'pointer':'default', minHeight:52, border:'none' } },
          e('span', { style:mn(10, canSubmit?'#ef4444':'#1a2535', {fontWeight:700,letterSpacing:'0.15em'}) }, '◈ BURN & PURGE'),
          e('span', { style:mn(8,'#1e2a3a',{letterSpacing:'0.08em'}) }, 'VAPORIZE · GRANT XP')
        )
      )
    ),

    // ── TRANSMISSION LOG ──
    e(TransmissionLog, { entries:entries })
  );
}
