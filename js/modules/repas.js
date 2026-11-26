// =====================================================
// Module Repas
//   1. le tiroir « repas » (et la reprise de ton Carnet de cuisine)
//   2. les petits outils (jours, recettes, riz, poisson)
//   3. lire et additionner les ingrédients (pour les courses)
//   4. l'onglet Semaine
//   5. la feuille d'un repas (choisir, gamelle, fait, déplacer)
//   6. envoyer des jours aux courses
//   7. l'onglet Carnet (chercher, filtrer, la fiche, modifier)
//   8. le mode cuisine (pas à pas, minuteurs)
//   9. la carte « Ce soir » de l'accueil et le résumé du Foyer
//  10. les réglages
// =====================================================

// ---------- 1. Le tiroir « repas » ----------
// recettes : [{ id, nom, categorie, proteine, temps, portions, ingredients (une ligne par ingrédient),
//              etapes (une ligne par étape), notes, etoiles (0 à 5), refaire ("oui" | "peutetre" | "non" | ""),
//              derniere ("AAAA-MM-JJ"), prix }]
// jours    : { "AAAA-MM-JJ": { soir: repas, midi: repas } }
//            un repas : { recetteId, texte, type ("cuisine" | "restaurant"), gamelle, plaisir, fait, envoye }
// reglages : { personnes, moments: { matin, midi, soir }, gamelle: [jours 0-6], plaisir: [jours 0-6],
//              dimancheMidi, rizMax, poissonParMois }
// Les sortes de repas : "cuisine" (fait maison), "restaurant", "sortie" (chez quelqu'un, pique-nique…)

const CATEGORIES_RECETTE = ["Plat", "Cheat meal", "Dessert", "Petit-déjeuner"];
const NOMS_JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

let repas = charger("repas", null);
if (!repas) {
  repas = {
    recettes: typeof RECETTES_IMPORT !== "undefined" ? RECETTES_IMPORT : [],
    jours: {},
    reglages: {
      personnes: 2,
      gamelle: [0, 1, 2, 3, 4], // du dimanche au jeudi soir : une gamelle pour le lendemain
      plaisir: [5, 6], // vendredi et samedi : repas plaisir
      dimancheMidi: true,
      rizMax: 2,
      poissonParMois: 1,
    },
  };
  // Ton plan des semaines 2 à 4, repris du Carnet
  if (typeof PLAN_IMPORT !== "undefined") {
    PLAN_IMPORT.forEach((p) => {
      const leRepas = nouveauRepas(p.date, p.moment);
      leRepas.recetteId = p.recetteId;
      leRepas.type = p.type;
      leRepas.fait = p.fait;
      if (!repas.jours[p.date]) repas.jours[p.date] = {};
      repas.jours[p.date][p.moment] = leRepas;
    });
  }
  sauvegarder("repas", repas);
}

// Les repas qu'on peut prévoir dans une journée (le petit-déjeuner, pour qui le cuisine)
const MOMENTS_REPAS = [
  ["matin", "Petit-déjeuner", "matin"],
  ["midi", "Déjeuner", "midi"],
  ["soir", "Dîner", "soir"],
];
const SORTES_REPAS = [
  ["cuisine", "Fait maison"],
  ["restaurant", "Restaurant"],
  ["sortie", "Sortie"],
  ["restes", "Restes"],
  ["commande", "On commande"],
];
// La réserve : des plats mis de côté, à replacer quand on veut (comme « En réserve » dans ton plan)
if (!repas.reserve) repas.reserve = [];
// Reprise de la V36 : on ne prévoyait que le dîner
if (!repas.reglages.moments) repas.reglages.moments = { matin: false, midi: false, soir: true };

function sauvegarderRepas() {
  sauvegarder("repas", repas);
}

// Un repas vide, avec les habitudes de la semaine (gamelle, plaisir)
function nouveauRepas(date, moment) {
  const jour = texteEnDate(date).getDay();
  const reglages = repas.reglages;
  return {
    recetteId: null,
    texte: "",
    type: "cuisine",
    gamelle: moment === "soir" && reglages.gamelle.includes(jour),
    plaisir: moment === "soir" && reglages.plaisir.includes(jour),
    fait: false,
    envoye: false,
  };
}

// ---------- 2. Les petits outils ----------

function recetteDe(id) {
  return repas.recettes.find((r) => r.id === id) || null;
}

function repasDu(date, moment) {
  return (repas.jours[date] && repas.jours[date][moment]) || null;
}

// Le nom à afficher pour un repas
function nomDuRepas(leRepas) {
  if (!leRepas) return "";
  if (leRepas.type !== "cuisine") {
    const sorte = (SORTES_REPAS.find(([code]) => code === leRepas.type) || [, "Autre"])[1];
    return leRepas.texte ? `${sorte} · ${leRepas.texte}` : sorte;
  }
  const recette = recetteDe(leRepas.recetteId);
  return recette ? recette.nom : leRepas.texte;
}

function repasVide(leRepas) {
  return !leRepas || (leRepas.type === "cuisine" && !leRepas.recetteId && !leRepas.texte);
}

// « mer. 25 »
function texteJourCourt(date) {
  const d = texteEnDate(date);
  return `${NOMS_JOURS_COURTS[d.getDay()]} ${d.getDate()}`;
}

