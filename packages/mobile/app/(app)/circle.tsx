/**
 * Circle of Six — réseau de sécurité personnel.
 *
 * Vrai module de sécurité (et non de mise en relation) : l'utilisatrice ajoute
 * jusqu'à 6 contacts de confiance (stockés localement, chiffrés, jamais envoyés
 * au serveur — voir lib/circleSafety.ts) et peut, en un geste, partager son plan
 * de sortie ou signaler qu'elle est bien rentrée, via la feuille de partage
 * native (SMS, messageries…).
 *
 * C'est le différenciateur central de SferaLuna face au 4.3(b) : une
 * fonctionnalité de sécurité réelle, absente des apps de rencontre génériques.
 * L'ancienne « sélection de profils » qui portait ce nom vit désormais dans
 * app/(app)/affinites.tsx.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from '../../components/LinearGradient';
import { OrbitGlow } from '../../components/OrbitGlow';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft, ShieldCheck, Plus, Trash, PaperPlaneTilt, HouseLine, Phone, X, UserPlus,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../lib/theme';
import { GradientButton } from '../../components/GradientButton';
import { GlassInput } from '../../components/GlassInput';
import {
  getTrustedContacts, addTrustedContact, removeTrustedContact,
  buildPlanMessage, buildSafeMessage, MAX_CONTACTS, type TrustedContact,
} from '../../lib/circleSafety';

export default function CircleScreen() {
  const [contacts, setContacts] = useState<TrustedContact[] | null>(null);
  const [plan, setPlan] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Recharge à chaque focus (contacts persistés localement).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTrustedContacts()
        .then((list) => { if (active) setContacts(list); })
        .catch(() => { if (active) setContacts([]); });
      return () => { active = false; };
    }, [])
  );

  const hasContacts = (contacts?.length ?? 0) > 0;
  const canAdd = (contacts?.length ?? 0) < MAX_CONTACTS;

  const handleShare = async (message: string) => {
    if (!hasContacts) return;
    try {
      await Share.share({ message });
    } catch {
      // Partage annulé — rien à faire.
    }
  };

  const handleAdd = async () => {
    if (saving) return;
    if (!newPhone.trim()) {
      Alert.alert('Numéro requis', 'Indiquez au moins un numéro de téléphone.');
      return;
    }
    setSaving(true);
    try {
      const updated = await addTrustedContact(newName || 'Contact', newPhone);
      setContacts(updated);
      setNewName('');
      setNewPhone('');
      setModalOpen(false);
    } catch {
      Alert.alert('Oups', "Impossible d'ajouter ce contact pour le moment. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (contact: TrustedContact) => {
    Alert.alert(
      'Retirer ce contact ?',
      `${contact.name} ne fera plus partie de votre Circle of Six.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              setContacts(await removeTrustedContact(contact.id));
            } catch {
              Alert.alert('Oups', 'Impossible de retirer ce contact pour le moment.');
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <OrbitGlow size={280} variant="light" style={{ top: -60, right: -90 }} />
      <OrbitGlow size={320} variant="light" style={{ bottom: -100, left: -110 }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <ShieldCheck size={18} color={Colors.accentPink} weight="fill" />
              <Text style={styles.title}>Circle of Six</Text>
            </View>
            <Text style={styles.subtitle}>Votre réseau de sécurité personnel</Text>
          </View>
        </View>

        {contacts === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accentPink} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <View style={styles.introCard}>
              <View style={styles.introIcon}>
                <ShieldCheck size={26} color={Colors.textPrimary} weight="fill" />
              </View>
              <Text style={styles.introText}>
                Ajoutez jusqu'à 6 contacts de confiance. En un geste, partagez
                votre plan de soirée ou prévenez-les que vous êtes bien rentrée.
                Vos contacts restent privés, sur votre téléphone.
              </Text>
            </View>

            {/* Actions rapides */}
            <Text style={styles.sectionLabel}>Actions rapides</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionCard, !hasContacts && styles.actionDisabled]}
                activeOpacity={0.85}
                disabled={!hasContacts}
                onPress={() => handleShare(buildPlanMessage(plan))}
              >
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionIcon}
                >
                  <PaperPlaneTilt size={22} color={Colors.textPrimary} weight="fill" />
                </LinearGradient>
                <Text style={styles.actionTitle}>Partager mon plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, !hasContacts && styles.actionDisabled]}
                activeOpacity={0.85}
                disabled={!hasContacts}
                onPress={() => handleShare(buildSafeMessage())}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionIcon}
                >
                  <HouseLine size={22} color={Colors.textPrimary} weight="fill" />
                </LinearGradient>
                <Text style={styles.actionTitle}>Je suis bien rentrée</Text>
              </TouchableOpacity>
            </View>

            {/* Contexte du plan */}
            <GlassInput
              label="Votre plan de ce soir (optionnel)"
              placeholder="Ex : dîner au centre-ville, retour vers 23h"
              value={plan}
              onChangeText={setPlan}
              multiline
            />

            {/* Contacts */}
            <View style={styles.contactsHeader}>
              <Text style={styles.sectionLabel}>
                Contacts de confiance · {contacts.length}/{MAX_CONTACTS}
              </Text>
            </View>

            {!hasContacts ? (
              <View style={styles.emptyBox}>
                <UserPlus size={34} color={Colors.textMuted} weight="light" />
                <Text style={styles.emptyText}>
                  Ajoutez votre premier contact de confiance pour activer votre
                  réseau de sécurité.
                </Text>
              </View>
            ) : (
              contacts.map((c) => (
                <View key={c.id} style={styles.contactRow}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactBody}>
                    <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                    <View style={styles.contactPhoneRow}>
                      <Phone size={12} color={Colors.textMuted} weight="fill" />
                      <Text style={styles.contactPhone} numberOfLines={1}>{c.phone}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemove(c)}
                    hitSlop={8}
                    style={styles.removeBtn}
                  >
                    <Trash size={18} color={Colors.error} weight="bold" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {canAdd && (
              <TouchableOpacity
                style={styles.addBtn}
                activeOpacity={0.8}
                onPress={() => setModalOpen(true)}
              >
                <Plus size={18} color={Colors.accentPink} weight="bold" />
                <Text style={styles.addText}>Ajouter un contact</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Modal ajout */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau contact de confiance</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={8}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <GlassInput
              label="Nom"
              placeholder="Ex : Maman, Léa, Sofia…"
              value={newName}
              onChangeText={setNewName}
            />
            <GlassInput
              label="Téléphone"
              placeholder="+33 6 12 34 56 78"
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />

            <GradientButton
              label="Ajouter à mon Circle of Six"
              onPress={handleAdd}
              loading={saving}
              style={styles.modalCta}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, backgroundColor: Colors.bgDeep },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerCenter: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 17 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },

  introCard: {
    flexDirection: 'row',
    gap: Spacing.base,
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(219,39,119,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: { flex: 1, fontSize: 13, lineHeight: 18, color: Colors.textSecondary },

  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  actionDisabled: { opacity: 0.4 },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  contactsHeader: { marginTop: Spacing.md },

  emptyBox: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitial: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  contactBody: { flex: 1, gap: 3 },
  contactName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  contactPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contactPhone: { fontSize: 12.5, color: Colors.textMuted },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accentPink,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  addText: { fontSize: 14, fontWeight: '600', color: Colors.accentPink },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    backgroundColor: Colors.bgMid,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: { ...Typography.h3, fontSize: 17 },
  modalCta: { marginTop: Spacing.base },
});
