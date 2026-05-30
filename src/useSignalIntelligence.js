/**
 * useSignalIntelligence.js — SILO v10 Pattern Intelligence Engine
 *
 * Runs entirely on local data. Zero external calls.
 * Derives behavioral and emotional insights from existing state.
 *
 * Outputs:
 *   momentum       — 0..1 exponentially-weighted 7-day signal score
 *   clarityMod     — 0.6..1.4 multiplier fed to useClarity passive rate
 *   clusters       — detected streaks of heavy or strong signal (3+ days)
 *   dayPatterns    — { Mon: { avgScore, count }, ... } which days trend hard
 *   taskLag        — does task completion correlate with better signal next day?
 *   recovery       — how did the last heavy cluster resolve?
 *   activeAlert    — highest-priority actionable insight right now (or null)
 *   weatherGrid    — 30-day array for SignalWeather component
 */

import React from 'react';
var useMemo = React.useMemo;

var STATE_WEIGHT  = { flat:0, flickering:0.33, steady:0.67, strong:1.0 };
var HEAVY_STATES  = { flat:true, flickering:true };
var DAY_NAMES     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── MOMENTUM ─────────────────────────────────────────────────────────────────
function computeMomentum(history) {
  var recent = history.slice(-7);
  if (!recent.length) return 0.5;
  var wSum = 0, wTotal = 0;
  recent.forEach(function(day, i) {
    var w = Math.pow(1.4, i);
    wSum   += (STATE_WEIGHT[day.state] || 0) * w;
    wTotal += w;
  });
  return wTotal > 0 ? wSum / wTotal : 0.5;
}

// ─── CLUSTER DETECTION ────────────────────────────────────────────────────────
function detectClusters(history) {
  var clusters = [];
  var run = null;
  history.forEach(function(day) {
    var type = HEAVY_STATES[day.state] ? 'heavy' : 'strong';
    if (!run || run.type !== type) {
      if (run && run.length >= 3) clusters.push(run);
      run = { type:type, length:1, startDate:day.date, endDate:day.date, states:[day.state] };
    } else {
      run.length++;
      run.endDate = day.date;
      run.states.push(day.state);
    }
  });
  if (run && run.length >= 3) clusters.push(run);
  return clusters;
}

// ─── DAY-OF-WEEK PATTERNS ─────────────────────────────────────────────────────
function analyzeDayPatterns(history) {
  var buckets = {};
  history.forEach(function(day) {
    var dow = DAY_NAMES[new Date(day.date + 'T12:00:00').getDay()];
    if (!buckets[dow]) buckets[dow] = { total:0, count:0 };
    buckets[dow].total += STATE_WEIGHT[day.state] || 0;
    buckets[dow].count++;
  });
  var result = {};
  Object.keys(buckets).forEach(function(day) {
    var b = buckets[day];
    result[day] = { avgScore: b.count ? b.total/b.count : 0.5, count: b.count };
  });
  return result;
}

// ─── TASK-MOOD LAG CORRELATION ────────────────────────────────────────────────
function analyzeTaskLag(taskLog, signalHistory) {
  var signalByDate = {};
  signalHistory.forEach(function(s) { signalByDate[s.date] = STATE_WEIGHT[s.state] || 0; });

  var taskDates = {};
  taskLog.forEach(function(l) { taskDates[l.date] = (taskDates[l.date]||0)+1; });

  var withTasks = [], withoutTasks = [];
  Object.keys(signalByDate).forEach(function(date) {
    var prev = new Date(date + 'T12:00:00');
    prev.setDate(prev.getDate() - 1);
    var prevStr = prev.toISOString().slice(0,10);
    if (taskDates[prevStr]) withTasks.push(signalByDate[date]);
    else withoutTasks.push(signalByDate[date]);
  });

  var avg = function(arr) { return arr.length ? arr.reduce(function(s,v){return s+v;},0)/arr.length : 0.5; };
  var wA = avg(withTasks), woA = avg(withoutTasks);
  return {
    withTasksAvg:    wA,
    withoutTasksAvg: woA,
    sampleSize:      withTasks.length + withoutTasks.length,
    tasksHelp:       wA > woA + 0.05,
    delta:           Math.round((wA - woA) * 100),
  };
}

// ─── RECOVERY PATTERN ─────────────────────────────────────────────────────────
function detectRecoveryPattern(signalHistory, journalEntries) {
  var clusters = detectClusters(signalHistory);
  var today = new Date().toISOString().slice(0,10);
  var resolved = clusters.filter(function(c) { return c.type==='heavy' && c.endDate < today; });
  if (!resolved.length) return null;

  var last = resolved[resolved.length-1];
  var clusterStart = last.startDate;
  var clusterEnd   = last.endDate;
  var windowEntries = journalEntries.filter(function(e) {
    return e.date >= clusterStart && e.date <= clusterEnd;
  });

  return {
    lastClusterLength:   last.length,
    entriesDuringCluster: windowEntries.length,
    recoveredWithJournal: windowEntries.length > 0,
    lastEndDate:          clusterEnd,
  };
}

