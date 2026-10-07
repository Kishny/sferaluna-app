/**
 * Signalement à la modération — POST /api/reports.
 *
 * Un seul parcours pour tout ce qui se signale dans l'app (un profil, un
 * message, une publication) : on demande le motif, on envoie le signalement au
 * serveur, et on ne dit « envoyé » que si le serveur l'a bien enregistré.
 */

import { Alert, Platform } from 'react-native';
import { sendReport, type ReportReason, type ReportTargetType } from './api';
import { ApiError } from './http';
import { hapticError, hapticSuccess, hapticWarning } from './haptics';

const REASONS: { reason: ReportReason; label: string; onlyFor?: ReportTargetType }[] = [
  { reason: 'harcèlement', label: 'Harcèlement' },
  { reason: 'contenu_inapproprié', label: 'Contenu inapproprié' },
  { reason: 'spam', label: 'Spam ou arnaque' },
  { reason: 'faux_profil', label: 'Faux profil', onlyFor: 'user' },
  { reason: 'autre', label: 'Autre' },
];

const TITLES: Record<ReportTargetType, string> = {
  user: 'Signaler ce profil',
  message: 'Signaler ce message',
  community_post: 'Signaler cette publication',
};

interface AskReportOptions {
  targetType: ReportTargetType;
  targetId: string | undefined | null;
  /** Appelé une fois le signalement enregistré (ou déjà enregistré auparavant). */
  onSent?: () => void;
}

async function submit({ targetType, targetId, onSent }: AskReportOptions, reason: ReportReason) {
  if (!targetId) return;
  try {
    await sendReport({ targetType, targetId, reason });
    hapticSuccess();
    onSent?.();
    Alert.alert('Signalement envoyé', 'Merci. Notre équipe de modération va l’examiner.');
  } catch (error) {
    if (error instanceof ApiError && error.code === 'REPORT_ALREADY_EXISTS') {
      onSent?.();
      Alert.alert('Déjà signalé', 'Vous avez déjà envoyé ce signalement. Notre équipe l’examine.');
      return;
    }
    hapticError();
    Alert.alert(
      'Signalement non envoyé',
      error instanceof ApiError && error.status < 500 && error.message
        ? error.message
        : 'Connexion impossible. Vérifiez votre réseau et réessayez.',
    );
  }
}

/** Demande le motif puis envoie le signalement. */
export function askReport(options: AskReportOptions) {
  if (!options.targetId) return;
  hapticWarning();
  const reasons = REASONS.filter((item) => !item.onlyFor || item.onlyFor === options.targetType);
  // Android n'affiche que trois boutons dans une alerte : on y propose les deux
  // motifs les plus fréquents. iOS les montre tous.
  const shown = Platform.OS === 'android' ? reasons.slice(0, 2) : reasons;
  Alert.alert(TITLES[options.targetType], 'Pour quelle raison ?', [
    ...shown.map((item) => ({ text: item.label, onPress: () => { submit(options, item.reason); } })),
    { text: 'Annuler', style: 'cancel' as const },
  ]);
}
