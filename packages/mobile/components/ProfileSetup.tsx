/**
 * ProfileSetupOverlay — création du profil à la première connexion.
 *
 * L'inscription dans l'app ne demande que nom, e-mail et mot de passe. Tant que
 * le profil n'est pas complété (`hasCompletedProfile` côté serveur), la membre
 * n'apparaît dans l'annuaire de personne et ne peut pas recevoir d'invitation.
 * Cet écran reprend donc les étapes de l'inscription du site, en quatre temps,
 * et les envoie à la même route (POST /api/users/update-profile), avec les
 * mêmes valeurs et les mêmes règles (28 ans minimum, 3 à 5 centres d'intérêt,
 * consentement obligatoire).
 *
 * Superposé au navigateur comme VerificationOverlay, et affiché avant lui :
 * on crée son profil, puis on vérifie son identité — même ordre que sur le site.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CaretDown, Check, MagnifyingGlass, X } from 'phosphor-react-native';
import { LinearGradient } from './LinearGradient';
import { GradientButton } from './GradientButton';
import { NP } from './NP';
import { Colors, Spacing, Radius } from '../lib/theme';
import { fetchMyProfile, completeProfile } from '../lib/api';
import { signOut } from '../lib/auth';
import { ApiError } from '../lib/http';
import { DEPARTEMENTS, getDepartementLabel, getVillesPourDepartement } from '../lib/locations';
import { INTENTIONS, INTERESTS } from '../lib/intentions';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';

// Valeurs alignées sur l'inscription du site (src/app/inscription/steps).
const ORIENTATIONS = [
  { value: 'homo', label: 'Lesbienne / Homosexuelle' },
  { value: 'bi', label: 'Bisexuelle' },
  { value: 'pan', label: 'Pansexuelle' },
  { value: 'hetero', label: 'Hétérosexuelle' },
  { value: 'curieuse', label: 'Curieuse' },
  { value: 'other', label: 'Autre' },
];

const PORTEES = [
  { value: 'departement', label: 'Mon département' },
  { value: 'region', label: 'Ma région' },
  { value: 'france', label: 'Toute la France' },
];

const QUESTIONS = [
  { value: 'nom-animal', label: 'Quel était le nom de votre premier animal de compagnie ?' },
  { value: 'ville-naissance', label: 'Dans quelle ville êtes-vous née ?' },
  { value: 'film-prefere', label: 'Quel est votre film préféré ?' },
  { value: 'prof-reve', label: 'Quel était le métier de vos rêves quand vous étiez enfant ?' },
  { value: 'livre-prefere', label: 'Quel est votre livre préféré ?' },
];

const DEFAULT_PSEUDO = 'Utilisateur Luna';
const STEP_TITLES = ['Qui êtes-vous ?', 'Pourquoi êtes-vous ici ?', 'Où êtes-vous ?', 'Ce que vous aimez'];

type Form = {
  pseudonyme: string;
  age: string;
  intentions: string[];
  orientation: string;
  departement: string;
  localisation: string;
  rayon: string;
  interets: string[];
  question: string;
  reponse: string;
  consentement: boolean;
};

/** Renvoie le message d'erreur de l'étape, ou null si elle est complète. */
function validateStep(step: number, f: Form): string | null {
  if (step === 0) {
    const pseudo = f.pseudonyme.trim();
    if (pseudo.length < 3) return 'Votre pseudonyme doit contenir au moins 3 caractères.';
    if (pseudo.length > 50) return 'Votre pseudonyme ne doit pas dépasser 50 caractères.';
    const age = Number(f.age);
    if (!f.age.trim() || !Number.isInteger(age)) return 'Indiquez votre âge.';
    if (age < 28) return 'SferaLuna est réservé aux femmes de 28 ans et plus.';
    if (age > 120) return 'Vérifiez votre âge.';
  }
  if (step === 1 && f.intentions.length === 0) return 'Choisissez au moins une raison.';
  if (step === 2) {
    if (!f.departement) return 'Sélectionnez votre département.';
    if (f.localisation.trim().length < 2) return 'Indiquez votre ville.';
  }
  if (step === 3) {
    if (f.interets.length < 3) return 'Choisissez au moins 3 centres d’intérêt.';
    if (!f.question) return 'Choisissez une question de sécurité.';
    if (f.reponse.trim().length < 2) return 'Votre réponse est trop courte.';
    if (!f.consentement) return 'Votre accord est nécessaire pour créer votre profil.';
  }
  return null;
}

