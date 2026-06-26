import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES } from '../constants/currencies';

interface Props {
  /** Initial "from" currency code. */
  defaultFrom: string;
  /** Initial "to" currency code. */
  defaultTo: string;
}

interface LatestResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

// Common symbols; falls back to the code when not listed.
const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$',
  JPY: '¥', CNY: '¥', SGD: 'S$', CHF: 'Fr', NZD: 'NZ$', AED: 'د.إ',
};
const sym = (code: string) => SYMBOLS[code] ?? code;

const QUICK = [100, 1000, 10000, 50000];

/**
 * Fetches the full per-1-unit rate table for `from` from the free Frankfurter
 * API (ECB daily rates). One call powers the conversion, the rate line and the
 * "common pairs" reference list, so typing never refetches.
 */
async function fetchRates(from: string): Promise<Record<string, number>> {
  const url = `https://api.frankfurter.dev/v1/latest?from=${from}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`rate fetch failed: HTTP ${res.status}`);
  const data: LatestResponse = await res.json();
  if (!data.rates || typeof data.rates !== 'object') throw new Error('rates missing in response');
  return { ...data.rates, [from]: 1 };
}

function formatMoney(value: number): string {
  if (value >= 1000) return Math.round(value).toLocaleString('en-US');
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function CurrencyConverter({ defaultFrom, defaultTo }: Props) {
  const { colors, spacing, radius, isDark } = useTheme();
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [picking, setPicking] = useState<null | 'from' | 'to'>(null);

  const { data: rates, isLoading, isError, refetch } = useQuery({
    queryKey: ['fx', from],
    queryFn: () => fetchRates(from),
    staleTime: 1000 * 60 * 60,
  });

  const numeric = parseFloat(amount.replace(/,/g, ''));
  const hasAmount = !Number.isNaN(numeric);
  const rate = rates ? (from === to ? 1 : rates[to]) : undefined;
  const converted = hasAmount && rate !== undefined ? numeric * rate : null;

  function swap() { setFrom(to); setTo(from); }
  function pick(code: string) {
    if (picking === 'from') setFrom(code);
    else if (picking === 'to') setTo(code);
    setPicking(null);
  }

  // Reference pairs — a few majors other than `from`, with live rates.
  const refCodes = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'].filter((c) => c !== from);
  const refs = rates
    ? refCodes.filter((c) => typeof rates[c] === 'number').slice(0, 5).map((c) => ({ code: c, value: formatMoney(rates[c]) }))
    : [];

  const s = styles(colors, spacing, radius);

  return (
    <View style={s.card}>
      {/* YOU HAVE */}
      <View style={s.block}>
        <View style={s.blockHead}>
          <Text style={[s.blockLabel, { color: colors.textTertiary }]}>YOU HAVE</Text>
          <Pressable
            style={[s.curPill, { backgroundColor: colors.primarySubtle }]}
            onPress={() => setPicking('from')}
            accessibilityRole="button"
            accessibilityLabel={`Change the currency you have, currently ${from}`}
          >
            <Text style={[s.curPillText, { color: colors.primary }]}>{from}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.primary} />
          </Pressable>
        </View>
        <View style={s.amountRow}>
          <Text style={[s.symbol, { color: colors.textTertiary }]}>{sym(from)}</Text>
          <TextInput
            style={[s.amountInput, { color: colors.textPrimary }]}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            maxLength={12}
          />
        </View>
      </View>

      {/* Divider + swap */}
      <View style={[s.divider, { backgroundColor: colors.border }]}>
        <Pressable
          style={[s.swapBtn, { backgroundColor: colors.primary }]}
          onPress={swap}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Swap the two currencies"
        >
          <Ionicons name="swap-vertical" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* THEY GET */}
      <View style={[s.block, s.toBlock, { backgroundColor: colors.primarySubtle }]}>
        <View style={s.blockHead}>
          <Text style={[s.blockLabel, { color: colors.primary }]}>THEY GET</Text>
          <Pressable
            style={[s.curPill, { backgroundColor: colors.surface }]}
            onPress={() => setPicking('to')}
            accessibilityRole="button"
            accessibilityLabel={`Change the currency they get, currently ${to}`}
          >
            <Text style={[s.curPillText, { color: colors.textPrimary }]}>{to}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={s.amountRow}>
          <Text style={[s.symbol, { color: colors.primary }]}>{sym(to)}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
          ) : isError ? (
            <Pressable onPress={() => refetch()}><Text style={[s.errorText, { color: colors.danger }]}>Rates unavailable — tap to retry</Text></Pressable>
          ) : (
            <Text style={[s.resultValue, { color: colors.textPrimary }]}>{converted === null ? '—' : formatMoney(converted)}</Text>
          )}
        </View>
      </View>

      {/* Rate line */}
      {!isLoading && !isError && rate !== undefined && (
        <Text style={[s.rateLine, { color: colors.textSecondary }]}>
          1 {from} = <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{rate.toLocaleString('en-US', { maximumFractionDigits: rate < 1 ? 4 : 2 })}</Text> {to}
        </Text>
      )}

      {/* Quick amounts */}
      <View style={s.quickRow}>
        {QUICK.map((v) => {
          const active = amount === String(v);
          return (
            <Pressable
              key={v}
              onPress={() => setAmount(String(v))}
              style={[s.quickChip, active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            >
              <Text style={[s.quickText, { color: active ? '#fff' : colors.textSecondary }]}>{v.toLocaleString('en-US')}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Common pairs reference */}
      {refs.length > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[s.refTitle, { color: colors.textSecondary }]}>Common pairs from {from}</Text>
          <View style={[s.refCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {refs.map((r, i) => (
              <View key={r.code} style={[s.refRow, i < refs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={s.refLeft}>
                  <View style={[s.refSym, { backgroundColor: colors.primarySubtle }]}>
                    <Text style={[s.refSymText, { color: colors.primary }]}>{sym(r.code)}</Text>
                  </View>
                  <Text style={[s.refCode, { color: colors.textPrimary }]}>{r.code}</Text>
                </View>
                <Text style={[s.refValue, { color: colors.textPrimary }]}>{r.value}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.refNote, { color: colors.textTertiary }]}>
            Indicative ECB mid-market rates for planning. Your bank's rate at transfer will differ.
          </Text>
        </View>
      )}

      {/* Currency picker modal */}
      <Modal visible={picking !== null} animationType="slide" transparent onRequestClose={() => setPicking(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setPicking(null)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.bg }]} onPress={() => {}}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Select {picking === 'from' ? '“from”' : '“to”'} currency</Text>
              <Pressable onPress={() => setPicking(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close currency picker"><Ionicons name="close" size={22} color={colors.textSecondary} /></Pressable>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => {
                const active = (picking === 'from' && item.code === from) || (picking === 'to' && item.code === to);
                return (
                  <Pressable style={[s.currencyRow, active && { backgroundColor: colors.surfaceAlt }]} onPress={() => pick(item.code)}>
                    <Text style={[s.currencyCode, { color: colors.textPrimary }]}>{item.code}</Text>
                    <Text style={[s.currencyName, { color: colors.textSecondary }]}>{item.name}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
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
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl, padding: 8 },
    block: { padding: 18, borderRadius: 18 },
    toBlock: { margin: 6 },
    blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    blockLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
    curPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
    curPillText: { fontSize: 14, fontWeight: '800' },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 },
    symbol: { fontSize: 30, fontWeight: '800' },
    amountInput: { flex: 1, fontSize: 34, fontWeight: '800', letterSpacing: -0.5, padding: 0 },
    resultValue: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
    errorText: { fontSize: 14, fontWeight: '600' },

    divider: { height: 1, marginHorizontal: 18, position: 'relative' },
    swapBtn: {
      position: 'absolute', right: 0, top: '50%', marginTop: -21, width: 42, height: 42, borderRadius: 21,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#A4133C', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5,
    },

    rateLine: { textAlign: 'center', fontSize: 12.5, marginTop: 16 },

    quickRow: { flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' },
    quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
    quickText: { fontSize: 12.5, fontWeight: '700' },

    refTitle: { fontSize: 13, fontWeight: '800', marginBottom: 10, paddingHorizontal: 2 },
    refCard: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 6 },
    refRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 6 },
    refLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    refSym: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    refSymText: { fontSize: 14, fontWeight: '800' },
    refCode: { fontSize: 14.5, fontWeight: '700' },
    refValue: { fontSize: 14, fontWeight: '800' },
    refNote: { fontSize: 11.5, lineHeight: 17, marginTop: 12, textAlign: 'center' },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '70%', paddingBottom: 24 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1 },
    modalTitle: { fontSize: 16, fontWeight: '700' },
    currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 },
    currencyCode: { fontSize: 15, fontWeight: '800', width: 52 },
    currencyName: { fontSize: 14, flex: 1 },
  });
}
