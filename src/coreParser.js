/**
 * coreParser.js — Emotional signal detection + XP calculation
 */

var LEXICON = {
  HEAVY: {
    label: 'Heavy / Stress',
    color: '#f97316',
    keywords: [
      'anxious','anxiety','stressed','stress','overwhelmed','exhausted','tired',
      'drained','heavy','burden','pressure','panic','scared','fear','afraid',
      'worried','worry','hopeless','helpless','trapped','stuck','numb','empty',
      'alone','lonely','sad','depressed','depression','grief','hurt','pain',
      'crying','broken','shattered','lost',
    ],
  },
  HEAT: {
    label: 'Turbulent / Heat',
    color: '#ef4444',
    keywords: [
      'angry','anger','mad','furious','rage','hate','hatred','disgusted','toxic',
      'betrayed','betrayal','cheated','disrespected','ignored','abandoned',
      'controlling','pathetic','worthless','useless','stupid','bitter',
      'resentment','revenge','break','destroy','explode','scream','yell',
    ],
  },
  CLEAR: {
    label: 'Clear / Focus',
    color: '#22c55e',
    keywords: [
      'done','complete','finished','progress','clear','clarity','focused',
      'productive','accomplished','proud','confident','strong','growing','better',
      'improved','healing','healed','peace','peaceful','calm','grateful',
      'gratitude','hopeful','positive','happy','excited','motivated','ready',
      'determined','free',
    ],
  },
  REFLECTIVE: {
    label: 'Reflective',
    color: '#4a9eff',
    keywords: [
      'thinking','thought','wondering','realize','realized','understand',
      'processing','learning','noticed','pattern','reflecting','reflection',
      'memory','remember','considering','maybe','perhaps','unsure','confused',
      'figuring','seeking','question',
    ],
  },
};

var XP_BASE   = 10;
var XP_PER_W  = 0.5;
var XP_SHIFT  = { HEAVY: 15, HEAT: 20, CLEAR: 25, REFLECTIVE: 18 };
var XP_COMMIT = 8;
var XP_BURN   = 5;

export function parse(text, action) {
  if (!text || !text.trim()) return null;

  var clean  = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  var words  = clean.split(/\s+/).filter(function(w) { return w.length > 0; });
  var wc     = words.length;
  var ws     = {};
  words.forEach(function(w) { ws[w] = 1; });

  var scores = { HEAVY: 0, HEAT: 0, CLEAR: 0, REFLECTIVE: 0 };
  Object.keys(LEXICON).forEach(function(cat) {
    LEXICON[cat].keywords.forEach(function(kw) {
      if (ws[kw]) scores[cat] += 1;
      words.forEach(function(w) {
        if (w !== kw && w.length > 4 && (w.indexOf(kw) === 0 || kw.indexOf(w) === 0)) {
          scores[cat] += 0.4;
        }
      });
    });
  });

  var primary = null;
  var top     = 0;
  Object.keys(scores).forEach(function(k) {
    if (scores[k] > top) { top = scores[k]; primary = k; }
  });

  var xp = XP_BASE + Math.floor(wc * XP_PER_W);
  if (primary) xp += XP_SHIFT[primary] || 0;
  xp += action === 'commit' ? XP_COMMIT : XP_BURN;

  return {
    wordCount:    wc,
    charCount:    text.trim().length,
    primaryShift: primary,
    shiftLabel:   primary ? LEXICON[primary].label : 'Ambient',
    shiftColor:   primary ? LEXICON[primary].color : '#94a3b8',
    scores:       scores,
    xp:           Math.max(xp, 5),
    action:       action,
    rawText:      text.trim(),
    timestamp:    Date.now(),
  };
}
