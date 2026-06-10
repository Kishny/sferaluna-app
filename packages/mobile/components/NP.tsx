/**
 * NP — No Pointer
 *
 * Enveloppe une icône (ou n'importe quel élément non-interactif) avec
 * `pointerEvents="none"` pour éviter que react-native-svg intercepte les
 * touches et empêche le TouchableOpacity / Pressable parent de répondre.
 *
 * Problème : phosphor-react-native utilise react-native-svg dont le composant
 * <Svg> revendique le responder touch par défaut. Résultat : taper sur une
 * icône dans un bouton ne déclenche jamais l'onPress du parent.
 *
 * Usage :
 *   <TouchableOpacity onPress={...}>
 *     <NP><ArrowLeft size={22} color="#fff" /></NP>
 *   </TouchableOpacity>
 */
import React from 'react';
import { View } from 'react-native';

export function NP({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View pointerEvents="none" style={style}>
      {children}
    </View>
  );
}
