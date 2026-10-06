/**
 * Intentions (« Ici pour… ») et centres d'intérêt des profils.
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

/** Intentions proposées à la création du profil et dans les filtres. */
export const INTENTIONS = ORDER.map((value) => ({ value, label: LABELS[value] }));

/** Centres d'intérêt : mêmes valeurs que l'inscription du site. */
export const INTERESTS = [
  { value: 'voyage', label: 'Voyage' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'sport', label: 'Sport' },
  { value: 'musique', label: 'Musique' },
  { value: 'cinema', label: 'Cinéma' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'art', label: 'Art' },
  { value: 'technologie', label: 'Technologie' },
  { value: 'nature', label: 'Nature' },
  { value: 'mode', label: 'Mode' },
  { value: 'gaming', label: 'Jeux vidéo' },
  { value: 'photographie', label: 'Photographie' },
];

const INTEREST_LABELS: Record<string, string> = Object.fromEntries(INTERESTS.map((i) => [i.value, i.label]));

/** Libellé d'un centre d'intérêt ; les saisies libres sont affichées telles quelles. */
export function interestLabel(value: string): string {
  return INTEREST_LABELS[normalize(value)] ?? value;
}

export function interestLabels(values: string[] | undefined | null): string[] {
  return (values ?? []).map(interestLabel);
}