// « Mercredi 25 novembre »
function texteJourLong(date) {
  return majuscule(texteEnDate(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
}

// Les moments d'un jour : ceux choisis dans les réglages, le midi du dimanche si activé,
// et tout repas déjà prévu (pour ne jamais le cacher)
function momentsDu(date) {
  const choisis = repas.reglages.moments;
  const dimanche = texteEnDate(date).getDay() === 0;
  return MOMENTS_REPAS.map(([code]) => code).filter(
    (code) => choisis[code] || (code === "midi" && dimanche && repas.reglages.dimancheMidi) || repasDu(date, code),
  );
}

function nomDuMoment(moment) {
  return MOMENTS_REPAS.find(([code]) => code === moment)[2];
}

// Jamais cuisiné : une recette « à tester »
function aTester(recette) {
  return !recette.derniere;
}

// Une recette avec du riz comme féculent (pas le vinaigre ni les nouilles de riz)
function avecDuRiz(recette) {
  return lignes(recette.ingredients).some((ligne) => /^(?:[\d.,/ ]+\s*g\s+(?:de\s+)?)?riz\b/i.test(ligne.trim()));
}

// Poisson, saumon, thon frais, crevettes
function avecDuPoisson(recette) {
  return /poisson|saumon|crevette|moule|fruits de mer/i.test(`${recette.proteine} ${recette.nom}`) &&
    !/en boîte|boîtes? de|thon/i.test(`${recette.proteine} ${recette.ingredients}`);
}

function lignes(texte) {
  return String(texte || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// Les jours d'une semaine (du lundi au dimanche)
function joursDeLaSemaine(lundi) {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => ajouterJours(lundi, i));
}

// Les recettes cuisinées dans une liste de jours
function recettesDesJours(jours) {
  const liste = [];
  jours.forEach((date) => {
    ["matin", "midi", "soir"].forEach((moment) => {
      const leRepas = repasDu(date, moment);
      const recette = leRepas && leRepas.type === "cuisine" ? recetteDe(leRepas.recetteId) : null;
      if (recette) liste.push(recette);
    });
  });
  return liste;
}

// ---------- 3. Lire et additionner les ingrédients ----------

// Les unités qu'on sait lire, et leur nom « rangé »
const UNITES_RECETTE = [
  ["c. à soupe", "c. à soupe"],
  ["c. à café", "c. à café"],
  ["cuillères à soupe", "c. à soupe"],
  ["cuillères à café", "c. à café"],
  ["kg", "kg"],
  ["g", "g"],
  ["cl", "cl"],
  ["ml", "ml"],
  ["l", "l"],
  ["boîtes", "boîte"],
  ["boîte", "boîte"],
  ["pots", "pot"],
  ["pot", "pot"],
  ["gousses", "gousse"],
  ["gousse", "gousse"],
  ["tranches", "tranche"],
  ["tranche", "tranche"],
  ["sachets", "sachet"],
  ["sachet", "sachet"],
  ["paquets", "paquet"],
  ["paquet", "paquet"],
  ["branches", "branche"],
  ["branche", "branche"],
  ["poignée", "poignée"],
  ["pincée", "pincée"],
  ["verre", "verre"],
  ["noix", "noix"],
  ["feuille", "feuille"],
];

// Ce qu'on a toujours sous la main : on ne l'ajoute pas aux courses
const TOUJOURS_LA = ["sel", "poivre", "eau", "sel et poivre", "eau de cuisson des pâtes", "glaçons"];

// "1/4" → 0.25 ; "1,5" → 1.5
function lireNombre(texte) {
  const propre = texte.replace(",", ".").replace(/\s/g, "");
  if (propre.includes("/")) {
    const [haut, bas] = propre.split("/").map(Number);
    return bas ? haut / bas : NaN;
  }
  return Number(propre);
}

// Le nom court d'un ingrédient : « blanc de poulet en dés » → « blanc de poulet »
function nomCourt(nom) {
  let propre = nom.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  propre = propre.split(/\s+(?:en |pour |sans |bien |env\.|environ |à température)/)[0];
  const adjectifs = /\s+(émincée?s?|râpée?s?|égouttée?s?|coupée?s?|crue?s?|décortiquée?s?|sèche?s?|secs?|finement|fine?s?|frais|fraîche?s?|hachée?s? fin)$/i;
  while (adjectifs.test(propre)) propre = propre.replace(adjectifs, "");
  return propre.trim();
}

// La clé pour reconnaître un même ingrédient : minuscules, sans pluriel
function cleIngredient(nom) {
  return nomCourt(nom)
    .toLowerCase()
    .split(" ")
    .map((mot) => {
      if (["riz", "pois", "maïs", "jus", "ananas", "noix", "frais", "gros", "bois"].includes(mot)) return mot;
      if (mot.endsWith("eaux")) return mot.slice(0, -1);
      if (mot.length > 3 && mot.endsWith("s")) return mot.slice(0, -1);
      return mot;
    })
    .join(" ");
}

// Une ligne de recette → une liste d'ingrédients { nom, quantite, unite }
function lireLigne(ligne) {
  // « Sauce : 2 c. à soupe de yaourt… » : on enlève l'étiquette avant les deux-points
  let texte = ligne.replace(/^[^:\d]{1,40}:\s*/, "").trim();
  const resultats = [];
  // Plusieurs ingrédients sur une ligne : « Sauce soja, huile de sésame, ail »
  texte.split(/,\s+|\s*;\s*|\s+\+\s+|\s+et\s+(?=\D)/).forEach((morceau) => {
    const lu = lireMorceau(morceau.trim());
    if (lu && !TOUJOURS_LA.includes(lu.nom.toLowerCase())) resultats.push(lu);
  });
  return resultats;
}

function lireMorceau(morceau) {
  if (!morceau) return null;
  const trouve = morceau.match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(.*)$/);
  if (!trouve) return { nom: majuscule(nomCourt(morceau)), quantite: null, unite: "" };
  const quantite = lireNombre(trouve[1]);
  let reste = trouve[2];
  let unite = "";
  for (const [lue, rangee] of UNITES_RECETTE) {
    const motif = new RegExp(`^${lue.replace(/\./g, "\\.")}(?=\\s|$)`, "i");
    if (motif.test(reste)) {
      unite = rangee;
      reste = reste.replace(motif, "").trim();
      break;
    }
  }
  reste = reste.replace(/^(de |d'|d’)/i, "").trim();
  if (!reste) return null;
  if (!unite) unite = "pièce";
  return { nom: majuscule(nomCourt(reste)), quantite: isNaN(quantite) ? null : quantite, unite };
}

// Pour additionner : grammes et millilitres comme base
function versBase(quantite, unite) {
  if (unite === "kg") return { valeur: quantite * 1000, base: "g" };
  if (unite === "l") return { valeur: quantite * 1000, base: "ml" };
  if (unite === "cl") return { valeur: quantite * 10, base: "ml" };
  return { valeur: quantite, base: unite };
}

// Arrondir joliment, puis écrire : 1250 g → « 1,3 kg » ; 0.25 pièce → « 1/4 »
function ecrireMesure(valeur, base) {
  if (base === "g" || base === "ml") {
    const pas = valeur > 50 ? 10 : 5;
    let arrondi = Math.max(pas, Math.round(valeur / pas) * pas);
    if (arrondi >= 1000) {
      const grand = Math.round(arrondi / 100) / 10;
      return { quantite: String(grand).replace(".", ","), unite: base === "g" ? "kg" : "l" };
    }
    return { quantite: String(arrondi), unite: base };
  }
  if (valeur < 1) {
    const fractions = { 0.25: "1/4", 0.5: "1/2", 0.75: "3/4" };
    const proche = [0.25, 0.5, 0.75].reduce((a, b) => (Math.abs(b - valeur) < Math.abs(a - valeur) ? b : a));
    return { quantite: fractions[proche], unite: base };
  }
  const arrondi = base === "pièce" || base === "boîte" || base === "gousse" ? Math.ceil(valeur - 0.01) : Math.round(valeur * 2) / 2;
  return { quantite: String(arrondi).replace(".", ","), unite: base };
}

// Combien de portions pour ce repas : 2 personnes, et 2 de plus s'il y a une gamelle
function portionsDu(leRepas) {
  const personnes = repas.reglages.personnes || 2;
  return personnes * (leRepas && leRepas.gamelle ? 2 : 1);
}

// Ajouter les ingrédients d'un repas à la liste de courses, en cumulant les quantités
function envoyerAuxCourses(date, moment) {
  const leRepas = repasDu(date, moment);
  const recette = leRepas ? recetteDe(leRepas.recetteId) : null;
  if (!recette || leRepas.type !== "cuisine") return 0;
  const facteur = portionsDu(leRepas) / (recette.portions || portionsDu(leRepas));
  const etiquette = texteJourCourt(date);
  let ajoutes = 0;
  lignes(recette.ingredients).forEach((ligne) => {
    lireLigne(ligne).forEach((ingredient) => {
      ajouterIngredientAuxCourses(ingredient, facteur, etiquette);
      ajoutes++;
    });
  });
  leRepas.envoye = true;
  sauvegarderCourses();
  sauvegarderRepas();
  return ajoutes;
}

function ajouterIngredientAuxCourses(ingredient, facteur, etiquette) {
  const cle = cleIngredient(ingredient.nom);
  const mesure = ingredient.quantite !== null ? versBase(ingredient.quantite * facteur, ingredient.unite) : null;
  // Le même ingrédient, pas encore pris, avec une unité qu'on peut additionner
  const existant = courses.articles.find((a) => {
    if (a.coche || cleIngredient(a.nom) !== cle) return false;
    if (!mesure || !a.quantite) return !mesure || !a.quantite;
    return versBase(lireNombre(String(a.quantite)), a.unite || "pièce").base === mesure.base;
  });
  if (existant) {
    if (mesure && existant.quantite) {
      const avant = versBase(lireNombre(String(existant.quantite)), existant.unite || "pièce");
      const total = ecrireMesure(avant.valeur + mesure.valeur, mesure.base);
      existant.quantite = total.quantite;
      existant.unite = total.unite;
    } else if (mesure) {
      const total = ecrireMesure(mesure.valeur, mesure.base);
      existant.quantite = total.quantite;
      existant.unite = total.unite;
    }
    existant.pour = [...new Set([...(existant.pour || []), etiquette])];
    return;
  }
  const ecrit = mesure ? ecrireMesure(mesure.valeur, mesure.base) : { quantite: "", unite: "" };
  courses.articles.push({
    id: nouvelId(),
    nom: ingredient.nom,
    quantite: ecrit.quantite,
    unite: ecrit.unite,
    rayonId: devinerRayon(ingredient.nom),
    coche: false,
    source: "repas",
    pour: [etiquette],
  });
}

// ---------- 4. L'onglet Semaine ----------

let lundiRepas = lundiDe(aujourdhuiEnTexte());

document.querySelectorAll("[data-panneau-repas]").forEach((onglet) => {
  onglet.addEventListener("click", () => {
    document.querySelectorAll("[data-panneau-repas]").forEach((o) => o.classList.toggle("actif", o === onglet));
    document.querySelectorAll(".panneau-repas").forEach((p) => p.classList.toggle("actif", p.id === onglet.dataset.panneauRepas));
  });
});

document.getElementById("semaine-repas-prec").addEventListener("click", () => {
  lundiRepas = ajouterJours(lundiRepas, -7);
  afficherSemaineRepas();
});
document.getElementById("semaine-repas-suiv").addEventListener("click", () => {
  lundiRepas = ajouterJours(lundiRepas, 7);
  afficherSemaineRepas();
});

function texteSemaine(lundi) {
  const dimanche = ajouterJours(lundi, 6);
  const debut = texteEnDate(lundi);
  const fin = texteEnDate(dimanche);
  if (debut.getMonth() === fin.getMonth()) return `Du ${debut.getDate()} au ${formaterDate(dimanche, false)}`;
  return `Du ${formaterDate(lundi, false)} au ${formaterDate(dimanche, false)}`;
}

function creerPastilleRepas(texte, sorte) {
  const pastille = document.createElement("span");
  pastille.classList.add("pastille-repas", `pastille-repas-${sorte}`);
  pastille.textContent = texte;
  return pastille;
}

function creerLigneRepas(date, moment) {
  const leRepas = repasDu(date, moment);
  const ligne = document.createElement("button");
  ligne.type = "button";
  ligne.classList.add("ligne-repas");
  if (date === aujourdhuiEnTexte()) ligne.classList.add("ligne-repas-aujourdhui");

  const jour = document.createElement("span");
  jour.classList.add("ligne-repas-jour");
  jour.textContent = texteJourCourt(date);
  if (momentsDu(date).length > 1) {
    const petit = document.createElement("small");
    petit.textContent = nomDuMoment(moment);
    jour.appendChild(petit);
  }

  const nom = document.createElement("span");
  nom.classList.add("ligne-repas-nom");
  if (repasVide(leRepas)) {
    nom.textContent = "Rien de prévu";
    nom.classList.add("ligne-repas-vide");
  } else {
    nom.textContent = nomDuRepas(leRepas);
    if (leRepas.fait) nom.classList.add("ligne-repas-fait");
  }

  const pastilles = document.createElement("span");
  pastilles.classList.add("ligne-repas-pastilles");
  if (!repasVide(leRepas)) {
    const recette = recetteDe(leRepas.recetteId);
    if (leRepas.fait && recette && recette.etoiles) pastilles.appendChild(creerPastilleRepas(`${String(recette.etoiles).replace(".", ",")}/5`, "note"));
    else if (recette && aTester(recette) && !leRepas.fait) pastilles.appendChild(creerPastilleRepas("à tester", "test"));
    if (leRepas.gamelle && leRepas.type === "cuisine") pastilles.appendChild(creerPastilleRepas("gamelle", "gamelle"));
    if (leRepas.plaisir) pastilles.appendChild(creerPastilleRepas("plaisir", "plaisir"));
    if (leRepas.envoye && !leRepas.fait) {
      const panier = creerIcone("shopping-basket");
      panier.classList.add("ligne-repas-panier");
      pastilles.appendChild(panier);
    }
  }

  ligne.append(jour, nom, pastilles);
  ligne.addEventListener("click", () => ouvrirFeuilleJourRepas(date, moment));
  return ligne;
}

document.getElementById("semaine-repas-aujourdhui").addEventListener("click", () => {
  lundiRepas = lundiDe(aujourdhuiEnTexte());
  afficherSemaineRepas();
});

function afficherSemaineRepas() {
  document.getElementById("semaine-repas-label").textContent = texteSemaine(lundiRepas);
  document.getElementById("semaine-repas-aujourdhui").hidden = lundiRepas === lundiDe(aujourdhuiEnTexte());
  const zone = document.getElementById("liste-semaine-repas");
  zone.replaceChildren();
  const jours = joursDeLaSemaine(lundiRepas);
  jours.forEach((date) => momentsDu(date).forEach((moment) => zone.appendChild(creerLigneRepas(date, moment))));
  afficherAlertesRepas(jours);
  afficherReserve();
}

function afficherReserve() {
  const zone = document.getElementById("reserve-repas");
  zone.replaceChildren();
  repas.reserve = repas.reserve.filter((id) => recetteDe(id));
  zone.hidden = repas.reserve.length === 0;
  if (zone.hidden) return;
  const titre = document.createElement("p");
  titre.classList.add("etiquette");
  titre.textContent = "En réserve";
  const liste = document.createElement("div");
  liste.classList.add("liste-reserve");
  repas.reserve.forEach((id) => {
    const recette = recetteDe(id);
    const pastille = document.createElement("span");
    pastille.classList.add("pastille-reserve");
    const nom = document.createElement("button");
    nom.type = "button";
    nom.textContent = recette.nom;
    nom.addEventListener("click", () => ouvrirFicheRecette(id));
    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.setAttribute("aria-label", `Retirer ${recette.nom} de la réserve`);
    retirer.appendChild(creerIcone("x"));
    retirer.addEventListener("click", () => {
      agirAvecAnnuler({
        tiroir: repas,
        message: "Retiré de la réserve",
        action: () => {
          repas.reserve = repas.reserve.filter((x) => x !== id);
        },
        apres: () => {
          sauvegarderRepas();
          afficherSemaineRepas();
        },
      });
    });
    pastille.append(nom, retirer);
    liste.appendChild(pastille);
  });
  const aide = document.createElement("p");
  aide.classList.add("sous-titre", "petit");
  aide.textContent = "Touche un jour pour y replacer un plat de la réserve.";
  zone.append(titre, liste, aide);
}

// Les petites alertes douces : trop de riz, pas encore de poisson ce mois-ci
function afficherAlertesRepas(jours) {
  const zone = document.getElementById("alertes-repas");
  zone.replaceChildren();
  const messages = [];
  const recettes = recettesDesJours(jours);
  const riz = recettes.filter(avecDuRiz).length;
  if (riz > repas.reglages.rizMax) {
    messages.push(`${riz} repas avec du riz cette semaine (tu en voulais ${repas.reglages.rizMax} au plus)`);
  }
  if (repas.reglages.poissonParMois > 0) {
    // Le mois du milieu de la semaine affichée
    const mois = ajouterJours(lundiRepas, 3).slice(0, 7);
    const joursDuMois = Object.keys(repas.jours).filter((d) => d.startsWith(mois));
    const poissons = recettesDesJours(joursDuMois).filter(avecDuPoisson).length;
    if (poissons < repas.reglages.poissonParMois) {
      messages.push(poissons === 0 ? "Pas encore de poisson ce mois-ci" : `${poissons} plat de poisson ce mois-ci`);
    }
  }
  messages.forEach((texte) => {
    const alerte = document.createElement("p");
    alerte.classList.add("alerte-repas");
    alerte.append(creerIcone("leaf"), texte);
    zone.appendChild(alerte);
  });
}

// ---------- 5. La feuille d'un repas ----------

const feuilleJourRepas = document.getElementById("feuille-jour-repas");
let repasOuvert = null; // { date, moment }
let rechercheJourRepas = "";

function ouvrirFeuilleJourRepas(date, moment) {
  repasOuvert = { date, moment };
  rechercheJourRepas = "";
  afficherFeuilleJourRepas();
  feuilleJourRepas.hidden = false;
  voile.hidden = false;
}

function fermerFeuilleJourRepas() {
  feuilleJourRepas.hidden = true;
  voile.hidden = true;
  repasOuvert = null;
}

document.getElementById("fermer-jour-repas").addEventListener("click", fermerFeuilleJourRepas);
voile.addEventListener("click", () => {
  if (!feuilleJourRepas.hidden) fermerFeuilleJourRepas();
});

// Modifier le repas ouvert (on le crée s'il n'existe pas encore)
function changerRepas(changement) {
  const { date, moment } = repasOuvert;
  if (!repas.jours[date]) repas.jours[date] = {};
  if (!repas.jours[date][moment]) repas.jours[date][moment] = nouveauRepas(date, moment);
  changement(repas.jours[date][moment]);
  sauvegarderRepas();
  afficherRepas();
  afficherFeuilleJourRepas();
}

function creerCase(texte, coche, quandChange) {
  const label = document.createElement("label");
  label.classList.add("case-repas");
  const caseACocher = document.createElement("input");
  caseACocher.type = "checkbox";
  caseACocher.checked = coche;
  caseACocher.addEventListener("change", () => quandChange(caseACocher.checked));
  label.append(caseACocher, texte);
  return label;
}

// Choisir une note (0 à 5, par demi-points)
function creerChoixNote(recette, quandChange) {
  const menu = document.createElement("select");
  menu.classList.add("champ-note");
  menu.setAttribute("aria-label", "Ma note");
  const vide = document.createElement("option");
  vide.value = "0";
  vide.textContent = "–";
  menu.appendChild(vide);
  for (let n = 1; n <= 5; n += 0.5) {
    const option = document.createElement("option");
    option.value = String(n);
    option.textContent = `${String(n).replace(".", ",")} / 5`;
    menu.appendChild(option);
  }
  menu.value = String(recette.etoiles || 0);
  menu.addEventListener("change", () => {
    recette.etoiles = Number(menu.value);
    sauvegarderRepas();
    if (quandChange) quandChange();
  });
  return menu;
}

function creerChoixRefaire(recette, quandChange) {
  const zone = document.createElement("div");
  zone.classList.add("choix-refaire");
  [["oui", "On refait"], ["peutetre", "Peut-être"], ["non", "Pas pour nous"]].forEach(([valeur, texte]) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille-temps");
    bouton.classList.toggle("choisie", recette.refaire === valeur);
    bouton.textContent = texte;
    bouton.addEventListener("click", () => {
      recette.refaire = recette.refaire === valeur ? "" : valeur;
      sauvegarderRepas();
      if (quandChange) quandChange();
    });
    zone.appendChild(bouton);
  });
  return zone;
}

// Piocher une recette au hasard parmi un filtre, en évitant celles déjà prévues cette semaine
function piocherRecette(filtre) {
  const dejaPrevues = recettesDesJours(joursDeLaSemaine(lundiDe(repasOuvert.date))).map((r) => r.id);
  const possibles = repas.recettes.filter((r) => filtre(r) && r.refaire !== "non" && !dejaPrevues.includes(r.id));
  return possibles[Math.floor(Math.random() * possibles.length)] || null;
}

function afficherFeuilleJourRepas() {
  if (!repasOuvert) return;
  const { date, moment } = repasOuvert;
  const leRepas = repasDu(date, moment);
  document.getElementById("jour-repas-titre").textContent =
    `${texteJourLong(date)}${momentsDu(date).length > 1 || moment !== "soir" ? `, ${nomDuMoment(moment)}` : ""}`;
  const zone = document.getElementById("jour-repas-contenu");
  zone.replaceChildren();

  const recette = leRepas ? recetteDe(leRepas.recetteId) : null;

  // Le repas prévu
  if (!repasVide(leRepas)) {
    const prevu = document.createElement("div");
    prevu.classList.add("repas-prevu");
    const nom = document.createElement("p");
    nom.classList.add("repas-prevu-nom");
    nom.textContent = nomDuRepas(leRepas);
    prevu.appendChild(nom);
    if (recette) {
      const detail = document.createElement("p");
      detail.classList.add("sous-titre", "petit");
      detail.textContent = [recette.temps ? `${recette.temps} min` : "", `pour ${portionsDu(leRepas)} portions`, aTester(recette) ? "à tester" : `fait le ${formaterDate(recette.derniere, false)}`]
        .filter(Boolean)
        .join(" · ");
      prevu.appendChild(detail);
    }
    const boutons = document.createElement("div");
    boutons.classList.add("envie-boutons");
    if (recette) {
      boutons.append(
        creerBoutonEnvie("Je cuisine", () => {
          fermerFeuilleJourRepas();
          ouvrirModeCuisine(recette.id, portionsDu(leRepas), { date, moment });
        }, true),
        creerBoutonEnvie("Voir la recette", () => {
          fermerFeuilleJourRepas();
          ouvrirFicheRecette(recette.id);
        }),
      );
    }
    if (leRepas.type === "cuisine") {
      boutons.appendChild(
        creerBoutonEnvie(leRepas.fait ? "Pas encore fait" : "C'est fait", () => {
          changerRepas((r) => {
            r.fait = !r.fait;
            if (r.fait && recette) recette.derniere = date;
          });
          if (!leRepas.fait) montrerPetitMessage("Bien joué 🌱");
        }),
      );
    }
    prevu.appendChild(boutons);

    // Fait : on note le plat (ça sert à repérer ce qui plaît, pas à le resservir)
    if (leRepas.fait && recette) {
      const noter = document.createElement("div");
      noter.classList.add("repas-noter");
      const etiquette = document.createElement("p");
      etiquette.classList.add("etiquette");
      etiquette.textContent = "Alors, c'était comment ?";
      noter.append(etiquette, creerChoixNote(recette, afficherRepas), creerChoixRefaire(recette, afficherFeuilleJourRepas));
      prevu.appendChild(noter);
    }
    zone.appendChild(prevu);
  }

  // Cuisiné ou restaurant
  const sorte = document.createElement("div");
  sorte.classList.add("choix-refaire");
  SORTES_REPAS.forEach(([valeur, texte]) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille-temps");
    bouton.classList.toggle("choisie", (leRepas ? leRepas.type : "cuisine") === valeur && !(valeur === "cuisine" && repasVide(leRepas)));
    bouton.textContent = texte;
    bouton.addEventListener("click", () =>
      changerRepas((r) => {
        if (r.type !== valeur && valeur !== "cuisine") {
          r.recetteId = null;
          r.texte = "";
          r.gamelle = false;
        }
        if (r.type !== valeur && valeur === "cuisine") r.texte = "";
        r.type = valeur;
      }),
    );
    sorte.appendChild(bouton);
  });
  zone.appendChild(sorte);

  // Restaurant ou sortie : où ? (facultatif)
  if (leRepas && leRepas.type !== "cuisine") {
    const ou = document.createElement("input");
    ou.type = "text";
    ou.classList.add("champ-note");
    ou.placeholder = {
      restaurant: "Où ? (facultatif)",
      sortie: "Chez qui, où ? (facultatif)",
      restes: "Les restes de quoi ? (facultatif)",
      commande: "Quoi, chez qui ? (facultatif)",
    }[leRepas.type];
    ou.maxLength = 60;
    ou.value = leRepas.texte || "";
    ou.addEventListener("change", () => changerRepas((r) => (r.texte = ou.value.trim())));
    zone.appendChild(ou);
  }

  // Choisir dans le carnet
  if (!leRepas || leRepas.type === "cuisine") {
    const titre = document.createElement("p");
    titre.classList.add("etiquette", "etiquette-espacee");
    titre.textContent = repasVide(leRepas) ? "Qu'est-ce qu'on mange ?" : "Changer de plat";
    const champ = document.createElement("input");
    champ.type = "search";
    champ.classList.add("champ-note");
    champ.placeholder = "Chercher dans le carnet";
    champ.value = rechercheJourRepas;
    const resultats = document.createElement("div");
    resultats.classList.add("resultats-recettes");

    const montrerResultats = () => {
      resultats.replaceChildren();
      const texte = champ.value.trim().toLowerCase();
      if (!texte) return;
      repas.recettes
        .filter((r) => r.nom.toLowerCase().includes(texte))
        .slice(0, 6)
        .forEach((r) => {
          const bouton = document.createElement("button");
          bouton.type = "button";
          bouton.classList.add("resultat-recette");
          bouton.textContent = r.nom;
          bouton.addEventListener("click", () => {
            rechercheJourRepas = "";
            changerRepas((leR) => {
              leR.recetteId = r.id;
              leR.texte = "";
              leR.type = "cuisine";
              leR.fait = false;
              leR.envoye = false;
            });
          });
          resultats.appendChild(bouton);
        });
      // Pas dans le carnet : juste un nom, en texte libre
      const libre = document.createElement("button");
      libre.type = "button";
      libre.classList.add("resultat-recette", "resultat-libre");
      libre.textContent = `Juste « ${champ.value.trim()} »`;
      libre.addEventListener("click", () => {
        const nomLibre = champ.value.trim();
        rechercheJourRepas = "";
        changerRepas((leR) => {
          leR.recetteId = null;
          leR.texte = nomLibre;
          leR.type = "cuisine";
          leR.envoye = false;
        });
      });
      resultats.appendChild(libre);
    };
    champ.addEventListener("input", () => {
      rechercheJourRepas = champ.value;
      montrerResultats();
    });
    montrerResultats();

    const idees = document.createElement("div");
    idees.classList.add("envie-boutons");
    const placerIdee = (filtre, messageVide) => {
      const idee = piocherRecette(filtre);
      if (!idee) {
        montrerPetitMessage(messageVide);
        return;
      }
      changerRepas((leR) => {
        leR.recetteId = idee.id;
        leR.texte = "";
        leR.type = "cuisine";
        leR.fait = false;
        leR.envoye = false;
      });
    };
    idees.append(
      creerBoutonEnvie("Une idée à tester", () =>
        placerIdee((r) => aTester(r) && ["Plat", "Cheat meal"].includes(r.categorie), "Tout a déjà été testé 🌱"),
      ),
      creerBoutonEnvie("Un plat poisson", () => placerIdee(avecDuPoisson, "Pas de plat poisson dans ton carnet")),
    );
    zone.append(titre, champ, resultats);
    if (repas.reserve.length) {
      const reserve = document.createElement("div");
      reserve.classList.add("envie-boutons");
      repas.reserve.forEach((id) => {
        const recette = recetteDe(id);
        if (!recette || (leRepas && leRepas.recetteId === id)) return;
        reserve.appendChild(
          creerBoutonEnvie(recette.nom, () => {
            repas.reserve = repas.reserve.filter((x) => x !== id);
            changerRepas((leR) => {
              leR.recetteId = id;
              leR.texte = "";
              leR.type = "cuisine";
              leR.fait = false;
              leR.envoye = false;
            });
          }),
        );
      });
      if (reserve.children.length) {
        const titreReserve = document.createElement("p");
        titreReserve.classList.add("etiquette");
        titreReserve.textContent = "Depuis la réserve";
        zone.append(titreReserve, reserve);
      }
    }
    zone.appendChild(idees);
  }

  // Gamelle et plaisir
  if (leRepas && !repasVide(leRepas)) {
    const cases = document.createElement("div");
    cases.classList.add("cases-repas");
    if (leRepas.type === "cuisine") {
      cases.appendChild(creerCase("Une gamelle pour le lendemain", leRepas.gamelle, (oui) => changerRepas((r) => (r.gamelle = oui))));
    }
    cases.appendChild(creerCase("Repas plaisir", leRepas.plaisir, (oui) => changerRepas((r) => (r.plaisir = oui))));
    zone.appendChild(cases);

    // Les courses de ce jour
    const actions = document.createElement("div");
    actions.classList.add("envie-boutons");
    if (recette && leRepas.type === "cuisine" && !leRepas.fait) {
      actions.appendChild(
        creerBoutonEnvie(leRepas.envoye ? "Remettre aux courses" : "Ajouter aux courses", () => {
          const nombre = envoyerAuxCourses(date, moment);
          afficherRepas();
          afficherCourses();
          afficherFeuilleJourRepas();
          montrerPetitMessage(`${nombre} ingrédient${nombre > 1 ? "s" : ""} dans tes courses 🌱`);
        }),
      );
    }
    zone.appendChild(actions);

    // Déplacer à un autre jour (le repas de ce jour-là prend la place, s'il y en a un)
    const deplacer = document.createElement("details");
    deplacer.classList.add("zone-modifier");
    const resume = document.createElement("summary");
    resume.textContent = "Décaler à un autre jour";
    const ligneDeplacer = document.createElement("div");
    ligneDeplacer.classList.add("form-article-ligne");
    const champDate = document.createElement("input");
    champDate.type = "date";
    champDate.classList.add("champ-note");
    champDate.value = ajouterJours(date, 1);
    const ok = document.createElement("button");
    ok.type = "button";
    ok.classList.add("bouton");
    ok.textContent = "Décaler";
    ok.addEventListener("click", () => {
      const cible = champDate.value;
      if (!cible || cible === date) return;
      if (!repas.jours[cible]) repas.jours[cible] = {};
      const autre = repas.jours[cible][moment] || null;
      repas.jours[cible][moment] = repas.jours[date][moment];
      if (autre) repas.jours[date][moment] = autre;
      else delete repas.jours[date][moment];
      sauvegarderRepas();
      afficherRepas();
      fermerFeuilleJourRepas();
      montrerPetitMessage(`Décalé au ${texteJourCourt(cible)}${autre ? ", et échangé" : ""}`);
    });
    ligneDeplacer.append(champDate, ok);
    deplacer.append(resume, ligneDeplacer);
    zone.appendChild(deplacer);

    // Vider ce repas (avec Annuler)
    const vider = document.createElement("button");
    vider.type = "button";
    vider.classList.add("lien", "lien-vider-repas");
    vider.textContent = "Ne rien prévoir ce jour-là";
    vider.addEventListener("click", () => {
      agirAvecAnnuler({
        tiroir: repas,
        message: "Repas retiré",
        action: () => {
          delete repas.jours[date][moment];
        },
        apres: () => {
          sauvegarderRepas();
          afficherRepas();
        },
      });
      fermerFeuilleJourRepas();
    });
    zone.appendChild(vider);
  }
}

// ---------- 6. Envoyer des jours aux courses ----------

const feuilleCoursesRepas = document.getElementById("feuille-courses-repas");

document.getElementById("repas-vers-courses").addEventListener("click", () => {
  const zone = document.getElementById("jours-courses-repas");
  zone.replaceChildren();
  // Les 10 prochains jours, à partir d'aujourd'hui
  for (let i = 0; i < 10; i++) {
    const date = ajouterJours(aujourdhuiEnTexte(), i);
    ["matin", "midi", "soir"].forEach((moment) => {
      const leRepas = repasDu(date, moment);
      const recette = leRepas && leRepas.type === "cuisine" && !leRepas.fait ? recetteDe(leRepas.recetteId) : null;
      if (!recette) return;
      const label = document.createElement("label");
      label.classList.add("case-repas", "case-jour-courses");
      const caseACocher = document.createElement("input");
      caseACocher.type = "checkbox";
      caseACocher.value = `${date}|${moment}`;
      const texte = document.createElement("span");
      texte.textContent = `${texteJourCourt(date)}${moment !== "soir" ? ` ${nomDuMoment(moment)}` : ""} · ${recette.nom}`;
      if (leRepas.envoye) {
        const deja = document.createElement("small");
        deja.textContent = "déjà dans les courses";
        texte.appendChild(deja);
      }
      label.append(caseACocher, texte);
      zone.appendChild(label);
    });
  }
  if (!zone.children.length) zone.appendChild(creerMessageVide("Aucun repas cuisiné de prévu ces prochains jours."));
  feuilleCoursesRepas.hidden = false;
  voile.hidden = false;
});

function fermerFeuilleCoursesRepas() {
  feuilleCoursesRepas.hidden = true;
  voile.hidden = true;
}
document.getElementById("fermer-courses-repas").addEventListener("click", fermerFeuilleCoursesRepas);
voile.addEventListener("click", () => {
  if (!feuilleCoursesRepas.hidden) fermerFeuilleCoursesRepas();
});

document.getElementById("valider-courses-repas").addEventListener("click", () => {
  const choisis = [...document.querySelectorAll("#jours-courses-repas input:checked")];
  if (choisis.length === 0) return;
  let total = 0;
  choisis.forEach((c) => {
    const [date, moment] = c.value.split("|");
    total += envoyerAuxCourses(date, moment);
  });
  fermerFeuilleCoursesRepas();
  afficherRepas();
  afficherCourses();
  montrerPetitMessage(`${choisis.length} repas ajouté${choisis.length > 1 ? "s" : ""} aux courses 🌱`);
});

// ---------- 7. L'onglet Carnet ----------

let rechercheCarnet = "";
let filtreCarnet = { categorie: "", sorte: "" }; // sorte : "test", "aimes", "poisson"

document.getElementById("recherche-recettes").addEventListener("input", (e) => {
  rechercheCarnet = e.target.value.trim().toLowerCase();
  afficherCarnet();
});

document.getElementById("filtrer-recettes").addEventListener("click", () => {
  const zone = document.getElementById("filtres-recettes");
  zone.hidden = !zone.hidden;
});

function afficherFiltresCarnet() {
  const zone = document.getElementById("filtres-recettes");
  zone.replaceChildren();
  const ajouterPastille = (texte, actif, quandOnTouche) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille-temps");
    bouton.classList.toggle("choisie", actif);
    bouton.textContent = texte;
    bouton.addEventListener("click", quandOnTouche);
    zone.appendChild(bouton);
  };
  CATEGORIES_RECETTE.forEach((c) =>
    ajouterPastille(c, filtreCarnet.categorie === c, () => {
      filtreCarnet.categorie = filtreCarnet.categorie === c ? "" : c;
      afficherCarnet();
    }),
  );
  [["test", "À tester"], ["aimes", "Aimés"], ["poisson", "Poisson"]].forEach(([code, texte]) =>
    ajouterPastille(texte, filtreCarnet.sorte === code, () => {
      filtreCarnet.sorte = filtreCarnet.sorte === code ? "" : code;
      afficherCarnet();
    }),
  );
}

function recetteVisible(r) {
  if (rechercheCarnet && !`${r.nom} ${r.proteine} ${r.ingredients}`.toLowerCase().includes(rechercheCarnet)) return false;
  if (filtreCarnet.categorie && r.categorie !== filtreCarnet.categorie) return false;
  if (filtreCarnet.sorte === "test" && !aTester(r)) return false;
  if (filtreCarnet.sorte === "aimes" && !(r.etoiles >= 4 || r.refaire === "oui")) return false;
  if (filtreCarnet.sorte === "poisson" && !avecDuPoisson(r)) return false;
  return true;
}

// La famille d'une protéine : une couleur et une icône pour s'y retrouver d'un coup d'œil
const FAMILLES_PROTEINE = [
  { code: "poulet", motif: /poulet|volaille|dinde/i, icone: "drumstick", couleur: "#E8C66A" },
  { code: "boeuf", motif: /b(œ|oe)uf|steak|veau/i, icone: "beef", couleur: "#D98B6A" },
  { code: "porc", motif: /porc|lardon|bacon|jambon|chorizo|saucisse/i, icone: "ham", couleur: "#E6A9A0" },
  { code: "poisson", motif: /poisson|saumon|thon|crevette|moule/i, icone: "fish", couleur: "#9CC0C4" },
  { code: "oeuf", motif: /(œ|oe)uf/i, icone: "egg", couleur: "#F0D58C" },
  { code: "vege", motif: /végé|vege/i, icone: "leaf", couleur: "#9DBB9F" },
];

function familleDe(recette) {
  return (
    FAMILLES_PROTEINE.find((f) => f.motif.test(recette.proteine || "")) ||
    (recette.categorie === "Dessert" ? { code: "dessert", icone: "cake-slice", couleur: "#D7B8D6" } : null) ||
    (recette.categorie === "Petit-déjeuner" ? { code: "matin", icone: "croissant", couleur: "#EBC9A0" } : null) ||
    { code: "autre", icone: "utensils", couleur: "#D9CBB6" }
  );
}

const TRIS_CARNET = [
  ["nom", "De A à Z"],
  ["note", "Les mieux notées"],
  ["temps", "Les plus rapides"],
  ["test", "À tester d'abord"],
];
let triCarnet = "nom";
if (!repas.reglages.vueCarnet) repas.reglages.vueCarnet = "cartes";

function trierRecettes(liste) {
  const parNom = (a, b) => a.nom.localeCompare(b.nom, "fr");
  return liste.sort((a, b) => {
    if (triCarnet === "note") return (b.etoiles || 0) - (a.etoiles || 0) || parNom(a, b);
    if (triCarnet === "temps") return (a.temps || 999) - (b.temps || 999) || parNom(a, b);
    if (triCarnet === "test") return Number(aTester(b)) - Number(aTester(a)) || parNom(a, b);
    return parNom(a, b);
  });
}

document.getElementById("tri-carnet").addEventListener("change", (e) => {
  triCarnet = e.target.value;
  afficherCarnet();
});
document.querySelectorAll("[data-vue-carnet]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    repas.reglages.vueCarnet = bouton.dataset.vueCarnet;
    sauvegarderRepas();
    afficherCarnet();
  });
});

