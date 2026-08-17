/**
 * paywall.tsx — LandHere Pro
 *
 * Reached from the locked surfaces: journey phases past acceptance, rankings
 * past the top 25, and university detail. Shows ghost preview rows so the user
 * can see real content behind the gate. The back button is always present —
 * this is an upsell, not a wall.
 *
 * Product: com.landhere.app.pro · Non-Consumable · one-time · $1.99
 * (App Store Connect owns the price; `displayPrice` from StoreKit is what the
 * user is shown, so a price change there needs no app release.)
 *
 * Nothing here grants access. Both the buy path and the restore path end at
 * POST /purchases/verify, and the server decides.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, ScrollView,
  StyleSheet, Text, View, Pressable,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// `finishTransaction` is taken from the root API rather than from the useIAP
// destructuring: the success callback is defined inside the hook's own options
// object, so referencing the hook's copy there is a use-before-declaration.
import {
  ErrorCode,
  finishTransaction,
  getAvailablePurchases,
  restorePurchases,
  useIAP,
  type Purchase,
} from 'expo-iap';

import { useTheme } from '../context/ThemeContext';
import { PressableScale } from '../components/PressableScale';
import { getErrorMessage } from '../lib/api';
import {
  PRO_PRODUCT_ID,
  STORE_ACCOUNT_LABEL,
  useContentUnlocked,
  useRefreshEntitlement,
  verifyPurchaseForPlatform,
} from '../lib/purchaseStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * What Pro actually unlocks. Kept in step with the server gates in
 * app/routes/info.py and app/routes/universities.py — advertising anything the
 * API does not gate would be a false claim in a paid listing.
 *
 * Scholarships, work-hour rules, the arrival checklist and the scoring
 * methodology are FREE and are deliberately absent from this list. The
 * methodology in particular stays free on purpose: it is the explanation of how
 * the rankings are calculated, and putting the reasoning behind a paywall while
 * selling the rankings would undercut the transparency the product rests on.
 */
const FEATURES: { icon: IoniconName; label: string; sub: string }[] = [
  { icon: 'trail-sign-outline', label: 'The rest of your journey', sub: 'Visa process, departure and arrival — every step' },
  { icon: 'trophy-outline', label: 'All 500+ ranked universities', sub: 'Free shows the top 25' },
  { icon: 'school-outline', label: 'University detail pages', sub: 'Cost, outcomes, research and intl. student mix' },
];

const GHOST_ROWS = [
  { initials: 'MIT', score: '94', name: 'Massachusetts Institute of Technology', state: 'Cambridge, MA', tuition: '~$62k' },
  { initials: 'STA', score: '91', name: 'Stanford University', state: 'Stanford, CA', tuition: '~$65k' },
  { initials: 'HVD', score: '90', name: 'Harvard University', state: 'Cambridge, MA', tuition: '~$59k' },
  { initials: 'CMU', score: '88', name: 'Carnegie Mellon University', state: 'Pittsburgh, PA', tuition: '~$66k' },
];

// Store-specific wording lives in lib/purchaseStore.ts so every surface agrees.
const STORE_ACCOUNT = STORE_ACCOUNT_LABEL;

