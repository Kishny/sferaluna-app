/**
 * VerificationOverlay — porte d'entrée « vérification d'identité obligatoire ».
 *
 * Superposé (position absolue, plein écran opaque) au navigateur authentifié
 * dans app/(app)/_layout.tsx. Tant que le champ serveur `identityVerified`
 * n'est pas `true`, l'utilisatrice ne peut RIEN faire dans l'app : l'overlay
 * couvre entièrement les onglets. C'est la traduction, côté produit, de la
 * promesse faite à l'App Review (« vérification obligatoire dès l'inscription »)
 * et le différenciateur structurel face au 4.3(b) — l'app n'est pas à
 * inscription ouverte comme une app de rencontre générique.
 *
 * On superpose (plutôt que remplacer le <Stack>) pour ne pas démonter le
 * navigateur : la navigation profonde / les deep-links restent intacts, on se
 * contente de masquer visuellement l'accès.
 *
 * `identityVerified` est calculé côté serveur (webhook Stripe Identity) — jamais
 * piloté par le client. Le flux Stripe est un hosted-redirect (même pattern que
 * securite.tsx / premium.tsx), traité en asynchrone : après retour, on
 * rafraîchit le profil ; le statut peut mettre quelques instants à passer à
 * `true` le temps du traitement Stripe, d'où le bouton « Actualiser le statut ».
 *
 * ⚠️ Réglage métier : ce gate bloque TOUTE utilisatrice non vérifiée, y compris
 * les comptes web existants. Pour l'assouplir (ex. laisser consulter mais pas
 * interagir), restreindre le rendu de l'overlay à certaines routes plutôt que
 * de couvrir tout le navigateur.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { ShieldCheck, IdentificationBadge, ArrowClockwise } from 'phosphor-react-native';
import { LinearGradient } from './LinearGradient';
import { GradientButton } from './GradientButton';
import { Colors, Spacing, Radius, Typography } from '../lib/theme';
import { fetchMyProfile, createIdentityVerificationSession } from '../lib/api';
import { signOut } from '../lib/auth';
import { ApiError, API_BASE_URL } from '../lib/http';

const APP_ORIGIN = API_BASE_URL.replace(/\/$/, '');

export function VerificationOverlay() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });

  const verified = Boolean(data?.user.identityVerified);

  // Profil vérifié → aucun overlay, accès complet à l'app.
  if (verified) return null;

  // Chargement initial : on couvre l'écran le temps de connaître le statut,
  // pour ne pas laisser entrevoir les onglets avant vérification.
  if (isLoading) {
    return (
      <Cover>
        <ActivityIndicator color={Colors.accentPink} size="large" />
        <Text style={styles.loaderText}>Chargement de votre espace…</Text>
      </Cover>
    );
  }

  // Erreur réseau : on ne verrouille pas définitivement, on propose de réessayer.
  if (isError) {
    return (
      <Cover>
        <Text style={styles.title}>Connexion impossible</Text>
        <Text style={styles.body}>
          Impossible de vérifier votre statut pour le moment. Vérifiez votre
          connexion et réessayez.
        </Text>
        <GradientButton
          label="Réessayer"
          onPress={() => refetch()}
          loading={isFetching}
          style={styles.cta}
        />
      </Cover>
    );
  }

  const handleVerify = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await createIdentityVerificationSession();
      const result = await WebBrowser.openAuthSessionAsync(url, APP_ORIGIN);
      if (result.type === 'success') {
        await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      }
      // 'cancel' / 'dismiss' : fenêtre fermée — on reste sur le gate.
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Impossible de lancer la vérification.'
      );
    } finally {
      setBusy(false);
    }
  };

  // État principal : compte non vérifié → gate bloquant.
  return (
    <Cover>
      <View style={styles.iconRing}>
        <IdentificationBadge size={44} color={Colors.textPrimary} weight="light" />
      </View>

      <Text style={styles.title}>Vérifiez votre identité</Text>

      <Text style={styles.body}>
        Sur SferaLuna, chaque membre vérifie son identité avant d'accéder à la
        communauté. C'est ce qui garantit un espace sûr, authentique et sans
        faux profils.
      </Text>

      <View style={styles.stepsCard}>
        <Step label="Pièce d'identité officielle" />
        <Step label="Selfie en direct" />
        <Step label="Vérification sécurisée via Stripe Identity" />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <GradientButton
        label="Vérifier mon identité"
        onPress={handleVerify}
        loading={busy}
        style={styles.cta}
      />

      <TouchableOpacity
        onPress={() => refetch()}
        style={styles.refreshBtn}
        activeOpacity={0.7}
        disabled={isFetching}
      >
        <ArrowClockwise size={16} color={Colors.textSecondary} weight="bold" />
        <Text style={styles.refreshText}>
          {isFetching ? 'Actualisation…' : 'Actualiser le statut'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => signOut()} activeOpacity={0.7}>
        <Text style={styles.signOut}>Se déconnecter</Text>
      </TouchableOpacity>
    </Cover>
  );
}

function Step({ label }: { label: string }) {
  return (
    <View style={styles.step}>
      <ShieldCheck size={18} color={Colors.success} weight="fill" />
      <Text style={styles.stepText}>{label}</Text>
    </View>
  );
}

/** Fond plein écran opaque qui masque totalement le navigateur sous-jacent. */
function Cover({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.cover} pointerEvents="auto">
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.bgDeep, Colors.bgMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: Colors.bgDeep,
  },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.base,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: Spacing.sm,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepText: { ...Typography.bodyLg, fontSize: 15, flex: 1 },
  cta: { width: '100%', marginTop: Spacing.sm },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  refreshText: { ...Typography.body, color: Colors.textSecondary },
  signOut: {
    ...Typography.body,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
    marginTop: Spacing.xs,
  },
  loaderText: { ...Typography.body, marginTop: Spacing.base },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
});