function creerCarteRecette(r) {
  const famille = familleDe(r);
  const carte = document.createElement("button");
  carte.type = "button";
  carte.classList.add("carte-recette");
  carte.style.setProperty("--couleur-recette", famille.couleur);
  const bandeau = document.createElement("span");
  bandeau.classList.add("carte-recette-bandeau");
  bandeau.appendChild(creerIcone(famille.icone));
  if (r.etoiles) bandeau.appendChild(creerPastilleRepas(`${String(r.etoiles).replace(".", ",")}/5`, "note"));
  else if (aTester(r)) bandeau.appendChild(creerPastilleRepas("à tester", "test"));
  const nom = document.createElement("span");
  nom.classList.add("carte-recette-nom");
  nom.textContent = r.nom;
  const detail = document.createElement("span");
  detail.classList.add("carte-recette-detail");
  detail.textContent = [r.temps ? `${r.temps} min` : "", r.proteine].filter(Boolean).join(" · ");
  carte.append(bandeau, nom, detail);
  carte.addEventListener("click", () => ouvrirFicheRecette(r.id));
  return carte;
}

function creerLigneRecette(r) {
  const famille = familleDe(r);
  const ligne = document.createElement("button");
  ligne.type = "button";
  ligne.classList.add("ligne-recette");
  ligne.style.setProperty("--couleur-recette", famille.couleur);
  const pastille = document.createElement("span");
  pastille.classList.add("ligne-recette-icone");
  pastille.appendChild(creerIcone(famille.icone));
  const nom = document.createElement("span");
  nom.classList.add("ligne-recette-nom");
  nom.textContent = r.nom;
  const detail = document.createElement("span");
  detail.classList.add("sous-titre", "petit");
  detail.textContent = [r.proteine, r.temps ? `${r.temps} min` : ""].filter(Boolean).join(" · ");
  const texte = document.createElement("span");
  texte.classList.add("ligne-recette-texte");
  texte.append(nom, detail);
  const droite = document.createElement("span");
  droite.classList.add("ligne-repas-pastilles");
  if (r.etoiles) droite.appendChild(creerPastilleRepas(`${String(r.etoiles).replace(".", ",")}/5`, "note"));
  else if (aTester(r)) droite.appendChild(creerPastilleRepas("à tester", "test"));
  ligne.append(pastille, texte, droite);
  ligne.addEventListener("click", () => ouvrirFicheRecette(r.id));
  return ligne;
}

