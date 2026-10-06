import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { ChatCircleDots, Sparkle, X } from 'phosphor-react-native';
import { LinearGradient } from './LinearGradient';
import { GradientButton } from './GradientButton';
import { AvatarPlaceholder } from './AvatarPlaceholder';
import { Colors, Spacing, Radius } from '../lib/theme';
import { NP } from '../components/NP';
import { hapticLight } from '../lib/haptics';

interface Props {
  visible: boolean;
  myImage?: string;
  memberImage?: string;
  memberName?: string;
  onSendMessage: () => void;
  onContinue: () => void;
}

/**
 * Affichée quand une invitation est réciproque : les deux membres sont
 * connectées et la messagerie s'ouvre entre elles.
 */
export function ConnectionModal({
  visible, myImage, memberImage, memberName, onSendMessage, onContinue,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[Colors.bgMid, Colors.bgDeep]}
          style={styles.card}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={() => { hapticLight(); onContinue(); }} hitSlop={8}>
            <NP><X size={18} color="rgba(255,255,255,0.6)" /></NP>
          </TouchableOpacity>

          <View style={styles.sparkleRow}>
            <Sparkle size={18} color={Colors.accentPink} weight="fill" />
            <Sparkle size={26} color="#fff" weight="fill" />
            <Sparkle size={18} color={Colors.accentPurple} weight="fill" />
          </View>

          <Text style={styles.title}>Vous êtes connectées</Text>
          <Text style={styles.subtitle}>
            {memberName
              ? `${memberName} et vous avez accepté de vous connecter.`
              : 'Votre invitation est réciproque.'}
            {'\n'}Vous pouvez maintenant vous écrire.
          </Text>

          <View style={styles.avatarsRow}>
            <View style={[styles.avatarRing, styles.avatarLeft]}>
              <AvatarPlaceholder uri={myImage} size={86} />
            </View>
            <View style={styles.heartBadge}>
              <Text style={styles.heartEmoji}>💫</Text>
            </View>
            <View style={[styles.avatarRing, styles.avatarRight]}>
              <AvatarPlaceholder uri={memberImage} name={memberName} size={86} />
            </View>
          </View>

          <GradientButton
            label="Envoyer un message"
            onPress={onSendMessage}
            style={styles.sendBtn}
          />
          <TouchableOpacity onPress={() => { hapticLight(); onContinue(); }} activeOpacity={0.7} style={styles.continueBtn}>
            <NP><ChatCircleDots size={16} color={Colors.textSecondary} />
            </NP><Text style={styles.continueText}>Plus tard</Text>
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
