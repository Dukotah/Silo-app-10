/**
 * useCoreEngine.js — SILO v10 Core Engine
 * Task system, achievements, journal, XP/levels.
 */

import React from 'react';
var useState      = React.useState;
var useEffect     = React.useEffect;
var createContext = React.createContext;
var useContext    = React.useContext;

var SK  = 'silo_core_v4';  // bumped from v3 — triggers clean migration
export var XPL = 300;

// ─── STREAK MULTIPLIER ────────────────────────────────────────────────────────
// Every active streak day adds +5% to XP & Clarity generation, capped at 30 days (+150%).
export var STREAK_MULT_PER_DAY = 0.05;
export var STREAK_MULT_CAP_DAYS = 30;
export function getStreakMult(streak) {
  var days = Math.min(Math.max(streak || 0, 0), STREAK_MULT_CAP_DAYS);
  return 1 + days * STREAK_MULT_PER_DAY;
}

// ─── TIERS ────────────────────────────────────────────────────────────────────
export var TIERS = [
  { min:1,  title:'Quiescent Matrix',   desc:'Dormant. Awaiting first signal.',               color:'#475569', glow:'rgba(71,85,105,0.5)'    },
  { min:4,  title:'Resonant Core',      desc:'Oscillating. Patterns emerging from noise.',    color:'#4a9eff', glow:'rgba(74,158,255,0.55)'  },
  { min:8,  title:'Kinetic Lattice',    desc:'Expanding. Signal threads multiplying outward.',color:'#22c55e', glow:'rgba(34,197,94,0.55)'   },
  { min:13, title:'Cascade Engine',     desc:'Accelerating. The architecture self-modifies.', color:'#e879a0', glow:'rgba(232,121,160,0.55)' },
  { min:18, title:'Sovereign Nexus',    desc:'Autonomous. The system rewrites itself.',        color:'#a78bfa', glow:'rgba(167,139,250,0.6)'  },
  { min:24, title:'Monolithic Overlord',desc:'Fully sentient. The Core has become aware.',    color:'#f59e0b', glow:'rgba(245,158,11,0.65)'  },
];

