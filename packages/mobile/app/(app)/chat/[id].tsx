import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from '../../../components/LinearGradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, PaperPlaneRight, DotsThree } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../lib/theme';
import { fetchMatches, fetchMessages, sendMessage, type ChatMessage } from '../../../lib/api';
import { ApiError } from '../../../lib/http';
import { getPusherClient, matchChannelName } from '../../../lib/realtime';

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');

  // Le contact (pseudonyme, photo) provient des matchs déjà chargés dans
  // l'onglet Messages — pas de route dédiée "GET /api/matches/{id}".
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
  } = useQuery({
    queryKey: ['chat', matchId, 'messages'],
    queryFn: () => fetchMessages(matchId!),
    enabled: !!matchId,
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
    setInput('');
    sendMutation.mutate(content);
  };

  // Réception temps réel via Pusher (canal private-match-{matchId},
  // événement "new-message") — voir lib/realtime.ts.
  const handleIncomingMessage = useCallback((incoming: ChatMessage) => {
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
    if (!pusher) return; // Pusher non configuré — le chat reste utilisable via l'API REST.

    const channel = pusher.subscribe(matchChannelName(matchId));
    channel.bind('new-message', handleIncomingMessage);

    return () => {
      channel.unbind('new-message', handleIncomingMessage);
      pusher.unsubscribe(matchChannelName(matchId));
    };
  }, [matchId, handleIncomingMessage]);

  return (
    <LinearGradient colors={[Colors.bgDeep, Colors.bgMid]} style={styles.bg}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.textSecondary} />
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

          <TouchableOpacity style={styles.moreBtn}>
            <DotsThree size={22} color={Colors.textSecondary} />
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
              <PaperPlaneRight
                size={20}
                color={input.trim() ? '#fff' : Colors.textMuted}
                weight="fill"
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
});
