/**
 * Petit toast de confirmation glassmorphism — affiché brièvement en bas de
 * l'écran après une action de réglage (ex: activer/désactiver le Mode
 * Fantôme, la connexion biométrique, les notifications…).
 *
 * Usage :
 *   const { toast, showToast, hideToast } = useToast();
 *   showToast('Mode Fantôme activé', 'success');
 *   ...
 *   <Toast toast={toast} onHide={hideToast} />   // à placer en overlay, en fin d'écran
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, XCircle } from 'phosphor-react-native';
import { Colors, Radius, Spacing } from '../lib/theme';
import { NP } from './NP';

export type ToastTone = 'success' | 'error';

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

let toastCounter = 0;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    toastCounter += 1;
    setToast({ id: toastCounter, message, tone });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  return { toast, showToast, hideToast };
}

interface ToastProps {
  toast: ToastState | null;
  onHide: () => void;
  duration?: number;
}

export function Toast({ toast, onHide, duration = 2600 }: ToastProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    translateY.setValue(80);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  if (!toast) return null;

  const isSuccess = toast.tone === 'success';

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrapper, { transform: [{ translateY }], opacity }]}
    >
      <View style={[styles.toast, isSuccess ? styles.toastSuccess : styles.toastError]}>
        {isSuccess ? (
          <NP><CheckCircle size={20} color={Colors.success} weight="fill" />
        </NP>) : (
          <XCircle size={20} color={Colors.error} weight="fill" />
        )}
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: Spacing.xxl,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(45, 27, 105, 0.94)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastSuccess: { borderColor: 'rgba(16, 185, 129, 0.4)' },
  toastError: { borderColor: 'rgba(239, 68, 68, 0.4)' },
  message: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
