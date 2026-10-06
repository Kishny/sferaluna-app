// src/lib/locations.ts

/**
 * Référence géographique SferaLuna.
 *
 * Couvre la France métropolitaine ET les départements d'outre-mer
 * (971 Guadeloupe, 972 Martinique, 973 Guyane, 974 La Réunion, 976 Mayotte).
 *
 * Utilisé pour :
 * - le sélecteur de département à l'inscription et dans Mon Compte ;
 * - le filtrage des profils par bassin géographique cohérent ;
 * - les suggestions de villes contextuelles.
 *
 * On stocke en base le CODE du département (ex. "974"), ce qui rend le
 * matching fiable (pas de souci d'accents, de casse ou d'homonymie comme
 * "Saint-Denis" 93 vs 974).
 */

export interface Departement {
  code: string;
  nom: string;
  outreMer?: boolean;
}

/**
 * Liste complète des départements français.
 * Métropole (01–95, 2A, 2B) puis les 5 DOM.
 */
export const DEPARTEMENTS: Departement[] = [
  { code: "01", nom: "Ain" },
  { code: "02", nom: "Aisne" },
  { code: "03", nom: "Allier" },
  { code: "04", nom: "Alpes-de-Haute-Provence" },
  { code: "05", nom: "Hautes-Alpes" },
  { code: "06", nom: "Alpes-Maritimes" },
  { code: "07", nom: "Ardèche" },
  { code: "08", nom: "Ardennes" },
  { code: "09", nom: "Ariège" },
  { code: "10", nom: "Aube" },
  { code: "11", nom: "Aude" },
  { code: "12", nom: "Aveyron" },
  { code: "13", nom: "Bouches-du-Rhône" },
  { code: "14", nom: "Calvados" },
  { code: "15", nom: "Cantal" },
  { code: "16", nom: "Charente" },
  { code: "17", nom: "Charente-Maritime" },
  { code: "18", nom: "Cher" },
  { code: "19", nom: "Corrèze" },
  { code: "2A", nom: "Corse-du-Sud" },
  { code: "2B", nom: "Haute-Corse" },
  { code: "21", nom: "Côte-d'Or" },
  { code: "22", nom: "Côtes-d'Armor" },
  { code: "23", nom: "Creuse" },
  { code: "24", nom: "Dordogne" },
  { code: "25", nom: "Doubs" },
  { code: "26", nom: "Drôme" },
  { code: "27", nom: "Eure" },
  { code: "28", nom: "Eure-et-Loir" },
  { code: "29", nom: "Finistère" },
  { code: "30", nom: "Gard" },
  { code: "31", nom: "Haute-Garonne" },
  { code: "32", nom: "Gers" },
  { code: "33", nom: "Gironde" },
  { code: "34", nom: "Hérault" },
  { code: "35", nom: "Ille-et-Vilaine" },
  { code: "36", nom: "Indre" },
  { code: "37", nom: "Indre-et-Loire" },
  { code: "38", nom: "Isère" },
  { code: "39", nom: "Jura" },
  { code: "40", nom: "Landes" },
  { code: "41", nom: "Loir-et-Cher" },
  { code: "42", nom: "Loire" },
  { code: "43", nom: "Haute-Loire" },
  { code: "44", nom: "Loire-Atlantique" },
  { code: "45", nom: "Loiret" },
  { code: "46", nom: "Lot" },
  { code: "47", nom: "Lot-et-Garonne" },
  { code: "48", nom: "Lozère" },
  { code: "49", nom: "Maine-et-Loire" },
  { code: "50", nom: "Manche" },
  { code: "51", nom: "Marne" },
  { code: "52", nom: "Haute-Marne" },
  { code: "53", nom: "Mayenne" },
  { code: "54", nom: "Meurthe-et-Moselle" },
  { code: "55", nom: "Meuse" },
  { code: "56", nom: "Morbihan" },
  { code: "57", nom: "Moselle" },
  { code: "58", nom: "Nièvre" },
  { code: "59", nom: "Nord" },
  { code: "60", nom: "Oise" },
  { code: "61", nom: "Orne" },
  { code: "62", nom: "Pas-de-Calais" },
  { code: "63", nom: "Puy-de-Dôme" },
  { code: "64", nom: "Pyrénées-Atlantiques" },
  { code: "65", nom: "Hautes-Pyrénées" },
  { code: "66", nom: "Pyrénées-Orientales" },
  { code: "67", nom: "Bas-Rhin" },
  { code: "68", nom: "Haut-Rhin" },
  { code: "69", nom: "Rhône" },
  { code: "70", nom: "Haute-Saône" },
  { code: "71", nom: "Saône-et-Loire" },
  { code: "72", nom: "Sarthe" },
  { code: "73", nom: "Savoie" },
  { code: "74", nom: "Haute-Savoie" },
  { code: "75", nom: "Paris" },
  { code: "76", nom: "Seine-Maritime" },
  { code: "77", nom: "Seine-et-Marne" },
  { code: "78", nom: "Yvelines" },
  { code: "79", nom: "Deux-Sèvres" },
  { code: "80", nom: "Somme" },
  { code: "81", nom: "Tarn" },
  { code: "82", nom: "Tarn-et-Garonne" },
  { code: "83", nom: "Var" },
  { code: "84", nom: "Vaucluse" },
  { code: "85", nom: "Vendée" },
  { code: "86", nom: "Vienne" },
  { code: "87", nom: "Haute-Vienne" },
  { code: "88", nom: "Vosges" },
  { code: "89", nom: "Yonne" },
  { code: "90", nom: "Territoire de Belfort" },
  { code: "91", nom: "Essonne" },
  { code: "92", nom: "Hauts-de-Seine" },
  { code: "93", nom: "Seine-Saint-Denis" },
  { code: "94", nom: "Val-de-Marne" },
  { code: "95", nom: "Val-d'Oise" },
  { code: "971", nom: "Guadeloupe", outreMer: true },
  { code: "972", nom: "Martinique", outreMer: true },
  { code: "973", nom: "Guyane", outreMer: true },
  { code: "974", nom: "La Réunion", outreMer: true },
  { code: "976", nom: "Mayotte", outreMer: true },
];

