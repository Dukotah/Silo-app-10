/**
 * useClarity.js — Clarity Clicker Idle Engine Hook
 *
 * Currency: "Clarity" — earned by tapping or passive generators.
 * Persisted to localStorage key 'silo_clarity_v1'.
 * Offline progression calculated on mount via timestamp delta (max 4h credit).
 *
 * Real-world connections:
 *   streak       -> manual tap power (streak x 1, min 1 Clarity per tap)
 *   journal today -> 2x passive multiplier for 24 hours (journalBoostEnd timestamp)
 *   milestoneStreak -> locks generator purchase until streak threshold met
 */

import React from 'react';
var useState  = React.useState;
var useEffect = React.useEffect;
var useRef    = React.useRef;

var CL_KEY      = 'silo_clarity_v1';
var OFFLINE_CAP = 14400; // 4-hour cap on offline credit (in seconds)

// --- GENERATOR CATALOGUE -----------------------------------------------------
export var GENERATORS = [
  { id:'focus',    name:'Focus Drone',      desc:'A quiet anchor. Generates minimal baseline clarity.', icon:'◇', rate:0.1,  baseCost:10,   costMult:1.15, maxCount:50, milestoneStreak:0,  vip:false, color:'#4a9eff' },
  { id:'signal',   name:'Signal Node',      desc:'Amplifies passive clarity. Requires a 3-day streak.', icon:'◆', rate:0.5,  baseCost:50,   costMult:1.15, maxCount:30, milestoneStreak:3,  vip:false, color:'#22c55e' },
  { id:'resonance',name:'Resonance Core',   desc:'Deep attunement. Requires one full week of presence.',icon:'◉', rate:2.0,  baseCost:200,  costMult:1.18, maxCount:20, milestoneStreak:7,  vip:false, color:'#8b5cf6' },
  { id:'cascade',  name:'Cascade Matrix',   desc:'Self-amplifying thought cycles. Requires a 14-day streak.', icon:'⬡', rate:8.0, baseCost:800, costMult:1.20, maxCount:10, milestoneStreak:14, vip:false, color:'#f59e0b' },
  { id:'sovereign',name:'Sovereign Engine', desc:'VIP Exclusive. Autonomous high-yield clarity synthesis.', icon:'◈', rate:25.0,baseCost:2500, costMult:1.25, maxCount:5,  milestoneStreak:30, vip:true,  color:'#e879a0' },
];

// --- TAP UPGRADES ------------------------------------------------------------
// Permanent flat bonuses to tap power. Purchased in order (level N before N+1).
export var TAP_UPGRADES = [
  { level:1, cost:25,   tapBonus:1,  name:'Focus Spike',     icon:'▸', desc:'+1 Clarity per tap' },
  { level:2, cost:100,  tapBonus:3,  name:'Signal Burst',    icon:'▸▸',desc:'+3 Clarity per tap' },
  { level:3, cost:450,  tapBonus:10, name:'Resonance Surge', icon:'▶', desc:'+10 Clarity per tap' },
  { level:4, cost:2000, tapBonus:25, name:'Cascade Pulse',   icon:'▶▶',desc:'+25 Clarity per tap' },
  { level:5, cost:9000, tapBonus:60, name:'Apex Strike',     icon:'◆', desc:'+60 Clarity per tap' },
];

// --- SHOP ITEMS --------------------------------------------------------------
// Stackable permanent passive rate multipliers. No streak requirement.
export var SHOP_ITEMS = [
  { id:'condenser', name:'Mind Condenser',   icon:'◇', cost:20,   maxCount:10, passiveBonus:0.05, color:'#4a9eff', desc:'All generators +5% rate. Stackable up to 10x.' },
  { id:'amplifier', name:'Signal Amplifier', icon:'◉', cost:200,  maxCount:5,  passiveBonus:0.20, color:'#22c55e', desc:'All generators +20% rate. Stackable up to 5x.' },
  { id:'prism',     name:'Clarity Prism',    icon:'◈', cost:850,  maxCount:3,  passiveBonus:0.50, color:'#8b5cf6', desc:'All generators +50% rate. Stackable up to 3x.' },
  { id:'nexus',     name:'Resonance Nexus',  icon:'⬡', cost:5000, maxCount:1,  passiveBonus:1.00, color:'#f59e0b', desc:'Permanently doubles all passive generation.' },
];

// --- HELPERS -----------------------------------------------------------------
export function calcPassiveRate(counts, boosted, shopMult) {
  var rate = GENERATORS.reduce(function(sum, gen) {
    return sum + gen.rate * ((counts && counts[gen.id]) || 0);
  }, 0);
  rate = rate * (shopMult || 1);
  return boosted ? rate * 2 : rate;
}

