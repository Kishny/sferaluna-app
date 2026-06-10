/**
 * Sécurité du compte — accessible depuis Réglages > Confidentialité > Sécurité
 * du compte.
 *
 * Regroupe les réglages liés à la protection de l'accès au compte :
 * - connexion biométrique (Face ID / Touch ID), verrou LOCAL superposé à la
 *   session NextAuth déjà persistée (voir lib/biometrics.ts et app/index.tsx) ;
 * - statut de vérification d'identité (Stripe Identity côté backend, champ
 *   `identityVerified` calculé serveur — purement informatif ici).
 *
 * La logique biométrique vivait auparavant comme item autonome dans
 * Réglages > Confidentialité ; elle est désormais intégrée à cet écran dédié,
 * rendant "Sécurité du compte" réellement navigable.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  CaretLeft, CaretRight, Fingerprint, ShieldCheck, ShieldWarning,
  Envelope, Key, IdentificationBadge, Trash,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { GlassCard } from '../../components/GlassCard';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { fetchMyProfile, createIdentityVerificationSession, requestPasswordReset } from '../../lib/api';
import { getSession, type AuthProvider } from '../../lib/auth';
import { ApiError } from '../../lib/http';
import { Toast, useToast } from '../../components/Toast';
import {
  isBiometricHardwareAvailable,
  getBiometricLabel,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  authenticateWithBiometrics,
} from '../../lib/biometrics';
import { NP } from '../../components/NP';

/** Libellé FR de la méthode de connexion — alignée sur AuthProvider (lib/auth.ts). */
function getProviderLabel(provider?: AuthProvider): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'apple':
      return 'Apple';
    case 'credentials':
      return 'Email et mot de passe';
    default:
      return 'Inconnue';
  }
}

