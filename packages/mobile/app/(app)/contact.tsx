import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../../components/LinearGradient';
import { OrbitGlow } from '../../components/OrbitGlow';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, EnvelopeSimple, PaperPlaneTilt, MoonStars, InstagramLogo } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../lib/theme';
import { NP } from '../../components/NP';

const SUBJECTS = [
  { value: 'support',       label: '🛠️  Support technique'       },
  { value: 'signalement',   label: '🚩  Signalement urgent'       },
  { value: 'abonnement',    label: '👑  Question abonnement'      },
  { value: 'partenariat',   label: '🤝  Partenariat / presse'     },
  { value: 'autre',         label: '💬  Autre'                    },
];

export default function ContactScreen() {
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const canSend = subject && email.includes('@') && message.trim().length > 10;

  const handleSend = () => {
    // Ouvre le client mail natif avec les champs pré-remplis.
    // Pour une vraie intégration, remplacer par un appel POST /api/contact.
    const body = encodeURIComponent(`Objet : ${SUBJECTS.find((s) => s.value === subject)?.label ?? subject}\n\n${message}`);
    Linking.openURL(`mailto:contact@sferaluna.com?subject=SferaLuna%20-%20${encodeURIComponent(subject)}&body=${body}`)
      .then(() => setSent(true))
      .catch(() => Alert.alert("Impossible d'ouvrir le client mail", 'Écrivez-nous à contact@sferaluna.com'));
  };

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <OrbitGlow size={280} style={{ top: -60, right: -90 }} />
      <OrbitGlow size={320} style={{ bottom: -100, left: -110 }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <NP><ArrowLeft size={22} color={Colors.textPrimary} />
          </NP></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Nous contacter</Text>
            <Text style={styles.subtitle}>Nous répondons sous 48h ouvrées</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {sent ? (
              <View style={styles.sentState}>
                <Text style={styles.sentEmoji}>🌙</Text>
                <Text style={styles.sentTitle}>Message envoyé</Text>
                <Text style={styles.sentText}>Merci ! Nous reviendrons vers vous dans les 48h ouvrées.</Text>
                <TouchableOpacity style={styles.backHome} onPress={() => router.back()} activeOpacity={0.8}>
                  <Text style={styles.backHomeText}>Retour</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Sujet</Text>
                <View style={styles.subjectGrid}>
                  {SUBJECTS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.subjectChip, subject === s.value && styles.subjectChipActive]}
                      onPress={() => setSubject(s.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.subjectChipText, subject === s.value && { color: Colors.accentPink }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Votre adresse e-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="vous@exemple.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Votre message</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Décrivez votre question ou problème en détail…"
                  placeholderTextColor={Colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={1500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{message.length}/1500</Text>

                <TouchableOpacity
                  style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!canSend}
                  activeOpacity={0.85}
                >
                  <NP><PaperPlaneTilt size={17} color="#fff" weight="fill" />
                  </NP><Text style={styles.sendBtnText}>Envoyer</Text>
                </TouchableOpacity>

                {/* Alternatives */}
                <View style={styles.altSection}>
                  <Text style={styles.altTitle}>Autres moyens de nous joindre</Text>
                  <TouchableOpacity style={styles.altRow} onPress={() => Linking.openURL('mailto:contact@sferaluna.com')} activeOpacity={0.8}>
                    <NP><EnvelopeSimple size={18} color={Colors.mutedPurple} weight="duotone" />
                    </NP><Text style={styles.altText}>contact@sferaluna.com</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.altRow} onPress={() => Linking.openURL('https://instagram.com/sferaluna')} activeOpacity={0.8}>
                    <InstagramLogo size={18} color={Colors.mutedPurple} weight="duotone" />
                    <Text style={styles.altText}>@sferaluna</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.note}>
                  <MoonStars size={13} color={Colors.textMuted} weight="duotone" />
                  <Text style={styles.noteText}>Pour les signalements urgents, utilisez aussi le bouton de signalement directement sur le profil concerné.</Text>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, overflow: 'hidden' },
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
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40, gap: 12 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectChip: {
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  subjectChipActive: { borderColor: Colors.accentPink, backgroundColor: 'rgba(219,39,119,0.12)' },
  subjectChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  input: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, color: Colors.textPrimary, fontSize: 14,
  },
  textarea: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, padding: 14, color: Colors.textPrimary, fontSize: 14,
    minHeight: 130, lineHeight: 20,
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: -6 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accentPink, borderRadius: Radius.full, paddingVertical: 14, marginTop: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  altSection: { gap: 8, marginTop: 8 },
  altTitle: { fontSize: 13.5, fontWeight: '700', color: Colors.textSecondary },
  altRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12,
  },
  altText: { fontSize: 14, color: Colors.textPrimary },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  sentState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  sentEmoji: { fontSize: 60 },
  sentTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sentText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  backHome: {
    marginTop: 12, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: Radius.full, backgroundColor: Colors.glassBg,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  backHomeText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
});
