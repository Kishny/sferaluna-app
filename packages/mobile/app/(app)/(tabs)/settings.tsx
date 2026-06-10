import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  Bell, Lock, Eye, Heart, Crown, SignOut, MoonStars,
  CaretRight, Trash, ShieldCheck, Sparkle,
} from 'phosphor-react-native';
import { router, useFocusEffect } from 'expo-router';
import { GlassCard } from '../../../components/GlassCard';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchMyProfile, updateVisibility } from '../../../lib/api';
import { canUseGhostMode, getPlanLabel, formatFrDate, signOut } from '../../../lib/auth';
import { ApiError } from '../../../lib/http';
import { Toast, useToast } from '../../../components/Toast';

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  iconGradient?: readonly [string, string];
  type: 'chevron' | 'toggle' | 'danger' | 'locked' | 'status';
  value?: boolean;
  statusTone?: 'active' | 'warning' | 'muted';
  statusLabel?: string;
  onPress?: () => void;
  onToggle?: (v: boolean) => void;
}

interface SettingGroup {
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

/** Petite enveloppe "retour tactile" via Animated du cœur RN (spring scale) —
 * voir la note dans SwipeCard.tsx : reanimated casse la prévisualisation web. */
function Pressy({
  children, onPress, disabled, style,
}: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => { if (!disabled) Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, friction: 9, tension: 240 }).start(); };
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 220 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={disabled ? 1 : 0.8} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Cercle d'icône avec halo dégradé — remplace les pastilles plates pour un
 * rendu plus "joaillerie lunaire", cohérent avec Découverte/Messages/Alertes. */