export default function AccountSecurityScreen() {
  const { toast, showToast, hideToast } = useToast();

  // Statut de vérification d'identité — purement informatif, calculé côté
  // serveur (Stripe Identity). Même clé de cache que Réglages/Profil pour
  // partager un seul instantané plutôt que de relancer une requête isolée.
  const { data: profileData } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });
  const identityVerified = Boolean(profileData?.user.identityVerified);

  // Méthode de connexion + email — issus de la session NextAuth (JWT) déjà
  // persistée localement, pas besoin d'un appel API dédié.
  const { data: session } = useQuery({ queryKey: ['session'], queryFn: getSession });
  const provider = session?.user.provider;
  const email = session?.user.email;

  const [resetBusy, setResetBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const handleRequestPasswordReset = async () => {
    if (!email || resetBusy) return;
    setResetBusy(true);
    try {
      await requestPasswordReset(email);
      showToast(`Email de réinitialisation envoyé à ${email}`, 'success');
    } catch (e) {
      showToast(
        e instanceof ApiError ? e.message : "Impossible d'envoyer cet email pour le moment.",
        'error'
      );
    } finally {
      setResetBusy(false);
    }
  };

  const handleStartIdentityVerification = async () => {
    if (verifyBusy) return;
    setVerifyBusy(true);
    try {
      const { url } = await createIdentityVerificationSession();
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      showToast(
        e instanceof ApiError ? e.message : 'Impossible de lancer la vérification pour le moment.',
        'error'
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleRequestAccountDeletion = () => {
    const subject = encodeURIComponent('Demande de suppression de mon compte SferaLuna');
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite supprimer définitivement mon compte SferaLuna associé à l'adresse ${email ?? '(email à préciser)'}.\n\nMerci de me confirmer la prise en compte de cette demande.\n\nCordialement.`
    );
    Linking.openURL(`mailto:contact@sferaluna.com?subject=${subject}&body=${body}`).catch(() => {
      showToast("Impossible d'ouvrir votre application mail.", 'error');
    });
  };

  // Connexion biométrique (Face ID / Touch ID) — voir lib/biometrics.ts.
  // On masque le réglage tant qu'on n'a pas confirmé que l'appareil dispose
  // d'un capteur ET d'un profil biométrique enregistré.
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biométrie');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [supported, label, enabled] = await Promise.all([
        isBiometricHardwareAvailable(),
        getBiometricLabel(),
        isBiometricUnlockEnabled(),
      ]);

      if (!cancelled) {
        setBiometricSupported(supported);
        setBiometricLabel(label);
        setBiometricEnabled(enabled);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleBiometrics = async (next: boolean) => {
    setBiometricError('');
    setBiometricBusy(true);

    try {
      if (next) {
        // On exige une vérification biométrique réussie AVANT d'activer le
        // verrou — sinon on risquerait d'enfermer l'utilisatrice hors de
        // l'app si son capteur ne fonctionne pas correctement.
        const confirmed = await authenticateWithBiometrics(
          `Confirmez avec ${biometricLabel} pour activer le verrou de l'app`
        );
        if (!confirmed) {
          const message = "Vérification biométrique annulée ou échouée. Le verrou n'a pas été activé.";
          setBiometricError(message);
          showToast(message, 'error');
          return;
        }
      }

      await setBiometricUnlockEnabled(next);
      setBiometricEnabled(next);
      showToast(
        next ? `Connexion ${biometricLabel} activée` : `Connexion ${biometricLabel} désactivée`,
        'success'
      );
    } catch {
      const message = 'Impossible de modifier ce réglage pour le moment.';
      setBiometricError(message);
      showToast(message, 'error');
    } finally {
      setBiometricBusy(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <NP><CaretLeft size={20} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <Text style={styles.headerTitle}>Sécurité du compte</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Renforcez la protection de l’accès à votre compte SferaLuna — au-delà de votre mot de
            passe ou de votre connexion Google / Apple.
          </Text>

          {/* Méthode de connexion + email — informatif, issu de la session */}
          <GlassCard style={styles.card}>
            <View style={styles.unavailableRow}>
              <View style={styles.iconWrapper}>
                <Envelope size={20} color={Colors.mutedPurple} weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>Méthode de connexion</Text>
                <Text style={styles.itemDescription}>
                  {getProviderLabel(provider)}
                  {email ? ` · ${email}` : ''}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Changer le mot de passe — uniquement pour les comptes email/mot de passe */}
          {provider === 'credentials' ? (
            <GlassCard padding={0} style={styles.card}>
              <TouchableOpacity
                style={styles.item}
                activeOpacity={0.7}
                disabled={resetBusy}
                onPress={handleRequestPasswordReset}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.iconWrapper}>
                    <Key size={20} color={Colors.mutedPurple} weight="duotone" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>Changer le mot de passe</Text>
                    <Text style={styles.itemDescription}>
                      {resetBusy
                        ? 'Envoi en cours…'
                        : `Recevez un lien de réinitialisation par email à ${email ?? 'votre adresse'}.`}
                    </Text>
                  </View>
                </View>
                <NP><CaretRight size={18} color={Colors.textMuted} />
              </NP></TouchableOpacity>
            </GlassCard>
          ) : null}

          {/* Connexion biométrique */}
          {biometricSupported ? (
            <GlassCard padding={0} style={styles.card}>
              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <View style={styles.iconWrapper}>
                    <Fingerprint size={20} color={Colors.mutedPurple} weight="duotone" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>Connexion {biometricLabel}</Text>
                    <Text style={styles.itemDescription}>
                      {biometricEnabled
                        ? "Déverrouillez l'app au lancement avec votre visage ou votre empreinte."
                        : `Activez ${biometricLabel} pour déverrouiller SferaLuna sans ressaisir vos identifiants.`}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometrics}
                  disabled={biometricBusy}
                  trackColor={{ false: Colors.glassBg, true: Colors.accentPurple }}
                  thumbColor={biometricEnabled ? '#fff' : Colors.textMuted}
                />
              </View>
            </GlassCard>
          ) : (
            <GlassCard style={styles.card}>
              <View style={styles.unavailableRow}>
                <View style={styles.iconWrapper}>
                  <Fingerprint size={20} color={Colors.textMuted} weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>Connexion biométrique</Text>
                  <Text style={styles.itemDescription}>
                    Indisponible sur cet appareil — aucun capteur Face ID / Touch ID détecté, ou
                    aucun profil biométrique enregistré dans les réglages système.
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}

          {biometricError ? <Text style={styles.errorText}>{biometricError}</Text> : null}

          {/* Vérification d'identité — informatif, calculé côté serveur */}
          <GlassCard style={styles.card}>
            <View style={styles.unavailableRow}>
              <View style={styles.iconWrapper}>
                {identityVerified ? (
                  <ShieldCheck size={20} color={Colors.success} weight="duotone" />
                ) : (
                  <ShieldWarning size={20} color={Colors.warning} weight="duotone" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>Vérification d’identité</Text>
                <Text style={styles.itemDescription}>
                  {identityVerified
                    ? 'Votre identité a été vérifiée — votre profil bénéficie du badge de confiance auprès des autres membres.'
                    : "Votre identité n'est pas encore vérifiée. Cette vérification renforce la confiance de la communauté et la sécurité de votre compte."}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  identityVerified ? styles.statusBadgeActive : styles.statusBadgeMuted,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    identityVerified ? styles.statusBadgeTextActive : styles.statusBadgeTextMuted,
                  ]}
                >
                  {identityVerified ? 'Vérifiée' : 'Non vérifiée'}
                </Text>
              </View>
            </View>

            {!identityVerified ? (
              <TouchableOpacity
                style={styles.ctaButton}
                activeOpacity={0.85}
                disabled={verifyBusy}
                onPress={handleStartIdentityVerification}
              >
                <NP><IdentificationBadge size={18} color="#fff" weight="bold" />
                </NP><Text style={styles.ctaButtonText}>
                  {verifyBusy ? 'Ouverture…' : "Lancer la vérification d'identité"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </GlassCard>

          {/* Suppression du compte — pas de route self-service côté backend ;
              on route vers le support par email plutôt que de simuler une
              action que l'API ne sait pas exécuter. */}
          <GlassCard padding={0} style={styles.card}>
            <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={handleRequestAccountDeletion}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconWrapper, styles.iconWrapperDanger]}>
                  <NP><Trash size={20} color={Colors.error} weight="duotone" />
                </NP></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, styles.itemLabelDanger]}>Supprimer mon compte</Text>
                  <Text style={styles.itemDescription}>
                    Envoie une demande à notre support — la suppression est traitée manuellement,
                    aucune action automatique n’est effectuée immédiatement.
                  </Text>
                </View>
              </View>
              <NP><CaretRight size={18} color={Colors.textMuted} />
            </NP></TouchableOpacity>
          </GlassCard>

          <Text style={styles.footer}>
            Besoin d’aide pour sécuriser votre compte ou de signaler une activité suspecte ?
            Contactez-nous à contact@sferaluna.com.
          </Text>
        </ScrollView>
      </SafeAreaView>

      <Toast toast={toast} onHide={hideToast} />
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
  intro: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 4 },
  card: { overflow: 'hidden' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  unavailableRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  itemLabelDanger: { color: Colors.error },
  itemDescription: { fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 17 },
  iconWrapperDanger: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  ctaButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accentPurple,
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  ctaButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassBg,
  },
  statusBadgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.14)' },
  statusBadgeMuted: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextActive: { color: Colors.success },
  statusBadgeTextMuted: { color: Colors.textSecondary },
  errorText: { fontSize: 12, color: Colors.error, textAlign: 'center' },
  footer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
