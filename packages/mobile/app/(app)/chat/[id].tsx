import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Animated, PanResponder, ActionSheetIOS, Alert, Clipboard, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft, PaperPlaneRight, DotsThree, Warning, Trash, BellSlash,
  Archive, X, Check, Checks, ArrowBendUpLeft, Smiley,
  Image as ImageIcon, File, Prohibit,
} from 'phosphor-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchMatches, fetchMessages, sendMessage, blockUser, archiveMatch, muteMatch, deleteMatch, uploadChatImage, markMessagesRead, type ChatMessage } from '../../../lib/api';
import { ApiError } from '../../../lib/http';
import { getPusherClient, matchChannelName } from '../../../lib/realtime';
import { hapticLight, hapticMedium, hapticWarning } from '../../../lib/haptics';
import { NP } from '../../../components/NP';

// ─── Constantes ──────────────────────────────────────────────────────────────

const MUTE_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '1 heure', value: 60 },
  { label: '8 heures', value: 480 },
  { label: '24 heures', value: 1440 },
];

const EMOJI_LIST = [
  '❤️','😍','😂','🥰','😊','🔥','✨','💫','🌙','💜',
  '👏','🎉','😘','💋','🤩','😭','💀','🙈','👀','💯',
];

const REACTION_LIST = ['❤️','😂','😮','😢','👍','🔥'];

// ─── Menu ⋯ (Android) ────────────────────────────────────────────────────────

interface ChatMenuProps {
  visible: boolean;
  onClose: () => void;
  contactName: string;
  onReport: () => void;
  onDelete: () => void;
  onMute: (minutes: number) => void;
  onArchive: () => void;
  onBlock: () => void;
}

