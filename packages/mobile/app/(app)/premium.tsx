import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from '../../components/LinearGradient';
import { OrbitGlow } from '../../components/OrbitGlow';
import { StatusBar } from 'expo-status-bar';
import { Check, X } from 'phosphor-react-native';
import { router } from 'expo-router';
import { GradientButton } from '../../components/GradientButton';
import { GlassCard } from '../../components/GlassCard';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { fetchSubscriptionStatus, type CheckoutPlan } from '../../lib/api';
import { API_BASE_URL } from '../../lib/http';
import {
  IAP_PLATFORM, IapError, fetchStorePlans, purchasePlan, restorePlan, openAppleSubscriptions,
} from '../../lib/iap';
import { NP } from '../../components/NP';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, hapticWarning } from '../../lib/haptics';

/**
 * Écran des formules.
 *
 * - iPhone : l'abonnement s'achète avec le compte Apple (achat intégré). Les
 *   prix viennent de l'App Store, le serveur vérifie la preuve d'achat et
 *   active la formule (voir lib/iap.ts).
 * - Android : pas d'achat dans l'app pour l'instant ; l'écran montre seulement
 *   la formule en cours.
 * - Membre déjà abonnée (dans l'app ou sur le site) : sa formule est affichée,
 *   sans bouton d'achat, pour ne jamais la faire payer deux fois.
 *
 * `isPremium` est toujours calculé par le serveur, jamais piloté d'ici.
 */
const SITE = API_BASE_URL.replace(/\/$/, '');

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Plans SferaLuna — valeurs et contenus strictement alignés sur
 * src/app/paiement/page.tsx et src/models/User.ts du backend.
 * Le plan `free` n'est pas proposé ici : cet écran sert à passer
 * d'un compte gratuit vers un abonnement payant.
 * Les prix ne sont pas écrits ici : sur iPhone, c'est Apple qui les fournit
 * (lib/iap.ts), pour qu'ils soient toujours ceux réellement facturés.
 */
type LunaPlan = CheckoutPlan;

interface PlanConfig {
  id: LunaPlan;
  name: string;
  badge?: string;
  highlighted?: boolean;
  description: string;
  features: string[];
}

