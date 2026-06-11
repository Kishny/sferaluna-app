import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Animated, ActionSheetIOS, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, PaperPlaneRight, DotsThree, Warning, Trash, BellSlash, Archive, X } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchMatches, fetchMessages, sendMessage, type ChatMessage } from '../../../lib/api';
import { ApiError } from '../../../lib/http';
import { getPusherClient, matchChannelName } from '../../../lib/realtime';
import { hapticLight, hapticMedium, hapticWarning } from '../../../lib/haptics';
import { NP } from '../../../components/NP';

// ─── Menu contextuel ⋯ ───────────────────────────────────────────────────────

const MUTE_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '1 heure', value: 60 },
  { label: '8 heures', value: 480 },
  { label: '24 heures', value: 1440 },
];

interface ChatMenuProps {
  visible: boolean;
  onClose: () => void;
  contactName: string;
  onReport: () => void;
  onDelete: () => void;
  onMute: (minutes: number) => void;
  onArchive: () => void;
}

function ChatMenu({ visible, onClose, contactName, onReport, onDelete, onMute, onArchive }: ChatMenuProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowMuteOptions(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 120 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const menuItems = showMuteOptions
    ? MUTE_OPTIONS.map((opt) => ({
        label: opt.label,
        icon: <BellSlash size={20} color={Colors.textSecondary} weight="duotone" />,
        onPress: () => { onMute(opt.value); onClose(); },
        danger: false,
      }))
    : [
        {
          label: 'Mettre en sourdine',
          icon: <BellSlash size={20} color={Colors.textSecondary} weight="duotone" />,
          onPress: () => setShowMuteOptions(true),
          danger: false,
        },
        {
          label: 'Archiver la conversation',
          icon: <Archive size={20} color={Colors.textSecondary} weight="duotone" />,
          onPress: () => { onArchive(); onClose(); },
          danger: false,
        },
        {
          label: 'Signaler',
          icon: <Warning size={20} color="#f59e0b" weight="duotone" />,
          onPress: () => { onReport(); onClose(); },
          danger: false,
        },
        {
          label: 'Supprimer la conversation',
          icon: <Trash size={20} color="#ef4444" weight="duotone" />,
          onPress: () => { onDelete(); onClose(); },
          danger: true,
        },
      ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.menuBackdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.menuSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.menuHandle} />

        {/* Titre */}
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>
            {showMuteOptions ? 'Mettre en sourdine' : contactName}
          </Text>
          {showMuteOptions && (
            <TouchableOpacity onPress={() => setShowMuteOptions(false)} style={styles.menuBackBtn}>
              <NP><X size={18} color={Colors.textSecondary} /></NP>
            </TouchableOpacity>
          )}
        </View>

        {/* Options */}
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
            onPress={() => { hapticLight(); item.onPress(); }}
            activeOpacity={0.7}
          >
            <NP style={styles.menuItemIcon}>{item.icon}</NP>
            <Text style={[styles.menuItemLabel, item.danger && styles.menuItemDanger]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const { data: matchesData } = useQuery({
    queryKey: ['messages', 'matches'],
    queryFn: fetchMatches,
  });
  const match = matchesData?.matches.find((m) => m.matchId === matchId);
  const contact = match?.user;

  const {
    data: messagesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chat', matchId, 'messages'],
    queryFn: () => fetchMessages(matchId!),
    enabled: !!matchId,
    // Polling de secours toutes les 5 s si Pusher n'est pas disponible
    refetchInterval: getPusherClient() ? false : 5_000,
    refetchIntervalInBackground: false,
  });

  const messages = messagesData?.messages ?? [];
  const currentUserId = messagesData?.currentUserId;

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(matchId!, content),
    onSuccess: (res) => {
      queryClient.setQueryData<typeof messagesData>(['chat', matchId, 'messages'], (prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m._id === res.message._id)) return prev;
        return { ...prev, messages: [...prev.messages, res.message] };
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const handleSend = () => {
    const content = input.trim();
    if (!content || sendMutation.isPending) return;
    hapticMedium();
    setInput('');
    sendMutation.mutate(content);
  };

  const handleIncomingMessage = useCallback((incoming: ChatMessage) => {
    hapticLight();
    queryClient.setQueryData<typeof messagesData>(['chat', matchId, 'messages'], (prev) => {
      if (!prev) return prev;
      if (prev.messages.some((m) => m._id === incoming._id)) return prev;
      return { ...prev, messages: [...prev.messages, incoming] };
    });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [queryClient, matchId]);

  useEffect(() => {
    if (!matchId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(matchChannelName(matchId));
    channel.bind('new-message', handleIncomingMessage);
    return () => {
      channel.unbind('new-message', handleIncomingMessage);
      pusher.unsubscribe(matchChannelName(matchId));
    };
  }, [matchId, handleIncomingMessage]);

  // ─── Handlers menu ⋯ ───────────────────────────────────────────────
  const handleMorePress = () => {
    hapticLight();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: contact?.pseudonyme ?? 'Conversation',
          options: ['Annuler', 'Mettre en sourdine', 'Archiver', 'Signaler', 'Supprimer'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 4,
        },
        (index) => {
          if (index === 1) showMuteSheet();
          else if (index === 2) handleArchive();
          else if (index === 3) handleReport();
          else if (index === 4) handleDelete();
        }
      );
    } else {
      setMenuVisible(true);
    }
  };

  const showMuteSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Mettre en sourdine',
          options: ['Annuler', ...MUTE_OPTIONS.map((o) => o.label)],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index > 0) handleMute(MUTE_OPTIONS[index - 1].value);
        }
      );
    }
  };

  const handleReport = () => {
    hapticWarning();
    Alert.alert(
      'Signaler',
      `Signaler ${contact?.pseudonyme ?? 'cette utilisatrice'} pour comportement inapproprié ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Signaler', style: 'destructive', onPress: () => {
          // TODO: POST /api/reports
          Alert.alert('Signalement envoyé', 'Notre équipe va examiner ce signalement.');
        }},
      ]
    );
  };

  const handleDelete = () => {
    hapticWarning();
    Alert.alert(
      'Supprimer la conversation',
      'Cette action est irréversible. La conversation sera supprimée de votre côté.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => {
          // TODO: DELETE /api/messages/{matchId}
          queryClient.removeQueries({ queryKey: ['chat', matchId, 'messages'] });
          router.back();
        }},
      ]
    );
  };

  const handleMute = (minutes: number) => {
    hapticLight();
    const label = MUTE_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes} min`;
    Alert.alert('Sourdine activée', `Cette conversation sera en sourdine pendant ${label}.`);
    // TODO: appel API dédié quand la route backend existera
  };

  const handleArchive = () => {
    hapticLight();
    Alert.alert('Conversation archivée', 'Vous pouvez la retrouver dans vos archives.');
    // TODO: PATCH /api/matches/{matchId}/archive
  };

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { hapticLight(); router.back(); }} style={styles.backBtn}>
            <NP><ArrowLeft size={22} color={Colors.textSecondary} /></NP>
          </TouchableOpacity>

          <View style={styles.contactInfo}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: contact?.image || 'https://i.pravatar.cc/100' }}
                style={styles.avatar}
              />
            </View>
            <View>
              <Text style={styles.contactName}>{contact?.pseudonyme ?? 'Conversation'}</Text>
              {contact?.identityVerified && (
                <Text style={styles.contactStatus}>✓ Profil vérifié</Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.moreBtn} onPress={handleMorePress}>
            <NP><DotsThree size={22} color={Colors.textSecondary} /></NP>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Colors.accentPink} size="large" />
            </View>
          ) : isError ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>Connexion impossible</Text>
              <Text style={styles.emptyText}>
                {error instanceof ApiError ? error.message : 'Impossible de charger cette conversation.'}
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Text style={styles.emptyText}>
                    Aucun message pour l'instant.{'\n'}Lancez la conversation 🌙
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const fromMe = item.senderId === currentUserId;
                const time = new Date(item.createdAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <View style={[styles.messageRow, fromMe && styles.messageRowMe]}>
                    {!fromMe && (
                      <Image
                        source={{ uri: contact?.image || 'https://i.pravatar.cc/100' }}
                        style={styles.msgAvatar}
                      />
                    )}
                    <View style={[styles.bubble, fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                      <Text style={[styles.bubbleText, fromMe && styles.bubbleTextMe]}>
                        {item.content}
                      </Text>
                      <Text style={[styles.timeText, fromMe && styles.timeTextMe]}>{time}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Input */}
          <View style={styles.inputBar}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Votre message..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, input.trim() && styles.sendBtnActive]}
              onPress={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
            >
              <NP><PaperPlaneRight
                size={20}
                color={input.trim() ? '#fff' : Colors.textMuted}
                weight="fill"
              /></NP>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Menu Android */}
      {Platform.OS !== 'ios' && (
        <ChatMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          contactName={contact?.pseudonyme ?? 'Conversation'}
          onReport={handleReport}
          onDelete={handleDelete}
          onMute={handleMute}
          onArchive={handleArchive}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  contactName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  contactStatus: { fontSize: 12, color: Colors.success },
  moreBtn: { padding: 6 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  messagesList: { paddingHorizontal: Spacing.base, paddingVertical: 16, gap: 12, flexGrow: 1 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '82%',
  },
  messageRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginBottom: 4 },
  bubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    position: 'relative',
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: Colors.accentPurple,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  timeText: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
  timeTextMe: { color: 'rgba(255,255,255,0.5)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: Colors.accentPink,
    borderColor: Colors.accentPink,
  },
  // ─── Menu BottomSheet (Android) ───
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  menuSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e1040',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  menuBackBtn: {
    padding: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  menuItemIcon: { width: 24, alignItems: 'center' },
  menuItemLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  menuItemDanger: {
    color: '#ef4444',
  },
});
