import React from 'react';
import {
  Modal, View, Text, StyleSheet, Image, TouchableOpacity,
} from 'react-native';
import { ChatCircleDots, Sparkle, X } from 'phosphor-react-native';
import { LinearGradient } from './LinearGradient';
import { GradientButton } from './GradientButton';
import { Colors, Spacing, Radius } from '../lib/theme';

const FALLBACK_IMAGE = 'https://i.pravatar.cc/400';

interface Props {
  visible: boolean;
  myImage?: string;
  matchImage?: string;
  matchName?: string;
  onSendMessage: () => void;
  onContinue: () => void;
}

/**
 * Célébration de match mutuel — moment fort qui ancre l'envie de revenir
 * sur l'app : on veut que l'utilisatrice ait hâte d'écrire à sa nouvelle
 * rencontre plutôt que de simplement continuer à swiper.
 */
export function MatchModal({
  visible, myImage, matchImage, matchName, onSendMessage, onContinue,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[Colors.bgMid, Colors.bgDeep]}
          style={styles.card}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={onContinue} hitSlop={8}>
            <X size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.sparkleRow}>
            <Sparkle size={18} color={Colors.accentPink} weight="fill" />
            <Sparkle size={26} color="#fff" weight="fill" />
            <Sparkle size={18} color={Colors.accentPurple} weight="fill" />
          </View>

          <Text style={styles.title}>C'est un match !</Text>
          <Text style={styles.subtitle}>
            {matchName
              ? `Vous et ${matchName} vous êtes plu mutuellement.`
              : 'Vous vous êtes plu mutuellement.'}
            {'\n'}Le moment est idéal pour faire le premier pas.
          </Text>

          <View style={styles.avatarsRow}>
            <View style={[styles.avatarRing, styles.avatarLeft]}>
              <Image source={{ uri: myImage || FALLBACK_IMAGE }} style={styles.avatar} />
            </View>
            <View style={styles.heartBadge}>
              <Text style={styles.heartEmoji}>💫</Text>
            </View>
            <View style={[styles.avatarRing, styles.avatarRight]}>
              <Image source={{ uri: matchImage || FALLBACK_IMAGE }} style={styles.avatar} />
            </View>
          </View>

          <GradientButton
            label="Envoyer un message"
            onPress={onSendMessage}
            style={styles.sendBtn}
          />
          <TouchableOpacity onPress={onContinue} activeOpacity={0.7} style={styles.continueBtn}>
            <ChatCircleDots size={16} color={Colors.textSecondary} />
            <Text style={styles.continueText}>Continuer à explorer</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.accentPink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 3,
    backgroundColor: Colors.bgDeep,
    borderWidth: 2,
    borderColor: Colors.accentPink,
  },
  avatarLeft: { marginRight: -16, zIndex: 1 },
  avatarRight: { marginLeft: -16, borderColor: Colors.accentPurple },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
  },
  heartBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgDeep,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heartEmoji: { fontSize: 18 },
  sendBtn: { width: '100%' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 8,
  },
  continueText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
});
