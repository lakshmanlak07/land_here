import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { PressableScale } from '../components/PressableScale';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_DISCLAIMER } from '../constants/scholarshipSources';


function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    hero: { paddingHorizontal: spacing.lg, paddingBottom: 46 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    glassBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 14 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 3 },

    note: {
      flexDirection: 'row', gap: 11, alignItems: 'flex-start',
      marginHorizontal: spacing.lg, marginTop: -22, padding: 14,
      borderRadius: 16, borderWidth: 1,
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    noteIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    noteText: { flex: 1, fontSize: 12, lineHeight: 18 },

    chipsRow: { paddingHorizontal: spacing.lg, paddingTop: 18, paddingBottom: 4, gap: 9 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99 },
    chipActiveShadow: { shadowColor: '#A4133C', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
    chipText: { fontSize: 13 },

    list: { paddingHorizontal: spacing.lg, paddingTop: 8, gap: 12 },
    card: { borderRadius: radius.lg, borderWidth: 1, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    regionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    regionText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
    cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, lineHeight: 20, marginTop: 11 },
    cardDesc: { fontSize: 12.5, marginTop: 4, lineHeight: 18 },
    cardLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 },
    cardLinkText: { fontSize: 12, fontWeight: '700' },
  });
}
