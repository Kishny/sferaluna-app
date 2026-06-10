import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { Colors, Radius } from '../lib/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function GlassInput({ label, error, icon, secureTextEntry, style, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error && styles.inputError]}>
        {icon && <View style={styles.iconLeft}>{icon}</View>}
        <TextInput
          {...props}
          secureTextEntry={isPassword ? !visible : false}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, !!icon && styles.inputWithIcon, style]}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setVisible(!visible)} style={styles.eyeBtn}>
            {visible
              ? <EyeSlash size={20} color={Colors.textMuted} />
              : <Eye size={20} color={Colors.textMuted} />
            }
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.md,
    height: 56,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  iconLeft: {
    marginRight: 4,
  },
  eyeBtn: {
    padding: 4,
  },
  error: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});