// Les chapitres du carnet, dans l'ordre du sommaire de ton PDF
const CHAPITRES_CARNET = ["Volaille", "Bœuf", "Porc & saucisses", "Poisson & mer", "Œufs & végétarien", "Cheat meals", "Desserts", "Petits-déjeuners"];

function chapitreDe(r) {
  if (r.categorie === "Cheat meal") return "Cheat meals";
  if (r.categorie === "Dessert") return "Desserts";
  if (r.categorie === "Petit-déjeuner") return "Petits-déjeuners";
  const code = familleDe(r).code;
  return { poulet: "Volaille", boeuf: "Bœuf", porc: "Porc & saucisses", poisson: "Poisson & mer" }[code] || "Œufs & végétarien";
}

// Le petit brin de feuilles sauge, comme dans le carnet
function creerBrin() {
  const brin = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  brin.setAttribute("viewBox", "0 0 80 20");
  brin.setAttribute("aria-hidden", "true");
  brin.classList.add("brin");
  brin.innerHTML =
    '<path d="M4 14 H76" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    [14, 28, 42, 56].map((x) => `<ellipse cx="${x}" cy="8" rx="4" ry="7" transform="rotate(25 ${x} 8)" fill="currentColor"/>`).join("") +
    '<ellipse cx="70" cy="12" rx="6" ry="3" fill="currentColor"/>';
  return brin;
}

