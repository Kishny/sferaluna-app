import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../../components/LinearGradient';
import { OrbitGlow } from '../../components/OrbitGlow';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, MoonStars, Heart, ShieldCheck, EnvelopeSimple } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, ACCENT_BARS } from '../../lib/theme';
import { NP } from '../../components/NP';

// L'équipe réelle n'est pas encore publiée — voir équivalent web (src/app/equipe/page.tsx).
// Cards "pôles" plutôt que profils inventés, en attendant le dévoilement officiel.
const TEAM_PREVIEW = [
  {
    emoji: '🌙',
    title: 'Direction créative',
    role: 'Vision produit',
    gradient: ['#7C3AED', '#DB2777'] as [string, string],
  },
  {
    emoji: '🛡️',
    title: 'Modération',
    role: 'Sécurité & confiance',
    gradient: ['#6D28D9', '#EC4899'] as [string, string],
  },
  {
    emoji: '💻',
    title: 'Tech & plateforme',
    role: 'Développement',
    gradient: ['#4C1D95', '#BE185D'] as [string, string],
  },
  {
    emoji: '💬',
    title: 'Expérience membre',
    role: 'Communauté',
    gradient: ['#5B21B6', '#9D174D'] as [string, string],
  },
];

const VALUES = [
  {
    emoji: '🌙',
    title: 'Authenticité lunaire',
    text: "Nous croyons que les connexions vraies naissent de la vulnérabilité. Aucun filtre excessif, aucun personnage — juste vous.",
  },
  {
    emoji: '🛡️',
    title: 'Sécurité avant tout',
    text: "Vérification d'identité, modération humaine, signalement rapide — la sécurité des membres est notre priorité absolue.",
  },
  {
    emoji: '💜',
    title: 'Expérience féminine',
    text: "Conçue par et pour les femmes. Chaque décision produit est passée au filtre de l'expérience féminine réelle.",
  },
  {
    emoji: '✨',
    title: 'Croissance douce',
    text: "Nous préférons une communauté saine et engagée à une croissance rapide et toxique. La qualité prime sur la quantité.",
  },
];

export default function EquipeScreen() {
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
            <Text style={styles.title}>Notre équipe</Text>
            <Text style={styles.subtitle}>{"L'équipe SferaLuna se dévoilera bientôt"}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Mission banner */}
          <LinearGradient
            colors={['rgba(124,58,237,0.18)', 'rgba(219,39,119,0.14)']}
            style={styles.missionBanner}
          >
            <MoonStars size={22} color={Colors.accentPink} weight="duotone" />
            <Text style={styles.missionText}>
              Nous construisons une expérience de rencontres plus sûre, plus humaine et plus élégante pour les femmes.
            </Text>
          </LinearGradient>

          {/* Aperçu de l'équipe (pôles, pas de profils inventés) */}
          <Text style={styles.sectionTitle}>{"Les pôles SferaLuna"}</Text>
          <Text style={styles.sectionSubtitle}>
            Les profils réels seront ajoutés plus tard. La structure est déjà prête pour accueillir les futures cards.
          </Text>
          {TEAM_PREVIEW.map((member) => (
            <View key={member.title} style={styles.memberCard}>
              <LinearGradient colors={member.gradient} style={styles.memberAvatar}>
                <Text style={styles.memberInitials}>{member.emoji}</Text>
              </LinearGradient>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.title}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>bientôt</Text>
              </View>
            </View>
          ))}

          {/* Valeurs */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Nos valeurs</Text>
          <View style={styles.valuesGrid}>
            {VALUES.map((v, index) => (
              <View key={v.title} style={styles.valueCard}>
                <LinearGradient colors={ACCENT_BARS[index % ACCENT_BARS.length]} style={styles.valueAccent} />
                <Text style={styles.valueEmoji}>{v.emoji}</Text>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueText}>{v.text}</Text>
              </View>
            ))}
          </View>

          {/* Stats */}
          <LinearGradient
            colors={['rgba(124,58,237,0.14)', 'rgba(219,39,119,0.10)']}
            style={styles.statsRow}
          >
            <View style={styles.stat}>
              <Text style={styles.statNum}>28+</Text>
              <Text style={styles.statLabel}>Âge minimum</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <ShieldCheck size={20} color={Colors.accentPink} weight="duotone" />
              <Text style={styles.statLabel}>Vérification identité</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <NP><Heart size={20} color={Colors.accentPink} weight="duotone" />
              </NP><Text style={styles.statLabel}>Communauté bienveillante</Text>
            </View>
          </LinearGradient>

          {/* CTA contact */}
          <View style={styles.contactCta}>
            <Text style={styles.contactCtaText}>Une question pour l'équipe ?</Text>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => router.push('/(app)/contact' as any)}
              activeOpacity={0.85}
            >
              <NP><EnvelopeSimple size={15} color={Colors.accentPink} weight="duotone" />
              </NP><Text style={styles.contactBtnText}>Nous contacter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 16 },
  missionBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 16, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  missionText: { flex: 1, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 20, fontStyle: 'italic' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  sectionSubtitle: { fontSize: 12.5, color: Colors.textMuted, lineHeight: 17, marginTop: -8 },
  memberCard: {
    flexDirection: 'row', gap: 14, alignItems: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.xl, padding: 14,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  memberInitials: { fontSize: 18, color: '#fff' },
  memberInfo: { flex: 1, gap: 3 },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  memberRole: { fontSize: 12, color: Colors.accentPink, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  soonBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    backgroundColor: 'rgba(219,39,119,0.12)',
  },
  soonBadgeText: { fontSize: 10.5, fontWeight: '700', color: Colors.accentPink },
  valuesGrid: { gap: 10 },
  valueCard: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.xl, padding: 16, paddingLeft: 19, gap: 6, overflow: 'hidden',
  },
  valueAccent: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3 },
  valueEmoji: { fontSize: 22 },
  valueTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  valueText: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    padding: 18, borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  stat: { alignItems: 'center', gap: 5, flex: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 14 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  contactCta: { alignItems: 'center', gap: 12, paddingTop: 8 },
  contactCtaText: { fontSize: 14, color: Colors.textSecondary },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 11,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accentPink,
    backgroundColor: 'rgba(219,39,119,0.1)',
  },
  contactBtnText: { fontSize: 14, fontWeight: '600', color: Colors.accentPink },
});
