/**
 * Libellés des intentions de profil (« Ici pour… »).
 *
 * Les valeurs sont celles du serveur et du site (inscription, filtres). On les
 * affiche avec un libellé lisible, dans un ordre fixe.
 */
const LABELS: Record<string, string> = {
  amitie: 'Amitié',
  discussion: 'Discussion',
  reseautage: 'Réseautage',
  'rencontre-serieuse': 'Relation sérieuse',
  aventure: 'Aventure',
};

const ORDER = Object.keys(LABELS);

/** Clé normalisée : sans accents ni majuscules (« rencontre-sérieuse » → « rencontre-serieuse »). */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function intentionLabel(value: string): string {
  return LABELS[normalize(value)] ?? value;
}

/** Intentions triées dans l'ordre d'affichage, avec leur libellé. */
export function intentionLabels(values: string[] | undefined | null): string[] {
  const rank = (v: string) => {
    const i = ORDER.indexOf(normalize(v));
    return i === -1 ? ORDER.length : i;
  };
  return [...(values ?? [])].sort((a, b) => rank(a) - rank(b)).map(intentionLabel);
}