export function getTier(level) {
  for (var i = TIERS.length - 1; i >= 0; i--) {
    if (level >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

// ─── TASK SYSTEM CONSTANTS ────────────────────────────────────────────────────
export var TASK_CATS = {
  body: { label:'BODY', color:'#22c55e', glow:'rgba(34,197,94,0.4)'   },
  mind: { label:'MIND', color:'#4a9eff', glow:'rgba(74,158,255,0.4)'  },
  soul: { label:'SOUL', color:'#f97316', glow:'rgba(249,115,22,0.4)'  },
};

export var TASK_DIFFS = {
  1: { label:'Standard', mult:1.0, color:'#475569' },
  2: { label:'Hard',     mult:1.5, color:'#f97316' },
  3: { label:'Elite',    mult:2.0, color:'#ef4444' },
};

export var TASK_FREQS = {
  daily:  { label:'Daily',   reset:'day'  },
  weekly: { label:'Weekly',  reset:'week' },
  once:   { label:'One-Time',reset:'never'},
};

// Default templates — shown in the "add from library" picker
export var TASK_TEMPLATES = [
  { id:'t_run',       name:'Run / Sprint',       xp:75,  cat:'body', freq:'daily',  diff:1, desc:'Physical output'      },
  { id:'t_gym',       name:'Lift / Train',        xp:100, cat:'body', freq:'daily',  diff:2, desc:'Resistance work'      },
  { id:'t_cold',      name:'Cold Exposure',       xp:60,  cat:'body', freq:'daily',  diff:2, desc:'Stress inoculation'   },
  { id:'t_sleep',     name:'Full Sleep Cycle',    xp:50,  cat:'body', freq:'daily',  diff:1, desc:'Recovery protocol'    },
  { id:'t_meditate',  name:'Meditation',          xp:55,  cat:'mind', freq:'daily',  diff:1, desc:'Signal clarity'       },
  { id:'t_journal',   name:'Deep Journal Entry',  xp:45,  cat:'mind', freq:'daily',  diff:1, desc:'Pattern processing'   },
  { id:'t_noscroll',  name:'No-Scroll Block',     xp:40,  cat:'mind', freq:'daily',  diff:2, desc:'Noise reduction'      },
  { id:'t_read',      name:'Read / Study',        xp:45,  cat:'mind', freq:'daily',  diff:1, desc:'Signal intake'        },
  { id:'t_social',    name:'Real Connection',     xp:80,  cat:'soul', freq:'weekly', diff:1, desc:'Human bandwidth'      },
  { id:'t_outside',   name:'Time in Nature',      xp:55,  cat:'soul', freq:'weekly', diff:1, desc:'Ground signal'        },
  { id:'t_creative',  name:'Creative Work',       xp:60,  cat:'soul', freq:'weekly', diff:1, desc:'Expression output'    },
  { id:'t_gratitude', name:'Gratitude Log',       xp:35,  cat:'soul', freq:'daily',  diff:1, desc:'Polarity shift'       },
];

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
export var ACHIEVEMENTS = [
  // Journal
  { id:'first_commit',  icon:'◆', color:'#4a9eff', title:'First Transmission',   desc:'Submit your first journal entry',        check:function(s){ return (s.log||[]).filter(function(l){return l.action==='commit';}).length>=1; } },
  { id:'first_burn',    icon:'◈', color:'#ef4444', title:'Signal Purged',         desc:'Burn your first entry to ash',           check:function(s){ return (s.log||[]).filter(function(l){return l.action==='burn';}).length>=1; } },
  { id:'journal_10',    icon:'◆', color:'#4a9eff', title:'Signal Archive',        desc:'Log 10 journal entries',                 check:function(s){ return (s.log||[]).length>=10; } },
  { id:'journal_50',    icon:'◆', color:'#4a9eff', title:'Transmission Matrix',   desc:'Log 50 journal entries',                 check:function(s){ return (s.log||[]).length>=50; } },
  // Streaks
  { id:'streak_3',      icon:'◉', color:'#f97316', title:'3-Day Lock',            desc:'Maintain a 3-day active streak',         check:function(s){ return (s.streak||0)>=3; } },
  { id:'streak_7',      icon:'◉', color:'#f97316', title:'One Week Signal',       desc:'Hold signal for 7 consecutive days',     check:function(s){ return (s.streak||0)>=7; } },
  { id:'streak_30',     icon:'◉', color:'#f97316', title:'30-Day Protocol',       desc:'Sustain presence for a full month',      check:function(s){ return (s.streak||0)>=30; } },
  // XP
  { id:'xp_100',        icon:'◇', color:'#22c55e', title:'Resonance Detected',    desc:'Accumulate 100 total XP',                check:function(s){ return (s.totalXP||0)>=100; } },
  { id:'xp_500',        icon:'◇', color:'#22c55e', title:'Core Awakening',        desc:'Accumulate 500 total XP',                check:function(s){ return (s.totalXP||0)>=500; } },
  { id:'xp_1000',       icon:'◇', color:'#22c55e', title:'Neural Cascade',        desc:'Accumulate 1,000 total XP',              check:function(s){ return (s.totalXP||0)>=1000; } },
  { id:'xp_5000',       icon:'◇', color:'#f59e0b', title:'Monolithic Signal',     desc:'Accumulate 5,000 total XP',              check:function(s){ return (s.totalXP||0)>=5000; } },
  // Tiers
  { id:'tier_2',        icon:'⬡', color:'#4a9eff', title:'Resonant Core Tier',    desc:'Reach Level 4',                          check:function(s){ return getLevelFromXP(s.totalXP||0)>=4; } },
  { id:'tier_3',        icon:'⬡', color:'#22c55e', title:'Kinetic Lattice Tier',  desc:'Reach Level 8',                          check:function(s){ return getLevelFromXP(s.totalXP||0)>=8; } },
  { id:'tier_4',        icon:'⬡', color:'#e879a0', title:'Cascade Engine Tier',   desc:'Reach Level 13',                         check:function(s){ return getLevelFromXP(s.totalXP||0)>=13; } },
  { id:'tier_5',        icon:'⬡', color:'#a78bfa', title:'Sovereign Nexus Tier',  desc:'Reach Level 18',                         check:function(s){ return getLevelFromXP(s.totalXP||0)>=18; } },
  // Tasks
  { id:'task_first',    icon:'▪', color:'#a78bfa', title:'Protocol Initiated',    desc:'Complete your first task',               check:function(s){ return (s.taskLog||[]).length>=1; } },
  { id:'task_10',       icon:'▪', color:'#a78bfa', title:'Protocol Active',       desc:'Complete 10 tasks total',                check:function(s){ return (s.taskLog||[]).length>=10; } },
  { id:'task_50',       icon:'▪', color:'#a78bfa', title:'System Operative',      desc:'Complete 50 tasks total',                check:function(s){ return (s.taskLog||[]).length>=50; } },
  { id:'task_100',      icon:'▪', color:'#f59e0b', title:'Infinite Loop',         desc:'Complete 100 tasks total',               check:function(s){ return (s.taskLog||[]).length>=100; } },
  { id:'trinity',       icon:'△', color:'#e879a0', title:'Trinity Protocol',      desc:'Complete tasks in all 3 categories in one day', check:function(s){
    var today = new Date().toISOString().slice(0,10);
    var cats = {};
    (s.taskLog||[]).forEach(function(tl){ if(tl.date===today) cats[tl.cat]=1; });
    return !!(cats.body && cats.mind && cats.soul);
  }},
];

// ─── CLARITY REWARD HELPERS ───────────────────────────────────────────────────
// Completing a task awards 10–25 Clarity scaled by difficulty (before streak mult).
export function clarityForTask(task) {
  var mult = (TASK_DIFFS[task.diff] || TASK_DIFFS[1]).mult; // 1.0 / 1.5 / 2.0
  return Math.round(10 + (mult - 1) * 15); // 10 / 18 / 25
}
// A journal entry awards 15–40 Clarity scaled by word count (before streak mult).
export function clarityForEntry(parseResult) {
  var wc = (parseResult && parseResult.wordCount) || 0;
  var t  = Math.min(wc, 250) / 250;
  return Math.round(15 + t * 25); // 15..40
}

// ─── UNIFIED USER STATS ───────────────────────────────────────────────────────
// Single read-only snapshot every module can render from. Clarity lives in its
// own hook, so the live total is passed in by the shell.
export function buildUserStats(coreState, clarityTotal) {
  var s = coreState || {};
  return {
    xp:                  s.totalXP || 0,
    level:               getLevelFromXP(s.totalXP || 0),
    streak:              s.streak || 0,
    streakMult:          getStreakMult(s.streak || 0),
    totalClarity:        clarityTotal || 0,
    bodyScore:           s.bodyScore || 0,
    mindScore:           s.mindScore || 0,
    soulScore:           s.soulScore || 0,
    tasksCompletedToday: Object.keys(s.completedToday || {}).length,
    journalEntriesTotal: (s.journalEntries || []).length,
    lastActiveDate:      s.lastDate || null,
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function getLevelFromXP(xp) { return Math.max(1, Math.floor((xp||0) / XPL) + 1); }
export function getLvlXP(xp)       { return (xp||0) % XPL; }
export function getXPIntoLevel(xp) { return (xp||0) % XPL; }

function todayKey() { return new Date().toISOString().slice(0,10); }
function weekKey() {
  var d   = new Date();
  var day = d.getDay();
  var mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return mon.toISOString().slice(0,10);
}

// ─── TASK STREAK HELPER (exported so UI can use it) ───────────────────────────
export function getTaskStreak(taskId, taskLog, freq) {
  var dates = (taskLog||[])
    .filter(function(l){ return l.taskId===taskId; })
    .map(function(l){ return l.date; });
  if (!dates.length) return 0;
  var unique = {};
  dates.forEach(function(d){ unique[d]=1; });
  if (freq === 'weekly') return Object.keys(unique).length; // lifetime weeks
  var streak = 0;
  var d = new Date();
  for (var i = 0; i < 90; i++) {
    var k = d.toISOString().slice(0,10);
    if (unique[k]) { streak++; }
    else if (i > 0) { break; }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ─── DEFAULT STATE ────────────────────────────────────────────────────────────
function defaults() {
  return {
    totalXP:              25,
    log:                  [],
    streak:               0,
    lastDate:             null,
    weeklyShifts:         {},
    journalEntries:       [{
      id: 1,
      date: new Date().toISOString().slice(0,10),
      time: '09:00 AM',
      text: "First transmission. I don't know exactly where I'm headed, but I know I need to build something better than what I've had. This is day one. I'm not going to overthink it — I'm just going to show up, log the signal, and see what compounds. That's the protocol.",
      mood: 'REFLECTIVE',
      tone: 'reflective',
      xp: 25,
      wordCount: 48,
      charCount: 280,
      primaryShift: 'REFLECTIVE',
      shiftLabel: 'Reflective',
      shiftColor: '#4a9eff',
      action: 'commit',
    }],
    tasks:                TASK_TEMPLATES.slice(0, 8),
    taskLog:              [],
    completedToday:       {},
    completedWeek:        {},
    completedOnce:        {},   // permanent — once-type tasks
    completedDate:        null,
    completedWeekKey:     null,
    unlockedAchievements: [],
    bodyScore:            0,
    mindScore:            0,
    soulScore:            0,
  };
}

function persist(st) { try { localStorage.setItem(SK, JSON.stringify(st)); } catch(x) {} }
function hydrate() {
  try {
    var r = localStorage.getItem(SK);
    if (!r) return defaults();
    var parsed = JSON.parse(r);
    var merged = Object.assign({}, defaults(), parsed);
    // Migrate v3 → v4: map old activityLog/loggedToday if present
    if (parsed.loggedToday && !parsed.completedToday) {
      merged.completedToday  = {};
      merged.completedDate   = parsed.loggedDate || null;
    }
    if (!merged.tasks || !merged.tasks.length) {
      merged.tasks = TASK_TEMPLATES.slice(0, 8);
    }
    // Backfill category scores from existing task history so the redesign
    // doesn't wipe a returning user's Body/Mind/Soul identity.
    if (parsed.bodyScore == null && parsed.mindScore == null && parsed.soulScore == null) {
      var seed = { body:0, mind:0, soul:0 };
      (merged.taskLog || []).forEach(function(l){ if (seed[l.cat] != null) seed[l.cat] += 5; });
      (merged.journalEntries || []).forEach(function(j){
        if (j.mood === 'CLEAR' || j.mood === 'REFLECTIVE') seed.soul += 8;
      });
      merged.bodyScore = seed.body;
      merged.mindScore = seed.mind;
      merged.soulScore = seed.soul;
    }
    return merged;
  } catch(x) { return defaults(); }
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
var Ctx = createContext(null);

export function CoreProvider(props) {
  var s1 = useState(null);   var state          = s1[0], setState          = s1[1];
  var s2 = useState(false);  var loaded         = s2[0], setLoaded         = s2[1];
  var s3 = useState(null);   var evolution      = s3[0], setEvolution      = s3[1];
  var s4 = useState(null);   var newAchievement = s4[0], setNewAchievement = s4[1];

  // Hydrate + daily/weekly resets
  useEffect(function() {
    var st    = hydrate();
    var today = todayKey();
    var wk    = weekKey();
    if (st.completedDate !== today)    { st.completedToday   = {}; st.completedDate    = today; }
    if (st.completedWeekKey !== wk)    { st.completedWeek    = {}; st.completedWeekKey = wk;    }
    if (st.lastDate !== today) {
      var yest = new Date(); yest.setDate(yest.getDate() - 1);
      var ykey = yest.toISOString().slice(0,10);
      st.streak   = st.lastDate === ykey ? (st.streak||0) + 1 : 0;
      st.lastDate = today;
    }
    setState(st);
    setLoaded(true);
  }, []);

  useEffect(function() { if (state) persist(state); }, [state]);

  // Check and award achievements against a state snapshot
  function checkAchievements(st) {
    var unlocked = st.unlockedAchievements || [];
    var newIds   = [];
    ACHIEVEMENTS.forEach(function(ach) {
      if (unlocked.indexOf(ach.id) === -1 && ach.check(st)) newIds.push(ach.id);
    });
    if (newIds.length) {
      var latest = ACHIEVEMENTS.find(function(a){ return a.id === newIds[newIds.length-1]; });
      if (latest) setTimeout(function(){ setNewAchievement(latest); }, 500);
      return unlocked.concat(newIds);
    }
    return unlocked;
  }

  // XP helper — fires evolution event on tier change, level-up event on level change
  function applyXP(prev, amt) {
    var nx       = (prev.totalXP||0) + amt;
    var oldLevel = getLevelFromXP(prev.totalXP||0);
    var newLevel = getLevelFromXP(nx);
    var old = getTier(oldLevel);
    var nw  = getTier(newLevel);
    if (nw.title !== old.title) setTimeout(function(){ setEvolution(nw); }, 250);
    if (newLevel > oldLevel) {
      setTimeout(function() {
        try { window.dispatchEvent(new CustomEvent('silo_level_up', { detail:{ level:newLevel } })); } catch(x) {}
      }, 200);
    }
    return nx;
  }

  // ── ACTIONS ────────────────────────────────────────────────────────────────

  function commitEntry(parseResult) {
    setState(function(prev) {
      if (!prev) return prev;
      var today  = todayKey();
      var weekly = Object.assign({}, prev.weeklyShifts||{});
      if (!weekly[today]) weekly[today] = { HEAVY:0, HEAT:0, CLEAR:0, REFLECTIVE:0 };
      if (parseResult.primaryShift) weekly[today][parseResult.primaryShift]++;
      // Keep 60 days of weekly data
      var cutoff = new Date(); cutoff.setDate(cutoff.getDate()-60);
      Object.keys(weekly).forEach(function(k){ if(new Date(k)<cutoff) delete weekly[k]; });
      var sMult     = getStreakMult(prev.streak||0);
      var boostedXP = Math.round((parseResult.xp||0) * sMult);
      // Sentiment → Soul score: only committed, positive/reflective entries count.
      var tone =
        parseResult.primaryShift === 'CLEAR'      ? 'positive'   :
        parseResult.primaryShift === 'REFLECTIVE' ? 'reflective' :
        parseResult.primaryShift === 'HEAVY'      ? 'heavy'      :
        parseResult.primaryShift === 'HEAT'       ? 'turbulent'  : 'neutral';
      var soulGain = (parseResult.action==='commit' && (tone==='positive' || tone==='reflective'))
        ? Math.round(8 * sMult) : 0;
      var entry = {
        id: Date.now(), date: today,
        time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
        wordCount: parseResult.wordCount, charCount: parseResult.charCount,
        primaryShift: parseResult.primaryShift, shiftLabel: parseResult.shiftLabel,
        shiftColor: parseResult.shiftColor, xp: boostedXP, action: parseResult.action,
      };
      var newLog     = [entry].concat((prev.log||[]).slice(0,99));
      var newJournal = parseResult.action==='commit'
        ? [{ id:Date.now(), date:today, time:entry.time, text:parseResult.rawText||'', mood:parseResult.primaryShift, tone:tone, xp:boostedXP }]
            .concat((prev.journalEntries||[]).slice(0,199))
        : (prev.journalEntries||[]);
      var next = Object.assign({}, prev, {
        totalXP: applyXP(prev, boostedXP),
        log: newLog, weeklyShifts: weekly, journalEntries: newJournal,
        soulScore: (prev.soulScore||0) + soulGain,
        lastDate: today, streak: Math.max(prev.streak||0, 1),
      });
      next.unlockedAchievements = checkAchievements(next);
      return next;
    });
  }

  function logTask(task, extraMult) {
    setState(function(prev) {
      if (!prev) return prev;
      var today = todayKey();
      var wk    = weekKey();
      var compKey = task.freq==='weekly' ? 'completedWeek'
                  : task.freq==='once'   ? 'completedOnce'
                  : 'completedToday';
      if ((prev[compKey]||{})[task.id]) return prev;
      var diffMult  = (TASK_DIFFS[task.diff]||TASK_DIFFS[1]).mult;
      var sMult     = getStreakMult(prev.streak||0);
      var skillMult = extraMult || 1;
      var xpAward   = Math.round(task.xp * diffMult * sMult * skillMult);
      var scoreField = (task.cat==='body'||task.cat==='mind'||task.cat==='soul') ? task.cat+'Score' : null;
      var scoreGain  = Math.round(5 * diffMult);
      var newComp = Object.assign({}, prev[compKey]||{}); newComp[task.id] = true;
      var compPatch = {}; compPatch[compKey] = newComp;
      if (task.freq==='weekly') compPatch.completedWeekKey = wk;
      else if (task.freq==='daily') compPatch.completedDate = today;
      var newTaskLog = (prev.taskLog||[]).concat([{
        id:Date.now(), taskId:task.id, taskName:task.name,
        cat:task.cat, xp:xpAward, date:today,
        time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
      }]);
      var next = Object.assign({}, prev, compPatch, {
        totalXP:  applyXP(prev, xpAward),
        taskLog:  newTaskLog.slice(-2000),
        lastDate: today, streak: Math.max(prev.streak||0, 1),
      });
      if (scoreField) next[scoreField] = (prev[scoreField]||0) + scoreGain;
      next.unlockedAchievements = checkAchievements(next);
      return next;
    });
  }

  function createTask(def) {
    setState(function(prev) {
      if (!prev) return prev;
      var task = Object.assign({ id:'custom_'+Date.now() }, def);
      return Object.assign({}, prev, { tasks: (prev.tasks||[]).concat([task]) });
    });
  }

  function deleteTask(taskId) {
    setState(function(prev) {
      if (!prev) return prev;
      return Object.assign({}, prev, { tasks:(prev.tasks||[]).filter(function(t){return t.id!==taskId;}) });
    });
  }

    function spendXP(amount) {
    setState(function(prev) { return Object.assign({}, prev, { totalXP: Math.max(0, (prev.totalXP||0) - amount) }); });
  }

  function patchLatestJournalEntry(patch) {
    setState(function(prev) {
      if (!prev || !prev.journalEntries || !prev.journalEntries.length) return prev;
      var updated = prev.journalEntries.slice();
      updated[0] = Object.assign({}, updated[0], patch);
      return Object.assign({}, prev, { journalEntries: updated });
    });
  }

  function dismissEvolution()  { setEvolution(null);      }
  function dismissAchievement(){ setNewAchievement(null); }
  function resetAll() { try { localStorage.removeItem(SK); } catch(x) {} setState(defaults()); }

  return React.createElement(Ctx.Provider, {
    value: {
      state, loaded, evolution, newAchievement,
      commitEntry, logTask, createTask, deleteTask,
      spendXP, patchLatestJournalEntry,
      dismissEvolution, dismissAchievement, resetAll,
      XPL,
    }
  }, props.children);
}

export function useCoreEngine() {
  var ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCoreEngine must be used inside CoreProvider');
  return ctx;
}