export function calcShopMult(shopCounts) {
  return 1 + SHOP_ITEMS.reduce(function(sum, item) {
    return sum + item.passiveBonus * ((shopCounts && shopCounts[item.id]) || 0);
  }, 0);
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

// --- PERSISTENCE -------------------------------------------------------------
function defaultState() {
  return {
    clarity: 0,
    totalEarned: 0,
    counts: { focus:0, signal:0, resonance:0, cascade:0, sovereign:0 },
    tapLevel: 0,
    shopCounts: { condenser:0, amplifier:0, prism:0, nexus:0 },
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

// --- HOOK --------------------------------------------------------------------
export function useClarity(coreState, isVIP) {
  var streak = (coreState && coreState.streak) || 0;

  // Init state — apply offline progression immediately
  var s1 = useState(function() {
    var st = loadState();
    var now = Date.now();
    var elapsed = Math.min((now - (st.lastSaved || now)) / 1000, OFFLINE_CAP);
    if (elapsed > 5) {
      var boosted = now < (st.journalBoostEnd || 0);
      var sMult   = calcShopMult(st.shopCounts);
      var rate    = calcPassiveRate(st.counts, boosted, sMult);
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

  // Persist on change (debounced 2s)
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
        var sMult   = calcShopMult(prev.shopCounts);
        var rate    = calcPassiveRate(prev.counts, boosted, sMult);
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
  var boosted       = Date.now() < (clState.journalBoostEnd || 0);
  var shopMult      = calcShopMult(clState.shopCounts);
  var passiveRate   = calcPassiveRate(clState.counts, boosted, shopMult);
  var tapBonusTotal = TAP_UPGRADES.slice(0, clState.tapLevel || 0).reduce(function(s,u){return s+u.tapBonus;},0);
  var tapPower      = Math.max(1, streak) + tapBonusTotal;

  // -- ACTIONS ----------------------------------------------------------------
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
    if (owned >= gen.maxCount)        return false;
    if (gen.vip && !isVIP)            return false;
    if (streak < gen.milestoneStreak) return false;
    var cost = genCost(gen, owned);
    if (clState.clarity < cost)       return false;
    setClState(function(prev) {
      var newCounts = Object.assign({}, prev.counts);
      newCounts[genId] = (prev.counts[genId] || 0) + 1;
      return Object.assign({}, prev, { clarity: prev.clarity - cost, counts: newCounts });
    });
    return true;
  }

  function upgradeTap() {
    var nextLevel = (clState.tapLevel || 0) + 1;
    var upg = TAP_UPGRADES[nextLevel - 1];
    if (!upg) return false;
    if (clState.clarity < upg.cost) return false;
    setClState(function(prev) {
      return Object.assign({}, prev, { clarity: prev.clarity - upg.cost, tapLevel: nextLevel });
    });
    return true;
  }

  function buyShopItem(itemId) {
    var item = SHOP_ITEMS.find(function(i){ return i.id === itemId; });
    if (!item) return false;
    var owned = (clState.shopCounts && clState.shopCounts[itemId]) || 0;
    if (owned >= item.maxCount)     return false;
    if (clState.clarity < item.cost) return false;
    setClState(function(prev) {
      var newShop = Object.assign({}, prev.shopCounts);
      newShop[itemId] = (newShop[itemId] || 0) + 1;
      return Object.assign({}, prev, { clarity: prev.clarity - item.cost, shopCounts: newShop });
    });
    return true;
  }

  function activateJournalBoost() {
    setClState(function(prev) {
      return Object.assign({}, prev, { journalBoostEnd: Date.now() + 24 * 60 * 60 * 1000 });
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
    clarity:              clState.clarity,
    totalEarned:          clState.totalEarned,
    counts:               clState.counts,
    tapLevel:             clState.tapLevel || 0,
    shopCounts:           clState.shopCounts || {},
    passiveRate:          passiveRate,
    tapPower:             tapPower,
    tapBonusTotal:        tapBonusTotal,
    shopMult:             shopMult,
    boosted:              boosted,
    journalBoostEnd:      clState.journalBoostEnd,
    offlineEarned:        clState.offlineEarned || 0,
    offlineSeconds:       clState.offlineSeconds || 0,
    tap:                  tap,
    buyGenerator:         buyGenerator,
    upgradeTap:           upgradeTap,
    buyShopItem:          buyShopItem,
    activateJournalBoost: activateJournalBoost,
    dismissOffline:       dismissOffline,
    resetClarity:         resetClarity,
  };
}