const NOMS_CATEGORIES = { Plat: "Plats", "Cheat meal": "Repas plaisir", Dessert: "Desserts", "Petit-déjeuner": "Petits-déjeuners" };

function afficherCarnet() {
  afficherFiltresCarnet();
  const vue = repas.reglages.vueCarnet;
  document.querySelectorAll("[data-vue-carnet]").forEach((b) => b.classList.toggle("choisie", b.dataset.vueCarnet === vue));
  const zone = document.getElementById("liste-recettes");
  zone.replaceChildren();
  const visibles = trierRecettes(repas.recettes.filter(recetteVisible));
  document.getElementById("carnet-compte").textContent =
    `${visibles.length} recette${visibles.length > 1 ? "s" : ""}${visibles.length !== repas.recettes.length ? ` sur ${repas.recettes.length}` : ""}`;
  if (visibles.length === 0) {
    zone.appendChild(creerMessageVide("Aucune recette ne correspond."));
    return;
  }
  // Un chapitre par famille, comme le sommaire du carnet
  CHAPITRES_CARNET.forEach((nomChapitre) => {
    const recettes = visibles.filter((r) => chapitreDe(r) === nomChapitre);
    if (recettes.length === 0) return;
    const chapitre = document.createElement("details");
    chapitre.classList.add("chapitre-carnet");
    chapitre.open = true;
    const titre = document.createElement("summary");
    const nom = document.createElement("span");
    nom.textContent = nomChapitre;
    const nombre = document.createElement("span");
    nombre.classList.add("chapitre-nombre");
    nombre.textContent = recettes.length;
    titre.append(nom, nombre);
    const contenu = document.createElement("div");
    contenu.classList.add(vue === "cartes" ? "grille-recettes" : "carte");
    recettes.forEach((r) => contenu.appendChild(vue === "cartes" ? creerCarteRecette(r) : creerLigneRecette(r)));
    chapitre.append(titre, contenu);
    zone.appendChild(chapitre);
  });
}

// La fiche d'une recette
const feuilleRecette = document.getElementById("feuille-recette");
let recetteOuverte = null;

let portionsFiche = 2;

