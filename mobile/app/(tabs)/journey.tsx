import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, Linking, StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { useProgressStore } from '../../lib/progressStore';
import { PressableScale } from '../../components/PressableScale';
import { getCountryName } from '../../constants/countries';
import { SkeletonCard } from '../../components/Skeleton';
import type { JourneyOut, InfoStep } from '../../lib/types';

const PHASE_META: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  after_acceptance: { label: 'After Acceptance', icon: 'checkmark-circle-outline' },
  visa_process: { label: 'Visa & Documents', icon: 'document-text-outline' },
  before_departure: { label: 'Before Departure', icon: 'airplane-outline' },
  after_arrival: { label: 'After Arrival', icon: 'home-outline' },
};

const cname = (code: string | null | undefined) => (code ? getCountryName(code) : '');

// User's self-reported onboarding stage → the journey phase it corresponds to.
// Only used to pick the initial "NOW" anchor for users who haven't checked off
// any steps yet (see below); never overrides real progress.
const STAGE_TO_PHASE: Record<string, string> = {
  deciding: 'before_applying',
  accepted: 'after_acceptance',
  visa_process: 'visa_process',
  about_to_fly: 'before_departure',
  landed: 'after_arrival',
};


function nodeRing(color: string) {
  return { shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, borderWidth: 5, borderColor: color };
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    hero: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    glassBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    corridorRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
    corridorText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
    heroTitle: { fontSize: 27, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 8 },
    progressCard: {
      flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16,
      backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    },
    progressTop: { position: 'absolute', left: 14, right: 14, top: 11, flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
    progressTrack: { flex: 1, height: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden', marginTop: 22 },
    progressFill: { height: 7, borderRadius: 99, backgroundColor: '#fff' },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
    emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 11, borderRadius: radius.button },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    legend: { flexDirection: 'row', gap: 9, paddingHorizontal: spacing.lg, paddingTop: 18, paddingBottom: 4, flexWrap: 'wrap' },
    legendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
    legendText: { fontSize: 11.5, fontWeight: '700' },

    timeline: { paddingHorizontal: spacing.lg, paddingTop: 14 },
    tlRow: { flexDirection: 'row', gap: 14 },
    rail: { width: 34, alignItems: 'center', flexShrink: 0 },
    node: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    nodeNum: { fontSize: 13, fontWeight: '800' },
    line: { width: 2, flex: 1, minHeight: 18, marginVertical: 3 },

    card: { flex: 1, marginBottom: 16, borderRadius: 18, borderWidth: 1, padding: 15 },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', letterSpacing: -0.2, lineHeight: 19 },
    nowBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
    nowText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: '#fff' },
    cardDesc: { fontSize: 12.5, lineHeight: 19, marginTop: 6 },
    cardTags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
    tagText: { fontSize: 11, fontWeight: '700' },
    sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, borderWidth: 1, maxWidth: 180 },
    sourceText: { fontSize: 11, fontWeight: '600' },
    disclosure: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
    disclosureText: { flex: 1, fontSize: 11.5, lineHeight: 17 },

    // Phase section headers
    phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14, paddingHorizontal: 2, marginTop: 6 },
    phaseIconBox: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    phaseLabel: { flex: 1, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.1 },
    phaseCount: { fontSize: 12, fontWeight: '700' },
  });
}
