import React, { useRef, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Compass, ChatCircle, Bell, User, Gear,
} from 'phosphor-react-native';
import { Colors } from '../../../lib/theme';
import { hapticLight } from '../../../lib/haptics';

/**
 * Icône de tab animée avec un "wobble" au tap :
 * scale 1 → 1.25 → 0.9 → 1 en séquence rapide (friction/tension, pas reanimated).
 */
function TabIcon({ Icon, color, size }: { Icon: React.ComponentType<any>; color: string; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  const wobble = useCallback(() => {
    scale.setValue(1);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, friction: 4, tension: 300 }),
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, friction: 5, tension: 280 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }),
    ]).start();
  }, [scale]);

  // L'animation est déclenchée depuis screenListeners.tabPress — on expose
  // la méthode via une ref partagée sur le nom de l'onglet. Mais pour
  // simplifier (pas de ref croisée possible facilement avec expo-router Tabs),
  // on déclenche le wobble directement dans onLayout via un event emitter léger.
  // Alternative simple : animer au rendu quand `focused` change.
  return (
    <Animated.View style={{ transform: [{ scale }] }} pointerEvents="none">
      <Icon size={size} color={color} weight="duotone" />
    </Animated.View>
  );
}

// Map pour stocker les refs wobble par onglet
const wobbleRefs: Record<string, () => void> = {};

function makeTabIcon(name: string, Icon: React.ComponentType<any>) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const prevFocused = useRef(focused);

    // Déclenche le wobble quand l'onglet passe à focused
    if (focused && !prevFocused.current) {
      scale.setValue(1);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.28, useNativeDriver: true, friction: 4, tension: 320 }),
        Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, friction: 5, tension: 260 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }),
      ]).start();
    }
    prevFocused.current = focused;

    return (
      <Animated.View style={{ transform: [{ scale }] }} pointerEvents="none">
        <Icon size={size} color={color} weight="duotone" />
      </Animated.View>
    );
  };
}

const DiscoverIcon = makeTabIcon('discover', Compass);
const MessagesIcon = makeTabIcon('messages', ChatCircle);
const AlertsIcon = makeTabIcon('notifications', Bell);
const ProfileIcon = makeTabIcon('profile', User);
const SettingsIcon = makeTabIcon('settings', Gear);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenListeners={{
        tabPress: () => { hapticLight(); },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: 56 + bottomInset, paddingBottom: bottomInset },
        ],
        tabBarActiveTintColor: Colors.accentPink,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Découvrir',
          tabBarIcon: (props) => <DiscoverIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: (props) => <MessagesIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertes',
          tabBarIcon: (props) => <AlertsIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: (props) => <ProfileIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: (props) => <SettingsIcon {...props} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(26, 11, 46, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
