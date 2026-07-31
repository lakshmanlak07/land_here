/**
 * paywall.tsx — "Taste → Upgrade" paywall
 *
 * Reached from locked feature screens (rankings, scholarships, work-hours, journey).
 * Shows ghost preview rows so the user can see real content behind the gate.
 * Back button always present — this is NOT a hard block.
 *
 * IAP: com.landhere.app.pro · Non-Consumable · $1.99
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, ScrollView,
  StyleSheet, Text, View, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIAP, finishTransaction, type Purchase } from 'react-native-iap';
import { useTheme } from '../context/ThemeContext';
import { usePurchaseStore } from '../lib/purchaseStore';

// Product identifier for the (disabled) one-time Pro unlock. Kept here rather
// than in lib/ so the shipped bundle contains no reference to it.
const PRODUCT_ID = 'com.landhere.app.pro';
import { PressableScale } from '../components/PressableScale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURES: { icon: IoniconName; label: string; sub: string }[] = [
  { icon: 'trail-sign-outline', label: 'Full relocation journey', sub: 'All steps, all phases — nothing locked mid-flow' },
  { icon: 'trophy-outline', label: 'University rankings', sub: '500+ schools scored for international students' },
  { icon: 'briefcase-outline', label: 'Student work-hour rules', sub: 'Official limits for 9 countries' },
  { icon: 'ribbon-outline', label: 'Scholarship directory', sub: 'Official sources, no spam' },
  { icon: 'cash-outline', label: 'Currency & cost planning', sub: 'Live rates and cost-of-living guide' },
  { icon: 'document-text-outline', label: 'Official visa guidance', sub: 'Human-verified steps, dated sources' },
];

// Ghost rows that hint at premium rankings content behind the gate.
const GHOST_ROWS = [
  { initials: 'MIT', score: '94', name: 'Massachusetts Institute of Technology', state: 'Cambridge, MA', tuition: '~$62k' },
  { initials: 'STA', score: '91', name: 'Stanford University', state: 'Stanford, CA', tuition: '~$65k' },
  { initials: 'HVD', score: '90', name: 'Harvard University', state: 'Cambridge, MA', tuition: '~$59k' },
  { initials: 'CMU', score: '88', name: 'Carnegie Mellon University', state: 'Pittsburgh, PA', tuition: '~$66k' },
];

const STORE_ACCOUNT = Platform.OS === 'ios' ? 'Apple ID' : 'Google account';

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
  const { purchased, setPurchased } = usePurchaseStore();

  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const navigatedRef = useRef(false);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  // Skip paywall if already purchased.
  useEffect(() => {
    if (purchased && !navigatedRef.current) {
      navigatedRef.current = true;
      goBack();
    }
  }, [purchased]);

  // ── IAP hook ───────────────────────────────────────────────────────────────

  const {
    connected, products, availablePurchases,
    fetchProducts, requestPurchase, getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: useCallback(
      async (purchase: Purchase) => {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        try { await finishTransaction({ purchase, isConsumable: false }); } catch {}
        await setPurchased(true);
        setBuying(false);
        goBack();
      },
      [setPurchased],
    ),
    onPurchaseError: useCallback((error: { code?: string; message?: string }) => {
      if (error.code !== 'E_USER_CANCELLED') {
        setStoreError('Purchase could not be completed. Please try again.');
      }
      setBuying(false);
    }, []),
  });

  const connectedOnce = useRef(false);
  useEffect(() => {
    if (!connected || connectedOnce.current) return;
    connectedOnce.current = true;
    fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' }).catch(() => {});
    getAvailablePurchases().catch(() => {});
  }, [connected]);

  useEffect(() => {
    if (navigatedRef.current || availablePurchases.length === 0) return;
    const found = availablePurchases.some((p) => p.productId === PRODUCT_ID);
    if (found) {
      navigatedRef.current = true;
      setPurchased(true).then(() => goBack()).catch(() => {});
    } else if (restoring) {
      setRestoring(false);
      setStoreError(`No previous purchase found for this ${STORE_ACCOUNT}.`);
    }
  }, [availablePurchases]);

  async function handlePurchase() {
    if (buying || restoring || !connected) return;
    setBuying(true);
    setStoreError(null);
    try {
      await requestPurchase({
        request: {
          apple: { sku: PRODUCT_ID },
          google: { skus: [PRODUCT_ID] },
        },
        type: 'in-app',
      });
    } catch {
      setBuying(false);
    }
  }

  async function handleRestore() {
    if (restoring || buying) return;
    setRestoring(true);
    setStoreError(null);
    try {
      await getAvailablePurchases();
      // The useEffect above handles the happy path (purchase found) via
      // availablePurchases state. This timeout only triggers the error message
      // if nothing was found after the IAP response window.
      // The useEffect on availablePurchases handles the happy-path (purchase found)
      // and sets navigatedRef. This timeout fires only when nothing was found —
      // checking navigatedRef avoids reading the stale availablePurchases closure.
      setTimeout(() => {
        if (!navigatedRef.current) {
          setStoreError(`No previous purchase found for this ${STORE_ACCOUNT}.`);
          setRestoring(false);
        }
      }, 1500);
    } catch {
      setStoreError('Unable to reach the store. Please check your connection.');
      setRestoring(false);
    }
  }

  const product = products.find((p) => p.id === PRODUCT_ID);
  const displayPrice = product?.displayPrice ?? '$1.99';
  const canBuy = connected && !buying && !restoring;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back button */}
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
        {/* ── Sneak peek — ghost ranking rows ── */}
        <View style={st.sneakOuter}>
          {GHOST_ROWS.map((row, i) => (
            <View
              key={row.initials}
              aria-hidden={true}
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
          {/* Gradient fade-out */}
          <LinearGradient
            colors={['transparent', colors.bg] as [string, string]}
            locations={[0, 1]}
            style={st.sneakFade}
            pointerEvents="none"
          />
          {/* Lock pill */}
          <View style={[st.lockPill, { backgroundColor: colors.surface }]}>
            <Ionicons name="lock-closed" size={16} color={colors.primary} />
            <Text style={[st.lockPillText, { color: colors.textPrimary }]}>Unlock everything for {displayPrice}</Text>
          </View>
        </View>

        {/* ── Hero ── */}
        <View style={st.hero}>
          <View style={[st.logoWrap, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="airplane" size={32} color={colors.primary} />
          </View>
          <Text style={[st.heroTitle, { color: colors.textPrimary }]}>
            One unlock.{'\n'}Everything you need.
          </Text>
          <Text style={[st.heroSub, { color: colors.textSecondary }]}>
            Full journey, rankings, work rules, scholarships, and visa tools —{' '}
            {displayPrice} once, no subscription.
          </Text>
        </View>

        {/* ── Feature list ── */}
        <View style={[st.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[
                st.featureRow,
                i < FEATURES.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border + '60' },
              ]}
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

        {/* Store offline notice */}
        {!connected && (
          <View style={st.offlineRow}>
            <Ionicons name="cloud-offline-outline" size={14} color={colors.textSecondary} />
            <Text style={[st.offlineText, { color: colors.textSecondary }]}>Connecting to store…</Text>
          </View>
        )}

        {/* Error */}
        {storeError ? (
          <View style={[st.errorBox, { backgroundColor: colors.danger + '1A' }]}>
            <Text style={[st.errorText, { color: colors.danger }]}>{storeError}</Text>
          </View>
        ) : null}

        {/* CTA */}
        <PressableScale
          onPress={handlePurchase}
          disabled={!canBuy}
          style={[st.ctaBtn, { backgroundColor: colors.primary }, !canBuy && st.ctaDisabled]}
          accessibilityRole="button"
          accessibilityLabel={`Unlock LandHere for ${displayPrice}`}
        >
          {buying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={st.ctaText}>Unlock Everything — {displayPrice}</Text>
          )}
        </PressableScale>

        <Text style={[st.legal, { color: colors.textTertiary }]}>
          One-time payment · No subscription
        </Text>

        {/* Restore */}
        <PressableScale
          onPress={handleRestore}
          disabled={restoring || buying}
          style={st.restoreBtn}
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchase"
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[st.restoreText, { color: colors.textSecondary }]}>
              Restore previous purchase
            </Text>
          )}
        </PressableScale>

        <Text style={[st.terms, { color: colors.textTertiary }]}>
          Payment charged to your{' '}
          {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play account'} at confirmation.
          One-time purchase — no recurring charges.
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

  // Sneak peek
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

  // Hero
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

  // Features
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
