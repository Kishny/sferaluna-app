import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from '../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, EnvelopeSimple, Lock, Cake, GoogleLogo, AppleLogo } from 'phosphor-react-native';
import { GradientButton } from '../../components/GradientButton';
import { GlassInput } from '../../components/GlassInput';
import { GlassCard } from '../../components/GlassCard';
import { Colors, Spacing } from '../../lib/theme';
import { registerWithCredentials, signInWithProvider } from '../../lib/auth';
import { ApiError } from '../../lib/http';

const steps = ['Identité', 'Contact', 'Sécurité'];

export default function RegisterScreen() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [providerLoading, setProviderLoading] = useState<'google' | 'apple' | null>(null);

  const validateStep = () => {
    setError('');
    if (step === 0 && (!name || !birthdate)) {
      setError('Veuillez renseigner votre prénom et date de naissance.');
      return false;
    }
    if (step === 1 && !email) {
      setError('Veuillez renseigner votre email.');
      return false;
    }
    if (step === 2) {
      if (!password || !confirmPassword) { setError('Veuillez remplir les deux champs.'); return false; }
      if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return false; }
      if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return false; }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // L'inscription crée un compte `plan: "free"` non vérifié ; la date de
      // naissance et le reste du profil sont complétés à l'étape suivante
      // (le backend /api/auth/register ne prend que name/email/password).
      // apiFetch lève une ApiError si `success: false` — un retour normal
      // signifie ici que le compte a bien été créé (email de vérification envoyé).
      await registerWithCredentials(name.trim(), email.trim(), password);
      router.replace('/(auth)/login');
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

  const handleProviderRegister = async (provider: 'google' | 'apple') => {
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
            <TouchableOpacity
              onPress={() => step > 0 ? setStep(step - 1) : router.back()}
              style={styles.back}
            >
              <Text style={styles.backText}>← Retour</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Créer mon compte</Text>
              <Text style={styles.subtitle}>Rejoignez SferaLuna gratuitement</Text>
            </View>

            {step === 0 && (
              <View style={styles.socialBlock}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => handleProviderRegister('google')}
                  disabled={providerLoading !== null}
                >
                  <GoogleLogo size={20} color={Colors.textPrimary} weight="bold" />
                  <Text style={styles.socialBtnText}>
                    {providerLoading === 'google' ? 'Connexion…' : "S'inscrire avec Google"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => handleProviderRegister('apple')}
                  disabled={providerLoading !== null}
                >
                  <AppleLogo size={20} color={Colors.textPrimary} weight="fill" />
                  <Text style={styles.socialBtnText}>
                    {providerLoading === 'apple' ? 'Connexion…' : "S'inscrire avec Apple"}
                  </Text>
                </TouchableOpacity>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou avec un email</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            )}

            {/* Step indicators */}
            <View style={styles.stepRow}>
              {steps.map((label, i) => (
                <View key={i} style={styles.stepItem}>
                  <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
                    <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>
                    {label}
                  </Text>
                  {i < steps.length - 1 && (
                    <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
                  )}
                </View>
              ))}
            </View>

            {/* Form */}
            <GlassCard style={styles.card}>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {step === 0 && (
                <>
                  <GlassInput
                    label="Prénom"
                    placeholder="Votre prénom"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    icon={<User size={20} color={Colors.textMuted} />}
                  />
                  <GlassInput
                    label="Date de naissance"
                    placeholder="JJ/MM/AAAA"
                    value={birthdate}
                    onChangeText={setBirthdate}
                    keyboardType="numeric"
                    icon={<Cake size={20} color={Colors.textMuted} />}
                  />
                </>
              )}

              {step === 1 && (
                <GlassInput
                  label="Adresse email"
                  placeholder="votre@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon={<EnvelopeSimple size={20} color={Colors.textMuted} />}
                />
              )}

              {step === 2 && (
                <>
                  <GlassInput
                    label="Mot de passe"
                    placeholder="Minimum 8 caractères"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    icon={<Lock size={20} color={Colors.textMuted} />}
                  />
                  <GlassInput
                    label="Confirmer le mot de passe"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    icon={<Lock size={20} color={Colors.textMuted} />}
                  />
                </>
              )}

              <GradientButton
                label={step < 2 ? 'Continuer' : "Créer mon compte"}
                onPress={handleNext}
                loading={loading}
                style={{ marginTop: 8 }}
              />
            </GlassCard>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.loginLink}
            >
              <Text style={styles.loginText}>
                Déjà un compte ?{' '}
                <Text style={styles.loginHighlight}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
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
  back: { paddingTop: Spacing.base, marginBottom: 16 },
  backText: { color: Colors.textSecondary, fontSize: 14 },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.textSecondary },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
  },
  stepNum: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: Colors.textMuted, marginLeft: 6 },
  stepLabelActive: { color: Colors.textPrimary, fontWeight: '500' },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginHorizontal: 6,
  },
  stepLineActive: { backgroundColor: Colors.accentPurple },
  card: { marginBottom: 24 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: Colors.error, fontSize: 13 },
  socialBlock: { marginBottom: 8 },
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.glassBorder },
  dividerText: { color: Colors.textMuted, fontSize: 12 },
  loginLink: { alignItems: 'center' },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginHighlight: { color: Colors.accentPink, fontWeight: '600' },
});