/**
 * Villes principales par département d'outre-mer.
 * Affichées comme suggestions rapides quand un DOM est sélectionné.
 */
export const VILLES_DOM: Record<string, string[]> = {
  "971": [
    "Les Abymes",
    "Pointe-à-Pitre",
    "Baie-Mahault",
    "Le Gosier",
    "Sainte-Anne",
    "Le Moule",
    "Petit-Bourg",
    "Capesterre-Belle-Eau",
    "Basse-Terre",
  ],
  "972": [
    "Fort-de-France",
    "Le Lamentin",
    "Le Robert",
    "Schœlcher",
    "Sainte-Marie",
    "Le François",
    "Ducos",
    "Rivière-Pilote",
  ],
  "973": [
    "Cayenne",
    "Saint-Laurent-du-Maroni",
    "Matoury",
    "Kourou",
    "Rémire-Montjoly",
    "Macouria",
    "Mana",
  ],
  "974": [
    "Saint-Denis",
    "Saint-Paul",
    "Saint-Pierre",
    "Le Tampon",
    "Saint-André",
    "Saint-Louis",
    "Le Port",
    "Saint-Benoît",
    "Saint-Joseph",
    "Sainte-Marie",
  ],
  "976": [
    "Mamoudzou",
    "Koungou",
    "Dembéni",
    "Dzaoudzi",
    "Pamandzi",
    "Bandraboua",
    "Tsingoni",
  ],
};

/**
 * Suggestions de villes pour la métropole (liste générale, affichée quand
 * aucun DOM n'est sélectionné).
 */
export const VILLES_METROPOLE: string[] = [
  "Paris",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nantes",
  "Strasbourg",
  "Rennes",
  "Nice",
  "Montpellier",
  "Grenoble",
  "Rouen",
  "Dijon",
  "Reims",
  "Saint-Étienne",
  "Brest",
  "Le Mans",
  "Clermont-Ferrand",
  "Tours",
  "Ajaccio",
];

const DEPARTEMENT_BY_CODE = new Map(DEPARTEMENTS.map((d) => [d.code, d]));

/** Retourne le nom du département à partir de son code (ex. "974" → "La Réunion"). */
export function getDepartementNom(code?: string | null): string {
  if (!code) return "";
  return DEPARTEMENT_BY_CODE.get(code)?.nom ?? "";
}

/** Indique si un code de département correspond à un territoire d'outre-mer. */
export function isOutreMer(code?: string | null): boolean {
  if (!code) return false;
  return Boolean(DEPARTEMENT_BY_CODE.get(code)?.outreMer);
}

/** Villes suggérées pour un département donné (DOM ciblé, sinon liste métropole). */
export function getVillesPourDepartement(code?: string | null): string[] {
  if (code && VILLES_DOM[code]) return VILLES_DOM[code];
  return VILLES_METROPOLE;
}

/** Libellé compact "Nom (code)" pour l'affichage. */
export function getDepartementLabel(code?: string | null): string {
  if (!code) return "";
  const dep = DEPARTEMENT_BY_CODE.get(code);
  return dep ? `${dep.nom} (${dep.code})` : "";
}
