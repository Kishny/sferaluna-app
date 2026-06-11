import React, { useRef } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Compass, ChatCircle, Bell, User, Gear,
} from 'phosphor-react-native';
import { Colors } from '../../../lib/theme';
import { hapticLight } from '../../../lib/haptics';
import { fetchNotificationsSummary } from '../../../lib/api';

function makeTabIcon(Icon: React.ComponentType<any>) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const prevFocused = useRef(focused);

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

const DiscoverIcon  = makeTabIcon(Compass);
const MessagesIcon  = makeTabIcon(ChatCircle);
const AlertsIcon    = makeTabIcon(Bell);
const ProfileIcon   = makeTabIcon(User);
const SettingsIcon  = makeTabIcon(Gear);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  // Compteurs pour les badges — polling léger toutes les 30 s
  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: fetchNotificationsSummary,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const unreadMessages = notifData?.unreadMessages ?? 0;
  const totalAlerts    = (notifData?.newMatches ?? 0) + (notifData?.newVisits ?? 0);

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
        tabBarBadgeStyle: styles.badge,
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
          tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertes',
          tabBarIcon: (props) => <AlertsIcon {...props} />,
          tabBarBadge: totalAlerts > 0 ? (totalAlerts > 99 ? '99+' : totalAlerts) : undefined,
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
  badge: {
    backgroundColor: Colors.accentPink,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    lineHeight: 16,
  },
});