export function ProfileSetupOverlay() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['profile', 'me'], queryFn: fetchMyProfile });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<'departement' | 'question' | null>(null);
  const [search, setSearch] = useState('');

  const user = data?.user as (Record<string, unknown> & { pseudonyme?: string }) | undefined;

  const departements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? DEPARTEMENTS.filter((d) => d.code.toLowerCase().startsWith(q) || d.nom.toLowerCase().includes(q)) : DEPARTEMENTS;
  }, [search]);

  // Tant que le statut est inconnu (chargement, erreur réseau), on laisse la
  // main à VerificationOverlay, qui gère déjà ces deux états en plein écran.
  if (isLoading || isError || !user) return null;
  if (user.hasCompletedProfile === true) return null;

  const f: Form = form ?? {
    pseudonyme: user.pseudonyme && user.pseudonyme !== DEFAULT_PSEUDO ? String(user.pseudonyme) : '',
    age: typeof user.age === 'number' ? String(user.age) : '',
    intentions: [],
    orientation: '',
    departement: '',
    localisation: '',
    rayon: 'region',
    interets: [],
    question: '',
    reponse: '',
    consentement: false,
  };
  const set = (patch: Partial<Form>) => { setForm({ ...f, ...patch }); setError(''); };
  const toggle = (key: 'intentions' | 'interets', value: string, max?: number) => {
    const list = f[key];
    if (list.includes(value)) return set({ [key]: list.filter((v) => v !== value) } as Partial<Form>);
    if (max && list.length >= max) { hapticWarning(); return setError(`Vous pouvez en choisir ${max} au maximum.`); }
    hapticLight();
    set({ [key]: [...list, value] } as Partial<Form>);
  };

  const villes = getVillesPourDepartement(f.departement).slice(0, 6);

  const next = async () => {
    const problem = validateStep(step, f);
    if (problem) { hapticWarning(); setError(problem); return; }
    if (step < STEP_TITLES.length - 1) { setStep(step + 1); setError(''); return; }

    setSaving(true);
    setError('');
    try {
      await completeProfile({
        pseudonyme: f.pseudonyme.trim(),
        age: Number(f.age),
        intentions: f.intentions,
        ...(f.orientation ? { orientation: f.orientation } : {}),
        departement: f.departement,
        localisation: f.localisation.trim(),
        rayon: f.rayon,
        interets: f.interets,
        question: f.question,
        reponse: f.reponse.trim(),
        visibilite: 'public',
        consentement: true,
      });
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    } catch (e) {
      hapticWarning();
      const message = e instanceof ApiError ? e.message : 'Enregistrement impossible. Vérifiez votre connexion et réessayez.';
      setError(message);
      // Pseudonyme déjà pris : on ramène à l'étape où le corriger.
      if (e instanceof ApiError && /pseudonyme/i.test(message)) setStep(0);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.cover} pointerEvents="auto">
      <StatusBar style="light" />
      <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.top}>
            {step > 0 ? (
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={() => { setStep(step - 1); setError(''); }}
                accessibilityRole="button"
                accessibilityLabel="Étape précédente"
              >
                <NP><ArrowLeft size={20} color={Colors.textPrimary} /></NP>
              </TouchableOpacity>
            ) : <View style={styles.roundSpacer} />}
            <View style={styles.progress} accessibilityLabel={`Étape ${step + 1} sur ${STEP_TITLES.length}`}>
              {STEP_TITLES.map((_, i) => (
                <View key={i} style={[styles.progressBar, i <= step && styles.progressBarOn]} />
              ))}
            </View>
            <View style={styles.roundSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.kicker}>Votre profil · {step + 1}/{STEP_TITLES.length}</Text>
            <Text style={styles.title}>{STEP_TITLES[step]}</Text>

            {step === 0 && (
              <>
                <Text style={styles.lead}>C’est ainsi que les autres membres vous verront dans la communauté.</Text>
                <Text style={styles.label}>Pseudonyme</Text>
                <TextInput
                  style={styles.input}
                  value={f.pseudonyme}
                  onChangeText={(v) => set({ pseudonyme: v })}
                  placeholder="Le nom affiché sur votre profil"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={50}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <Text style={styles.label}>Âge</Text>
                <TextInput
                  style={styles.input}
                  value={f.age}
                  onChangeText={(v) => set({ age: v.replace(/[^0-9]/g, '').slice(0, 3) })}
                  placeholder="28 ans minimum"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
                <Text style={styles.hint}>SferaLuna est une communauté réservée aux femmes de 28 ans et plus.</Text>
              </>
            )}

            {step === 1 && (
              <>
                <Text style={styles.lead}>Plusieurs réponses possibles. Vous pourrez en parler librement sur votre profil.</Text>
                <View style={styles.chips}>
                  {INTENTIONS.map((o) => (
                    <Chip key={o.value} label={o.label} on={f.intentions.includes(o.value)} onPress={() => toggle('intentions', o.value)} />
                  ))}
                </View>
                <Text style={styles.label}>Orientation <Text style={styles.optional}>(facultatif)</Text></Text>
                <View style={styles.chips}>
                  {ORIENTATIONS.map((o) => (
                    <Chip
                      key={o.value}
                      label={o.label}
                      on={f.orientation === o.value}
                      onPress={() => { hapticLight(); set({ orientation: f.orientation === o.value ? '' : o.value }); }}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.lead}>Pour vous proposer des membres et des événements près de chez vous, en métropole comme en outre-mer.</Text>
                <Text style={styles.label}>Département</Text>
                <TouchableOpacity style={styles.select} onPress={() => { setSearch(''); setPicker('departement'); }} accessibilityRole="button">
                  <Text style={[styles.selectText, !f.departement && styles.placeholder]} numberOfLines={1}>
                    {f.departement ? getDepartementLabel(f.departement) : 'Sélectionnez votre département'}
                  </Text>
                  <CaretDown size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.label}>Ville</Text>
                <TextInput
                  style={styles.input}
                  value={f.localisation}
                  onChangeText={(v) => set({ localisation: v })}
                  placeholder="Saisissez votre ville"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={120}
                  autoCapitalize="words"
                />
                {villes.length > 0 && (
                  <View style={[styles.chips, { marginTop: Spacing.md }]}>
                    {villes.map((ville) => (
                      <Chip key={ville} label={ville} on={f.localisation === ville} onPress={() => { hapticLight(); set({ localisation: ville }); }} />
                    ))}
                  </View>
                )}
                <Text style={styles.label}>Voir des membres de</Text>
                <View style={styles.chips}>
                  {PORTEES.map((o) => (
                    <Chip key={o.value} label={o.label} on={f.rayon === o.value} onPress={() => { hapticLight(); set({ rayon: o.value }); }} />
                  ))}
                </View>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.lead}>Choisissez de 3 à 5 centres d’intérêt.</Text>
                <View style={styles.chips}>
                  {INTERESTS.map((o) => (
                    <Chip key={o.value} label={o.label} on={f.interets.includes(o.value)} onPress={() => toggle('interets', o.value, 5)} />
                  ))}
                </View>
                <Text style={styles.label}>Question de sécurité</Text>
                <TouchableOpacity style={styles.select} onPress={() => setPicker('question')} accessibilityRole="button">
                  <Text style={[styles.selectText, !f.question && styles.placeholder]} numberOfLines={2}>
                    {QUESTIONS.find((q) => q.value === f.question)?.label ?? 'Choisissez une question'}
                  </Text>
                  <CaretDown size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { marginTop: Spacing.sm }]}
                  value={f.reponse}
                  onChangeText={(v) => set({ reponse: v })}
                  placeholder="Votre réponse"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={200}
                />
                <Text style={styles.hint}>Elle reste privée et sert à protéger votre compte.</Text>

                <TouchableOpacity
                  style={styles.consentRow}
                  activeOpacity={0.8}
                  onPress={() => { hapticLight(); set({ consentement: !f.consentement }); }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: f.consentement }}
                >
                  <View style={[styles.box, f.consentement && styles.boxOn]}>
                    {f.consentement && <Check size={14} color="#fff" weight="bold" />}
                  </View>
                  <Text style={styles.consentText}>
                    J’accepte les conditions d’utilisation et la politique de confidentialité de SferaLuna, et que ces informations
                    apparaissent sur mon profil.
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <GradientButton
              label={step < STEP_TITLES.length - 1 ? 'Continuer' : 'Créer mon profil'}
              onPress={next}
              loading={saving}
            />
            {step === 0 && (
              <TouchableOpacity onPress={() => signOut()} activeOpacity={0.7} style={styles.signOutBtn}>
                <Text style={styles.signOut}>Se déconnecter</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Sélecteurs */}
      <Modal visible={picker !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(null)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{picker === 'departement' ? 'Votre département' : 'Question de sécurité'}</Text>
            <TouchableOpacity onPress={() => setPicker(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <NP><X size={22} color={Colors.textPrimary} /></NP>
            </TouchableOpacity>
          </View>

          {picker === 'departement' ? (
            <>
              <View style={styles.searchRow}>
                <MagnifyingGlass size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Numéro ou nom"
                  placeholderTextColor={Colors.textMuted}
                  autoCorrect={false}
                />
              </View>
              <FlatList
                data={departements}
                keyExtractor={(d) => d.code}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.sheetEmpty}>Aucun département trouvé.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.sheetRow}
                    onPress={() => { set({ departement: item.code, localisation: '' }); setPicker(null); }}
                  >
                    <Text style={styles.sheetRowText}>{item.code} — {item.nom}</Text>
                    {f.departement === item.code && <Check size={18} color={Colors.accentPink} weight="bold" />}
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            QUESTIONS.map((q) => (
              <TouchableOpacity key={q.value} style={styles.sheetRow} onPress={() => { set({ question: q.value }); setPicker(null); }}>
                <Text style={styles.sheetRowText}>{q.label}</Text>
                {f.question === q.value && <Check size={18} color={Colors.accentPink} weight="bold" />}
              </TouchableOpacity>
            ))
          )}
        </View>
      </Modal>

      {saving && (
        <View style={styles.savingVeil} pointerEvents="auto">
          <ActivityIndicator color={Colors.accentPink} size="large" />
        </View>
      )}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, on && styles.chipOn]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Au-dessus de VerificationOverlay (zIndex 100) : le profil d'abord.
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 110, backgroundColor: Colors.bgDeep },
  safe: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  roundBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  roundSpacer: { width: 44, height: 44 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.glassBorder },
  progressBarOn: { backgroundColor: Colors.accentPink },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: Colors.accentPink },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginTop: 6 },
  lead: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary, marginTop: Spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  optional: { fontWeight: '400', color: Colors.textMuted },
  hint: { fontSize: 13, lineHeight: 18, color: Colors.textMuted, marginTop: Spacing.sm },
  input: {
    minHeight: 52, borderRadius: Radius.md, paddingHorizontal: Spacing.base,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    color: Colors.textPrimary, fontSize: 16,
  },
  select: {
    minHeight: 52, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: 10,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  selectText: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  placeholder: { color: Colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: Spacing.base },
  chip: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: Radius.full, justifyContent: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  chipOn: { backgroundColor: 'rgba(219,39,119,0.18)', borderColor: Colors.accentPink },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  chipTextOn: { color: Colors.textPrimary, fontWeight: '600' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: Spacing.xl, minHeight: 44 },
  box: {
    width: 24, height: 24, borderRadius: 7, marginTop: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  boxOn: { backgroundColor: Colors.accentPink, borderColor: Colors.accentPink },
  consentText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  error: {
    marginTop: Spacing.lg, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.12)',
    fontSize: 14, lineHeight: 20, color: '#FECACA',
  },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.base },
  signOutBtn: { alignSelf: 'center', paddingVertical: Spacing.md, minHeight: 44, justifyContent: 'center' },
  signOut: { fontSize: 14, color: Colors.textMuted },
  sheet: { flex: 1, backgroundColor: Colors.bgDeep },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, margin: Spacing.lg, paddingHorizontal: Spacing.base,
    minHeight: 48, borderRadius: Radius.md, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 16 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md,
    minHeight: 52, paddingHorizontal: Spacing.xl, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sheetRowText: { flex: 1, fontSize: 15, lineHeight: 21, color: Colors.textPrimary },
  sheetEmpty: { textAlign: 'center', color: Colors.textMuted, marginTop: Spacing.xl },
  savingVeil: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,11,46,0.6)' },
});
