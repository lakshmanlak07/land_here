import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES } from '../constants/currencies';

interface Props {
  /** Initial "from" currency code (defaults to destination currency). */
  defaultFrom: string;
  /** Initial "to" currency code (defaults to home currency). */
  defaultTo: string;
}

interface LatestResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetches the from→to rate (per 1 unit) from the free Frankfurter API.
 *
 * Note: the old `api.frankfurter.app` host now 301-redirects to
 * `api.frankfurter.dev/v1/...`; we call the canonical host directly so RN's
 * fetch never has to follow a cross-host redirect (which returned an HTML
 * redirect body and broke JSON parsing).
 */
async function fetchRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  const url = `https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`;
  console.log('[CurrencyConverter] fetching', url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`rate fetch failed: HTTP ${res.status}`);
    const data: LatestResponse = await res.json();
    const rate = data.rates?.[to];
    if (typeof rate !== 'number') {
      throw new Error(`rate for ${to} missing in response: ${JSON.stringify(data)}`);
    }
    return rate;
  } catch (err) {
    console.warn('[CurrencyConverter] rate fetch failed for', url, err);
    throw err;
  }
}

/** Rounds to 2 decimals and groups thousands — e.g. "1,234.56". */
function formatMoney(value: number): string {
  const fixed = value.toFixed(2);
  const [whole, decimals] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${decimals}`;
}

/**
 * Live currency converter using ECB daily rates (Frankfurter API, no key).
 * Enter an amount, pick currencies, swap with the middle button. The rate is
 * fetched once per currency pair and the amount is converted locally, so
 * typing doesn't refetch.
 */
export function CurrencyConverter({ defaultFrom, defaultTo }: Props) {
  const { colors, spacing, radius } = useTheme();
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [picking, setPicking] = useState<null | 'from' | 'to'>(null);

  const { data: rate, isLoading, isError, refetch } = useQuery({
    queryKey: ['fx', from, to],
    queryFn: () => fetchRate(from, to),
    staleTime: 1000 * 60 * 60, // ECB publishes once a day; cache for an hour.
  });

  const numeric = parseFloat(amount);
  const hasAmount = !Number.isNaN(numeric);
  const converted = hasAmount && rate !== undefined ? numeric * rate : null;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function pick(code: string) {
    if (picking === 'from') setFrom(code);
    else if (picking === 'to') setTo(code);
    setPicking(null);
  }

  const s = styles(colors, spacing, radius);

  return (
    <View style={s.card}>
      <Text style={s.heading}>Currency converter</Text>
      <Text style={s.sub}>Live daily rates (European Central Bank)</Text>

      {/* Amount */}
      <View style={s.amountRow}>
        <TextInput
          style={s.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          maxLength={12}
        />
      </View>

      {/* From / swap / To */}
      <View style={s.pickerRow}>
        <Pressable style={s.picker} onPress={() => setPicking('from')}>
          <Text style={s.pickerLabel}>From</Text>
          <Text style={s.pickerCode}>{from}</Text>
        </Pressable>

        <Pressable style={s.swapBtn} onPress={swap} hitSlop={8}>
          <Ionicons name="swap-horizontal" size={20} color="#fff" />
        </Pressable>

        <Pressable style={s.picker} onPress={() => setPicking('to')}>
          <Text style={s.pickerLabel}>To</Text>
          <Text style={s.pickerCode}>{to}</Text>
        </Pressable>
      </View>

      {/* Result */}
      <View style={s.result}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : isError ? (
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <Text style={s.errorText}>Rates unavailable — tap to retry</Text>
          </Pressable>
        ) : converted === null ? (
          <Text style={s.resultHint}>Enter an amount to convert</Text>
        ) : (
          <>
            <Text style={s.resultValue}>
              {formatMoney(converted)} {to}
            </Text>
            <Text style={s.resultHint}>
              {formatMoney(numeric)} {from} · 1 {from} = {rate!.toFixed(4)} {to}
            </Text>
          </>
        )}
      </View>

      {/* Currency picker modal */}
      <Modal
        visible={picking !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPicking(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setPicking(null)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                Select {picking === 'from' ? '“from”' : '“to”'} currency
              </Text>
              <Pressable onPress={() => setPicking(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => {
                const active =
                  (picking === 'from' && item.code === from) ||
                  (picking === 'to' && item.code === to);
                return (
                  <Pressable
                    style={[s.currencyRow, active && s.currencyRowActive]}
                    onPress={() => pick(item.code)}
                  >
                    <Text style={s.currencyCode}>{item.code}</Text>
                    <Text style={s.currencyName}>{item.name}</Text>
                    {active && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: spacing.lg,
      gap: spacing.md,
    },
    heading: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    sub: { fontSize: 12, color: colors.textTertiary, marginTop: -spacing.sm },

    amountRow: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.button,
      paddingHorizontal: spacing.lg,
    },
    amountInput: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      paddingVertical: spacing.md,
    },

    pickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    picker: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.button,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    pickerLabel: {
      fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
      textTransform: 'uppercase', color: colors.textTertiary,
    },
    pickerCode: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
    swapBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center',
    },

    result: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 64,
      paddingVertical: spacing.sm,
    },
    resultValue: { fontSize: 26, fontWeight: '900', color: colors.primary },
    resultHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    errorText: { fontSize: 14, fontWeight: '600', color: '#C0392B' },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      maxHeight: '70%',
      paddingBottom: spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomColor: colors.border, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    currencyRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    },
    currencyRowActive: { backgroundColor: colors.surfaceAlt },
    currencyCode: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, width: 52 },
    currencyName: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  });
}
