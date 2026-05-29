/**
 * useSkillTree.js — SILO v10 Psychological Skill Tree Hook
 *
 * XP IS DERIVED — never stored separately. This hook reads existing coreState
 * (streak, taskLog, journalEntries, log) and computes attribute XP on the fly.
 * The only thing persisted here is the set of unlocked node IDs, stored under
 * a separate localStorage key so it never touches silo_core_v4.
 *
 * Attributes:
 *   Fortitude  — driven by streak + task consistency (active days in taskLog)
 *   Awareness  — driven by journal entries (quality via word count + consistency)
 *   Release    — driven by burn actions + completed once-tasks + task volume
 *
 * Level formula: Math.floor(attrXP / XP_PER_LEVEL) + 1
 * Insight Points earned = sum of (level - 1) across all three attributes
 * Insight Points available = earned - spent (spent = sum of costs of unlocked nodes)
 *
 * The Shame Buffer is inherently respected: XP is derived from cumulative
 * historical data (never subtracted), and unlock state is permanent.
 */

import React from 'react';
import { SKILL_TREE_NODES } from './skillTreeConfig.js';

var useState  = React.useState;
var useMemo   = React.useMemo;
var useEffect = React.useEffect;

var ST_KEY        = 'silo_skilltree_v1';
export var XP_PER_LEVEL = 150;   // XP needed per attribute level

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
function loadUnlocked() {
  try {
    var r = localStorage.getItem(ST_KEY);
    return r ? JSON.parse(r) : [];
  } catch(x) { return []; }
}

function saveUnlocked(ids) {
  try { localStorage.setItem(ST_KEY, JSON.stringify(ids)); } catch(x) {}
}

// ─── XP DERIVATION ────────────────────────────────────────────────────────────
/**
 * Derives Fortitude / Awareness / Release XP from existing coreState.
 * All values are additive and cumulative — they never decrease.
 *
 * Fortitude  = (streak × 40) + (unique task-completion days × 20)
 * Awareness  = (journal entries × 30) + (entries >100 words +20 each)
 *            + (entries >250 words +20 again) + (burn actions × 15)
 * Release    = (burn actions × 40) + (once-task completions × 50)
 *            + (total task completions × 4)
 */
function deriveAttrXP(coreState) {
  if (!coreState) return { Fortitude: 0, Awareness: 0, Release: 0 };

  var taskLog        = coreState.taskLog        || [];
  var log            = coreState.log            || [];
  var journalEntries = coreState.journalEntries || [];
  var tasks          = coreState.tasks          || [];
  var streak         = coreState.streak         || 0;

  // ── Fortitude ──────────────────────────────────────────────────────────────
  var taskDates = {};
  taskLog.forEach(function(l) { if (l.date) taskDates[l.date] = 1; });
  var activeDays = Object.keys(taskDates).length;
  var fortXP = (streak * 40) + (activeDays * 20);

  // ── Awareness ──────────────────────────────────────────────────────────────
  var awareXP = 0;
  journalEntries.forEach(function(entry) {
    var text = entry.text || '';
    var wc   = text.trim().length > 0
      ? text.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length
      : 0;
    awareXP += 30;
    if (wc > 100) awareXP += 20;
    if (wc > 250) awareXP += 20;
  });
  // Burns also signal introspection effort
  log.forEach(function(l) {
    if (l.action === 'burn') awareXP += 15;
  });

  // ── Release ────────────────────────────────────────────────────────────────
  var releaseXP = 0;
  log.forEach(function(l) {
    if (l.action === 'burn') releaseXP += 40;
  });
  // Once-type task IDs (completing long-standing commitments = Release)
  var onceTaskIds = {};
  tasks.forEach(function(t) {
    if (t.freq === 'once') onceTaskIds[t.id] = 1;
  });
  taskLog.forEach(function(l) {
    if (onceTaskIds[l.taskId]) releaseXP += 50;
  });
  // General task completion volume contributes a small baseline
  releaseXP += taskLog.length * 4;

  return {
    Fortitude: Math.max(0, fortXP),
    Awareness: Math.max(0, awareXP),
    Release:   Math.max(0, releaseXP),
  };
}

function xpToLevel(xp) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

// ─── SKILL BONUS COMPUTATION ──────────────────────────────────────────────────
/**
 * Converts a list of active effectFlags into concrete gameplay multipliers.
 *
 * Fortitude → task XP bonus (additive per node unlocked)
 * Awareness → journal XP bonus + signal multiplier nudge
 * Release   → XP Bridge bonus Clarity + reduced bridge cost + shorter urge cooldown
 */
