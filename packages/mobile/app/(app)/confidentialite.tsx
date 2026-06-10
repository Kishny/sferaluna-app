/**
 * Politique de confidentialité — accessible à toutes les utilisatrices
 * connectées depuis Réglages > Confidentialité > Politique de confidentialité.
 *
 * Contenu informatif statique (RGPD), aligné sur les traitements réellement
 * effectués par le backend SferaLuna (voir /Users/jeyko.dev/Projects/sferaluna,
 * CLAUDE.md) : MongoDB Atlas (profils, messages, matches…), Stripe + Stripe
 * Identity (paiements et vérification d'identité), Cloudinary (photos),
 * Pusher (messagerie temps réel), Resend (emails transactionnels).
 *
 * Pour rester source unique de vérité légale, ce texte reprend la structure
 * de la page web /confidentialite — à garder cohérent si le contenu officiel
 * évolue côté site.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { CaretLeft, ShieldCheck } from 'phosphor-react-native';
import { router } from 'expo-router';
import { GlassCard } from '../../components/GlassCard';
import { Colors, Spacing, Radius } from '../../lib/theme';

interface PolicySection {
  title: string;
  paragraphs: string[];
}

const sections: PolicySection[] = [
  {
    title: '1. Les données que nous collectons',
    paragraphs: [
      'Lors de votre inscription et de l’utilisation de SferaLuna, nous collectons : vos informations de profil (pseudonyme, âge, localisation, intentions, photos), vos identifiants de connexion (email, ou identifiant Google / Apple), vos échanges avec vos matchs, ainsi que des données techniques (appareil, journal de connexion) nécessaires au bon fonctionnement et à la sécurité du service.',
      'Si vous choisissez de vérifier votre identité ou de souscrire à un abonnement, des données supplémentaires sont traitées par nos prestataires de paiement et de vérification (voir section 3).',
    ],
  },
  {
    title: '2. Pourquoi nous les utilisons',
    paragraphs: [
      'Vos données nous permettent de créer et afficher votre profil, vous proposer des suggestions de rencontre pertinentes, assurer la messagerie et les notifications en temps réel, gérer votre abonnement Premium, prévenir la fraude et les comportements abusifs, et vous accompagner via notre support.',
      'Nous ne vendons jamais vos données personnelles à des tiers à des fins publicitaires.',
    ],
  },
  {
    title: '3. Avec qui nous les partageons',
    paragraphs: [
      'Certaines données sont transmises à des prestataires de confiance, strictement nécessaires au fonctionnement de SferaLuna : Stripe (paiements et abonnements, vérification d’identité via Stripe Identity), Cloudinary (hébergement de vos photos de profil), Pusher (messagerie et notifications en temps réel) et Resend (emails transactionnels : confirmation, réinitialisation de mot de passe…).',
      'Ces prestataires n’accèdent qu’aux données strictement nécessaires à leur mission et sont contractuellement engagés à en assurer la confidentialité.',
    ],
  },
  {
    title: '4. Combien de temps nous les conservons',
    paragraphs: [
      'Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte, vos informations de profil et vos contenus sont supprimés ou anonymisés dans un délai raisonnable, sous réserve des durées de conservation imposées par la loi (obligations comptables, lutte contre la fraude, litiges en cours).',
    ],
  },
  {
    title: '5. Vos droits',
    paragraphs: [
      'Conformément au RGPD, vous disposez à tout moment d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données. Vous pouvez exercer ces droits directement depuis votre compte (Réglages, Mon Compte) ou en nous contactant à contact@sferaluna.com.',
      'Vous pouvez également déposer une réclamation auprès de la CNIL (www.cnil.fr) si vous estimez que vos droits ne sont pas respectés.',
    ],
  },
  {
    title: '6. Cookies et traceurs',
    paragraphs: [
      'Notre site web utilise des cookies essentiels au fonctionnement (connexion, sécurité) et, sous réserve de votre consentement, des cookies de mesure d’audience. Vous pouvez gérer vos préférences à tout moment depuis le bandeau de consentement du site sferaluna.com.',
    ],
  },
  {
    title: '7. Sécurité',
    paragraphs: [
      'Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données : chiffrement des mots de passe, connexions sécurisées (HTTPS), accès restreint aux données par notre équipe, et journalisation des actions sensibles. Vous pouvez renforcer la sécurité de votre compte (connexion biométrique, vérification d’identité) depuis Réglages > Sécurité du compte.',
    ],
  },
  {
    title: '8. Mises à jour de cette politique',
    paragraphs: [
      'Cette politique peut évoluer pour refléter les changements de nos pratiques ou de la réglementation. En cas de modification substantielle, nous vous en informerons depuis l’application ou par email.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <CaretLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Politique de confidentialité</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <ShieldCheck size={26} color={Colors.accentPurple} weight="duotone" />
            </View>
            <Text style={styles.introTitle}>Vos données, vos droits</Text>
            <Text style={styles.introText}>
              Chez SferaLuna, la confiance et la sécurité de notre communauté priment. Voici, en
              toute transparence, ce que nous collectons, pourquoi, et comment vous gardez le
              contrôle.
            </Text>
            <Text style={styles.introMeta}>Dernière mise à jour : juin 2026</Text>
          </View>

          {sections.map((section) => (
            <GlassCard key={section.title} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.paragraphs.map((paragraph, idx) => (
                <Text key={idx} style={styles.sectionText}>
                  {paragraph}
                </Text>
              ))}
            </GlassCard>
          ))}

          <Text style={styles.footer}>
            Une question sur vos données ? Écrivez-nous à contact@sferaluna.com — nous répondons
            sous 24 à 48h.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glassBg,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 16 },
  intro: { alignItems: 'center', textAlign: 'center', marginBottom: 4, gap: 6 },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  introTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  introText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  introMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  sectionCard: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sectionText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  footer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
