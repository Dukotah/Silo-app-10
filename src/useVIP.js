/**
 * useVIP.js — SILO v10 VIP State Hook
 * Production: uses RevenueCat for entitlement checks and purchases.
 * Fallback: localStorage boolean when RevenueCat is unavailable (web/dev).
 *
 * SETUP:
 *   1. Create a product in App Store Connect / Google Play Console.
 *   2. Create a "vip" entitlement in RevenueCat dashboard.
 *   3. Replace the placeholder API keys below with your real keys.
 *   4. Run: npm run mobile:build
 */

import React from 'react';
var useState  = React.useState;
var useEffect = React.useEffect;
var useRef    = React.useRef;

// ─── RevenueCat API Keys ───────────────────────────────────────────────────────
// Replace these with your actual RevenueCat public API keys.
export var REVENUECAT_IOS_KEY     = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
export var REVENUECAT_ANDROID_KEY = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';

// ─── Constants ────────────────────────────────────────────────────────────────
var VIP_KEY          = 'silo_vip_v1';
var VIP_ENTITLEMENT  = 'vip';
export var FREE_JOURNAL_LIMIT = 3;

// ─── RevenueCat loader (lazy, so web build doesn't crash) ─────────────────────
function getPurchases() {
  try {
    // Capacitor plugin is only available in native builds
    var mod = require('@revenuecat/purchases-capacitor');
    return mod.Purchases || null;
  } catch (x) {
    return null;
  }
}

function getPlatformKey() {
  try {
    var ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return REVENUECAT_ANDROID_KEY;
    return REVENUECAT_IOS_KEY;
  } catch (x) {
    return REVENUECAT_IOS_KEY;
  }
}

function isPlaceholderKey(key) {
  return !key || key.startsWith('appl_REPLACE') || key.startsWith('goog_REPLACE');
}

// localStorage helpers
function readLocalVIP() {
  try { return JSON.parse(localStorage.getItem(VIP_KEY) || 'false'); } catch (x) { return false; }
}
function writeLocalVIP(v) {
  try { localStorage.setItem(VIP_KEY, JSON.stringify(v)); } catch (x) {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useVIP() {
  var s1 = useState(readLocalVIP);
  var isVIP = s1[0], setIsVIP = s1[1];

  var s2 = useState(false);
  var loading = s2[0], setLoading = s2[1];

  var s3 = useState(null);
  var error = s3[0], setError = s3[1];

  var initialized = useRef(false);

  // Sync state helper — updates both React state and localStorage
  function setVIP(val) {
    setIsVIP(val);
    writeLocalVIP(val);
  }

  // Called from App.js on mount
  async function initialize() {
    if (initialized.current) return;
    initialized.current = true;

    var Purchases = getPurchases();
    var apiKey    = getPlatformKey();

    if (!Purchases || isPlaceholderKey(apiKey)) {
      // Dev mode / web — use localStorage value as-is
      return;
    }

    try {
      setLoading(true);
      await Purchases.configure({ apiKey });
      var result = await Purchases.getCustomerInfo();
      var entitled = !!result?.customerInfo?.entitlements?.active?.[VIP_ENTITLEMENT];
      setVIP(entitled);
    } catch (x) {
      setError(x?.message || 'RevenueCat init failed');
      // Don't override localStorage on error — keep last known state
    } finally {
      setLoading(false);
    }
  }

  // Trigger the native paywall / purchase flow
  async function purchaseVIP() {
    var Purchases = getPurchases();
    var apiKey    = getPlatformKey();

    if (!Purchases || isPlaceholderKey(apiKey)) {
      // Dev fallback: grant VIP instantly so UI can be tested
      setVIP(true);
      return { success: true, devMode: true };
    }

    try {
      setLoading(true);
      setError(null);
      // Fetch available offerings first
      var offerings = await Purchases.getOfferings();
      var pkg = offerings?.current?.availablePackages?.[0];
      if (!pkg) throw new Error('No package available');

      var result = await Purchases.purchasePackage({ aPackage: pkg });
      var entitled = !!result?.customerInfo?.entitlements?.active?.[VIP_ENTITLEMENT];
      setVIP(entitled);
      return { success: entitled };
    } catch (x) {
      if (x?.code !== 'PURCHASE_CANCELLED') {
        setError(x?.message || 'Purchase failed');
      }
      return { success: false, cancelled: x?.code === 'PURCHASE_CANCELLED' };
    } finally {
      setLoading(false);
    }
  }

  // Restore prior purchases (required by App Store guidelines)
  async function restorePurchases() {
    var Purchases = getPurchases();
    var apiKey    = getPlatformKey();

    if (!Purchases || isPlaceholderKey(apiKey)) {
      return { success: false, devMode: true };
    }

    try {
      setLoading(true);
      setError(null);
      var result = await Purchases.restoreTransactions();
      var entitled = !!result?.customerInfo?.entitlements?.active?.[VIP_ENTITLEMENT];
      setVIP(entitled);
      return { success: true, isVIP: entitled };
    } catch (x) {
      setError(x?.message || 'Restore failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }

  // Dev-only reset (removes local flag)
  function resetVIP() {
    setVIP(false);
  }

  return {
    isVIP,
    loading,
    error,
    initialize,
    purchaseVIP,
    restorePurchases,
    resetVIP,
    // Legacy alias so existing call-sites using upgrade() keep working
    upgrade: purchaseVIP,
  };
}
