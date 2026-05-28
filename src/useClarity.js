/**
 * useClarity.js â Clarity Clicker Idle Engine Hook (v4 â prestige system)
 *
 * New in v4:
 *   - Echo currency persists across resets (silo_echo_v1)
 *   - prestige(): resets run, earns Echoes, carries tap if perked
 *   - ECHO_PERKS: 5 permanent upgrades (amplifier, tapMem, seed, resonance, orbEvol)
 *   - calcPrestigeEchoes / calcPrestigeThreshold / calcEchoMult exports
 *   - calcPassiveRate now accepts optional echoMult 4th param
 *   - activateJournalBoost respects resonance perk (48h instead of 24h)
 */

import React from 'react';
var useState  = React.useState;
var useEffect = React.useEffect;
var useRef    = React.useRef;

var CL_KEY      = 'silo_clarity_v1';
var ECHO_KEY    = 'silo_echo_v1';
var OFFLINE_CAP = 14400;
var MARKET_COST = 500;

// --- GENERATORS --------------------------------------------------------------
export var GENERATORS = [
  { id:'focus',    name:'Focus Drone',      icon:'â', rate:0.1,  baseCost:10,   costMult:1.15, maxCount:50, milestoneStreak:0,  vip:false, color:'#4a9eff', desc:'A quiet anchor. Generates minimal baseline clarity.' },
  { id:'spark',    name:'Clarity Spark',    icon:'â', rate:0.25, baseCost:25,   costMult:1.15, maxCount:40, milestoneStreak:0,  vip:false, color:'#06b6d4', desc:'A small but steady flicker of self-awareness.' },
  { id:'signal',   name:'Signal Node',      icon:'â', rate:0.5,  baseCost:50,   costMult:1.15, maxCount:30, milestoneStreak:3,  vip:false, color:'#22c55e', desc:'Amplifies passive clarity. Requires a 3-day streak.' },
  { id:'weaver',   name:'Thought Weaver',   icon:'â', rate:1.0,  baseCost:100,  costMult:1.17, maxCount:25, milestoneStreak:5,  vip:false, color:'#a78bfa', desc:'Patterns emerging from the noise. Requires a 5-day streak.' },
  { id:'resonance',name:'Resonance Core',   icon:'â', rate:2.0,  baseCost:200,  costMult:1.18, maxCount:20, milestoneStreak:7,  vip:false, color:'#8b5cf6', desc:'Deep attunement. Requires one full week of presence.' },
  { id:'pulse',    name:'Pulse Array',      icon:'â¬¡', rate:4.0,  baseCost:400,  costMult:1.19, maxCount:15, milestoneStreak:10, vip:false, color:'#fb923c', desc:'Synchronized thought cycles. Requires a 10-day streak.' },
  { id:'cascade',  name:'Cascade Matrix',   icon:'â¬¡', rate:8.0,  baseCost:800,  costMult:1.20, maxCount:10, milestoneStreak:14, vip:false, color:'#f59e0b', desc:'Self-amplifying feedback loops. Requires a 14-day streak.' },
  { id:'lattice',  name:'Void Lattice',     icon:'â', rate:15.0, baseCost:1500, costMult:1.22, maxCount:8,  milestoneStreak:21, vip:false, color:'#e11d48', desc:'Deep subconscious rewiring. Requires a 21-day streak.' },
  { id:'sovereign',name:'Sovereign Engine', icon:'â', rate:25.0, baseCost:2500, costMult:1.25, maxCount:5,  milestoneStreak:30, vip:true,  color:'#e879a0', desc:'VIP Exclusive. Autonomous high-yield clarity synthesis.' },
];

// --- TAP UPGRADES ------------------------------------------------------------
export var TAP_UPGRADES = [
  { level:1, cost:25,   tapBonus:1,  name:'Focus Spike',     icon:'â¸',    desc:'+1 Clarity per tap' },
  { level:2, cost:100,  tapBonus:3,  name:'Signal Burst',    icon:'â¸â¸', desc:'+3 Clarity per tap' },
  { level:3, cost:450,  tapBonus:10, name:'Resonance Surge', icon:'â¶',    desc:'+10 Clarity per tap' },
  { level:4, cost:2000, tapBonus:25, name:'Cascade Pulse',   icon:'â¶â¶', desc:'+25 Clarity per tap' },
  { level:5, cost:9000, tapBonus:60, name:'Apex Strike',     icon:'â',    desc:'+60 Clarity per tap' },
];

