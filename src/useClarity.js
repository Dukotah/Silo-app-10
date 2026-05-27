/**
 * useClarity.js — Clarity Clicker Idle Engine Hook
 *
 * Currency: "Clarity" — earned by tapping or passive generators.
 * Persisted to localStorage key 'silo_clarity_v1'.
 * Offline progression calculated on mount via timestamp delta (max 4h credit).
 *
 * Real-world connections:
 *   streak       → manual tap power (streak × 1, min 1 Clarity per tap)
 *   journal today → 2× passive multiplier for 24 hours (journalBoostEnd timestamp)
 *   milestoneStreak → locks generator purchase until streak threshold met
 */

import React from 'react';
var useState  = React.useState;
var useEffect = React.useEffect;
var useRef    = React.useRef;

var CL_KEY      = 'silo_clarity_v1';
var OFFLINE_CAP = 14400; // 4-hour cap on offline credit (in seconds)

// ─── GENERATOR CATALOGUE ──────────────────────────────────────────────────────
export var GENERATORS = [
  {
    id: 'focus',
    name: 'Focus Drone',
    desc: 'A quiet anchor. Generates minimal baseline clarity.',
    icon: '◇',
    rate: 0.1,
    baseCost: 10,
    costMult: 1.15,
    maxCount: 50,
    milestoneStreak: 0,
    vip: false,
    color: '#4a9eff',
  },
  {
    id: 'signal',
    name: 'Signal Node',
    desc: 'Amplifies passive clarity. Requires a 3-day streak.',
    icon: '◆',
    rate: 0.5,
    baseCost: 50,
    costMult: 1.15,
    maxCount: 30,
    milestoneStreak: 3,
    vip: false,
    color: '#22c55e',
  },
  {
    id: 'resonance',
    name: 'Resonance Core',
    desc: 'Deep attunement. Requires one full week of presence.',
    icon: '◉',
    rate: 2.0,
    baseCost: 200,
    costMult: 1.18,
    maxCount: 20,
    milestoneStreak: 7,
    vip: false,
    color: '#8b5cf6',
  },
  {
    id: 'cascade',
    name: 'Cascade Matrix',
    desc: 'Self-amplifying thought cycles. Requires a 14-day streak.',
    icon: '⬡',
    rate: 8.0,
    baseCost: 800,
    costMult: 1.20,
    maxCount: 10,
    milestoneStreak: 14,
    vip: false,
    color: '#f59e0b',
  },
  {
    id: 'sovereign',
    name: 'Sovereign Engine',
    desc: 'VIP Exclusive. Autonomous high-yield clarity synthesis.',
    icon: '◈',
    rate: 25.0,
    baseCost: 2500,
    costMult: 1.25,
    maxCount: 5,
    milestoneStreak: 30,
    vip: true,
    color: '#e879a0',
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function calcPassiveRate(counts, boosted) {
  var rate = GENERATORS.reduce(function(sum, gen) {
    return sum + gen.rate * ((counts && counts[gen.id]) || 0);
  }, 0);
  return boosted ? rate * 2 : rate;
}

export function genCost(gen, owned) {
  return Math.ceil(gen.baseCost * Math.pow(gen.costMult, owned || 0));
}

export function fmtClarity(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
function defaultState() {
  return {
    clarity: 0,
    totalEarned: 0,
    counts: { focus:0, signal:0, resonance:0, cascade:0, sovereign:0 },
    journalBoostEnd: 0,
    lastSaved: Date.now(),
    offlineEarned: 0,
    offlineSeconds: 0,
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(CL_KEY);
    if (!raw) return defaultState();
    return Object.assign({}, defaultState(), JSON.parse(raw));
  } catch(x) { return defaultState(); }
}

function saveState(st) {
  try {
    localStorage.setItem(CL_KEY, JSON.stringify(
      Object.assign({}, st, { lastSaved: Date.now(), offlineEarned: 0, offlineSeconds: 0 })
    ));
  } catch(x) {}
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useClarity(coreState, isVIP) {
  var streak = (coreState && coreState.streak) || 0;

  // Init state — apply offline progression immediately
  var s1 = useState(function() {
    var st = loadState();
    var now = Date.now();
    var elapsed = Math.min((now - (st.lastSaved || now)) / 1000, OFFLINE_CAP);
    if (elapsed > 5) {
      var boosted = now < (st.journalBoostEnd || 0);
      var rate    = calcPassiveRate(st.counts, boosted);
      var earned  = rate * elapsed;
      st.clarity      = (st.clarity || 0) + earned;
      st.totalEarned  = (st.totalEarned || 0) + earned;
      st.offlineEarned  = earned;
      st.offlineSeconds = Math.floor(elapsed);
    } else {
      st.offlineEarned  = 0;
      st.offlineSeconds = 0;
    }
    return st;
  });
  var clState = s1[0], setClState = s1[1];

  // Persist on change (debounce to every 5 ticks via interval — saves battery)
  var saveRef = useRef(null);
  useEffect(function() {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(function() { saveState(clState); }, 2000);
    return function() { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [clState]);

  // 1-second passive tick
  useEffect(function() {
    var tick = setInterval(function() {
      setClState(function(prev) {
        var boosted = Date.now() < (prev.journalBoostEnd || 0);
        var rate    = calcPassiveRate(prev.counts, boosted);
        if (rate === 0) return prev;
        return Object.assign({}, prev, {
          clarity:     prev.clarity + rate,
          totalEarned: prev.totalEarned + rate,
        });
      });
    }, 1000);
    return function() { clearInterval(tick); };
  }, []);

  // Derived values
  var boosted     = Date.now() < (clState.journalBoostEnd || 0);
  var passiveRate = calcPassiveRate(clState.counts, boosted);
  var tapPower    = Math.max(1, streak);

  // ── ACTIONS ─────────────────────────────────────────────────────────────────
  function tap() {
    var earned = tapPower;
    setClState(function(prev) {
      return Object.assign({}, prev, {
        clarity:     prev.clarity + earned,
        totalEarned: prev.totalEarned + earned,
      });
    });
  }

  function buyGenerator(genId) {
    var gen = GENERATORS.find(function(g) { return g.id === genId; });
    if (!gen) return false;
    var owned = clState.counts[genId] || 0;
    if (owned >= gen.maxCount)           return false;
    if (gen.vip && !isVIP)               return false;
    if (streak < gen.milestoneStreak)    return false;
    var cost = genCost(gen, owned);
    if (clState.clarity < cost)          return false;
    setClState(function(prev) {
      var newCounts = Object.assign({}, prev.counts);
      newCounts[genId] = (prev.counts[genId] || 0) + 1;
      return Object.assign({}, prev, {
        clarity: prev.clarity - cost,
        counts:  newCounts,
      });
    });
    return true;
  }

  function activateJournalBoost() {
    setClState(function(prev) {
      return Object.assign({}, prev, {
        journalBoostEnd: Date.now() + 24 * 60 * 60 * 1000,
      });
    });
  }

  function dismissOffline() {
    setClState(function(prev) {
      return Object.assign({}, prev, { offlineEarned: 0, offlineSeconds: 0 });
    });
  }

  function resetClarity() {
    var fresh = defaultState();
    setClState(fresh);
    saveState(fresh);
  }

  return {
    clarity:             clState.clarity,
    totalEarned:         clState.totalEarned,
    counts:              clState.counts,
    passiveRate:         passiveRate,
    tapPower:            tapPower,
    boosted:             boosted,
    journalBoostEnd:     clState.journalBoostEnd,
    offlineEarned:       clState.offlineEarned || 0,
    offlineSeconds:      clState.offlineSeconds || 0,
    tap:                 tap,
    buyGenerator:        buyGenerator,
    activateJournalBoost: activateJournalBoost,
    dismissOffline:      dismissOffline,
    resetClarity:        resetClarity,
  };
}
