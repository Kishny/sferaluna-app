import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Compass, ChatCircle, Bell, User, Gear,
} from 'phosphor-react-native';
import { Colors } from '../../../lib/theme';
import { hapticLight } from '../../../lib/haptics';

export default function TabsLayout() {
  // La barre d'onglets est positionnée en absolu par React Navigation : elle
  // ignore donc le SafeAreaView des écrans et doit gérer elle-même l'inset bas
  // (zone de l'indicateur d'accueil sur iPhone X+, barre de gestes Android).
  // Sans ça, icônes et libellés se retrouvent collés/rognés par les coins
  // arrondis et l'indicateur système — exactement ce qui apparaît sur la capture.
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
          tabBarIcon: ({ color, size }) => (
            <Compass size={size} color={color} weight="duotone" />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <ChatCircle size={size} color={color} weight="duotone" />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertes',
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} weight="duotone" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} weight="duotone" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color, size }) => (
            <Gear size={size} color={color} weight="duotone" />
          ),
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
