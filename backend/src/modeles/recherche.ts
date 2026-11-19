// Recherche du catalogue sans tenir compte de la casse ni des accents : « ile » trouve « L'Île », « coeur » trouve « cœur ».
const VARIANTES: Record<string, string> = {
  a: "aàáâãäå",
  c: "cç",
  e: "eèéêë",
  i: "iìíîï",
  n: "nñ",
  o: "oòóôõö",
  u: "uùúûü",
  y: "yýÿ",
};

const LIGATURES: Record<string, string> = { oe: "œ", ae: "æ" };

export function sansAccents(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

function classe(lettre: string): string {
  const variantes = VARIANTES[lettre];
  return variantes ? `[${variantes}${variantes.toUpperCase()}]` : lettre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Motif d'expression régulière (MongoDB, option i) qui accepte chaque lettre avec ou sans accent, et les ligatures.
export function motifSansAccents(recherche: string): string {
  return sansAccents(recherche).replace(/oe|ae|[\s\S]/g, (morceau) => {
    const ligature = LIGATURES[morceau];
    if (!ligature) {
      return classe(morceau);
    }
    return `(?:${classe(morceau.charAt(0))}${classe(morceau.charAt(1))}|${ligature}|${ligature.toUpperCase()})`;
  });
}
