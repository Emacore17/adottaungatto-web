export const roleSeedRows = [
  {
    code: "registered_user",
    name: "Utente registrato",
    description:
      "Utente autenticato che puo creare annunci, contattare proprietari e salvare preferiti.",
  },
  {
    code: "professional_user",
    name: "Utente professionale",
    description:
      "Associazione, gattile, allevamento o professionista con profilo strutturato.",
  },
  {
    code: "moderator",
    name: "Moderatore",
    description:
      "Utente interno che puo revisionare annunci e gestire segnalazioni.",
  },
  {
    code: "admin",
    name: "Amministratore",
    description:
      "Utente interno con accesso alla gestione della piattaforma e delle configurazioni.",
  },
] as const

export const catBreedSeedRows = [
  {
    name: "Europeo",
    slug: "europeo",
    synonyms: ["Comune europeo", "European Shorthair"],
  },
  {
    name: "Maine Coon",
    slug: "maine-coon",
    synonyms: [],
  },
  {
    name: "Siamese",
    slug: "siamese",
    synonyms: ["Thai"],
  },
  {
    name: "Persiano",
    slug: "persiano",
    synonyms: ["Persian"],
  },
  {
    name: "British Shorthair",
    slug: "british-shorthair",
    synonyms: ["Britannico a pelo corto"],
  },
  {
    name: "Ragdoll",
    slug: "ragdoll",
    synonyms: [],
  },
  {
    name: "Bengala",
    slug: "bengala",
    synonyms: ["Bengal"],
  },
  {
    name: "Siberiano",
    slug: "siberiano",
    synonyms: ["Siberian"],
  },
  {
    name: "Sacro di Birmania",
    slug: "sacro-di-birmania",
    synonyms: ["Birmano", "Birman"],
  },
  {
    name: "Norvegese delle Foreste",
    slug: "norvegese-delle-foreste",
    synonyms: ["Gatto delle foreste norvegesi", "Norwegian Forest Cat"],
  },
  {
    name: "Certosino",
    slug: "certosino",
    synonyms: ["Chartreux"],
  },
  {
    name: "Blu di Russia",
    slug: "blu-di-russia",
    synonyms: ["Russian Blue"],
  },
  {
    name: "Scottish Fold",
    slug: "scottish-fold",
    synonyms: [],
  },
  {
    name: "Sphynx",
    slug: "sphynx",
    synonyms: [],
  },
  {
    name: "Devon Rex",
    slug: "devon-rex",
    synonyms: [],
  },
  {
    name: "Cornish Rex",
    slug: "cornish-rex",
    synonyms: [],
  },
  {
    name: "Abissino",
    slug: "abissino",
    synonyms: ["Abyssinian"],
  },
  {
    name: "Somalo",
    slug: "somalo",
    synonyms: ["Somali"],
  },
  {
    name: "Orientale",
    slug: "orientale",
    synonyms: ["Oriental Shorthair"],
  },
  {
    name: "Exotic Shorthair",
    slug: "exotic-shorthair",
    synonyms: ["Esotico"],
  },
  {
    name: "Angora Turco",
    slug: "angora-turco",
    synonyms: ["Turkish Angora"],
  },
  {
    name: "Turco Van",
    slug: "turco-van",
    synonyms: ["Turkish Van"],
  },
  {
    name: "Burmese",
    slug: "burmese",
    synonyms: ["Burmese americano", "Burmese europeo"],
  },
  {
    name: "Manx",
    slug: "manx",
    synonyms: [],
  },
  {
    name: "Munchkin",
    slug: "munchkin",
    synonyms: [],
  },
].map((breed, index) => ({
  ...breed,
  isActive: true,
  sortOrder: (index + 1) * 10,
}))
