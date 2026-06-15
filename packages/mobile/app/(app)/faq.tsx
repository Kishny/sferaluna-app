import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CaretDown, CaretUp, MoonStars } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { NP } from '../../components/NP';

interface FaqItem { q: string; a: string }
interface FaqSection { title: string; emoji: string; items: FaqItem[] }

const FAQ: FaqSection[] = [
  {
    title: 'Inscription & profil',
    emoji: '🌸',
    items: [
      {
        q: "Qui peut s'inscrire sur SferaLuna ?",
        a: "SferaLuna est réservé aux femmes de 28 ans et plus cherchant des rencontres authentiques et sécurisées. L'accès est contrôlé pour garantir la qualité de la communauté.",
      },
      {
        q: "Comment compléter mon profil ?",
        a: "Rendez-vous dans l'onglet Profil. Plus votre profil est riche (photo, bio, centres d'intérêt, intentions), mieux l'algorithme Circle of Six pourra vous proposer des affinités pertinentes.",
      },
      {
        q: "Puis-je modifier mon pseudo ou mes informations ?",
        a: "Oui, depuis l'onglet Profil en appuyant sur \"Modifier\". Certaines informations saisies à l'inscription (orientation, intentions) sont en lecture seule pour maintenir la fiabilité du profil.",
      },
      {
        q: "Comment fonctionne la vérification d'identité ?",
        a: "La vérification est effectuée via Stripe Identity. Elle est optionnelle mais fortement recommandée — elle affiche un badge sur votre profil et augmente votre score de confiance.",
      },
    ],
  },
  {
    title: 'Matchs & messages',
    emoji: '💕',
    items: [
      {
        q: "Comment se forment les matchs ?",
        a: "Un match se crée lorsque deux utilisatrices se likent mutuellement dans l'écran Découverte. Vous recevez alors une notification et un accès à la messagerie privée.",
      },
      {
        q: "Combien de likes puis-je envoyer par jour ?",
        a: "Le plan Gratuit est limité à 5 likes/jour. Les abonnements Essentiel, Premium et Elite offrent des quotas augmentés ou illimités.",
      },
      {
        q: "Mes messages sont-ils privés ?",
        a: "Oui. Les messages ne sont accessibles qu'aux deux personnes matchées. SferaLuna ne lit pas vos conversations.",
      },
      {
        q: "Que faire si je ne reçois pas de réponse ?",
        a: "La patience est de mise ! Vous pouvez proposer une activité via VibePlanner ou continuer à explorer de nouveaux profils dans Découverte.",
      },
    ],
  },
  {
    title: 'Abonnements & paiement',
    emoji: '👑',
    items: [
      {
        q: "Quelles sont les offres disponibles ?",
        a: "SferaLuna propose 3 plans payants : Essentiel (9,99€/mois), Premium (19,99€/mois) et Elite (34,99€/mois), en plus du plan Gratuit. Chaque offre débloque des fonctionnalités supplémentaires.",
      },
      {
        q: "Comment résilier mon abonnement ?",
        a: "Depuis Réglages → Abonnement → Gérer mon abonnement. La résiliation prend effet à la fin de la période en cours — vous continuez à profiter de votre accès jusqu'à cette date.",
      },
      {
        q: "Mon paiement est-il sécurisé ?",
        a: "Oui. Les paiements sont gérés par Stripe, l'un des processeurs de paiement les plus sécurisés au monde. SferaLuna ne stocke jamais vos données bancaires.",
      },
      {
        q: "Puis-je mettre mon abonnement en pause ?",
        a: "Oui, depuis la page Abonnement. Votre accès Premium est suspendu pendant la pause et reprend automatiquement à la réactivation.",
      },
    ],
  },
  {
    title: 'Confidentialité & sécurité',
    emoji: '🛡️',
    items: [
      {
        q: "Qui peut voir mon profil ?",
        a: "Par défaut, tous les membres connectés peuvent voir votre profil. Vous pouvez restreindre la visibilité depuis Réglages ou activer le Mode Fantôme (Premium/Elite) pour naviguer sans laisser de trace.",
      },
      {
        q: "Comment signaler un comportement suspect ?",
        a: "Sur n'importe quel profil, appuyez sur le bouton de signalement. Notre équipe modère les signalements sous 24h ouvrées.",
      },
      {
        q: "Mes données personnelles sont-elles protégées ?",
        a: "Oui, conformément au RGPD. Retrouvez notre politique de confidentialité complète dans Réglages → Confidentialité.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Depuis Réglages → Compte → Supprimer mon compte. La suppression est définitive et entraîne la perte de tous vos matchs et messages.",
      },
    ],
  },
];

function FaqEntry({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.entry, open && styles.entryOpen]}
      onPress={() => setOpen(!open)}
      activeOpacity={0.85}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryQ}>{item.q}</Text>
        {open ? <CaretUp size={15} color={Colors.accentPink} /> : <CaretDown size={15} color={Colors.textMuted} />}
      </View>
      {open && <Text style={styles.entryA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

export default function FaqScreen() {
  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Questions fréquentes</Text>
            <Text style={styles.subtitle}>Toutes les réponses à vos questions</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {FAQ.map((section) => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {section.items.map((item) => (
                <FaqEntry key={item.q} item={item} />
              ))}
            </View>
          ))}
          <View style={styles.footer}>
            <MoonStars size={14} color={Colors.textMuted} weight="duotone" />
            <Text style={styles.footerText}>Une question sans réponse ici ? Contactez-nous.</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/contact' as any)} activeOpacity={0.8}>
              <Text style={styles.footerLink}>Nous écrire →</Text>
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
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 24 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  entry: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, gap: 10,
  },
  entryOpen: { borderColor: 'rgba(219,39,119,0.3)', backgroundColor: 'rgba(219,39,119,0.06)' },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  entryQ: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  entryA: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 20 },
  footer: { alignItems: 'center', gap: 8, paddingTop: 8 },
  footerText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  footerLink: { fontSize: 13.5, color: Colors.accentPink, fontWeight: '600' },
});