const GHOST_GRADS: [string, string][] = [
  ['#8A1538', '#5A0C24'],
  ['#3B5BA5', '#1E2F5E'],
  ['#A4133C', '#6B0F2C'],
  ['#B5762A', '#7A4A14'],
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const unlocked = useContentUnlocked();
  const refreshEntitlement = useRefreshEntitlement();

  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  // Non-error status: "waiting for approval", "restoring", "restored". Kept
  // separate from storeError so a pending purchase does not read as a failure.
  const [storeNotice, setStoreNotice] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  // The purchase-error callback needs to kick off a restore, but handleRestore
  // is redeclared every render — listing it as a dependency would rebuild the
  // StoreKit listener on every render. A latest-value ref keeps the listener
  // stable without capturing a stale closure.
  const restoreRef = useRef<() => void>(() => {});

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  // Already entitled (bought elsewhere, or the server confirmed mid-flow).
  useEffect(() => {
    if (unlocked && !navigatedRef.current) {
      navigatedRef.current = true;
      goBack();
    }
  }, [unlocked, goBack]);

  /**
   * The one place a transaction becomes an entitlement: hand the signed blob to
   * the server and take its answer. Used by both buy and restore.
   */
  const submitToServer = useCallback(
    async (purchase: Purchase): Promise<boolean> => {
      const signed = purchase.purchaseToken;
      if (!signed) {
        setStoreError('The store did not return a verifiable receipt. Please try again.');
        return false;
      }
      try {
        const entitlement = await verifyPurchaseForPlatform(signed);
        await refreshEntitlement();
        if (!entitlement.pro) {
          // Verified, but not entitling — a refunded or revoked purchase.
          setStoreError('This purchase is no longer active on your account.');
          return false;
        }
        return true;
      } catch (e) {
        // 402 = the store says payment is still pending. Common on Google Play
        // with deferred payment methods (cash, bank transfer). Not a failure,
        // and crucially not something to retry — it resolves on its own.
        if (isAxiosError(e) && e.response?.status === 402) {
          setStoreNotice(
            'Your payment is still being processed. Pro unlocks automatically once it completes.',
          );
          return false;
        }
        setStoreError(getErrorMessage(e, 'We could not confirm your purchase. Please try again.'));
        return false;
      }
    },
    [refreshEntitlement],
  );

  // ── StoreKit ───────────────────────────────────────────────────────────────

  const {
    connected, products,
    fetchProducts, requestPurchase,
  } = useIAP({
    onPurchaseSuccess: useCallback(
      async (purchase: Purchase) => {
        const ok = await submitToServer(purchase);
        // Finish the transaction only after the server has recorded it —
        // finishing first would let a failed verification lose the receipt.
        if (ok) {
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch {
            // The entitlement is already recorded server-side; StoreKit will
            // re-deliver an unfinished transaction on next launch.
          }
        }
        setBuying(false);
        if (ok && !navigatedRef.current) {
          navigatedRef.current = true;
          goBack();
        }
      },
      [submitToServer, goBack],
    ),
    // Typed structurally rather than with the exported PurchaseError: expo-iap
    // ships two shapes under that name and the hook expects the one whose
    // `code` is optional.
    onPurchaseError: useCallback((error: { code?: ErrorCode; message?: string }) => {
      setBuying(false);
      switch (error.code) {
        case ErrorCode.UserCancelled:
          // A normal outcome, not a failure. Say nothing.
          setStoreError(null);
          setStoreNotice(null);
          return;
        case ErrorCode.AlreadyOwned:
          // StoreKit knows this Apple ID already bought Pro, but our server has
          // no record for this account — the usual cause is a reinstall or a
          // second LandHere account. Restoring is the fix, so do it rather than
          // showing a dead end.
          setStoreNotice('You already own LandHere Pro. Restoring it now…');
          restoreRef.current();
          return;
        case ErrorCode.DeferredPayment:
        case ErrorCode.Pending:
          // "Ask to Buy" and similar: the purchase is real but not approved
          // yet. It must not read as an error, and must not look complete.
          setStoreNotice(
            'Your purchase is waiting for approval. Pro unlocks automatically once it is approved.',
          );
          return;
        case ErrorCode.NetworkError:
          setStoreError('The App Store could not be reached. Check your connection and try again.');
          return;
        case ErrorCode.ItemUnavailable:
          setStoreError('LandHere Pro is not available on this account or in this region right now.');
          return;
        default:
          setStoreError(error.message || 'Purchase could not be completed. Please try again.');
      }
    }, []),
    onError: useCallback((error: Error) => {
      setStoreError(error.message || 'The store is unavailable right now.');
    }, []),
  });

  const connectedOnce = useRef(false);
  useEffect(() => {
    if (!connected || connectedOnce.current) return;
    connectedOnce.current = true;
    fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'in-app' }).catch(() => {});
  }, [connected, fetchProducts]);

  async function handlePurchase() {
    if (buying || restoring || !connected) return;
    setBuying(true);
    setStoreError(null);
    setStoreNotice(null);
    try {
      await requestPurchase({
        request: {
          apple: { sku: PRO_PRODUCT_ID },
          google: { skus: [PRO_PRODUCT_ID] },
        },
        type: 'in-app',
      });
    } catch {
      // onPurchaseError reports the reason; this only clears the spinner for
      // failures that never reach the listener.
      setBuying(false);
    }
  }

  /**
   * Restore a previous purchase.
   *
   * Uses the root `getAvailablePurchases`, which RESOLVES with the list, rather
   * than the hook method, which returns void and updates state asynchronously.
   * The hook version forced a "wait and see if state changed" timer, and a
   * timer racing StoreKit is how you get a spinner that never stops or a
   * "nothing found" message that arrives just before the purchase does.
   */
  async function handleRestore() {
    if (restoring || buying) return;
    setRestoring(true);
    setStoreError(null);
    setStoreNotice('Checking your Apple account…');
    try {
      await restorePurchases();
      const owned = await getAvailablePurchases();
      const match = (owned ?? []).find((p) => p.productId === PRO_PRODUCT_ID);
      if (!match) {
        setStoreNotice(null);
        setStoreError(`No previous LandHere Pro purchase found for this ${STORE_ACCOUNT}.`);
        return;
      }
      const ok = await submitToServer(match);
      if (!ok) {
        setStoreNotice(null);
        return; // submitToServer has already set a specific message
      }
      setStoreNotice('LandHere Pro restored.');
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        goBack();
      }
    } catch (e) {
      setStoreNotice(null);
      setStoreError(getErrorMessage(e, 'Unable to reach the store. Please check your connection.'));
    } finally {
      setRestoring(false);
    }
  }

  // Keep the ref pointing at the current closure (see restoreRef above).
  useEffect(() => {
    restoreRef.current = handleRestore;
  });

  const product = products.find((p) => p.id === PRO_PRODUCT_ID);
  // Falls back only if StoreKit has not answered yet; App Store Connect is the
  // authority on price, including in other currencies and storefronts.
  const displayPrice = product?.displayPrice ?? '$1.99';
  const canBuy = connected && !buying && !restoring;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[st.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={[st.backBtn, { backgroundColor: colors.surfaceAlt }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[st.container, { paddingBottom: insets.bottom + 40 }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.sneakOuter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {GHOST_ROWS.map((row, i) => (
            <View
              key={row.initials}
              style={[
                st.ghostRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: Math.max(0.10, 0.38 - i * 0.08),
                },
              ]}
            >
              <LinearGradient
                colors={GHOST_GRADS[i]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.ghostTile}
              >
                <Text style={st.ghostInitials}>{row.initials}</Text>
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[st.ghostName, { color: colors.textPrimary }]} numberOfLines={1}>{row.name}</Text>
                <Text style={[st.ghostMeta, { color: colors.textSecondary }]}>{row.state}</Text>
                <Text style={[st.ghostTuition, { color: colors.textPrimary }]}>{row.tuition} intl/yr</Text>
              </View>
              <View style={st.ghostScore}>
                <Text style={[st.ghostScoreNum, { color: colors.primary }]}>{row.score}</Text>
                <Text style={[st.ghostScoreLbl, { color: colors.textTertiary }]}>SCORE</Text>
              </View>
            </View>
          ))}
          <LinearGradient
            colors={['transparent', colors.bg] as [string, string]}
            locations={[0, 1]}
            style={st.sneakFade}
            pointerEvents="none"
          />
          <View style={[st.lockPill, { backgroundColor: colors.surface }]}>
            <Ionicons name="lock-closed" size={16} color={colors.primary} />
            <Text style={[st.lockPillText, { color: colors.textPrimary }]}>Unlock everything for {displayPrice}</Text>
          </View>
        </View>

        <View style={st.hero}>
          <View style={[st.logoWrap, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="airplane" size={32} color={colors.primary} />
          </View>
          <Text style={[st.heroTitle, { color: colors.textPrimary }]} accessibilityRole="header">
            One unlock.{'\n'}The whole journey.
          </Text>
          <Text style={[st.heroSub, { color: colors.textSecondary }]}>
            Every journey phase, all 500+ ranked universities and their detail pages —{' '}
            {displayPrice} once, no subscription. Scholarships, work-hour rules, the
            arrival checklist and our scoring methodology stay free.
          </Text>
        </View>

        <View style={[st.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[
                st.featureRow,
                i < FEATURES.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border + '60' },
              ]}
              accessibilityLabel={`${f.label}. ${f.sub}`}
            >
              <View style={[st.featureIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.featureLabel, { color: colors.textPrimary }]}>{f.label}</Text>
                <Text style={[st.featureSub, { color: colors.textSecondary }]}>{f.sub}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ opacity: 0.7 }} />
            </View>
          ))}
        </View>

        {!connected ? (
          <View style={st.offlineRow} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={14} color={colors.textSecondary} />
            <Text style={[st.offlineText, { color: colors.textSecondary }]}>Connecting to store…</Text>
          </View>
        ) : null}

        {storeNotice ? (
          <View
            style={[st.errorBox, { backgroundColor: colors.primary + '14' }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={[st.errorText, { color: colors.textPrimary }]}>{storeNotice}</Text>
          </View>
        ) : null}

        {storeError ? (
          <View
            style={[st.errorBox, { backgroundColor: colors.danger + '1A' }]}
            accessibilityLiveRegion="assertive"
          >
            <Text style={[st.errorText, { color: colors.danger }]}>{storeError}</Text>
          </View>
        ) : null}

        <PressableScale
          onPress={handlePurchase}
          disabled={!canBuy}
          style={[st.ctaBtn, { backgroundColor: colors.primary }, !canBuy && st.ctaDisabled]}
          accessibilityRole="button"
          accessibilityLabel={`Buy LandHere Pro for ${displayPrice}, one-time purchase`}
          accessibilityState={{ disabled: !canBuy, busy: buying }}
        >
          {buying ? (
            <ActivityIndicator color="#fff" accessibilityLabel="Completing your purchase" />
          ) : (
            <Text style={st.ctaText}>Unlock Everything — {displayPrice}</Text>
          )}
        </PressableScale>

        <Text style={[st.legal, { color: colors.textTertiary }]}>
          One-time payment · No subscription
        </Text>

        <PressableScale
          onPress={handleRestore}
          disabled={restoring || buying}
          style={st.restoreBtn}
          accessibilityRole="button"
          accessibilityLabel="Restore a previous LandHere Pro purchase"
          accessibilityState={{ disabled: restoring || buying, busy: restoring }}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} accessibilityLabel="Restoring your purchase" />
          ) : (
            <Text style={[st.restoreText, { color: colors.textSecondary }]}>
              Restore Purchases
            </Text>
          )}
        </PressableScale>

        <Text style={[st.terms, { color: colors.textTertiary }]}>
          Payment charged to your{' '}
          {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play account'} at confirmation.
          One-time purchase — no recurring charges. Refunds are handled by{' '}
          {Platform.OS === 'ios' ? 'Apple' : 'Google'}.
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 4 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  container: { paddingHorizontal: 24, alignItems: 'center' },

  sneakOuter: { width: '100%', marginBottom: 20, position: 'relative', paddingTop: 4 },
  ghostRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 13, borderRadius: 14, borderWidth: 1, marginBottom: 9,
  },
  ghostTile: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ghostInitials: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  ghostName: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2, marginBottom: 3 },
  ghostMeta: { fontSize: 12, marginBottom: 3 },
  ghostTuition: { fontSize: 12, fontWeight: '700' },
  ghostScore: { alignItems: 'center', paddingLeft: 10 },
  ghostScoreNum: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  ghostScoreLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  sneakFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  lockPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 99, marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  lockPillText: { fontSize: 14, fontWeight: '800' },

  hero: { alignItems: 'center', marginBottom: 24 },
  logoWrap: {
    width: 62, height: 62, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '800', textAlign: 'center',
    letterSpacing: -0.5, lineHeight: 32, marginBottom: 10,
  },
  heroSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 300 },

  featureCard: {
    width: '100%', borderRadius: 16,
    paddingVertical: 4, paddingHorizontal: 16,
    marginBottom: 24, borderWidth: 1,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
  },
  featureIcon: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  featureLabel: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  featureSub: { fontSize: 12, lineHeight: 16, marginTop: 2 },

  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, opacity: 0.7 },
  offlineText: { fontSize: 13 },
  errorBox: { width: '100%', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, textAlign: 'center' },

  ctaBtn: {
    width: '100%', borderRadius: 99, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', minHeight: 54,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  legal: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  restoreBtn: {
    paddingVertical: 10, paddingHorizontal: 24, minHeight: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  restoreText: { fontSize: 14, textDecorationLine: 'underline' },
  terms: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12, maxWidth: 300 },
});
