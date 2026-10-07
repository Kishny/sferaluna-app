/**
 * L'Hexade (anciennement « Circle of Six ») — réseau de sécurité personnel.
 *
 * Les « contacts de confiance » sont désormais persistés **côté serveur**
 * (champ User.trustedContacts, routes /api/users/trusted-contacts) pour être
 * synchronisés entre les appareils de l'utilisatrice. L'écran
 * app/(app)/circle.tsx consomme ces fonctions ; le partage de plan / « bien
 * rentrée » passe toujours par la feuille de partage native (Share/Linking).
 *
 * En mode démo (captures App Store), on renvoie une liste fictive sans toucher
 * au réseau, pour que l'écran soit joliment rempli.
 */
import { http } from './http';
import { DEMO_MODE } from './demoMode';

export type TrustedContact = { id: string; name: string; phone: string };

export const MAX_CONTACTS = 6;

type ContactsResponse = { success: boolean; contacts: TrustedContact[] };

// Contacts fictifs pour les captures (mode démo uniquement).
const DEMO_CONTACTS: TrustedContact[] = [
  { id: 'demo-c1', name: 'Maman', phone: '+33 6 12 34 56 78' },
  { id: 'demo-c2', name: 'Léa — ma sœur', phone: '+33 6 98 76 54 32' },
  { id: 'demo-c3', name: 'Sofia', phone: '+33 6 45 67 89 01' },
];

/** Liste courante des contacts de confiance (démo si DEMO_MODE). */
export async function getTrustedContacts(): Promise<TrustedContact[]> {
  if (DEMO_MODE) return DEMO_CONTACTS;
  const res = await http.get<ContactsResponse>('/api/users/trusted-contacts');
  return res.contacts ?? [];
}

/** Ajoute un contact (le serveur applique la limite de MAX_CONTACTS). */
export async function addTrustedContact(
  name: string,
  phone: string
): Promise<TrustedContact[]> {
  if (DEMO_MODE) return DEMO_CONTACTS;
  const res = await http.post<ContactsResponse>('/api/users/trusted-contacts', {
    name: name.trim(),
    phone: phone.trim(),
  });
  return res.contacts ?? [];
}

/** Retire un contact par id. */
export async function removeTrustedContact(id: string): Promise<TrustedContact[]> {
  if (DEMO_MODE) return DEMO_CONTACTS;
  const res = await http.delete<ContactsResponse>(
    `/api/users/trusted-contacts?id=${encodeURIComponent(id)}`
  );
  return res.contacts ?? [];
}

/** Message pré-rempli « je partage mon plan » à envoyer aux contacts. */
export function buildPlanMessage(plan?: string): string {
  const detail = plan && plan.trim() ? ` ${plan.trim()}.` : '.';
  return (
    `🌙 SferaLuna — Sécurité\n` +
    `Je te partage mon plan pour ce soir${detail}\n` +
    `Je te préviens dès que je suis bien rentrée. Merci de veiller sur moi 💜`
  );
}

/** Message pré-rempli « je suis bien rentrée ». */
export function buildSafeMessage(): string {
  return `🌙 SferaLuna — Je suis bien rentrée, tout va bien. Merci d'avoir veillé sur moi 💜`;
}
