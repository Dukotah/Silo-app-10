/**
 * skillTreeConfig.js — SILO v10 Psychological Skill Tree
 * Static node graph — UI reads this; never mutated at runtime.
 *
 * Tree topology (same diamond shape for all 3 attributes):
 *
 *       [0] ROOT
 *      /         \
 *   [1] LEFT    [2] RIGHT
 *                   |
 *               [3] RIGHT-DEEP
 *      \             /
 *       [4] CONVERGENCE
 *
 * Attribute colors (matches existing app palette):
 *   Fortitude → #f97316  (orange — streak/intensity)
 *   Awareness → #4a9eff  (blue   — journal/reflection)
 *   Release   → #22c55e  (green  — completion/clearing)
 */

export var SKILL_TREE_NODES = [

  // ── FORTITUDE ─────────────────────────────────────────────────────────────
  {
    id:          'fort_steadfast',
    title:       'Steadfast Protocol',
    description: 'You hold your position under pressure. Streak maintenance becomes instinct, not effort.',
    effect:      '+5% task XP',
    attribute:   'Fortitude',
    cost:        1,
    dependencies: [],
    unlocked:    false,
    effectFlag:  'FORTITUDE_STEADFAST',
  },
  {
    id:          'fort_controlled',
    title:       'Controlled Response',
    description: 'Reactions become deliberate. You act from protocol, not impulse. The gap between trigger and action widens.',
    effect:      '+8% task XP',
    attribute:   'Fortitude',
    cost:        1,
    dependencies: ['fort_steadfast'],
    unlocked:    false,
    effectFlag:  'FORTITUDE_CONTROLLED',
  },
  {
    id:          'fort_resilient',
    title:       'Resilient Core',
    description: 'Setbacks register without destabilizing you. Broken cycles are data points, not defeats.',
    effect:      '+10% task XP',
    attribute:   'Fortitude',
    cost:        2,
    dependencies: ['fort_steadfast'],
    unlocked:    false,
    effectFlag:  'FORTITUDE_RESILIENT',
  },
  {
    id:          'fort_ironwall',
    title:       'Iron Wall',
    description: 'External noise no longer penetrates the signal. Provocations lose their charge. You remain immovable.',
    effect:      '+12% task XP',
    attribute:   'Fortitude',
    cost:        2,
    dependencies: ['fort_resilient'],
    unlocked:    false,
    effectFlag:  'FORTITUDE_IRONWALL',
  },
  {
    id:          'fort_sovereign',
    title:       'Sovereign Protocol',
    description: 'The highest tier of personal discipline. Your system operates entirely without external validation. The architecture holds.',
    effect:      '+15% task XP — max Fortitude path: +50% total',
    attribute:   'Fortitude',
    cost:        3,
    dependencies: ['fort_ironwall', 'fort_controlled'],
    unlocked:    false,
    effectFlag:  'FORTITUDE_SOVEREIGN',
  },

  // ── AWARENESS ─────────────────────────────────────────────────────────────
  {
    id:          'aware_observer',
    title:       'Signal Observer',
    description: 'You begin noticing patterns in your own transmission. The first act of introspection: watching yourself from a step back.',
    effect:      '+8% journal XP',
    attribute:   'Awareness',
    cost:        1,
    dependencies: [],
    unlocked:    false,
    effectFlag:  'AWARENESS_OBSERVER',
  },
  {
    id:          'aware_meta',
    title:       'Meta Awareness',
    description: 'You witness your own thoughts without fusing with them. The observer separates cleanly from the observed signal.',
    effect:      '+10% journal XP',
    attribute:   'Awareness',
    cost:        1,
    dependencies: ['aware_observer'],
    unlocked:    false,
    effectFlag:  'AWARENESS_META',
  },
  {
    id:          'aware_clarity',
    title:       'Pattern Clarity',
    description: 'Emotional signals become legible before they peak. You read the shift as it forms, not after it lands.',
    effect:      '+12% journal XP · signal multiplier +0.1',
    attribute:   'Awareness',
    cost:        2,
    dependencies: ['aware_observer'],
    unlocked:    false,
    effectFlag:  'AWARENESS_CLARITY',
  },
  {
    id:          'aware_deep',
    title:       'Deep Signal Read',
    description: 'You identify the root source behind the surface emotion. Surface reactions are traced back to their origin point.',
    effect:      '+10% journal XP — burns now earn full XP',
    attribute:   'Awareness',
    cost:        2,
    dependencies: ['aware_clarity'],
    unlocked:    false,
    effectFlag:  'AWARENESS_DEEP',
  },
  {
    id:          'aware_architect',
    title:       'Signal Architect',
    description: 'You design your internal environment with intention. Emotional noise becomes raw material. The signal is yours to shape.',
    effect:      '+15% journal XP — max Awareness path: +55% total',
    attribute:   'Awareness',
    cost:        3,
    dependencies: ['aware_deep', 'aware_meta'],
    unlocked:    false,
    effectFlag:  'AWARENESS_ARCHITECT',
  },

  // ── RELEASE ───────────────────────────────────────────────────────────────
  {
    id:          'rel_exhale',
    title:       'First Exhale',
    description: 'You discover the act of release. What no longer transmits can be set down. The purge is a protocol, not a failure.',
    effect:      'XP Bridge yields +100 bonus Clarity',
    attribute:   'Release',
    cost:        1,
    dependencies: [],
    unlocked:    false,
    effectFlag:  'RELEASE_EXHALE',
  },
  {
    id:          'rel_detach',
    title:       'Clean Detachment',
    description: 'You release without severing. Completion without collapse. The signal ends clean, not cut.',
    effect:      'XP Bridge yields additional +200 Clarity',
    attribute:   'Release',
    cost:        1,
    dependencies: ['rel_exhale'],
    unlocked:    false,
    effectFlag:  'RELEASE_DETACH',
  },
  {
    id:          'rel_purge',
    title:       'Signal Purge',
    description: 'Emotional backlog clears efficiently. The system no longer stores residue from resolved events. The buffer empties.',
    effect:      'XP Bridge cost halved — convert at 25 XP instead of 50',
    attribute:   'Release',
    cost:        2,
    dependencies: ['rel_exhale'],
    unlocked:    false,
    effectFlag:  'RELEASE_PURGE',
  },
  {
    id:          'rel_catharsis',
    title:       'Full Catharsis',
    description: 'Complete emotional processing becomes a controlled strength. The deep flush is no longer a vulnerability — it is a tool.',
    effect:      'Urge Rescue cooldown reduced to 12h (from 24h)',
    attribute:   'Release',
    cost:        2,
    dependencies: ['rel_purge'],
    unlocked:    false,
    effectFlag:  'RELEASE_CATHARSIS',
  },
  {
    id:          'rel_void',
    title:       'Sovereign Void',
    description: 'Total inner silence. The cleared state becomes the default. Nothing external disturbs the core signal.',
    effect:      'Sovereign Release — all Release effects compounded at maximum',
    attribute:   'Release',
    cost:        3,
    dependencies: ['rel_catharsis', 'rel_detach'],
    unlocked:    false,
    effectFlag:  'RELEASE_VOID',
  },
];