// ─── PATTERN ECHO ─────────────────────────────────────────────────────────────
// Find a sentence from a past entry with matching emotional mood.
// Exported standalone so JournalTab can call it directly.
export function findPatternEcho(currentMood, journalEntries) {
  if (!currentMood || !journalEntries || !journalEntries.length) return null;

  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  var cutStr = cutoff.toISOString().slice(0,10);

  var candidates = journalEntries.filter(function(e) {
    return e.mood === currentMood && e.date < cutStr && e.text && e.text.trim().length > 80;
  });
  if (!candidates.length) return null;

  // Pick from the 5 most recent matching candidates, slightly randomised
  var pool = candidates.slice(0, 5);
  var entry = pool[Math.floor(Math.random() * pool.length)];

  var sentences = entry.text.split(/[.!?]+/)
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 35; });
  if (!sentences.length) return null;

  var emotionRe = /feel|realize|understand|know|hurt|angry|afraid|clear|free|numb|lost|found|broken|whole|tired|alive|remember|thought|always|never|finally/i;
  var emotional  = sentences.filter(function(s) { return emotionRe.test(s); });
  var picked     = emotional.length ? emotional[0] : sentences[0];

  return { text: picked, date: entry.date, mood: entry.mood };
}

// ─── ALERT GENERATION ─────────────────────────────────────────────────────────
function generateActiveAlert(clusters, recovery, dayPatterns, taskLag, momentum) {
  var alerts = [];
  var today  = new Date().toISOString().slice(0,10);

  // Current heavy cluster
  var last = clusters.length ? clusters[clusters.length-1] : null;
  var clusterActive = last && last.type==='heavy' && last.endDate >= today;

  if (clusterActive && last.length >= 3) {
    var recStr = recovery && recovery.recoveredWithJournal
      ? 'A journal session helped break your last cluster (day '+recovery.lastClusterLength+'). Write now.'
      : 'Consider a deep burn session to break the pattern.';
    alerts.push({
      severity: last.length >= 5 ? 'critical' : 'warning',
      type:     'HEAVY_CLUSTER',
      title:    last.length+'-day heavy signal cluster detected',
      body:     recStr,
      action:   'OPEN_JOURNAL',
      priority: last.length >= 5 ? 10 : 7,
    });
  }

  // Momentum recovering out of heavy
  if (momentum > 0.55 && clusterActive) {
    alerts.push({
      severity: 'positive',
      type:     'RECOVERY_SIGNAL',
      title:    'Signal stabilizing',
      body:     'Your transmission is clearing. This is the moment to lock in a task or journal entry.',
      action:   'OPEN_TASKS',
      priority: 5,
    });
  }

  // Task correlation
  if (taskLag.sampleSize >= 10 && taskLag.tasksHelp && taskLag.delta > 0) {
    alerts.push({
      severity: 'insight',
      type:     'TASK_CORRELATION',
      title:    'Your data shows a pattern',
      body:     'After task days, your signal averages +'+taskLag.delta+' points higher the next day. Showing up compounds.',
      action:   'OPEN_TASKS',
      priority: 3,
    });
  }

  // Day-of-week warning
  var todayDOW   = DAY_NAMES[new Date().getDay()];
  var todayPatt  = dayPatterns[todayDOW];
  if (todayPatt && todayPatt.avgScore < 0.35 && todayPatt.count >= 3) {
    alerts.push({
      severity: 'warning',
      type:     'DAY_PATTERN',
      title:    todayDOW+'s run heavy for you',
      body:     Math.round(todayPatt.avgScore*100)+'% avg signal strength on '+todayDOW+'s across your history. Lower the bar today.',
      action:   null,
      priority: 4,
    });
  }

  alerts.sort(function(a,b) { return b.priority - a.priority; });
  return alerts[0] || null;
}

// ─── WEATHER GRID ─────────────────────────────────────────────────────────────
function buildWeatherGrid(signalHistory, journalEntries, taskLog) {
  var journalDates = {};
  var taskDates    = {};
  journalEntries.forEach(function(e) { journalDates[e.date] = (journalDates[e.date]||0)+1; });
  taskLog.forEach(function(l)        { taskDates[l.date]    = (taskDates[l.date]||0)+1; });

  var signalMap = {};
  signalHistory.forEach(function(s) { signalMap[s.date] = s.state; });

  var grid = [];
  for (var i = 29; i >= 0; i--) {
    var d  = new Date();
    d.setDate(d.getDate() - i);
    var ds = d.toISOString().slice(0,10);
    grid.push({
      date:         ds,
      state:        signalMap[ds] || null,
      hasJournal:   !!journalDates[ds],
      journalCount: journalDates[ds] || 0,
      taskCount:    taskDates[ds]    || 0,
      isToday:      i === 0,
    });
  }
  return grid;
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useSignalIntelligence(signalHistory, journalEntries, taskLog) {
  return useMemo(function() {
    var hist    = signalHistory  || [];
    var entries = journalEntries || [];
    var log     = taskLog        || [];

    var momentum    = computeMomentum(hist);
    var clusters    = detectClusters(hist);
    var dayPatterns = analyzeDayPatterns(hist);
    var taskLag     = analyzeTaskLag(log, hist);
    var recovery    = detectRecoveryPattern(hist, entries);
    var activeAlert = generateActiveAlert(clusters, recovery, dayPatterns, taskLag, momentum);
    var weatherGrid = buildWeatherGrid(hist, entries, log);

    // 0.60 at zero momentum, 1.40 at full momentum
    var clarityMod = 0.60 + (momentum * 0.80);

    return {
      momentum,
      clarityMod,
      clusters,
      dayPatterns,
      taskLag,
      recovery,
      activeAlert,
      weatherGrid,
    };
  }, [signalHistory, journalEntries, taskLog]);
}
