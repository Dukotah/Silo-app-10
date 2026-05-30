/**
 * useNotifications.js — SILO local notification scheduling
 *
 * Wraps @capacitor/local-notifications for task reminders.
 * Safe-no-ops on web (where the native plugin isn't present).
 */

var _plugin = null;

function getPlugin() {
  if (_plugin) return _plugin;
  try {
    var cap = window && window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      var mod = require('@capacitor/local-notifications');
      _plugin = mod.LocalNotifications;
    }
  } catch(e) {}
  return _plugin;
}

function isAvailable() {
  return !!getPlugin();
}

// Each daily task reminder gets a stable notification ID derived from task ID.
// We use a simple hash so the same task always maps to the same notif ID.
function taskNotifId(taskId) {
  var h = 0;
  for (var i = 0; i < taskId.length; i++) {
    h = ((h << 5) - h) + taskId.charCodeAt(i);
    h = h & h; // 32-bit int
  }
  // LocalNotifications requires positive integers
  return Math.abs(h) % 2000000000 || 1;
}

// Build the next Date for a given "HH:MM" time string (always tomorrow-or-later
// if that time has already passed today).
function nextOccurrence(timeStr) {
  var parts = timeStr.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var now = new Date();
  var d   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

export async function requestNotifPermission() {
  var plugin = getPlugin();
  if (!plugin) return false;
  try {
    var status = await plugin.checkPermissions();
    if (status.display === 'granted') return true;
    var req = await plugin.requestPermissions();
    return req.display === 'granted';
  } catch(e) { return false; }
}

// Schedule a daily reminder for a task.
// taskId   — unique task id string
// taskName — display name
// timeStr  — "HH:MM" 24-hour string, e.g. "08:00"
// freq     — 'daily' | 'weekly' | 'once'
export async function scheduleTaskReminder(taskId, taskName, timeStr, freq) {
  var plugin = getPlugin();
  if (!plugin || !timeStr) return;
  try {
    var id     = taskNotifId(taskId);
    var when   = nextOccurrence(timeStr);
    var body   = freq === 'weekly'
      ? 'Your weekly protocol is waiting.'
      : freq === 'once'
      ? 'You have a one-time task ready.'
      : 'Stay on signal — check in your protocol.';

    // Cancel any existing reminder for this task before rescheduling
    await cancelTaskReminder(taskId);

    var notif = {
      id:       id,
      title:    '◆ ' + taskName,
      body:     body,
      schedule: { at: when, repeats: freq === 'daily', every: freq === 'daily' ? 'day' : undefined },
      sound:    null,
      smallIcon:'ic_stat_icon_config_sample',
      actionTypeId: '',
      extra:    { taskId: taskId },
    };

    // Remove undefined keys (Capacitor is strict)
    if (!notif.schedule.repeats) delete notif.schedule.repeats;
    if (!notif.schedule.every)   delete notif.schedule.every;

    await plugin.schedule({ notifications: [notif] });
  } catch(e) { console.warn('SILO notif schedule error:', e); }
}

export async function cancelTaskReminder(taskId) {
  var plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id: taskNotifId(taskId) }] });
  } catch(e) {}
}

export async function cancelAllReminders() {
  var plugin = getPlugin();
  if (!plugin) return;
  try {
    var pending = await plugin.getPending();
    if (pending && pending.notifications && pending.notifications.length) {
      await plugin.cancel({ notifications: pending.notifications.map(function(n){ return { id: n.id }; }) });
    }
  } catch(e) {}
}

export { isAvailable };