function ouvrirFicheRecette(id) {
  recetteOuverte = id;
  const r = recetteDe(id);
  portionsFiche = (r && r.portions) || repas.reglages.personnes;
  afficherFicheRecette();
  feuilleRecette.hidden = false;
  voile.hidden = false;
}

function fermerFicheRecette() {
  feuilleRecette.hidden = true;
  voile.hidden = true;
  recetteOuverte = null;
}
document.getElementById("fermer-recette").addEventListener("click", fermerFicheRecette);
voile.addEventListener("click", () => {
  if (!feuilleRecette.hidden) fermerFicheRecette();
});

function creerSectionRecette(titre, contenu, ouverte) {
  const section = document.createElement("details");
  section.classList.add("section-loisir");
  section.open = ouverte;
  const resume = document.createElement("summary");
  resume.textContent = titre;
  section.append(resume, contenu);
  return section;
}

function afficherFicheRecette() {
  const r = recetteDe(recetteOuverte);
  if (!r) return;
  document.getElementById("recette-titre").textContent = "";
  const zone = document.getElementById("recette-contenu");
  zone.replaceChildren();

  const famille = familleDe(r);
  feuilleRecette.style.setProperty("--couleur-recette", famille.couleur);

  // L'en-tête de la page : les étiquettes, le titre, le brin de feuilles
  const etiquettes = document.createElement("div");
  etiquettes.classList.add("fiche-etiquettes");
  const categorie = document.createElement("span");
  categorie.classList.add("fiche-etiquette", "fiche-etiquette-pleine");
  categorie.textContent = r.categorie || "Plat";
  etiquettes.appendChild(categorie);
  if (r.proteine) {
    const proteine = document.createElement("span");
    proteine.classList.add("fiche-etiquette");
    proteine.textContent = r.proteine;
    etiquettes.appendChild(proteine);
  }
  if (aTester(r)) {
    const test = document.createElement("span");
    test.classList.add("fiche-etiquette", "fiche-etiquette-test");
    test.textContent = "À tester";
    etiquettes.appendChild(test);
  }
  const titre = document.createElement("h2");
  titre.classList.add("fiche-titre");
  titre.textContent = r.nom;
  const separateur = document.createElement("div");
  separateur.classList.add("fiche-separateur");
  separateur.appendChild(creerBrin());
  zone.append(etiquettes, titre, separateur);

  // Temps, portions (réglables), prix
  const infos = document.createElement("div");
  infos.classList.add("fiche-infos");
  const ajouterInfo = (icone, texte) => {
    const info = document.createElement("span");
    info.classList.add("fiche-info");
    info.append(creerIcone(icone), texte);
    infos.appendChild(info);
    return info;
  };
  if (r.temps) ajouterInfo("clock", `${r.temps} min`);
  const infoPortions = ajouterInfo("circle-dot", "");
  infoPortions.classList.add("fiche-portions");
  const moins = document.createElement("button");
  moins.type = "button";
  moins.classList.add("fiche-plus-moins");
  moins.setAttribute("aria-label", "Une portion de moins");
  moins.textContent = "−";
  moins.addEventListener("click", () => {
    portionsFiche = Math.max(1, portionsFiche - 1);
    afficherFicheRecette();
  });
  const combien = document.createElement("span");
  combien.textContent = `${portionsFiche} portion${portionsFiche > 1 ? "s" : ""}`;
  const plus = document.createElement("button");
  plus.type = "button";
  plus.classList.add("fiche-plus-moins");
  plus.setAttribute("aria-label", "Une portion de plus");
  plus.textContent = "+";
  plus.addEventListener("click", () => {
    portionsFiche += 1;
    afficherFicheRecette();
  });
  infoPortions.append(moins, combien, plus);
  // Le prix se modifie directement ici
  const infoPrix = document.createElement("label");
  infoPrix.classList.add("fiche-info", "fiche-prix");
  const champPrix = document.createElement("input");
  champPrix.type = "number";
  champPrix.inputMode = "numeric";
  champPrix.min = "0";
  champPrix.value = r.prix || "";
  champPrix.setAttribute("aria-label", "Prix de la recette en francs");
  champPrix.addEventListener("change", () => {
    r.prix = Number(champPrix.value) || null;
    sauvegarderRepas();
  });
  infoPrix.append("Prix", champPrix, "F");
  infos.appendChild(infoPrix);
  zone.appendChild(infos);

  const boutons = document.createElement("div");
  boutons.classList.add("envie-boutons");
  boutons.append(
    creerBoutonEnvie("Je cuisine", () => {
      fermerFicheRecette();
      ouvrirModeCuisine(r.id, portionsFiche, null);
    }, true),
    creerBoutonEnvie("Modifier", () => {
      fermerFicheRecette();
      ouvrirFormRecette(r);
    }),
  );
  zone.appendChild(boutons);

  // Les ingrédients (adaptés aux portions), et les notes en dessous, comme dans le carnet
  const facteur = portionsFiche / (r.portions || portionsFiche);
  const colonnes = document.createElement("div");
  colonnes.classList.add("fiche-colonnes");
  if (lignes(r.ingredients).length || r.notes) {
    const bloc = document.createElement("section");
    bloc.classList.add("fiche-ingredients");
    const titreIngredients = document.createElement("h3");
    titreIngredients.textContent = "Ingrédients";
    const liste = document.createElement("ul");
    liste.classList.add("liste-ingredients");
    lignes(r.ingredients).forEach((l) => {
      const li = document.createElement("li");
      li.textContent = ligneAdaptee(l, facteur);
      liste.appendChild(li);
    });
    bloc.append(titreIngredients, liste);
    if (Math.abs(facteur - 1) > 0.01) {
      const recalcule = document.createElement("p");
      recalcule.classList.add("fiche-recalcule");
      recalcule.textContent = `Écrite pour ${r.portions} portions, quantités recalculées.`;
      bloc.appendChild(recalcule);
    }
    if (r.notes) {
      const notes = document.createElement("p");
      notes.classList.add("fiche-notes-texte");
      notes.textContent = r.notes;
      bloc.appendChild(notes);
    }
    colonnes.appendChild(bloc);
  }
  zone.appendChild(colonnes);

  // La préparation, avec de gros numéros
  if (lignes(r.etapes).length) {
    const bloc = document.createElement("section");
    bloc.classList.add("fiche-preparation");
    const titre = document.createElement("h3");
    titre.textContent = "Préparation";
    const liste = document.createElement("ol");
    liste.classList.add("liste-etapes");
    lignes(r.etapes).forEach((l) => {
      const li = document.createElement("li");
      li.textContent = l;
      liste.appendChild(li);
    });
    bloc.append(titre, liste);
    colonnes.appendChild(bloc);
  }

  // Notre avis
  const avis = document.createElement("section");
  avis.classList.add("fiche-avis");
  const enteteAvis = document.createElement("div");
  enteteAvis.classList.add("fiche-avis-entete");
  const titreAvis = document.createElement("h3");
  titreAvis.textContent = "Notre avis";
  const etoiles = document.createElement("span");
  etoiles.classList.add("fiche-etoiles");
  etoiles.setAttribute("aria-label", r.etoiles ? `${r.etoiles} sur 5` : "Pas encore notée");
  for (let i = 1; i <= 5; i++) {
    const etoile = document.createElement("span");
    etoile.textContent = "★";
    etoile.classList.toggle("allumee", (r.etoiles || 0) >= i - 0.5);
    etoiles.appendChild(etoile);
  }
  enteteAvis.append(titreAvis, etoiles);
  const champs = document.createElement("div");
  champs.classList.add("fiche-avis-champs");
  const ajouterChamp = (texte, element) => {
    const champ = document.createElement("label");
    champ.classList.add("fiche-avis-champ");
    const etiquette = document.createElement("span");
    etiquette.textContent = texte;
    champ.append(etiquette, element);
    champs.appendChild(champ);
  };
  ajouterChamp("Note /5", creerChoixNote(r, () => {
    afficherCarnet();
    afficherFicheRecette();
  }));
  const derniere = document.createElement("input");
  derniere.type = "date";
  derniere.classList.add("champ-note");
  derniere.value = r.derniere || "";
  derniere.addEventListener("change", () => {
    r.derniere = derniere.value;
    sauvegarderRepas();
    afficherRepas();
    afficherFicheRecette();
  });
  ajouterChamp("Dernière fois", derniere);
  const titreRefaire = document.createElement("span");
  titreRefaire.classList.add("fiche-avis-etiquette");
  titreRefaire.textContent = "À refaire ?";
  avis.append(enteteAvis, champs, titreRefaire, creerChoixRefaire(r, afficherFicheRecette));
  zone.appendChild(avis);



  const supprimer = document.createElement("button");
  supprimer.type = "button";
  supprimer.classList.add("lien", "lien-vider-repas");
  supprimer.textContent = "Retirer du carnet";
  supprimer.addEventListener("click", () => {
    agirAvecAnnuler({
      tiroir: repas,
      message: `« ${r.nom} » retirée du carnet`,
      action: () => {
        repas.recettes = repas.recettes.filter((x) => x.id !== r.id);
      },
      apres: () => {
        sauvegarderRepas();
        afficherRepas();
      },
    });
    fermerFicheRecette();
  });
  zone.appendChild(supprimer);
}

// Ajouter ou modifier une recette (seul le nom est obligatoire)
const feuilleFormRecette = document.getElementById("feuille-form-recette");
const formRecette = document.getElementById("form-recette");
let recetteEnModification = null;

function ouvrirFormRecette(recette) {
  recetteEnModification = recette;
  document.getElementById("form-recette-titre").textContent = recette ? "Modifier la recette" : "Nouvelle recette";
  const r = recette || { nom: "", categorie: "Plat", proteine: "", temps: "", portions: repas.reglages.personnes * 2, ingredients: "", etapes: "", notes: "", prix: "" };
  formRecette.elements["recette-nom"].value = r.nom;
  formRecette.elements["recette-categorie"].value = r.categorie;
  formRecette.elements["recette-proteine"].value = r.proteine;
  formRecette.elements["recette-temps"].value = r.temps || "";
  formRecette.elements["recette-portions"].value = r.portions || "";
  formRecette.elements["recette-prix"].value = r.prix || "";
  formRecette.elements["recette-ingredients"].value = r.ingredients;
  formRecette.elements["recette-etapes"].value = r.etapes;
  formRecette.elements["recette-notes"].value = r.notes;
  feuilleFormRecette.hidden = false;
  voile.hidden = false;
}

