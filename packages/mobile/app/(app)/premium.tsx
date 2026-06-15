import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  Crown, Check, X,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { GradientButton } from '../../components/GradientButton';
import { GlassCard } from '../../components/GlassCard';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { createCheckoutSession } from '../../lib/api';
import { ApiError, API_BASE_URL } from '../../lib/http';
import { NP } from '../../components/NP';

/**
 * Le backend redirige toujours vers les pages web (success_url → /mon-compte,
 * cancel_url → /paiement — voir create-checkout-session/route.ts, codé en dur
 * sur l'URL de l'app web). On ouvre donc Stripe Checkout dans une session
 * d'authentification in-app : dès que la redirection finale revient sur le
 * domaine de l'app, la session se ferme et on peut rafraîchir le statut réel
 * (isPremium est calculé serveur, jamais piloté depuis le client).
 */
const APP_ORIGIN = API_BASE_URL.replace(/\/$/, '');

/**
 * Plans SferaLuna — valeurs et contenus strictement alignés sur
 * src/app/paiement/page.tsx et src/models/User.ts du backend.
 * Le plan `free` n'est pas proposé ici : cet écran sert à passer
 * d'un compte gratuit vers un abonnement payant.
 */
type LunaPlan = 'essential-monthly' | 'premium-monthly' | 'elite-monthly';

interface PlanConfig {
  id: LunaPlan;
  name: string;
  price: string;
  per: string;
  badge?: string;
  highlighted?: boolean;
  description: string;
  features: string[];
}

const plans: PlanConfig[] = [
  {
    id: 'essential-monthly',
    name: 'Essentiel',
    price: '9,99 €',
    per: '/ mois',
    description: 'Pour découvrir SferaLuna en douceur.',
    features: [
      'Profil visible',
      'Suggestions compatibles',
      'Messages avec vos matchs',
      'Accès au journal émotionnel',
      'Sécurité standard',
    ],
  },
  {
    id: 'premium-monthly',
    name: 'Premium',
    price: '19,99 €',
    per: '/ mois',
    badge: 'Le plus populaire',
    highlighted: true,
    description: 'Pour profiter pleinement de SferaLuna.',
    features: [
      'Likes illimités',
      'Messages prioritaires',
      'Filtres avancés',
      'Mode Fantôme (navigation invisible)',
      'Vue des visiteurs de profil',
      'Badge Premium',
    ],
  },
  {
    id: 'elite-monthly',
    name: 'Elite',
    price: '34,99 €',
    per: '/ mois',
    badge: 'VIP',
    description: "L'expérience haut de gamme pour maximiser vos rencontres.",
    features: [
      'Tout Premium inclus',
      'Boost de visibilité',
      'Profil mis en avant',
      'Coaching personnalisé',
      'Accès événements privés',
      'Support VIP',
    ],
  },
];