// --- SHOP ITEMS --------------------------------------------------------------
export var SHOP_ITEMS = [
  { id:'condenser', name:'Mind Condenser',   icon:'â', cost:20,   maxCount:10, passiveBonus:0.05, color:'#4a9eff', desc:'All generators +5% rate. Stackable up to 10x.' },
  { id:'amplifier', name:'Signal Amplifier', icon:'â', cost:200,  maxCount:5,  passiveBonus:0.20, color:'#22c55e', desc:'All generators +20% rate. Stackable up to 5x.' },
  { id:'prism',     name:'Clarity Prism',    icon:'â', cost:850,  maxCount:3,  passiveBonus:0.50, color:'#8b5cf6', desc:'All generators +50% rate. Stackable up to 3x.' },
  { id:'nexus',     name:'Resonance Nexus',  icon:'â¬¡', cost:5000, maxCount:1,  passiveBonus:1.00, color:'#f59e0b', desc:'Permanently doubles all passive generation.' },
];

// --- ECHO PERKS --------------------------------------------------------------
export var ECHO_PERKS = [
  { id:'amplifier', name:'Echo Amplifier',   icon:'â', maxLevel:5, costs:[1,2,4,8,15],   color:'#22c55e', desc:'All passive generation +15% per level (up to +75%).' },
  { id:'tapMem',    name:'Tap Memory',        icon:'â¶', maxLevel:3, costs:[2,5,10],        color:'#4a9eff', desc:'Carry 25% / 50% / 75% of tap upgrades into each run.' },
  { id:'seed',      name:'Clarity Seed',      icon:'â', maxLevel:3, costs:[1,3,7],         color:'#f59e0b', desc:'Start each run with 50 / 150 / 400 bonus Clarity.' },
  { id:'resonance', name:'Journal Resonance', icon:'â¦', maxLevel:1, costs:[1],             color:'#a78bfa', desc:'Journal 2x boost lasts 48 hours instead of 24 hours.' },
  { id:'orbEvol',   name:'Orb Evolution',     icon:'â', maxLevel:6, costs:[1,2,3,5,8,13], color:'#e879a0', desc:'Evolve your orb through 6 visual tiers of power.' },
];

// --- HELPERS -----------------------------------------------------------------
export function genMilestoneMult(owned) {
  var m = 1;
  if (owned >= 5)  m *= 1.10;
  if (owned >= 10) m *= 1.25;
  if (owned >= 25) m *= 1.50;
  if (owned >= 50) m *= 2.00;
  return m;
}

