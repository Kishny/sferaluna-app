import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../components/LinearGradient';
import { OrbitGlow } from '../../components/OrbitGlow';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CalendarBlank, MapPin, Users, MoonStars, CheckCircle } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, ACCENT_BARS } from '../../lib/theme';
import { fetchEvents, toggleEventRegistration, LunaEvent } from '../../lib/api';
import { NP } from '../../components/NP';

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

function isFuture(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}

function EventCard({ event, index, onToggle, isPending }: {
  event: LunaEvent;
  index: number;
  onToggle: () => void;
  isPending: boolean;
}) {
  const future = isFuture(event.date);
  const full = !!event.capacity && event.registeredCount >= event.capacity && !event.isRegistered;
  const accent = ACCENT_BARS[index % ACCENT_BARS.length];

  return (
    <View style={styles.card}>
      <LinearGradient colors={accent} style={styles.accentBar} />
      {/* Header gradient */}
      <LinearGradient
        colors={['rgba(124,58,237,0.18)', 'rgba(219,39,119,0.12)']}
        style={styles.cardHeader}
      >
        <View style={styles.cardHeaderLeft}>
          {event.isRegistered && (
            <View style={styles.registeredBadge}>
              <NP><CheckCircle size={11} color="#fff" weight="fill" />
              </NP><Text style={styles.registeredBadgeText}>Inscrite</Text>
            </View>
          )}
          {!future && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>Passé</Text>
            </View>
          )}
        </View>
        <MoonStars size={22} color="rgba(255,255,255,0.25)" weight="duotone" />
      </LinearGradient>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{event.title}</Text>

        <View style={styles.metaRow}>
          <CalendarBlank size={13} color={Colors.accentPink} weight="duotone" />
          <Text style={styles.metaText}>{formatEventDate(event.date)}</Text>
        </View>

        <View style={styles.metaRow}>
          <MapPin size={13} color={Colors.accentPink} weight="duotone" />
          <Text style={styles.metaText}>{event.location}</Text>
        </View>

        {event.capacity && (
          <View style={styles.metaRow}>
            <Users size={13} color={Colors.accentPink} weight="duotone" />
            <Text style={styles.metaText}>
              {event.registeredCount} / {event.capacity} participantes
            </Text>
          </View>
        )}

        <Text style={styles.description} numberOfLines={3}>{event.description}</Text>

        {future && (
          <TouchableOpacity
            style={[
              styles.registerBtn,
              event.isRegistered && styles.registerBtnRegistered,
              full && styles.registerBtnFull,
            ]}
            onPress={onToggle}
            disabled={isPending || full}
            activeOpacity={0.85}
          >
            {event.isRegistered ? (
              <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']} style={styles.registerBtnInner}>
                <NP><CheckCircle size={15} color={Colors.accentPink} weight="fill" />
                </NP><Text style={[styles.registerBtnText, { color: Colors.accentPink }]}>
                  {isPending ? "…" : "Me désinscrire"}
                </Text>
              </LinearGradient>
            ) : (
              <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.registerBtnInner}>
                <Text style={styles.registerBtnText}>
                  {isPending ? "…" : full ? "Complet" : "S'inscrire"}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleEventRegistration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const events = data?.events ?? [];
  const upcoming = events.filter((e) => isFuture(e.date));
  const past = events.filter((e) => !isFuture(e.date));
  const sorted = [...upcoming, ...past];

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <OrbitGlow size={280} style={{ top: -60, right: -90 }} />
      <OrbitGlow size={320} style={{ bottom: -100, left: -110 }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Événements Luna</Text>
            <Text style={styles.subtitle}>
              {upcoming.length > 0 ? `${upcoming.length} à venir` : "Aucun événement à venir"}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
          </View>
        ) : isError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyText}>Impossible de charger les événements.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Aucun événement pour l'instant</Text>
            <Text style={styles.emptyText}>Revenez bientôt — la communauté Luna prépare de beaux moments.</Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(e) => e._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.accentPink}
              />
            }
            renderItem={({ item, index }) => (
              <EventCard
                event={item}
                index={index}
                onToggle={() => toggleMutation.mutate(item._id)}
                isPending={toggleMutation.isPending && toggleMutation.variables === item._id}
              />
            )}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.base, paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glassBg, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  retryText: { color: Colors.textPrimary, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: Radius.xl, overflow: 'hidden',
  },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 1 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', gap: 8 },
  registeredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentPink, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  registeredBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  pastBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pastBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  cardBody: { padding: 16, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  description: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 20 },
  registerBtn: { borderRadius: Radius.full, overflow: 'hidden', marginTop: 4 },
  registerBtnRegistered: {},
  registerBtnFull: { opacity: 0.5 },
  registerBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  registerBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
