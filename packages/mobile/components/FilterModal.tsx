import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X, Check, Lock, MapPin, ArrowCounterClockwise,
} from 'phosphor-react-native';
import { Colors, Spacing, Radius, Typography } from '../lib/theme';
import { GlassInput } from './GlassInput';
import { GradientButton } from './GradientButton';
import type { DiscoverFilters } from '../lib/api';
import { NP } from '../components/NP';

// Bornes côté serveur : l'âge minimum cible de SferaLuna est 28 ans
// (cf. /api/profiles — clamp [28, 120]).
const AGE_FLOOR = 28;
const AGE_CEIL = 120;

const AGE_RANGES: { label: string; min: number; max: number }[] = [
  { label: 'Tous les âges', min: AGE_FLOOR, max: AGE_CEIL },
  { label: '28 – 35 ans', min: 28, max: 35 },
  { label: '36 – 45 ans', min: 36, max: 45 },
  { label: '46 – 55 ans', min: 46, max: 55 },
  { label: '56 ans et +', min: 56, max: AGE_CEIL },
];

// Valeurs alignées sur src/app/inscription/steps/Step2.tsx (web)
const INTENTIONS = [
  { value: 'rencontre-serieuse', label: 'Rencontre sérieuse' },
  { value: 'amitie', label: 'Amitié' },
  { value: 'aventure', label: 'Aventure' },
  { value: 'reseautage', label: 'Réseautage' },
  { value: 'discussion', label: 'Discussion' },
];

const ORIENTATIONS = [
  { value: 'hetero', label: 'Hétérosexuelle' },
  { value: 'homo', label: 'Lesbienne / Homosexuelle' },
  { value: 'bi', label: 'Bisexuelle' },
  { value: 'pan', label: 'Pansexuelle' },
  { value: 'curieuse', label: 'Curieuse' },
];

const EMPTY_FILTERS: DiscoverFilters = {};

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: DiscoverFilters) => void;
  initialFilters: DiscoverFilters;
  /** Reflète filters.userIsPremium renvoyé par /api/profiles : déverrouille
   * orientation et actif_recemment, filtres premium côté serveur. */
  isPremium: boolean;
}

export function FilterModal({
  visible, onClose, onApply, initialFilters, isPremium,
}: Props) {
  const [draft, setDraft] = useState<DiscoverFilters>(initialFilters);

  // Resynchronise le brouillon à chaque ouverture pour refléter les filtres actifs
  useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const selectedRangeIndex = AGE_RANGES.findIndex(
    (r) => r.min === (draft.ageMin ?? AGE_FLOOR) && r.max === (draft.ageMax ?? AGE_CEIL),
  );

  const toggleIntention = (value: string) => {
    const current = draft.intentions ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setDraft({ ...draft, intentions: next });
  };

  const selectAgeRange = (min: number, max: number) => {
    if (min === AGE_FLOOR && max === AGE_CEIL) {
      setDraft({ ...draft, ageMin: undefined, ageMax: undefined });
    } else {
      setDraft({ ...draft, ageMin: min, ageMax: max });
    }
  };

  const selectOrientation = (value: string) => {
    if (!isPremium) return;
    setDraft({ ...draft, orientation: draft.orientation === value ? undefined : value });
  };

  const handleReset = () => setDraft(EMPTY_FILTERS);
  const handleApply = () => onApply(draft);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Filtres de découverte</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <NP><X size={20} color={Colors.textSecondary} /></NP>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Tranche d'âge */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tranche d'âge</Text>
              <View style={styles.chipsWrap}>
                {AGE_RANGES.map((range, i) => {
                  const active = i === selectedRangeIndex
                    || (selectedRangeIndex === -1 && i === 0 && !draft.ageMin && !draft.ageMax);
                  return (
                    <TouchableOpacity
                      key={range.label}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => selectAgeRange(range.min, range.max)}
                      activeOpacity={0.8}
                    >
                      {active && <NP><Check size={14} color="#fff" weight="bold" style={styles.chipIcon} /></NP>}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{range.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Intentions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Intentions recherchées</Text>
              <View style={styles.chipsWrap}>
                {INTENTIONS.map((intention) => {
                  const active = (draft.intentions ?? []).includes(intention.value);
                  return (
                    <TouchableOpacity
                      key={intention.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleIntention(intention.value)}
                      activeOpacity={0.8}
                    >
                      {active && <NP><Check size={14} color="#fff" weight="bold" style={styles.chipIcon} /></NP>}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{intention.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Localisation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Localisation</Text>
              <GlassInput
                placeholder="Ville (ex : Lyon, Paris…)"
                value={draft.localisation ?? ''}
                onChangeText={(text) => setDraft({ ...draft, localisation: text })}
                icon={<MapPin size={18} color={Colors.textMuted} />}
                style={styles.inputCompact}
              />
            </View>

            {/* Orientation — premium */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Orientation</Text>
                {!isPremium && (
                  <View style={styles.lockedBadge}>
                    <Lock size={12} color="#F59E0B" weight="fill" />
                    <Text style={styles.lockedBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
              {!isPremium && (
                <Text style={styles.upsellText}>
                  Filtrer par orientation est réservé aux membres Premium et Élite.
                </Text>
              )}
              <View style={[styles.chipsWrap, !isPremium && styles.disabledGroup]}>
                {ORIENTATIONS.map((orientation) => {
                  const active = draft.orientation === orientation.value;
                  return (
                    <TouchableOpacity
                      key={orientation.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => selectOrientation(orientation.value)}
                      activeOpacity={isPremium ? 0.8 : 1}
                      disabled={!isPremium}
                    >
                      {active && <NP><Check size={14} color="#fff" weight="bold" style={styles.chipIcon} /></NP>}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{orientation.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Actif récemment — premium */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Actives récemment</Text>
                    {!isPremium && (
                      <View style={styles.lockedBadge}>
                        <Lock size={12} color="#F59E0B" weight="fill" />
                        <Text style={styles.lockedBadgeText}>Premium</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.toggleHint}>
                    {isPremium
                      ? 'Afficher uniquement les profils actifs ces 7 derniers jours'
                      : 'Réservé aux membres Premium et Élite'}
                  </Text>
                </View>
                <Switch
                  value={!!draft.actifRecemment && isPremium}
                  onValueChange={(value) => { if (isPremium) setDraft({ ...draft, actifRecemment: value }); }}
                  disabled={!isPremium}
                  trackColor={{ false: Colors.glassBg, true: Colors.accentPurple }}
                  thumbColor={draft.actifRecemment && isPremium ? '#fff' : Colors.textMuted}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <NP><ArrowCounterClockwise size={16} color={Colors.textSecondary} />
              </NP><Text style={styles.resetText}>Réinitialiser</Text>
            </TouchableOpacity>
            <GradientButton label="Appliquer les filtres" onPress={handleApply} style={styles.applyBtn} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgDeep,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.glassBorder,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  title: { ...Typography.h2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, fontSize: 15 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
  },
  chipIcon: { marginRight: 6 },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  disabledGroup: { opacity: 0.45 },
  inputCompact: { marginBottom: 0 },
  upsellText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockedBadgeText: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  toggleHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resetText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  applyBtn: { flex: 1 },
});

export { EMPTY_FILTERS };
