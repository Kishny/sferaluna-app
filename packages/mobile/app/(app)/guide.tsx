import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, MoonStars } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { NP } from '../../components/NP';

const STEPS = [
  {
    step: '01', emoji: '🌸', title: 'Soignez votre profil',
    body: "Ajoutez une photo authentique, rédigez une bio qui vous ressemble et précisez vos intentions. Un profil complet multiplie par 3 vos chances d'apparaître dans le Circle of Six des autres membres.",
  },
  {
    step: '02', emoji: '🔍', title: 'Explorez Découverte',
    body: "Glissez à droite pour liker, à gauche pour passer. Utilisez les filtres (âge, localisation, intentions) pour affiner votre recherche. Chaque like est discret — seul un match mutuel vous le révèle.",
  },
  {
    step: '03', emoji: '💕', title: 'Célébrez vos matchs',
    body: "Un match se forme quand deux personnes se likent mutuellement. Vous recevez une alerte immédiate. C'est le signal pour engager la conversation — un simple « bonjour » suffit souvent.",
  },
  {
    step: '04', emoji: '💬', title: 'Osez le premier message',
    body: "Ne restez pas sur le match seul. Posez une question ouverte sur leur bio, leurs centres d'intérêt ou leur humeur du jour dans VibeSphere. L'authenticité prime toujours sur la perfection.",
  },
  {
    step: '05', emoji: '✨', title: 'Rejoignez la communauté',
    body: "VibeSphere, VibeMentor, les événements Luna… SferaLuna est bien plus qu'une app de rencontre. Participez à la communauté pour rencontrer des personnes partageant vos valeurs.",
  },
  {
    step: '06', emoji: '🌙', title: 'Proposez un plan',
    body: "Quand la conversation coule naturellement, utilisez VibePlanner pour suggérer une activité concrète : café, balade, appel vidéo. Passer du virtuel au réel est l'étape la plus belle.",
  },
];

const TIPS = [
  { emoji: '🌟', text: "Répondez dans les 48h — les conversations actives sont mieux mises en avant." },
  { emoji: '🛡️', text: "Ne partagez jamais vos coordonnées personnelles avant d'être à l'aise." },
  { emoji: '🎯', text: "Soyez honnête sur vos intentions — cela attire les personnes compatibles." },
  { emoji: '💫', text: "Le Mode Fantôme (Premium+) vous permet d'explorer sans pression." },
];

export default function GuideScreen() {
  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Guide débutant</Text>
            <Text style={styles.subtitle}>Tout ce qu'il faut savoir pour bien commencer</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Intro */}
          <LinearGradient
            colors={['rgba(124,58,237,0.18)', 'rgba(219,39,119,0.14)']}
            style={styles.introBanner}
          >
            <MoonStars size={24} color={Colors.accentPink} weight="duotone" />
            <Text style={styles.introText}>
              Bienvenue sur SferaLuna — un espace pensé pour les rencontres authentiques, au rythme qui vous convient.
            </Text>
          </LinearGradient>

          {/* Étapes */}
          <Text style={styles.sectionTitle}>Les 6 étapes clés</Text>
          {STEPS.map((s) => (
            <View key={s.step} style={styles.stepCard}>
              <View style={styles.stepLeft}>
                <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{s.step}</Text>
                </LinearGradient>
                <View style={styles.stepLine} />
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepEmoji}>{s.emoji}</Text>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                </View>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            </View>
          ))}

          {/* Conseils */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Nos conseils</Text>
          <View style={styles.tipsCard}>
            {TIPS.map((tip, i) => (
              <View key={i} style={[styles.tipRow, i < TIPS.length - 1 && styles.tipBorder]}>
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.ctaBtnGradient}>
              <MoonStars size={17} color="#fff" weight="fill" />
              <Text style={styles.ctaBtnText}>{"C'est parti — explorer Découverte"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
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
  introBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 16, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  introText: { flex: 1, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  stepCard: { flexDirection: 'row', gap: 14, minHeight: 80 },
  stepLeft: { alignItems: 'center', width: 32 },
  stepBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 6, marginBottom: -12 },
  stepContent: { flex: 1, paddingBottom: 16 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  stepEmoji: { fontSize: 16 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  stepBody: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 20 },
  tipsCard: {
    backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, borderRadius: Radius.xl, overflow: 'hidden',
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  tipBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tipEmoji: { fontSize: 18, lineHeight: 22 },
  tipText: { flex: 1, fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19 },
  ctaBtn: { marginTop: 4 },
  ctaBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: Radius.full, paddingVertical: 15,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