export default function PremiumScreen() {
  // Premium est l'offre mise en avant par défaut, comme sur le web.
  const [selected, setSelected] = useState<LunaPlan>('premium-monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const queryClient = useQueryClient();

  const selectedPlan = plans.find((p) => p.id === selected) ?? plans[1];

  /**
   * Lance Stripe Checkout via le backend existant.
   * POST /api/stripe/create-checkout-session { plan } → { success, url }
   * isPremium est calculé automatiquement côté serveur après webhook —
   * jamais piloté depuis le client.
   */
  const handleSubscribe = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const data = await createCheckoutSession(selected);

      if (!data?.url) {
        setError('Impossible de démarrer le paiement. Réessayez dans un instant.');
        return;
      }

      // Stripe Checkout est une page web sécurisée hébergée par Stripe : on
      // l'ouvre dans une session d'authentification in-app et on attend la
      // redirection finale vers le domaine de l'app (success ou annulation).
      const result = await WebBrowser.openAuthSessionAsync(data.url, APP_ORIGIN);

      if (result.type === 'success' && result.url) {
        const returned = new URL(result.url);
        const status = returned.searchParams.get('payment');
        if (status === 'success') {
          // isPremium est recalculé côté serveur après le webhook Stripe ;
          // on rafraîchit simplement les données affichées dans l'app.
          await queryClient.invalidateQueries();
          setInfo('Paiement confirmé ! Votre abonnement est en cours d\'activation — cela peut prendre quelques instants.');
        } else if (status === 'cancelled') {
          setInfo('Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.');
        } else {
          await queryClient.invalidateQueries();
        }
      }
      // type 'cancel' / 'dismiss' : l'utilisatrice a fermé la fenêtre — rien à faire.
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message ?? 'Impossible de démarrer le paiement. Réessayez dans un instant.');
      } else {
        setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.bgDeep, '#1a0b2e', Colors.bgMid]}
      style={styles.bg}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Close */}
          <View style={styles.closeRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <NP><X size={20} color={Colors.textSecondary} />
            </NP></TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.crownWrapper}>
              <Text style={styles.crownEmoji}>👑</Text>
              <View style={styles.crownGlow} />
            </View>
            <Text style={styles.heroTitle}>SferaLuna Premium</Text>
            <Text style={styles.heroSub}>
              Vivez des rencontres sans limites.{'\n'}Chaque connexion mérite d'être saisie.
            </Text>
          </View>

          {/* Plans */}
          <View style={styles.plans}>
            <Text style={styles.plansTitle}>Choisissez votre formule</Text>
            {plans.map((plan) => {
              const isActive = selected === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelected(plan.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.planCard, isActive && styles.planCardActive]}>
                    {plan.badge && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>{plan.badge}</Text>
                      </View>
                    )}
                    <View style={styles.planHeaderRow}>
                      <View style={styles.planLeft}>
                        <View style={[styles.radio, isActive && styles.radioActive]}>
                          {isActive && <View style={styles.radioInner} />}
                        </View>
                        <View>
                          <Text style={styles.planLabel}>{plan.name}</Text>
                          <Text style={styles.planDescription}>{plan.description}</Text>
                        </View>
                      </View>
                      <View style={styles.planRight}>
                        <Text style={styles.planPrice}>{plan.price}</Text>
                        <Text style={styles.planPer}>{plan.per}</Text>
                      </View>
                    </View>
                    {isActive && (
                      <View style={styles.planFeatures}>
                        {plan.features.map((feature) => (
                          <View key={feature} style={styles.featureItem}>
                            <NP><Check size={16} color={Colors.success} weight="bold" />
                            </NP><Text style={styles.featureLabel}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Erreur */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Info (retour de paiement) */}
          {!!info && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{info}</Text>
            </View>
          )}

          {/* CTA */}
          <View style={styles.cta}>
            <GradientButton
              label={`Passer à ${selectedPlan.name}`}
              onPress={handleSubscribe}
              loading={loading}
            />
            <Text style={styles.ctaNote}>
              Paiement sécurisé via Stripe. Résiliable à tout moment depuis{' '}
              « Mon compte ».
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
  },
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
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.xl },
  crownWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  crownEmoji: { fontSize: 64, zIndex: 2 },
  crownGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F59E0B',
    opacity: 0.12,
  },
  heroTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  heroSub: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  featureLabel: { fontSize: 13, color: Colors.textSecondary },
  plans: { paddingHorizontal: Spacing.xl, gap: 12, marginBottom: Spacing.lg },
  plansTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  planCard: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    padding: 16,
  },
  planCardActive: {
    borderColor: Colors.accentPurple,
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planDescription: { fontSize: 12, color: Colors.textMuted, marginTop: 2, maxWidth: 180 },
  planFeatures: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  errorBox: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },
  infoBox: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  infoText: { fontSize: 13, color: '#10B981', textAlign: 'center', lineHeight: 18 },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: Colors.accentPink,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.accentPurple },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accentPurple,
  },
  planLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  planRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  planPer: { fontSize: 12, color: Colors.textMuted },
  cta: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 16 },
  ctaNote: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