const plans: PlanConfig[] = [
  {
    id: 'essential-monthly',
    name: 'Essentiel',
    description: 'Pour découvrir SferaLuna en douceur.',
    features: [
      'Profil visible',
      'Suggestions compatibles',
      'Messages avec vos connexions',
      'Accès au journal émotionnel',
      'Sécurité standard',
    ],
  },
  {
    id: 'premium-monthly',
    name: 'Premium',
    badge: 'Le plus populaire',
    highlighted: true,
    description: 'Pour profiter pleinement de SferaLuna.',
    features: [
      'Invitations illimitées',
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
    badge: 'VIP',
    description: "L'expérience la plus complète de SferaLuna.",
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
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const queryClient = useQueryClient();

  const statusQuery = useQuery({ queryKey: ['subscription', 'status'], queryFn: fetchSubscriptionStatus });
  const subscription = statusQuery.data?.subscription;
  const isSubscribed = subscription?.isPremium === true;
  const canBuy = IAP_PLATFORM && !!subscription && !isSubscribed;

  // Les prix Apple ne sont demandés que si l'achat est réellement proposé.
  const storeQuery = useQuery({
    queryKey: ['iap', 'plans'],
    queryFn: fetchStorePlans,
    enabled: canBuy,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const prices = new Map((storeQuery.data ?? []).map((item) => [item.plan, item.displayPrice]));
  const offered = plans.filter((plan) => prices.has(plan.id));
  const selectedPlan = offered.find((plan) => plan.id === selected) ?? offered[0];

  const refreshAccount = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] }),
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['session'] }),
    ]);
  };

  // Rattrapage silencieux : un achat payé mais pas encore activé (coupure
  // réseau juste après le paiement) est validé à l'ouverture de l'écran, sans
  // rien demander. Une seule tentative, et jamais de message en cas d'échec.
  const recovered = useRef(false);
  useEffect(() => {
    if (!canBuy || recovered.current) return;
    recovered.current = true;
    restorePlan(false)
      .then((result) => { if (result?.isPremium) return refreshAccount(); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canBuy]);

  const fail = (e: unknown) => {
    if (e instanceof IapError) {
      if (e.kind === 'cancelled') return;
      if (e.kind === 'pending') { hapticWarning(); setInfo(e.message); return; }
      hapticError();
      setError(e.message);
      return;
    }
    hapticError();
    setError('Une erreur est survenue. Réessayez dans un instant.');
  };

  const handleSubscribe = async () => {
    if (busy || !selectedPlan) return;
    hapticMedium();
    setBusy('buy');
    setError('');
    setInfo('');
    try {
      const result = await purchasePlan(selectedPlan.id);
      await refreshAccount();
      if (result.isPremium) {
        hapticSuccess();
        setInfo(`Bienvenue dans la formule ${selectedPlan.name} ! Votre abonnement est actif.`);
      } else {
        hapticWarning();
        setInfo('Achat reçu. Votre formule sera activée dans quelques instants.');
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    hapticLight();
    setBusy('restore');
    setError('');
    setInfo('');
    try {
      const result = await restorePlan(true);
      await refreshAccount();
      if (result?.isPremium) {
        hapticSuccess();
        setInfo('Votre abonnement a été restauré.');
      } else {
        hapticWarning();
        setInfo('Aucun abonnement actif n’a été trouvé sur ce compte Apple.');
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const handleManage = async () => {
    hapticLight();
    setError('');
    const opened = await openAppleSubscriptions();
    if (!opened) {
      setError('Ouvrez l’app Réglages de votre iPhone, touchez votre nom, puis « Abonnements ».');
      return;
    }
    // Au retour, la membre a pu changer de formule ou résilier : Apple prévient
    // le serveur, on relit donc l'état (tout de suite, puis après un court délai
    // le temps que la notification arrive).
    await refreshAccount();
    setTimeout(() => { refreshAccount(); }, 4000);
  };

  const openPage = (path: string) => {
    hapticLight();
    WebBrowser.openBrowserAsync(`${SITE}${path}`).catch(() => {});
  };

  const renewal = formatDate(subscription?.premiumExpiresAt);

  return (
    <LinearGradient
      colors={[Colors.bgDeep, '#1a0b2e', Colors.bgMid]}
      style={styles.bg}
    >
      <OrbitGlow size={280} style={{ top: -60, right: -90 }} />
      <OrbitGlow size={320} style={{ bottom: -100, left: -110 }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Close */}
          <View style={styles.closeRow}>
            <TouchableOpacity
              onPress={() => { hapticLight(); router.back(); }}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <NP><X size={20} color={Colors.textSecondary} />
            </NP></TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.crownWrapper}>
              <Text style={styles.crownEmoji}>👑</Text>
              <View style={styles.crownGlow} />
            </View>
            <Text style={styles.heroTitle}>{isSubscribed ? 'Mon abonnement' : 'Les formules SferaLuna'}</Text>
            {!isSubscribed && (
              <Text style={styles.heroSub}>
                Profitez de toute la communauté,{'\n'}sans limites.
              </Text>
            )}
          </View>

          {/* Chargement de l'état d'abonnement */}
          {statusQuery.isPending && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.accentPink} />
            </View>
          )}

          {statusQuery.isError && (
            <GlassCard style={styles.notice}>
              <Text style={styles.noticeTitle}>Connexion impossible</Text>
              <Text style={styles.noticeText}>
                Nous n’avons pas pu charger votre abonnement. Vérifiez votre réseau et réessayez.
              </Text>
              <GradientButton label="Réessayer" variant="outline" onPress={() => statusQuery.refetch()} style={{ marginTop: 14 }} />
            </GlassCard>
          )}

          {/* Déjà abonnée : la formule en cours, jamais de second achat */}
          {subscription && isSubscribed && (
            <>
              <GlassCard style={styles.current}>
                <Text style={styles.currentKicker}>Votre formule</Text>
                <Text style={styles.currentPlan}>{subscription.planLabel}</Text>
                {!!renewal && (
                  <Text style={styles.currentMeta}>
                    {subscription.cancelAtPeriodEnd
                      ? `Renouvellement désactivé — accès jusqu’au ${renewal}.`
                      : `Prochain renouvellement le ${renewal}.`}
                  </Text>
                )}
                <Text style={styles.currentMeta}>
                  {subscription.source === 'apple'
                    ? 'Abonnement pris avec votre compte Apple. Vous pouvez changer de formule ou le résilier depuis vos abonnements App Store.'
                    : 'Abonnement pris sur sferaluna.com. Il se gère depuis votre compte sur le site.'}
                </Text>
              </GlassCard>

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              {!!info && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{info}</Text>
                </View>
              )}

              {subscription.source === 'apple' && (
                <View style={styles.cta}>
                  <GradientButton label="Gérer mon abonnement" onPress={handleManage} />
                </View>
              )}
            </>
          )}

          {/* Pas abonnée, hors iPhone : aucun achat dans l'app */}
          {subscription && !isSubscribed && !IAP_PLATFORM && (
            <GlassCard style={styles.notice}>
              <Text style={styles.noticeTitle}>Formule Gratuite</Text>
              <Text style={styles.noticeText}>
                Les abonnements ne sont pas encore proposés dans cette version de l’application.
              </Text>
            </GlassCard>
          )}

          {/* Pas abonnée, iPhone : achat intégré */}
          {canBuy && (
            <>
              {storeQuery.isPending && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={Colors.accentPink} />
                </View>
              )}

              {!storeQuery.isPending && offered.length === 0 && (
                <GlassCard style={styles.notice}>
                  <Text style={styles.noticeTitle}>Formules indisponibles</Text>
                  <Text style={styles.noticeText}>
                    L’App Store ne répond pas pour le moment. Réessayez dans un instant.
                  </Text>
                  <GradientButton label="Réessayer" variant="outline" onPress={() => storeQuery.refetch()} style={{ marginTop: 14 }} />
                </GlassCard>
              )}

              {offered.length > 0 && selectedPlan && (
                <>
                  <View style={styles.plans}>
                    <Text style={styles.plansTitle}>Choisissez votre formule</Text>
                    {offered.map((plan) => {
                      const isActive = selectedPlan.id === plan.id;
                      return (
                        <TouchableOpacity
                          key={plan.id}
                          onPress={() => { hapticLight(); setSelected(plan.id); setError(''); }}
                          activeOpacity={0.8}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isActive }}
                          accessibilityLabel={`${plan.name}, ${prices.get(plan.id)} par mois`}
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
                                <Text style={styles.planPrice}>{prices.get(plan.id)}</Text>
                                <Text style={styles.planPer}>/ mois</Text>
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

                  {!!error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                  {!!info && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>{info}</Text>
                    </View>
                  )}

                  <View style={styles.cta}>
                    <GradientButton
                      label={`S’abonner — ${prices.get(selectedPlan.id)} / mois`}
                      onPress={handleSubscribe}
                      loading={busy === 'buy'}
                      disabled={busy !== null}
                    />
                    <Text style={styles.ctaNote}>
                      Abonnement mensuel {selectedPlan.name} à {prices.get(selectedPlan.id)} par mois, renouvelé
                      automatiquement. Le paiement est débité sur votre compte Apple à la confirmation de
                      l’achat. L’abonnement se renouvelle chaque mois sauf résiliation au moins 24 heures
                      avant la fin de la période en cours, depuis les réglages de votre compte App Store.
                    </Text>
                    <TouchableOpacity
                      onPress={handleRestore}
                      disabled={busy !== null}
                      style={styles.restore}
                      accessibilityRole="button"
                    >
                      {busy === 'restore'
                        ? <ActivityIndicator color={Colors.accentPink} size="small" />
                        : <Text style={styles.restoreText}>Restaurer mes achats</Text>}
                    </TouchableOpacity>
                    <View style={styles.legalLinks}>
                      <TouchableOpacity onPress={() => openPage('/conditions')} accessibilityRole="link">
                        <Text style={styles.link}>Conditions d’utilisation</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openPage('/confidentialite')} accessibilityRole="link">
                        <Text style={styles.link}>Politique de confidentialité</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, overflow: 'hidden' },
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
  legalLinks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 18 },
  link: { fontSize: 13, color: Colors.textSecondary, textDecorationLine: 'underline', paddingVertical: 8 },
  restore: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  restoreText: { fontSize: 14, fontWeight: '600', color: Colors.accentPink },
  loadingBox: { paddingVertical: 48, alignItems: 'center' },
  notice: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, padding: 18 },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  noticeText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  current: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, padding: 20, gap: 4 },
  currentKicker: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  currentPlan: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  currentMeta: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginTop: 2 },
});