function fermerFormRecette() {
  feuilleFormRecette.hidden = true;
  voile.hidden = true;
  recetteEnModification = null;
}
document.getElementById("fermer-form-recette").addEventListener("click", fermerFormRecette);
voile.addEventListener("click", () => {
  if (!feuilleFormRecette.hidden) fermerFormRecette();
});
document.getElementById("nouvelle-recette").addEventListener("click", () => ouvrirFormRecette(null));

formRecette.addEventListener("submit", (e) => {
  e.preventDefault();
  const champ = (nom) => formRecette.elements[nom].value.trim();
  const donnees = {
    nom: champ("recette-nom"),
    categorie: champ("recette-categorie"),
    proteine: champ("recette-proteine"),
    temps: Number(champ("recette-temps")) || null,
    portions: Number(champ("recette-portions")) || null,
    prix: Number(champ("recette-prix")) || null,
    ingredients: champ("recette-ingredients"),
    etapes: champ("recette-etapes"),
    notes: champ("recette-notes"),
  };
  if (!donnees.nom) return;
  let id;
  if (recetteEnModification) {
    Object.assign(recetteEnModification, donnees);
    id = recetteEnModification.id;
  } else {
    id = String(nouvelId());
    repas.recettes.push({ id, ...donnees, etoiles: 0, refaire: "", derniere: "" });
  }
  sauvegarderRepas();
  fermerFormRecette();
  afficherRepas();
  ouvrirFicheRecette(id);
  montrerPetitMessage("Recette enregistrée 🌱");
});

// ---------- 8. Le mode cuisine ----------
// Un écran plein, très lisible : les ingrédients d'abord, puis une étape à la fois.
// Les durées écrites dans une étape (« 10 à 12 min », « 2 h 30 ») deviennent des minuteurs.

const ecranCuisine = document.getElementById("mode-cuisine");
let cuisine = null; // { recetteId, portions, repas: { date, moment }, etape: -1 (ingrédients) … }
let verrouEcran = null;
let minuteurs = []; // [{ id, texte, fin (timestamp), sonne }]

async function garderEcranAllume() {
  try {
    if ("wakeLock" in navigator) verrouEcran = await navigator.wakeLock.request("screen");
  } catch (erreur) {
    verrouEcran = null; // pas grave : l'écran s'éteindra comme d'habitude
  }
}

function ouvrirModeCuisine(recetteId, portions, leRepas) {
  cuisine = { recetteId, portions, repas: leRepas, etape: -1, coches: {} };
  ecranCuisine.hidden = false;
  document.body.classList.add("en-cuisine");
  garderEcranAllume();
  afficherModeCuisine();
}

function fermerModeCuisine() {
  ecranCuisine.hidden = true;
  document.body.classList.remove("en-cuisine");
  if (verrouEcran) verrouEcran.release().catch(() => {});
  verrouEcran = null;
  cuisine = null;
}
document.getElementById("fermer-cuisine").addEventListener("click", fermerModeCuisine);

// Si on revient sur l'appli, on redemande à garder l'écran allumé
document.addEventListener("visibilitychange", () => {
  if (cuisine && document.visibilityState === "visible") garderEcranAllume();
});

// Adapter les quantités au nombre de portions (seulement le nombre en début de ligne)
function ligneAdaptee(ligne, facteur) {
  if (Math.abs(facteur - 1) < 0.01) return ligne;
  const motif = /(?<![\d.,/])(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)(?![\d.,/])(?!\s*(?:%|°|cm|x\b|min|h\b|kcal))/g;
  return ligne.replace(motif, (nombre) => {
    const valeur = lireNombre(nombre) * facteur;
    if (valeur < 1) return ecrireMesure(valeur, "pièce").quantite;
    // Des chiffres ronds : 208 g → 210 g ; 13,4 → 13 ; 2,3 → 2,5
    const arrondi = valeur >= 100 ? Math.round(valeur / 5) * 5 : valeur >= 10 ? Math.round(valeur) : Math.round(valeur * 2) / 2;
    return String(arrondi).replace(".", ",");
  });
}

// Les durées d'une étape, en minutes
function dureesDe(texte) {
  const durees = [];
  const motif = /(\d+(?:[.,]\d+)?)(?:\s*(?:à|-)\s*\d+(?:[.,]\d+)?)?\s*(h|heures?|min|minutes?)\b(?:\s*(\d+))?/gi;
  let trouve;
  while ((trouve = motif.exec(texte))) {
    const nombre = lireNombre(trouve[1]);
    const enHeures = /^h/i.test(trouve[2]);
    const reste = trouve[3] ? Number(trouve[3]) : 0;
    const minutes = enHeures ? nombre * 60 + reste : nombre + reste / 60;
    if (minutes > 0 && minutes <= 600 && !durees.includes(minutes)) durees.push(minutes);
  }
  return durees.slice(0, 2);
}

function texteDuree(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h} h ${m}` : `${h} h`;
  }
  const entieres = Math.floor(minutes);
  const secondes = Math.round((minutes - entieres) * 60);
  return secondes ? `${entieres} min ${secondes}` : `${entieres} min`;
}

function lancerMinuteur(minutes, texte) {
  minuteurs.push({ id: nouvelId(), texte, fin: Date.now() + minutes * 60000, sonne: false });
  afficherMinuteurs();
  montrerPetitMessage(`Minuteur lancé : ${texteDuree(minutes)}`);
}

// Un petit « ding » doux, sans fichier son
function sonner() {
  try {
    const contexte = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((decalage) => {
      const oscillateur = contexte.createOscillator();
      const volume = contexte.createGain();
      oscillateur.frequency.value = 880;
      volume.gain.setValueAtTime(0.25, contexte.currentTime + decalage);
      volume.gain.exponentialRampToValueAtTime(0.001, contexte.currentTime + decalage + 0.3);
      oscillateur.connect(volume).connect(contexte.destination);
      oscillateur.start(contexte.currentTime + decalage);
      oscillateur.stop(contexte.currentTime + decalage + 0.3);
    });
  } catch (erreur) {
    // pas de son possible : la vibration et le message suffisent
  }
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}

function afficherMinuteurs() {
  const zone = document.getElementById("cuisine-minuteurs");
  zone.replaceChildren();
  minuteurs.forEach((m) => {
    const restant = Math.max(0, Math.round((m.fin - Date.now()) / 1000));
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("minuteur");
    bouton.classList.toggle("minuteur-fini", restant === 0);
    const minutes = Math.floor(restant / 60);
    const secondes = String(restant % 60).padStart(2, "0");
    bouton.textContent = restant === 0 ? `${m.texte} : c'est prêt` : `${m.texte} · ${minutes}:${secondes}`;
    bouton.setAttribute("aria-label", "Arrêter ce minuteur");
    bouton.addEventListener("click", () => {
      minuteurs = minuteurs.filter((x) => x.id !== m.id);
      afficherMinuteurs();
    });
    zone.appendChild(bouton);
  });
  zone.hidden = minuteurs.length === 0;
}

setInterval(() => {
  if (minuteurs.length === 0) return;
  minuteurs.forEach((m) => {
    if (!m.sonne && Date.now() >= m.fin) {
      m.sonne = true;
      sonner();
      montrerPetitMessage(`${m.texte} : c'est prêt 🌱`);
    }
  });
  afficherMinuteurs();
}, 1000);

function afficherModeCuisine() {
  const r = recetteDe(cuisine.recetteId);
  if (!r) return;
  const etapes = lignes(r.etapes);
  const facteur = cuisine.portions / (r.portions || cuisine.portions);
  document.getElementById("cuisine-titre").textContent = r.nom;
  const zone = document.getElementById("cuisine-contenu");
  zone.replaceChildren();

  // Le fil des étapes : ingrédients, 1, 2, 3…, fini
  const fil = document.getElementById("cuisine-fil");
  fil.replaceChildren();
  for (let i = -1; i <= etapes.length; i++) {
    const point = document.createElement("span");
    point.classList.add("fil-point");
    point.classList.toggle("fil-fait", i < cuisine.etape);
    point.classList.toggle("fil-actuel", i === cuisine.etape);
    fil.appendChild(point);
  }

  if (cuisine.etape === -1) {
    // Les ingrédients, à cocher en les sortant
    const portions = document.createElement("div");
    portions.classList.add("cuisine-portions");
    const moins = document.createElement("button");
    moins.type = "button";
    moins.classList.add("bouton-rond");
    moins.setAttribute("aria-label", "Une portion de moins");
    moins.appendChild(creerIcone("minus"));
    moins.addEventListener("click", () => {
      cuisine.portions = Math.max(1, cuisine.portions - 1);
      afficherModeCuisine();
    });
    const texte = document.createElement("span");
    texte.textContent = `${cuisine.portions} portion${cuisine.portions > 1 ? "s" : ""}`;
    const plus = document.createElement("button");
    plus.type = "button";
    plus.classList.add("bouton-rond");
    plus.setAttribute("aria-label", "Une portion de plus");
    plus.appendChild(creerIcone("plus"));
    plus.addEventListener("click", () => {
      cuisine.portions += 1;
      afficherModeCuisine();
    });
    portions.append(moins, texte, plus);

    const titre = document.createElement("h2");
    titre.textContent = "On sort les ingrédients";
    const liste = document.createElement("div");
    lignes(r.ingredients).forEach((ligne, i) => {
      const label = document.createElement("label");
      label.classList.add("cuisine-ingredient");
      const caseACocher = document.createElement("input");
      caseACocher.type = "checkbox";
      caseACocher.checked = !!cuisine.coches[i];
      caseACocher.addEventListener("change", () => (cuisine.coches[i] = caseACocher.checked));
      label.append(caseACocher, ligneAdaptee(ligne, facteur));
      liste.appendChild(label);
    });
    zone.append(portions, titre, liste);
    if (etapes.length === 0) zone.appendChild(creerMessageVide("Pas d'étapes notées pour cette recette."));
  } else if (cuisine.etape < etapes.length) {
    // Une étape, en grand
    const numero = document.createElement("p");
    numero.classList.add("cuisine-numero");
    numero.textContent = `Étape ${cuisine.etape + 1} sur ${etapes.length}`;
    const texte = document.createElement("p");
    texte.classList.add("cuisine-etape");
    texte.textContent = etapes[cuisine.etape];
    zone.append(numero, texte);
    const durees = dureesDe(etapes[cuisine.etape]);
    if (durees.length) {
      const boutons = document.createElement("div");
      boutons.classList.add("envie-boutons");
      durees.forEach((minutes) =>
        boutons.appendChild(
          creerBoutonEnvie(`Minuteur ${texteDuree(minutes)}`, () => lancerMinuteur(minutes, `Étape ${cuisine.etape + 1}`)),
        ),
      );
      zone.appendChild(boutons);
    }
  } else {
    // C'est fini
    const fin = document.createElement("h2");
    fin.textContent = "C'est prêt, bon appétit 🌱";
    zone.appendChild(fin);
    if (cuisine.repas) {
      const leRepas = repasDu(cuisine.repas.date, cuisine.repas.moment);
      if (leRepas && !leRepas.fait) {
        leRepas.fait = true;
        r.derniere = cuisine.repas.date;
        sauvegarderRepas();
        afficherRepas();
      }
    } else if (r.derniere !== aujourdhuiEnTexte()) {
      r.derniere = aujourdhuiEnTexte();
      sauvegarderRepas();
      afficherRepas();
    }
    const etiquette = document.createElement("p");
    etiquette.classList.add("etiquette");
    etiquette.textContent = "Tu notes le plat ? (plus tard, c'est bien aussi)";
    zone.append(etiquette, creerChoixNote(r, afficherRepas), creerChoixRefaire(r, afficherModeCuisine));
  }

  document.getElementById("cuisine-precedent").hidden = cuisine.etape === -1;
  const suivant = document.getElementById("cuisine-suivant");
  suivant.hidden = cuisine.etape >= etapes.length;
  suivant.textContent = cuisine.etape === -1 ? "C'est parti" : cuisine.etape === etapes.length - 1 ? "J'ai fini" : "Étape suivante";
  afficherMinuteurs();
}

