import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnvelopeSimple, Lock, GoogleLogo, AppleLogo } from 'phosphor-react-native';
import { GradientButton } from '../../components/GradientButton';
import { GlassInput } from '../../components/GlassInput';
import { Colors, Spacing } from '../../lib/theme';
import { signInWithCredentials, signInWithProvider } from '../../lib/auth';
import { ApiError } from '../../lib/http';

const SFERALUNA_LOGO = require('../../assets/branding/logo-icon.png');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithCredentials(email.trim(), password);
      router.replace('/(app)/(tabs)/discover');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Connexion impossible. Vérifiez votre réseau et réessayez.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProviderLogin = async (provider: 'google' | 'apple') => {
    setError('');
    setProviderLoading(provider);
    try {
      await signInWithProvider(provider);
      router.replace('/(app)/(tabs)/discover');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connexion impossible pour le moment.');
    } finally {
      setProviderLoading(null);
    }
  };

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>← Retour</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Image source={SFERALUNA_LOGO} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Bon retour</Text>
              <Text style={styles.subtitle}>
                Connectez-vous pour retrouver vos connexions
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <GlassInput
                label="Adresse email"
                placeholder="votre@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<EnvelopeSimple size={20} color={Colors.textMuted} />}
              />

              <GlassInput
                label="Mot de passe"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon={<Lock size={20} color={Colors.textMuted} />}
              />

              <TouchableOpacity style={styles.forgot}>
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>

              <GradientButton
                label="Se connecter"
                onPress={handleLogin}
                loading={loading}
                style={styles.btn}
              />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleProviderLogin('google')}
                disabled={providerLoading !== null}
              >
                <GoogleLogo size={20} color={Colors.textPrimary} weight="bold" />
                <Text style={styles.socialBtnText}>
                  {providerLoading === 'google' ? 'Connexion…' : 'Continuer avec Google'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleProviderLogin('apple')}
                disabled={providerLoading !== null}
              >
                <AppleLogo size={20} color={Colors.textPrimary} weight="fill" />
                <Text style={styles.socialBtnText}>
                  {providerLoading === 'apple' ? 'Connexion…' : 'Continuer avec Apple'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                style={styles.registerLink}
              >
                <Text style={styles.registerText}>
                  Pas encore de compte ?{' '}
                  <Text style={styles.registerHighlight}>S'inscrire</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  back: { paddingTop: Spacing.base, marginBottom: 24 },
  backText: { color: Colors.textSecondary, fontSize: 14 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 64, height: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  form: { gap: 4 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: Colors.error, fontSize: 13 },
  forgot: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 },
  forgotText: { color: Colors.accentPink, fontSize: 13 },
  btn: { marginTop: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.glassBorder },
  dividerText: { color: Colors.textMuted, fontSize: 12 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
    marginBottom: 12,
  },
  socialBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  registerLink: { alignItems: 'center', paddingTop: 20 },
  registerText: { color: Colors.textSecondary, fontSize: 14 },
  registerHighlight: { color: Colors.accentPink, fontWeight: '600' },
});