export function calcPassiveRate(counts, boosted, shopMult, echoMult) {
  var rate = GENERATORS.reduce(function(sum, gen) {
    var owned = (counts && counts[gen.id]) || 0;
    return sum + gen.rate * owned * genMilestoneMult(owned);
  }, 0);
  rate = rate * (shopMult || 1) * (echoMult || 1);
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

export function calcPrestigeEchoes(totalEarned) {
  if (totalEarned < 10000) return 0;
  return Math.max(1, Math.floor(Math.log10(totalEarned) - 3));
}

export function calcPrestigeThreshold(runCount) {
  return Math.floor(10000 * Math.pow(3, runCount || 0));
}

export function calcEchoMult(echoPerks) {
  var ampLevel = (echoPerks && echoPerks.amplifier) || 0;
  return 1 + ampLevel * 0.15;
}

// --- PERSISTENCE -------------------------------------------------------------
function defaultState() {
  return {
    clarity: 0,
    totalEarned: 0,
    counts: { focus:0, spark:0, signal:0, weaver:0, resonance:0, pulse:0, cascade:0, lattice:0, sovereign:0 },
    tapLevel: 0,
    shopCounts: { condenser:0, amplifier:0, prism:0, nexus:0 },
    marketItems: [],
    marketUntil: 0,
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

function defaultEchoState() {
  return {
    echoes: 0,
    totalEchoes: 0,
    runCount: 0,
    echoPerks: { amplifier:0, tapMem:0, seed:0, resonance:0, orbEvol:0 },
  };
}

function loadEchoState() {
  try {
    var raw = localStorage.getItem(ECHO_KEY);
    if (!raw) return defaultEchoState();
    return Object.assign({}, defaultEchoState(), JSON.parse(raw));
  } catch(x) { return defaultEchoState(); }
}

function saveEchoState(st) {
  try { localStorage.setItem(ECHO_KEY, JSON.stringify(st)); } catch(x) {}
}

// --- HOOK --------------------------------------------------------------------
export function useClarity(coreState, isVIP) {
  var streak = (coreState && coreState.streak) || 0;

  var s1 = useState(function() {
    var st = loadState();
    var now = Date.now();
    var elapsed = Math.min((now - (st.lastSaved || now)) / 1000, OFFLINE_CAP);
    if (elapsed > 5) {
      var boosted = now < (st.journalBoostEnd || 0);
      var sMult   = calcShopMult(st.shopCounts);
      var rate    = calcPassiveRate(st.counts, boosted, sMult, 1);
      var earned  = rate * elapsed;
      st.clarity      = (st.clarity || 0) + earned;
      st.totalEarned  = (st.totalEarned || 0) + earned;
      st.offlineEarned  = earned;
      st.offlineSeconds = Math.floor(elapsed);
    } else {
      st.offlineEarned = 0; st.offlineSeconds = 0;
    }
    return st;
  });
  var clState = s1[0], setClState = s1[1];

  var se = useState(function() { return loadEchoState(); });
  var echoState = se[0], setEchoState = se[1];

  var s2 = useState(0);     var comboCount = s2[0],        setComboCount        = s2[1];
  var s3 = useState(0);     var comboLockedUntil = s3[0],  setComboLockedUntil  = s3[1];
  var s4 = useState(false); var isCharged = s4[0],         setIsCharged         = s4[1];
  var s5 = useState(null);  var burstGenId = s5[0],        setBurstGenId        = s5[1];

  var saveRef        = useRef(null);
  var lastTapRef     = useRef(0);
  var chargeTimerRef = useRef(null);
  var comboRef       = useRef(0);
  var comboLockRef   = useRef(0);
  var isChargedRef   = useRef(false);
  var burstNextRef   = useRef(Date.now() + 120000 + Math.random() * 60000);
  var echoPerksRef   = useRef(echoState.echoPerks);

  useEffect(function() {
    echoPerksRef.current = echoState.echoPerks;
  }, [echoState]);

  useEffect(function() {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(function() { saveState(clState); }, 2000);
    return function() { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [clState]);

  useEffect(function() {
    var tick = setInterval(function() {
      var now = Date.now();
      setClState(function(prev) {
        var newC  = prev.clarity;
        var newTE = prev.totalEarned;

        if (now > burstNextRef.current) {
          var ownedGens = GENERATORS.filter(function(g) { return (prev.counts[g.id]||0) > 0 && !g.vip; });
          burstNextRef.current = now + 90000 + Math.random() * 90000;
          if (ownedGens.length > 0) {
            var bg  = ownedGens[Math.floor(Math.random() * ownedGens.length)];
            var bOw = prev.counts[bg.id];
            var bEr = bg.rate * bOw * genMilestoneMult(bOw) * calcShopMult(prev.shopCounts) * calcEchoMult(echoPerksRef.current) * 5 * 10;
            newC  += bEr;
            newTE += bEr;
            setBurstGenId(bg.id);
            setTimeout(function() { setBurstGenId(null); }, 10000);
          }
        }

        var boosted = now < (prev.journalBoostEnd || 0);
        var eMult   = calcEchoMult(echoPerksRef.current);
        var rate    = calcPassiveRate(prev.counts, boosted, calcShopMult(prev.shopCounts), eMult);
        newC  += rate;
        newTE += rate;

        if (newC === prev.clarity && newTE === prev.totalEarned) return prev;
        return Object.assign({}, prev, { clarity: newC, totalEarned: newTE });
      });
    }, 1000);
    return function() { clearInterval(tick); };
  }, []);

  var boosted       = Date.now() < (clState.journalBoostEnd || 0);
  var shopMult      = calcShopMult(clState.shopCounts);
  var echoMult      = calcEchoMult(echoState.echoPerks);
  var passiveRate   = calcPassiveRate(clState.counts, boosted, shopMult, echoMult);
  var tapBonusTotal = TAP_UPGRADES.slice(0, clState.tapLevel || 0).reduce(function(s,u){return s+u.tapBonus;},0);
  var tapPower      = Math.max(1, streak) + tapBonusTotal;

  function tap() {
    var now           = Date.now();
    var timeSinceLast = now - (lastTapRef.current || 0);
    var chargeMult    = isChargedRef.current ? 3 : 1;
    var comboMult;
    if (now < comboLockRef.current) {
      comboMult = 5;
    } else if (timeSinceLast <= 1500) {
      var nc = Math.min(comboRef.current + 1, 5);
      comboRef.current = nc;
      setComboCount(nc);
      if (nc >= 5) { comboLockRef.current = now + 5000; setComboLockedUntil(now + 5000); }
      comboMult = nc;
    } else {
      comboRef.current = 1;
      setComboCount(1);
      comboMult = 1;
    }
    var isCrit   = Math.random() < 0.08;
    var critMult = isCrit ? 7 : 1;
    lastTapRef.current   = now;
    isChargedRef.current = false;
    setIsCharged(false);
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    chargeTimerRef.current = setTimeout(function() {
      isChargedRef.current = true;
      setIsCharged(true);
    }, 3000);
    var earned = Math.max(1, Math.round(tapPower * chargeMult * comboMult * critMult));
    setClState(function(prev) {
      return Object.assign({}, prev, { clarity: prev.clarity + earned, totalEarned: prev.totalEarned + earned });
    });
    return { earned: earned, isCrit: isCrit, comboMult: comboMult, chargeMult: chargeMult };
  }

  function buyGenerator(genId, discount) {
    var gen = GENERATORS.find(function(g) { return g.id === genId; });
    if (!gen) return false;
    var owned = clState.counts[genId] || 0;
    if (owned >= gen.maxCount)        return false;
    if (gen.vip && !isVIP)            return false;
    if (streak < gen.milestoneStreak) return false;
    var cost = Math.ceil(genCost(gen, owned) * (1 - (discount || 0)));
    if (clState.clarity < cost)       return false;
    setClState(function(prev) {
      var nc = Object.assign({}, prev.counts);
      nc[genId] = (nc[genId] || 0) + 1;
      return Object.assign({}, prev, { clarity: prev.clarity - cost, counts: nc });
    });
    return true;
  }

  function buyShopItem(itemId, discount) {
    var item = SHOP_ITEMS.find(function(i) { return i.id === itemId; });
    if (!item) return false;
    var owned = (clState.shopCounts && clState.shopCounts[itemId]) || 0;
    if (owned >= item.maxCount) return false;
    var cost = Math.ceil(item.cost * (1 - (discount || 0)));
    if (clState.clarity < cost) return false;
    setClState(function(prev) {
      var ns = Object.assign({}, prev.shopCounts);
      ns[itemId] = (ns[itemId] || 0) + 1;
      return Object.assign({}, prev, { clarity: prev.clarity - cost, shopCounts: ns });
    });
    return true;
  }

  function upgradeTap() {
    var nextLevel = (clState.tapLevel || 0) + 1;
    var upg = TAP_UPGRADES[nextLevel - 1];
    if (!upg || clState.clarity < upg.cost) return false;
    setClState(function(prev) {
      return Object.assign({}, prev, { clarity: prev.clarity - upg.cost, tapLevel: nextLevel });
    });
    return true;
  }

  function rollMarket() {
    if (clState.clarity < MARKET_COST) return false;
    var now  = Date.now();
    var pool = GENERATORS.filter(function(g) { return !g.vip; }).concat(SHOP_ITEMS);
    var shuf = pool.slice().sort(function() { return Math.random() - 0.5; });
    var items = shuf.slice(0, 2).map(function(it) {
      var isGen = !!GENERATORS.find(function(g) { return g.id === it.id; });
      return { id: it.id, type: isGen ? 'gen' : 'shop', discount: parseFloat((0.4 + Math.random() * 0.2).toFixed(2)) };
    });
    setClState(function(prev) {
      return Object.assign({}, prev, { clarity: prev.clarity - MARKET_COST, marketItems: items, marketUntil: now + 600000 });
    });
    return true;
  }

  function activateJournalBoost() {
    var resonance = (echoState.echoPerks && echoState.echoPerks.resonance) || 0;
    var duration  = resonance > 0 ? 172800000 : 86400000;
    setClState(function(prev) {
      return Object.assign({}, prev, { journalBoostEnd: Date.now() + duration });
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

  function prestige() {
    var threshold = calcPrestigeThreshold(echoState.runCount);
    if (clState.totalEarned < threshold) return false;
    var earned = calcPrestigeEchoes(clState.totalEarned);
    if (earned <= 0) return false;

    var tapMemLevel = (echoState.echoPerks && echoState.echoPerks.tapMem) || 0;
    var tapCarry    = 0;
    if (tapMemLevel > 0) {
      var carryPcts = [0.25, 0.50, 0.75];
      tapCarry = Math.min(Math.floor((clState.tapLevel || 0) * carryPcts[tapMemLevel - 1]), TAP_UPGRADES.length);
    }

    var seedLevel   = (echoState.echoPerks && echoState.echoPerks.seed) || 0;
    var seedAmts    = [0, 50, 150, 400];
    var seedClarity = seedAmts[seedLevel] || 0;

    var newEcho = {
      echoes:      echoState.echoes + earned,
      totalEchoes: echoState.totalEchoes + earned,
      runCount:    echoState.runCount + 1,
      echoPerks:   Object.assign({}, echoState.echoPerks),
    };

    var fresh = defaultState();
    fresh.clarity     = seedClarity;
    fresh.totalEarned = seedClarity;
    fresh.tapLevel    = tapCarry;

    setEchoState(newEcho);
    saveEchoState(newEcho);
    setClState(fresh);
    saveState(fresh);

    setComboCount(0);
    setComboLockedUntil(0);
    setIsCharged(false);
    setBurstGenId(null);
    comboRef.current     = 0;
    comboLockRef.current = 0;
    isChargedRef.current = false;

    return earned;
  }

  function buyEchoPerk(perkId) {
    var perk = ECHO_PERKS.find(function(p) { return p.id === perkId; });
    if (!perk) return false;
    var currentLevel = (echoState.echoPerks && echoState.echoPerks[perkId]) || 0;
    if (currentLevel >= perk.maxLevel) return false;
    var cost = perk.costs[currentLevel];
    if (echoState.echoes < cost) return false;
    var newPerks = Object.assign({}, echoState.echoPerks);
    newPerks[perkId] = currentLevel + 1;
    var newEcho = Object.assign({}, echoState, {
      echoes:    echoState.echoes - cost,
      echoPerks: newPerks,
    });
    setEchoState(newEcho);
    saveEchoState(newEcho);
    return true;
  }

  function receiveXPBridge(xpCost, clarityAmount, signalObj) {
    var mult = signalObj ? signalObj.clarityMult : 1;
    var actualClarity = Math.round(clarityAmount * mult);
    setState(function(prev) {
      return Object.assign({}, prev, {
        clarity:     (prev.clarity     || 0) + actualClarity,
        totalEarned: (prev.totalEarned || 0) + actualClarity,
        lastSaved:   Date.now(),
      });
    });
  }

  return {
    clarity:              clState.clarity,
    totalEarned:          clState.totalEarned,
    counts:               clState.counts,
    tapLevel:             clState.tapLevel || 0,
    shopCounts:           clState.shopCounts || {},
    marketItems:          clState.marketItems || [],
    marketUntil:          clState.marketUntil || 0,
    passiveRate:          passiveRate,
    tapPower:             tapPower,
    tapBonusTotal:        tapBonusTotal,
    shopMult:             shopMult,
    echoMult:             echoMult,
    boosted:              boosted,
    journalBoostEnd:      clState.journalBoostEnd,
    offlineEarned:        clState.offlineEarned || 0,
    offlineSeconds:       clState.offlineSeconds || 0,
    comboCount:           comboCount,
    comboLockedUntil:     comboLockedUntil,
    isCharged:            isCharged,
    burstGenId:           burstGenId,
    echoes:               echoState.echoes,
    totalEchoes:          echoState.totalEchoes,
    runCount:             echoState.runCount,
    echoPerks:            echoState.echoPerks || {},
    tap:                  tap,
    buyGenerator:         buyGenerator,
    buyShopItem:          buyShopItem,
    upgradeTap:           upgradeTap,
    rollMarket:           rollMarket,
    activateJournalBoost: activateJournalBoost,
    receiveXPBridge,
    dismissOffline:       dismissOffline,
    resetClarity:         resetClarity,
    prestige:             prestige,
    buyEchoPerk:          buyEchoPerk,
  };
}
