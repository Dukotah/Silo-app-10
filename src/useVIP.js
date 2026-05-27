/**
 * useVIP.js — SILO v10 VIP State Hook
 * isVIP flag persisted to localStorage key 'silo_vip_v1'.
 * FREE_JOURNAL_LIMIT: max journal entries for free users.
 */

import React from 'react';
var useState = React.useState;

var VIP_KEY = 'silo_vip_v1';
export var FREE_JOURNAL_LIMIT = 3;

export function useVIP() {
  var s1 = useState(function() {
    try { return JSON.parse(localStorage.getItem(VIP_KEY) || 'false'); } catch(x) { return false; }
  });
  var isVIP = s1[0], setIsVIP = s1[1];

  function upgrade() {
    setIsVIP(true);
    try { localStorage.setItem(VIP_KEY, 'true'); } catch(x) {}
  }

  function resetVIP() {
    setIsVIP(false);
    try { localStorage.setItem(VIP_KEY, 'false'); } catch(x) {}
  }

  return { isVIP: isVIP, upgrade: upgrade, resetVIP: resetVIP };
}