function IconHalo({ icon, gradient }: { icon: React.ReactNode; gradient?: readonly [string, string] }) {
  if (!gradient) {
    return <View style={styles.iconWrapper}>{icon}</View>;
  }
  return (
    <LinearGradient colors={gradient} style={styles.iconWrapperGradient}>
      {icon}
    </LinearGradient>
  );
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [matches, setMatches] = useState(true);
  const [visibilityError, setVisibilityError] = useState('');

  // Petit toast de confirmation affiché après chaque activation/désactivation
  // d'un réglage (Mode Fantôme, notifications…) — voir components/Toast.tsx.
  // La connexion biométrique a son propre toast, gérée dans son écran dédié
  // (Réglages → Confidentialité → Sécurité du compte, voir app/(app)/securite.tsx).
  const { toast, showToast, hideToast } = useToast();

  const queryClient = useQueryClient();

  // Le Mode Fantôme dépend du plan d'abonnement réel de l'utilisateur
  // (calculé côté serveur) — on le récupère via /api/users/profile.
  // Même clé de cache que l'écran Profil (['profile', 'me']) : les deux écrans
  // partagent ainsi un seul instantané d'abonnement plutôt que deux requêtes
  // indépendantes pouvant être peuplées à des instants différents — c'est ce
  // qui causait l'incohérence "Elite" sur Profil vs "Inactif" dans Réglages.
  const { data: profileData, refetch, isRefetching } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });

  // Revérifie systématiquement auprès de MongoDB via l'API à chaque fois que
  // cet onglet redevient actif (les écrans d'onglets restent montés en arrière-
  // plan dans Expo Router, donc sans focus-refetch les données peuvent rester
  // figées sur un état antérieur, ex. avant l'activation d'un abonnement Stripe).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const premium = profileData?.premium;
  const plan = premium?.plan;
  const ghostModeAllowed = canUseGhostMode(plan);
  const isInvisible = profileData?.user.visibilite === 'invisible';
  const pseudonyme = profileData?.user.pseudonyme;

  // Source de vérité unique : `isPremium` (calculé côté serveur). On ne se base
  // jamais sur `plan` seul pour décider de l'état "abonnée" — sinon on peut se
  // retrouver avec un badge "Elite" affiché en même temps qu'un lien "Passer
  // Premium" (cas observé : plan encore renseigné mais abonnement inactif).
  const isPremium = premium?.isPremium ?? false;
  const planLabel = getPlanLabel(plan);
  const expiresAtLabel = formatFrDate(premium?.premiumExpiresAt ?? null);
  const subscriptionDescription = isPremium
    ? (expiresAtLabel ? `Prochain renouvellement le ${expiresAtLabel}` : 'Abonnement actif')
    : 'Débloquez le Mode Fantôme, plus de visibilité et bien plus.';

  /**
   * Le backend refuse "invisible" pour les plans free / essential-monthly
   * (règle métier stricte — voir canUseGhostMode dans lib/auth.ts et
   * /api/users/visibility). On verrouille donc le bouton côté UI pour ces
   * plans plutôt que de laisser l'utilisatrice déclencher un aller-retour
   * voué à l'échec, et on l'oriente vers l'écran Premium.
   */
  const visibilityMutation = useMutation({
    mutationFn: (next: 'invisible' | 'public') => updateVisibility(next),
    onSuccess: (_data, next) => {
      setVisibilityError('');
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      showToast(
        next === 'invisible' ? 'Mode Fantôme activé 👻' : 'Mode Fantôme désactivé',
        'success'
      );
    },
    onError: (e: unknown) => {
      const message =
        e instanceof ApiError
          ? e.message
          : 'Impossible de modifier la visibilité pour le moment.';
      setVisibilityError(message);
      showToast(message, 'error');
    },
  });

  const handleToggleGhostMode = (value: boolean) => {
    if (!ghostModeAllowed) {
      router.push('/(app)/premium');
      return;
    }
    visibilityMutation.mutate(value ? 'invisible' : 'public');
  };

  const groups: SettingGroup[] = [
    {
      title: 'Notifications',
      icon: <Bell size={13} color={Colors.textMuted} weight="fill" />,
      items: [
        {
          id: 'notif',
          label: 'Notifications push',
          description: 'Messages, matchs, visites — restez informée',
          icon: <Bell size={18} color="#fff" weight="fill" />,
          iconGradient: [Colors.accentPurple, Colors.mutedPurple] as const,
          type: 'toggle',
          value: notifications,
          onToggle: (v: boolean) => {
            setNotifications(v);
            showToast(v ? 'Notifications push activées' : 'Notifications push désactivées', 'success');
          },
        },
        {
          id: 'matches',
          label: 'Alertes nouveaux matchs',
          description: 'Soyez prévenue dès qu’une affinité naît',
          icon: <Heart size={18} color="#fff" weight="fill" />,
          iconGradient: [Colors.accentPink, '#F59E0B'] as const,
          type: 'toggle',
          value: matches,
          onToggle: (v: boolean) => {
            setMatches(v);
            showToast(v ? 'Alertes nouveaux matchs activées' : 'Alertes nouveaux matchs désactivées', 'success');
          },
        },
      ],
    },
    {
      title: 'Confidentialité',
      icon: <ShieldCheck size={13} color={Colors.textMuted} weight="fill" />,
      items: [
        ghostModeAllowed
          ? {
              id: 'invisible',
              label: 'Mode Fantôme',
              description: 'Naviguez sans laisser de trace de visite.',
              icon: <Eye size={18} color="#fff" weight="duotone" />,
              iconGradient: [Colors.bgSurface, Colors.mutedPurple] as const,
              type: 'toggle',
              value: isInvisible,
              onToggle: handleToggleGhostMode,
            }
          : {
              id: 'invisible',
              label: 'Mode Fantôme',
              description: 'Réservé aux abonnements Premium et Elite.',
              icon: <Eye size={18} color={Colors.textMuted} weight="duotone" />,
              type: 'locked',
              onPress: () => router.push('/(app)/premium'),
            },
        {
          id: 'privacy',
          label: 'Politique de confidentialité',
          description: 'Vos données, vos droits — RGPD et transparence.',
          icon: <ShieldCheck size={18} color={Colors.mutedPurple} weight="duotone" />,
          type: 'chevron',
          onPress: () => router.push('/(app)/confidentialite'),
        },
        {
          id: 'security',
          label: 'Sécurité du compte',
          description: 'Connexion biométrique, vérification d’identité…',
          icon: <Lock size={18} color={Colors.mutedPurple} weight="duotone" />,
          type: 'chevron',
          onPress: () => router.push('/(app)/securite'),
        },
      ],
    },
    {
      title: 'Compte',
      icon: <MoonStars size={13} color={Colors.textMuted} weight="fill" />,
      items: [
        {
          id: 'logout',
          label: 'Se déconnecter',
          icon: <SignOut size={18} color={Colors.textSecondary} />,
          type: 'chevron',
          onPress: () => {
            // Invalide le cookie de session côté serveur (lib/auth.ts → signOut)
            // avant de rediriger — sinon la session NextAuth resterait active
            // et la prochaine ouverture de l'app reconnecterait automatiquement.
            signOut().finally(() => {
              queryClient.clear();
              router.replace('/(auth)/login');
            });
          },
        },
        {
          id: 'delete',
          label: 'Supprimer mon compte',
          description: 'Action définitive et irréversible',
          icon: <Trash size={18} color={Colors.error} />,
          type: 'danger',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={Colors.accentPink}
              colors={[Colors.accentPink]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MoonStars size={20} color={Colors.accentPink} weight="duotone" />
              <Text style={styles.title}>Réglages</Text>
            </View>
            {pseudonyme && (
              <Text style={styles.subtitle}>Bienvenue, {pseudonyme} — votre espace, à votre image.</Text>
            )}
          </View>

          <View style={styles.content}>
            {/* Carte d'abonnement — vitrine premium en tête de page */}
            <Pressy onPress={() => router.push('/(app)/premium')}>
              <LinearGradient
                colors={isPremium ? [Colors.accentPurple, Colors.accentPink] : [Colors.bgSurface, Colors.bgMid]}
                style={styles.planCard}
              >
                <View style={styles.planCardTop}>
                  <View style={styles.planIconWrap}>
                    <Crown size={22} color="#FCD34D" weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planLabel}>{isPremium ? `Plan ${planLabel}` : 'Plan Gratuit'}</Text>
                    <Text style={styles.planDescription} numberOfLines={2}>{subscriptionDescription}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isPremium ? styles.statusBadgeActive : styles.statusBadgeMuted,
                    ]}
                  >
                    <View style={[styles.statusDot, isPremium ? styles.statusDotActive : styles.statusDotMuted]} />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isPremium ? styles.statusBadgeTextActive : styles.statusBadgeTextMuted,
                      ]}
                    >
                      {isPremium ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>
                <View style={styles.planCta}>
                  <Sparkle size={14} color="#fff" weight="fill" />
                  <Text style={styles.planCtaText}>
                    {isPremium ? 'Gérer mon abonnement' : 'Découvrir Essentiel, Premium ou Elite — dès 9,99 €/mois'}
                  </Text>
                  <CaretRight size={14} color="rgba(255,255,255,0.7)" />
                </View>
              </LinearGradient>
            </Pressy>

            {groups.map((group) => (
              <View key={group.title} style={styles.group}>
                <View style={styles.groupTitleRow}>
                  {group.icon}
                  <Text style={styles.groupTitle}>{group.title}</Text>
                </View>
                <GlassCard padding={0} style={styles.groupCard}>
                  {group.items.map((item, i) => (
                    <Pressy
                      key={item.id}
                      onPress={item.type !== 'toggle' && item.type !== 'status' ? item.onPress : undefined}
                      disabled={item.type === 'toggle' || item.type === 'status'}
                    >
                      <View
                        style={[
                          styles.settingItem,
                          i < group.items.length - 1 && styles.settingBorder,
                        ]}
                      >
                        <View style={styles.settingLeft}>
                          <IconHalo icon={item.icon} gradient={item.iconGradient} />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.settingLabel,
                                item.type === 'danger' && styles.settingDanger,
                                item.type === 'locked' && styles.settingMuted,
                              ]}
                            >
                              {item.label}
                            </Text>
                            {item.description && (
                              <Text style={styles.settingDescription} numberOfLines={2}>{item.description}</Text>
                            )}
                          </View>
                        </View>
                        {item.type === 'toggle' && (
                          <Switch
                            value={item.value}
                            onValueChange={item.onToggle}
                            disabled={item.id === 'invisible' && visibilityMutation.isPending}
                            trackColor={{ false: Colors.glassBg, true: Colors.accentPurple }}
                            thumbColor={item.value ? '#fff' : Colors.textMuted}
                          />
                        )}
                        {item.type === 'locked' && (
                          <View style={styles.lockedBadge}>
                            <Lock size={12} color="#F59E0B" weight="fill" />
                            <Text style={styles.lockedBadgeText}>Premium</Text>
                          </View>
                        )}
                        {item.type === 'chevron' && (
                          <CaretRight size={18} color={Colors.textMuted} />
                        )}
                      </View>
                    </Pressy>
                  ))}
                </GlassCard>
              </View>
            ))}

            {visibilityError ? (
              <Text style={styles.errorText}>{visibilityError}</Text>
            ) : null}

            <View style={styles.footer}>
              <MoonStars size={14} color={Colors.textMuted} weight="duotone" />
              <Text style={styles.version}>SferaLuna · v1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Toast toast={toast} onHide={hideToast} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
  subtitle: { fontSize: 12.5, color: Colors.textMuted, marginTop: 4, lineHeight: 17 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 32, gap: 24 },

  planCard: {
    borderRadius: Radius.xl,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  planCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planLabel: { fontSize: 17, fontWeight: '700', color: '#fff' },
  planDescription: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 3, lineHeight: 17 },
  planCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  planCtaText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: '#fff' },

  group: { gap: 8 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupCard: { overflow: 'hidden' },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperGradient: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  settingDanger: { color: Colors.error },
  settingMuted: { color: Colors.textSecondary },
  settingDescription: { fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  lockedBadgeText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusBadgeActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  statusBadgeMuted: { backgroundColor: 'rgba(255,255,255,0.1)' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotActive: { backgroundColor: '#fff' },
  statusDotMuted: { backgroundColor: Colors.textMuted },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextActive: { color: '#fff' },
  statusBadgeTextMuted: { color: 'rgba(255,255,255,0.7)' },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  version: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
