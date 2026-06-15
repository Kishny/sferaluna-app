import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, MoonStars, Heart, ShieldCheck, EnvelopeSimple } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { NP } from '../../components/NP';

const TEAM = [
  {
    initials: 'SL',
    name: 'Sofia L.',
    role: 'Fondatrice & CEO',
    bio: "Passionnée par les relations saines et la technologie bienveillante. Elle a fondé SferaLuna après avoir vécu les limites des applications de rencontre traditionnelles.",
    gradient: ['#7C3AED', '#DB2777'] as [string, string],
  },
  {
    initials: 'MA',
    name: 'Marie A.',
    role: 'Directrice Produit',
    bio: "Ancienne UX researcher spécialisée en psychologie des relations. Elle veille à ce que chaque fonctionnalité serve l'authenticité et la sécurité des membres.",
    gradient: ['#6D28D9', '#EC4899'] as [string, string],
  },
  {
    initials: 'CJ',
    name: 'Claire J.',
    role: 'Modération & Sécurité',
    bio: "Coordinatrice de la sécurité de la communauté. Elle pilote l'équipe de modération et les processus de vérification d'identité pour maintenir la confiance.",
    gradient: ['#4C1D95', '#BE185D'] as [string, string],
  },
  {
    initials: 'NR',
    name: 'Nina R.',
    role: 'Community Manager',
    bio: "Voix et âme de la communauté SferaLuna. Elle anime les espaces VibeSphere, VibeMentor et les événements Luna avec bienveillance et humour.",
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
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notre équipe</Text>
            <Text style={styles.subtitle}>Les visages derrière SferaLuna</Text>
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
              SferaLuna est née d'une conviction : les femmes méritent un espace de rencontre qui les respecte, les protège et célèbre leur complexité.
            </Text>
          </LinearGradient>

          {/* Équipe */}
          <Text style={styles.sectionTitle}>{"L'équipe"}</Text>
          {TEAM.map((member) => (
            <View key={member.name} style={styles.memberCard}>
              <LinearGradient colors={member.gradient} style={styles.memberAvatar}>
                <Text style={styles.memberInitials}>{member.initials}</Text>
              </LinearGradient>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
                <Text style={styles.memberBio}>{member.bio}</Text>
              </View>
            </View>
          ))}

          {/* Valeurs */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Nos valeurs</Text>
          <View style={styles.valuesGrid}>
            {VALUES.map((v) => (
              <View key={v.title} style={styles.valueCard}>
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
  bg: { flex: 1 },
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
  memberCard: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.xl, padding: 14,
  },
  memberAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  memberInitials: { fontSize: 17, fontWeight: '800', color: '#fff' },
  memberInfo: { flex: 1, gap: 3 },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  memberRole: { fontSize: 12, color: Colors.accentPink, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  memberBio: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 4 },
  valuesGrid: { gap: 10 },
  valueCard: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.xl, padding: 16, gap: 6,
  },
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