export function computeSkillBonuses(effectFlags) {
  var flags = effectFlags || [];
  var has   = function(f) { return flags.indexOf(f) !== -1; };

  // Fortitude branch — task XP multiplier
  var taskBonus = 0;
  if (has('FORTITUDE_STEADFAST'))  taskBonus += 0.05;
  if (has('FORTITUDE_CONTROLLED')) taskBonus += 0.08;
  if (has('FORTITUDE_RESILIENT'))  taskBonus += 0.10;
  if (has('FORTITUDE_IRONWALL'))   taskBonus += 0.12;
  if (has('FORTITUDE_SOVEREIGN'))  taskBonus += 0.15;

  // Awareness branch — journal XP multiplier
  var journalBonus = 0;
  if (has('AWARENESS_OBSERVER'))  journalBonus += 0.08;
  if (has('AWARENESS_META'))      journalBonus += 0.10;
  if (has('AWARENESS_CLARITY'))   journalBonus += 0.12;
  if (has('AWARENESS_DEEP'))      journalBonus += 0.10;
  if (has('AWARENESS_ARCHITECT')) journalBonus += 0.15;

  // Release branch — XP Bridge bonuses
  var bridgeBonusClarity = 0;
  if (has('RELEASE_EXHALE')) bridgeBonusClarity += 100;
  if (has('RELEASE_DETACH')) bridgeBonusClarity += 200;

  return {
    taskXPMult:        1 + taskBonus,
    journalXPMult:     1 + journalBonus,
    signalBoost:       has('AWARENESS_CLARITY') ? 0.1 : 0,
    bridgeBonusClarity: bridgeBonusClarity,
    bridgeHalfCost:    has('RELEASE_PURGE'),
    urgeCooldownMs:    has('RELEASE_CATHARSIS') ? 43200000 : 86400000,
  };
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useSkillTree(coreState) {
  var s1 = useState(loadUnlocked);
  var unlockedIds = s1[0], setUnlockedIds = s1[1];

  // Derived attribute XP — recomputes only when coreState reference changes
  var attrXP = useMemo(function() {
    return deriveAttrXP(coreState);
  }, [coreState]);

  // Attribute levels
  var levels = useMemo(function() {
    return {
      Fortitude: xpToLevel(attrXP.Fortitude),
      Awareness: xpToLevel(attrXP.Awareness),
      Release:   xpToLevel(attrXP.Release),
    };
  }, [attrXP]);

  // Total Insight Points earned = sum of (level - 1) per attribute
  var totalInsightEarned = useMemo(function() {
    return (levels.Fortitude - 1) + (levels.Awareness - 1) + (levels.Release - 1);
  }, [levels]);

  // Points spent = sum of costs of all unlocked nodes
  var pointsSpent = useMemo(function() {
    return SKILL_TREE_NODES.reduce(function(sum, node) {
      return sum + (unlockedIds.indexOf(node.id) !== -1 ? node.cost : 0);
    }, 0);
  }, [unlockedIds]);

  var insightPoints = Math.max(0, totalInsightEarned - pointsSpent);

  // Nodes with runtime unlocked flag merged in — memoized to prevent re-renders
  var nodes = useMemo(function() {
    return SKILL_TREE_NODES.map(function(node) {
      return Object.assign({}, node, { unlocked: unlockedIds.indexOf(node.id) !== -1 });
    });
  }, [unlockedIds]);

  // Active effect flags — forward-looking hook for future feature integration
  var effectFlags = useMemo(function() {
    return nodes
      .filter(function(n) { return n.unlocked; })
      .map(function(n) { return n.effectFlag; });
  }, [nodes]);

  // ── ACTIONS ──────────────────────────────────────────────────────────────
  function canUnlock(nodeId) {
    var node = SKILL_TREE_NODES.find(function(n) { return n.id === nodeId; });
    if (!node)                                    return false;
    if (unlockedIds.indexOf(nodeId) !== -1)       return false;  // already unlocked
    if (node.cost > insightPoints)                return false;  // not enough points
    // All dependencies must be unlocked
    return node.dependencies.every(function(dep) {
      return unlockedIds.indexOf(dep) !== -1;
    });
  }

  function unlockNode(nodeId) {
    if (!canUnlock(nodeId)) return false;
    var newIds = unlockedIds.concat([nodeId]);
    setUnlockedIds(newIds);
    saveUnlocked(newIds);
    return true;
  }

  return {
    nodes:              nodes,
    attrXP:             attrXP,
    levels:             levels,
    insightPoints:      insightPoints,
    totalInsightEarned: totalInsightEarned,
    pointsSpent:        pointsSpent,
    effectFlags:        effectFlags,
    canUnlock:          canUnlock,
    unlockNode:         unlockNode,
    XP_PER_LEVEL:       XP_PER_LEVEL,
  };
}