document.getElementById("cuisine-suivant").addEventListener("click", () => {
  cuisine.etape += 1;
  afficherModeCuisine();
});
document.getElementById("cuisine-precedent").addEventListener("click", () => {
  cuisine.etape = Math.max(-1, cuisine.etape - 1);
  afficherModeCuisine();
});

// ---------- 9. La carte « Ce soir » et le résumé du Foyer ----------

function afficherCarteRepas() {
  const carte = document.querySelector('[data-carte="repas"]');
  const zone = document.getElementById("accueil-repas");
  zone.replaceChildren();
  const aujourdhui = aujourdhuiEnTexte();
  // Le prochain repas de la journée : le matin avant 10 h, le midi avant 14 h, sinon le soir
  const heure = new Date().getHours();
  const dejaPasses = heure >= 14 ? ["matin", "midi"] : heure >= 10 ? ["matin"] : [];
  const prevus = momentsDu(aujourdhui)
    .filter((moment) => !dejaPasses.includes(moment))
    .map((moment) => ({ moment, leRepas: repasDu(aujourdhui, moment) }))
    .filter((x) => !repasVide(x.leRepas) && !x.leRepas.fait);
  carte.dataset.vide = prevus.length === 0 ? "true" : "false";
  const titres = { matin: "Ce matin", midi: "Ce midi", soir: "Ce soir" };
  document.getElementById("titre-carte-repas").textContent = prevus.length ? titres[prevus[0].moment] : "Ce soir";
  prevus.slice(0, 1).forEach(({ moment, leRepas }) => {
    const nom = document.createElement("p");
    nom.classList.add("repas-prevu-nom");
    nom.textContent = nomDuRepas(leRepas);
    zone.appendChild(nom);
    if (leRepas.gamelle && leRepas.type === "cuisine") {
      const gamelle = document.createElement("p");
      gamelle.classList.add("sous-titre", "petit");
      gamelle.textContent = "+ une gamelle pour demain midi";
      zone.appendChild(gamelle);
    }
    const recette = recetteDe(leRepas.recetteId);
    if (leRepas.type === "cuisine") {
      const boutons = document.createElement("div");
      boutons.classList.add("envie-boutons");
      if (recette) {
        boutons.appendChild(
          creerBoutonEnvie("Je cuisine", (e) => {
            e.stopPropagation();
            ouvrirModeCuisine(recette.id, portionsDu(leRepas), { date: aujourdhui, moment });
          }, true),
        );
      }
      boutons.appendChild(
        creerBoutonEnvie("Changement de plan", (e) => {
          e.stopPropagation();
          ouvrirChangementDePlan(aujourdhui, moment);
        }),
      );
      zone.appendChild(boutons);
    }
  });
  if (typeof placerCartesAccueil === "function") placerCartesAccueil();
}

function afficherResumeRepas() {
  const ceSoir = repasDu(aujourdhuiEnTexte(), "soir");
  document.getElementById("foyer-repas-resume").textContent = repasVide(ceSoir)
    ? "Ton menu de la semaine et ton carnet"
    : `Ce soir : ${nomDuRepas(ceSoir)}`;
  document.getElementById("repas-resume").textContent = `${repas.recettes.length} recettes dans ton carnet`;
}

// ---------- 9 bis. Changement de plan (la flemme, des restes, on commande…) ----------
// Pas de culpabilité : on remplace le repas du jour, et le plat prévu glisse au prochain soir libre.

const feuilleChangement = document.getElementById("feuille-changement");
let changementOuvert = null; // { date, moment }

function ouvrirChangementDePlan(date, moment) {
  changementOuvert = { date, moment };
  const leRepas = repasDu(date, moment);
  document.getElementById("changement-garder-texte").textContent = `Garder « ${nomDuRepas(leRepas)} » en réserve pour un autre jour`;
  document.getElementById("changement-garder").checked = true;
  feuilleChangement.hidden = false;
  voile.hidden = false;
}

function fermerChangementDePlan() {
  feuilleChangement.hidden = true;
  voile.hidden = true;
  changementOuvert = null;
}
document.getElementById("fermer-changement").addEventListener("click", fermerChangementDePlan);
voile.addEventListener("click", () => {
  if (!feuilleChangement.hidden) fermerChangementDePlan();
});

document.querySelectorAll("[data-changement]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    if (!changementOuvert) return;
    const { date, moment } = changementOuvert;
    const sorte = bouton.dataset.changement;
    const garder = document.getElementById("changement-garder").checked;
    let message = "C'est noté, bonne soirée 🌙";
    const copie = JSON.stringify(repas); // pour pouvoir annuler
    const prevu = repas.jours[date][moment];
    // Le plat prévu attend dans la réserve, pour le replacer quand on veut
    if (garder && prevu && prevu.recetteId) {
      if (!repas.reserve.includes(prevu.recetteId)) repas.reserve.push(prevu.recetteId);
      message = `C'est noté. « ${nomDuRepas(prevu)} » t'attend dans la réserve 🌙`;
    }
    repas.jours[date][moment] = { ...nouveauRepas(date, moment), type: sorte, gamelle: false };
    sauvegarderRepas();
    afficherRepas();
    montrerPetitMessage(message, () => {
      remettreCommeAvant(repas, copie);
      sauvegarderRepas();
      afficherRepas();
    });
    fermerChangementDePlan();
  });
});

// ---------- 10. Les réglages ----------

function afficherReglagesRepas() {
  const r = repas.reglages;
  document.getElementById("repas-personnes").value = r.personnes;
  document.getElementById("repas-riz-max").value = r.rizMax;
  document.getElementById("repas-poisson").value = r.poissonParMois;
  document.getElementById("repas-dimanche-midi").checked = r.dimancheMidi;
  document.getElementById("ligne-dimanche-midi").hidden = r.moments.midi;
  const zoneMoments = document.getElementById("repas-moments");
  zoneMoments.replaceChildren();
  MOMENTS_REPAS.forEach(([code, nom]) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille-temps");
    bouton.classList.toggle("choisie", r.moments[code]);
    bouton.textContent = nom;
    bouton.addEventListener("click", () => {
      const autres = MOMENTS_REPAS.filter(([c]) => c !== code && r.moments[c]);
      if (r.moments[code] && autres.length === 0) {
        montrerPetitMessage("Garde au moins un repas à prévoir");
        return;
      }
      r.moments[code] = !r.moments[code];
      sauvegarderRepas();
      afficherReglagesRepas();
      afficherRepas();
    });
    zoneMoments.appendChild(bouton);
  });
  ["gamelle", "plaisir"].forEach((sorte) => {
    const zone = document.getElementById(`repas-jours-${sorte}`);
    zone.replaceChildren();
    [1, 2, 3, 4, 5, 6, 0].forEach((jour) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.classList.add("pastille-temps");
      bouton.classList.toggle("choisie", r[sorte].includes(jour));
      bouton.textContent = NOMS_JOURS_COURTS[jour];
      bouton.addEventListener("click", () => {
        r[sorte] = r[sorte].includes(jour) ? r[sorte].filter((j) => j !== jour) : [...r[sorte], jour];
        sauvegarderRepas();
        afficherReglagesRepas();
      });
      zone.appendChild(bouton);
    });
  });
}

[
  ["repas-personnes", "personnes"],
  ["repas-riz-max", "rizMax"],
  ["repas-poisson", "poissonParMois"],
].forEach(([id, cle]) => {
  document.getElementById(id).addEventListener("change", (e) => {
    repas.reglages[cle] = Math.max(0, Number(e.target.value) || 0);
    if (cle === "personnes" && repas.reglages.personnes < 1) repas.reglages.personnes = 1;
    sauvegarderRepas();
    afficherRepas();
  });
});
document.getElementById("repas-dimanche-midi").addEventListener("change", (e) => {
  repas.reglages.dimancheMidi = e.target.checked;
  sauvegarderRepas();
  afficherRepas();
});

// ---------- Tout afficher ----------

function afficherRepas() {
  afficherSemaineRepas();
  afficherCarnet();
  afficherCarteRepas();
  afficherResumeRepas();
}

afficherRepas();
afficherReglagesRepas();