function ChatMenu({ visible, onClose, contactName, onReport, onDelete, onMute, onArchive, onBlock }: ChatMenuProps) {
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
        { label: 'Mettre en sourdine', icon: <BellSlash size={20} color={Colors.textSecondary} weight="duotone" />, onPress: () => setShowMuteOptions(true), danger: false },
        { label: 'Archiver', icon: <Archive size={20} color={Colors.textSecondary} weight="duotone" />, onPress: () => { onArchive(); onClose(); }, danger: false },
        { label: 'Signaler', icon: <Warning size={20} color="#f59e0b" weight="duotone" />, onPress: () => { onReport(); onClose(); }, danger: false },
        { label: 'Bloquer', icon: <Prohibit size={20} color="#ef4444" weight="duotone" />, onPress: () => { onBlock(); onClose(); }, danger: true },
        { label: 'Supprimer la conversation', icon: <Trash size={20} color="#ef4444" weight="duotone" />, onPress: () => { onDelete(); onClose(); }, danger: true },
      ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.menuBackdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.menuSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.menuHandle} />
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>{showMuteOptions ? 'Mettre en sourdine' : contactName}</Text>
          {showMuteOptions && (
            <TouchableOpacity onPress={() => setShowMuteOptions(false)}>
              <NP><X size={18} color={Colors.textSecondary} /></NP>
            </TouchableOpacity>
          )}
        </View>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
            onPress={() => { hapticLight(); item.onPress(); }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemIcon} pointerEvents="none">{item.icon}</View>
            <Text style={[styles.menuItemLabel, item.danger && styles.menuItemDanger]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Message action sheet ─────────────────────────────────────────────────────

interface MsgActionsProps {
  visible: boolean;
  message: ChatMessage | null;
  fromMe: boolean;
  onClose: () => void;
  onReply: (msg: ChatMessage) => void;
  onReact: (msg: ChatMessage, emoji: string) => void;
  onCopy: (msg: ChatMessage) => void;
  onReport: (msg: ChatMessage) => void;
}

function MsgActions({ visible, message, fromMe, onClose, onReply, onReact, onCopy, onReport }: MsgActionsProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  if (!message) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.menuBackdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.menuSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.menuHandle} />

        {/* Réactions rapides */}
        <View style={styles.reactRow}>
          {REACTION_LIST.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactBtn}
              onPress={() => { hapticLight(); onReact(message, emoji); onClose(); }}
            >
              <Text style={styles.reactEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        {[
          { label: 'Répondre', icon: <ArrowBendUpLeft size={20} color={Colors.textSecondary} weight="duotone" />, onPress: () => { onReply(message); onClose(); }, danger: false },
          { label: 'Copier', icon: <File size={20} color={Colors.textSecondary} weight="duotone" />, onPress: () => { onCopy(message); onClose(); }, danger: false },
          ...(!fromMe ? [{ label: 'Signaler ce message', icon: <Warning size={20} color="#f59e0b" weight="duotone" />, onPress: () => { onReport(message); onClose(); }, danger: false }] : []),
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, i < arr.length - 1 && styles.menuItemBorder]}
            onPress={() => { hapticLight(); item.onPress(); }}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemIcon} pointerEvents="none">{item.icon}</View>
            <Text style={[styles.menuItemLabel, item.danger && styles.menuItemDanger]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Emoji picker ─────────────────────────────────────────────────────────────

function EmojiPicker({ visible, onSelect, onClose }: { visible: boolean; onSelect: (e: string) => void; onClose: () => void }) {
  const slideAnim = useRef(new Animated.Value(200)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 120 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 200, duration: 180, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.menuBackdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.emojiSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.menuHandle} />
        <Text style={styles.emojiSheetTitle}>Emojis</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_LIST.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiBtn}
              onPress={() => { hapticLight(); onSelect(emoji); onClose(); }}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Bulle swipeable ─────────────────────────────────────────────────────────

interface SwipeableMessageProps {
  item: ChatMessage;
  fromMe: boolean;
  isLast: boolean;
  contact: any;
  reactions: string[];
  onLongPress: (msg: ChatMessage) => void;
  onReply: (msg: ChatMessage) => void;
  onReact: (msg: ChatMessage, emoji: string) => void;
}

function SwipeableMessage({ item, fromMe, isLast, contact, reactions, onLongPress, onReply, onReact }: SwipeableMessageProps) {
  const swipeX = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 60;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        // Uniquement vers la droite, avec résistance
        if (g.dx > 0) swipeX.setValue(Math.min(g.dx * 0.55, 80));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          hapticMedium();
          onReply(item);
        }
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 180 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 180 }).start();
      },
    })
  ).current;

  const time = new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const isReply = item.content.startsWith('↩ ');
  const [replyPart, ...bodyParts] = isReply ? item.content.split('\n') : ['', item.content];
  const bodyText = isReply ? bodyParts.join('\n') : item.content;
  const isImageMessage = /^https?:\/\/res\.cloudinary\.com\//i.test(bodyText);

  // Icône de réponse qui apparaît lors du swipe
  const replyIconOpacity = swipeX.interpolate({ inputRange: [20, 50], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={[styles.messageRow, fromMe && styles.messageRowMe]}>
      {!fromMe && (
        <TouchableOpacity onPress={() => { hapticLight(); router.push(`/(app)/profil/${contact?._id ?? contact?.pseudonyme}` as any); }}>
          <Image source={{ uri: contact?.image || 'https://i.pravatar.cc/100' }} style={styles.msgAvatar} />
        </TouchableOpacity>
      )}

      {/* Icône réponse (visible au swipe) */}
      <Animated.View style={[styles.replyIcon, { opacity: replyIconOpacity }]} pointerEvents="none">
        <ArrowBendUpLeft size={18} color={Colors.accentPink} />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[{ flexShrink: 1 }, { transform: [{ translateX: swipeX }] }]}
      >
        <Pressable onLongPress={() => onLongPress(item)} delayLongPress={300}>
          <View style={[styles.bubble, fromMe ? styles.bubbleMe : styles.bubbleThem]}>
            {isReply && (
              <View style={styles.replyPreviewInBubble}>
                <Text style={styles.replyPreviewText} numberOfLines={1}>{replyPart.replace('↩ ', '')}</Text>
              </View>
            )}
            {isImageMessage ? (
              <Image
                source={{ uri: bodyText }}
                style={styles.chatImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.bubbleText, fromMe && styles.bubbleTextMe]}>{bodyText}</Text>
            )}
            <View style={styles.bubbleMeta}>
              <Text style={[styles.timeText, fromMe && styles.timeTextMe]}>{time}</Text>
              {fromMe && (
                <View style={styles.readStatus}>
                  {item.readAt
                    ? <NP><Checks size={13} color="#60d4f4" /></NP>
                    : isLast
                      ? <NP><Checks size={13} color="rgba(255,255,255,0.55)" /></NP>
                      : <NP><Check size={13} color="rgba(255,255,255,0.35)" /></NP>
                  }
                </View>
              )}
            </View>
          </View>
        </Pressable>
        {reactions.length > 0 && (
          <View style={[styles.reactionsRow, fromMe && styles.reactionsRowMe]}>
            {reactions.map((emoji, i) => (
              <TouchableOpacity key={i} onPress={() => onReact(item, emoji)}>
                <Text style={styles.reactionChip}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [msgActionsVisible, setMsgActionsVisible] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  // Reactions locales : { [messageId]: emoji[] }
  const [reactions, setReactions] = useState<Record<string, string[]>>({});

  const { data: matchesData } = useQuery({
    queryKey: ['messages', 'matches'],
    queryFn: fetchMatches,
  });
  const match = matchesData?.matches.find((m) => m.matchId === matchId);
  const contact = match?.user;

  const { data: messagesData, isLoading, isError, error } = useQuery({
    queryKey: ['chat', matchId, 'messages'],
    queryFn: () => fetchMessages(matchId!),
    enabled: !!matchId,
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
    const content = replyTo
      ? `↩ ${replyTo.content.slice(0, 40)}${replyTo.content.length > 40 ? '…' : ''}\n${input.trim()}`
      : input.trim();
    if (!content || sendMutation.isPending) return;
    hapticMedium();
    setInput('');
    setReplyTo(null);
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

    // Quand l'autre utilisatrice lit nos messages → mettre à jour readAt en cache
    const handleMessagesRead = ({ readAt }: { readerId: string; readAt: string }) => {
      queryClient.setQueryData<typeof messagesData>(['chat', matchId, 'messages'], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.senderId === prev.currentUserId && !m.readAt
              ? { ...m, readAt }
              : m
          ),
        };
      });
    };
    channel.bind('messages-read', handleMessagesRead);

    return () => {
      channel.unbind('new-message', handleIncomingMessage);
      channel.unbind('messages-read', handleMessagesRead);
      pusher.unsubscribe(matchChannelName(matchId));
    };
  }, [matchId, handleIncomingMessage]);

  // Marquer les messages comme lus quand l'écran prend le focus
  useFocusEffect(useCallback(() => {
    if (matchId) {
      markMessagesRead(matchId as string).catch(() => {});
    }
  }, [matchId]));

  // ─── Upload image ─────────────────────────────────────────────────────────
  const [uploadingImage, setUploadingImage] = useState(false);

  const handlePickImage = async () => {
    hapticLight();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Accès refusé', "Autorisez l'accès à vos photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const type = asset.mimeType ?? `image/${ext}`;
    const name = asset.fileName ?? `chat-${Date.now()}.${ext}`;

    setUploadingImage(true);
    hapticMedium();
    try {
      const { url } = await uploadChatImage({ uri: asset.uri, name, type });
      sendMutation.mutate(url);
    } catch {
      Alert.alert('Erreur', "Impossible d'envoyer l'image pour l'instant.");
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Actions message ──────────────────────────────────────────────────────
  const handleLongPressMessage = (msg: ChatMessage) => {
    hapticMedium();
    setSelectedMsg(msg);
    setMsgActionsVisible(true);
  };

  const handleReact = (msg: ChatMessage, emoji: string) => {
    setReactions((prev) => {
      const existing = prev[msg._id] ?? [];
      if (existing.includes(emoji)) return { ...prev, [msg._id]: existing.filter((e) => e !== emoji) };
      return { ...prev, [msg._id]: [...existing, emoji] };
    });
  };

  const handleCopy = (msg: ChatMessage) => {
    Clipboard.setString(msg.content);
    hapticLight();
  };

  const handleReportMsg = () => {
    hapticWarning();
    Alert.alert('Signaler ce message', 'Notre équipe va examiner ce signalement.');
  };

  // ─── Menu ⋯ ───────────────────────────────────────────────────────────────
  const handleMorePress = () => {
    hapticLight();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: contact?.pseudonyme ?? 'Conversation',
          options: ['Annuler', 'Mettre en sourdine', 'Archiver', 'Signaler', 'Bloquer', 'Supprimer'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 5,
        },
        (index) => {
          if (index === 1) showMuteSheet();
          else if (index === 2) handleArchive();
          else if (index === 3) handleReport();
          else if (index === 4) handleBlock();
          else if (index === 5) handleDelete();
        }
      );
    } else {
      setMenuVisible(true);
    }
  };

  const showMuteSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Mettre en sourdine', options: ['Annuler', ...MUTE_OPTIONS.map((o) => o.label)], cancelButtonIndex: 0 },
        (index) => { if (index > 0) handleMute(MUTE_OPTIONS[index - 1].value); }
      );
    }
  };

  const handleReport = () => { hapticWarning(); Alert.alert('Signaler', `Signaler ${contact?.pseudonyme ?? 'cette utilisatrice'} ?`, [{ text: 'Annuler', style: 'cancel' }, { text: 'Signaler', style: 'destructive', onPress: () => Alert.alert('Signalement envoyé') }]); };
  const handleDelete = () => {
    hapticWarning();
    Alert.alert('Supprimer la conversation', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMatch(matchId as string);
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.removeQueries({ queryKey: ['chat', matchId, 'messages'] });
            router.back();
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer pour l\'instant.');
          }
        },
      },
    ]);
  };

  const handleMute = async (minutes: number) => {
    hapticLight();
    try {
      await muteMatch(matchId as string, minutes);
      const label = MUTE_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes} min`;
      Alert.alert('Sourdine activée', `Conversation en sourdine pendant ${label}.`);
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre en sourdine pour l\'instant.');
    }
  };

  const handleArchive = async () => {
    hapticLight();
    try {
      const result = await archiveMatch(matchId as string) as { archived: boolean };
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      Alert.alert(result.archived ? 'Archivée' : 'Désarchivée', result.archived ? 'Conversation archivée.' : 'Conversation retirée des archives.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'archiver pour l\'instant.');
    }
  };
  const handleBlock = () => {
    hapticWarning();
    const name = contact?.pseudonyme ?? 'cette utilisatrice';
    Alert.alert(
      'Bloquer',
      `Bloquer ${name} ? Elle ne pourra plus vous voir ni vous contacter.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            const targetId = match?.user?._id ?? match?.matchId;
            if (!targetId) return;
            try {
              await blockUser(targetId);
              queryClient.removeQueries({ queryKey: ['chat', matchId, 'messages'] });
              router.back();
            } catch {
              Alert.alert('Erreur', 'Impossible de bloquer pour l\'instant.');
            }
          },
        },
      ]
    );
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

          {/* Tap sur la photo → profil public */}
          <TouchableOpacity
            style={styles.contactInfo}
            activeOpacity={0.8}
            onPress={() => {
              if (contact) {
                hapticLight();
                router.push(`/(app)/profil/${match?.matchId}` as any);
              }
            }}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: contact?.image || 'https://i.pravatar.cc/100' }}
                style={styles.avatar}
              />
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.contactName}>{contact?.pseudonyme ?? 'Conversation'}</Text>
              {contact?.identityVerified
                ? <Text style={styles.contactStatus}>✓ Profil vérifié</Text>
                : <Text style={styles.contactSubtitle}>Voir le profil →</Text>
              }
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreBtn} onPress={handleMorePress}>
            <NP><DotsThree size={22} color={Colors.textSecondary} /></NP>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {isLoading ? (
            <View style={styles.centerState}><ActivityIndicator color={Colors.accentPink} size="large" /></View>
          ) : isError ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>Connexion impossible</Text>
              <Text style={styles.emptyText}>{error instanceof ApiError ? error.message : 'Impossible de charger cette conversation.'}</Text>
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
                  <Text style={styles.emptyText}>Aucun message pour l'instant.{'\n'}Lancez la conversation 🌙</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <SwipeableMessage
                  item={item}
                  fromMe={item.senderId === currentUserId}
                  isLast={index === messages.length - 1}
                  contact={contact}
                  reactions={reactions[item._id] ?? []}
                  onLongPress={handleLongPressMessage}
                  onReply={(msg) => { setReplyTo(msg); }}
                  onReact={handleReact}
                />
              )}
            />
          )}

          {/* Aperçu de réponse au-dessus de la saisie */}
          {replyTo && (
            <View style={styles.replyBar}>
              <NP><ArrowBendUpLeft size={16} color={Colors.accentPink} /></NP>
              <Text style={styles.replyBarText} numberOfLines={1}>
                {replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? '…' : ''}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)} style={{ padding: 4 }}>
                <NP><X size={16} color={Colors.textMuted} /></NP>
              </TouchableOpacity>
            </View>
          )}

          {/* Barre de saisie */}
          <View style={styles.inputBar}>
            {/* Emoji */}
            <TouchableOpacity style={styles.attachBtn} onPress={() => { hapticLight(); setEmojiPickerVisible(true); }}>
              <NP><Smiley size={22} color={Colors.textSecondary} weight="duotone" /></NP>
            </TouchableOpacity>
            {/* Image */}
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploadingImage}>
              {uploadingImage
                ? <ActivityIndicator size="small" color={Colors.accentPink} />
                : <NP><ImageIcon size={22} color={Colors.textSecondary} weight="duotone" /></NP>}
            </TouchableOpacity>

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
              <NP><PaperPlaneRight size={20} color={input.trim() ? '#fff' : Colors.textMuted} weight="fill" /></NP>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modals */}
      {Platform.OS !== 'ios' && (
        <ChatMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          contactName={contact?.pseudonyme ?? 'Conversation'}
          onReport={handleReport}
          onDelete={handleDelete}
          onMute={handleMute}
          onArchive={handleArchive}
          onBlock={handleBlock}
        />
      )}

      <MsgActions
        visible={msgActionsVisible}
        message={selectedMsg}
        fromMe={selectedMsg?.senderId === currentUserId}
        onClose={() => setMsgActionsVisible(false)}
        onReply={(msg) => setReplyTo(msg)}
        onReact={handleReact}
        onCopy={handleCopy}
        onReport={handleReportMsg}
      />

      <EmojiPicker
        visible={emojiPickerVisible}
        onSelect={(emoji) => setInput((prev) => prev + emoji)}
        onClose={() => setEmojiPickerVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#1a0b2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 1.5,
    borderColor: Colors.bgDeep,
  },
  contactName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  contactStatus: { fontSize: 12, color: Colors.success },
  contactSubtitle: { fontSize: 12, color: Colors.textMuted },
  moreBtn: { padding: 6 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  messagesList: { paddingHorizontal: Spacing.base, paddingVertical: 16, gap: 12, flexGrow: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '82%', overflow: 'visible' },
  replyIcon: { position: 'absolute', left: -28, bottom: 14 },
  messageRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginBottom: 4 },
  bubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    maxWidth: '100%',
  },
  bubbleMe: { backgroundColor: Colors.accentPurple, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderBottomLeftRadius: 4 },
  replyPreviewInBubble: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
    paddingLeft: 8,
    marginBottom: 6,
    opacity: 0.7,
  },
  replyPreviewText: { fontSize: 12, color: '#fff', fontStyle: 'italic' },
  bubbleText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 20 },
  chatImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 2 },
  bubbleTextMe: { color: '#fff' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  timeText: { fontSize: 11, color: Colors.textMuted },
  timeTextMe: { color: 'rgba(255,255,255,0.5)' },
  readStatus: { marginLeft: 2 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, marginLeft: 4 },
  reactionsRowMe: { justifyContent: 'flex-end', marginRight: 4 },
  reactionChip: { fontSize: 18, lineHeight: 24 },
  // Barre de réponse
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    gap: 8,
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  replyBarText: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  // Barre de saisie
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    gap: 6,
  },
  attachBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: { color: Colors.textPrimary, fontSize: 15, lineHeight: 20 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: Colors.accentPink, borderColor: Colors.accentPink },
  // ─── Menus ───
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
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
  menuHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  menuItemIcon: { width: 24, alignItems: 'center' },
  menuItemLabel: { fontSize: 16, color: Colors.textPrimary },
  menuItemDanger: { color: '#ef4444' },
  // Réactions
  reactRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder, marginBottom: 8 },
  reactBtn: { padding: 6 },
  reactEmoji: { fontSize: 28 },
  // Emoji picker
  emojiSheet: {
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
  emojiSheetTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12, textAlign: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  emojiBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.glassBg },
  emojiText: { fontSize: 28 },
});
