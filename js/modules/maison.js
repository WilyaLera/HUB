// =====================================================
// Module Maison : le ménage doux, pièce par pièce
//   1. le tiroir « maison » et les tâches de départ
//   2. la mise en place (combien de pièces, plantes, animaux)
//   3. l'état d'une tâche et d'une pièce (jamais de rouge, jamais « en retard »)
//   4. le plan de la maison (et la vue liste)
//   5. une pièce : Nettoyer, Ranger, Entretenir — tout se modifie
//   6. la petite session : « J'ai 5, 15 ou 30 minutes »
//   7. la carte de l'accueil
// =====================================================

// ---------- 1. Le tiroir « maison » ----------
// pieces : [{ id, type, nom }]
// taches : [{ id, pieceId, titre, famille ("nettoyer" | "ranger" | "entretenir"), frequenceJours, dureeMinutes, derniereFois }]
// plantes, installee, vue ("plan" | "liste"), animauxVus : [clés déjà proposées]

const TYPES_PIECES = [
  { code: "cuisine", nom: "Cuisine", icone: "cooking-pot", defaut: 1, grande: true },
  { code: "salon", nom: "Salon", icone: "sofa", defaut: 1, grande: true },
  { code: "chambre", nom: "Chambre", icone: "bed-double", defaut: 1 },
  { code: "sdb", nom: "Salle de bain", icone: "bath", defaut: 1 },
  { code: "wc", nom: "Toilettes", icone: "toilet", defaut: 1 },
  { code: "bureau", nom: "Bureau", icone: "lamp-desk", defaut: 0 },
  { code: "entree", nom: "Entrée", icone: "door-open", defaut: 0 },
  { code: "buanderie", nom: "Buanderie", icone: "washing-machine", defaut: 0 },
  { code: "exterieur", nom: "Extérieur", icone: "trees", defaut: 0 },
];

const FAMILLES_MENAGE = [
  ["nettoyer", "Nettoyer", "sparkles"],
  ["ranger", "Ranger", "layers"],
  ["entretenir", "Entretenir", "wrench"],
];

// [titre, famille, rythme en jours, durée en minutes] — tout est indicatif et modifiable
const TACHES_DE_DEPART = {
  cuisine: [
    ["Plan de travail", "nettoyer", 2, 5], ["Évier", "nettoyer", 3, 5], ["Plaques", "nettoyer", 7, 5],
    ["Sol", "nettoyer", 7, 15], ["Frigo", "nettoyer", 30, 20], ["Four", "nettoyer", 30, 20],
    ["Vaisselle", "ranger", 1, 15], ["Placards", "ranger", 90, 30],
    ["Poubelles", "entretenir", 3, 5], ["Torchons", "entretenir", 7, 5],
  ],
  sdb: [
    ["Lavabo", "nettoyer", 7, 5], ["Douche ou baignoire", "nettoyer", 7, 15], ["Miroir", "nettoyer", 14, 5],
    ["Sol", "nettoyer", 7, 10], ["Produits et placards", "ranger", 30, 15],
    ["Serviettes", "entretenir", 7, 5], ["Tapis de bain", "entretenir", 14, 5],
  ],
  wc: [["WC", "nettoyer", 7, 10], ["Sol", "nettoyer", 7, 5], ["Essuie-mains", "entretenir", 7, 5]],
  chambre: [
    ["Poussière", "nettoyer", 14, 10], ["Aspirateur", "nettoyer", 7, 15], ["Vêtements", "ranger", 7, 10],
    ["Table de nuit", "ranger", 14, 5], ["Changer les draps", "entretenir", 14, 15], ["Aérer la couette", "entretenir", 90, 5],
  ],
  salon: [
    ["Poussière", "nettoyer", 14, 10], ["Sol", "nettoyer", 7, 15], ["Table basse et canapé", "ranger", 3, 5],
    ["Plaids et coussins", "entretenir", 60, 10],
  ],
  bureau: [["Poussière", "nettoyer", 14, 10], ["Sol", "nettoyer", 7, 10], ["Bureau et papiers", "ranger", 7, 15], ["Vider la corbeille", "entretenir", 7, 5]],
  entree: [["Sol", "nettoyer", 14, 10], ["Chaussures", "ranger", 7, 5]],
  buanderie: [["Plier et ranger le linge", "ranger", 3, 15], ["Lessive", "entretenir", 3, 10], ["Repassage", "entretenir", 14, 30]],
  exterieur: [["Balayer", "nettoyer", 14, 15], ["Mobilier", "nettoyer", 30, 15], ["Arroser", "entretenir", 3, 10], ["Tondre", "entretenir", 30, 30]],
};

// Les animaux (de « Ma petite famille ») ont leur coin « Animaux »
const TACHES_ANIMAUX = {
  chat: [["Litière", "entretenir", 1, 5], ["Litière complète", "entretenir", 7, 15], ["Gamelles", "entretenir", 1, 5], ["Fontaine à eau", "entretenir", 7, 5], ["Brossage", "entretenir", 7, 10]],
  chien: [["Gamelles", "entretenir", 1, 5], ["Panier et couverture", "entretenir", 14, 10], ["Brossage", "entretenir", 7, 10]],
  rongeur: [["Eau et nourriture", "entretenir", 1, 5], ["Litière de la cage", "entretenir", 7, 15]],
  oiseau: [["Eau et graines", "entretenir", 1, 5], ["Cage", "entretenir", 7, 15]],
  poisson: [["Nourrir", "entretenir", 1, 5], ["Changement d'eau partiel", "entretenir", 14, 20]],
  autre: [["Eau et nourriture", "entretenir", 1, 5]],
};

let maison = charger("maison", null);
if (!maison) maison = { pieces: [], taches: [], plantes: false, installee: false, vue: "plan", animauxVus: [] };
if (!maison.animauxVus) maison.animauxVus = [];

function sauvegarderMaison() {
  sauvegarder("maison", maison);
}

function idMaison() {
  return String(nouvelId()) + Math.random().toString(36).slice(2, 6);
}

function pieceDe(id) {
  return maison.pieces.find((p) => p.id === id) || null;
}

function typePiece(code) {
  return TYPES_PIECES.find((t) => t.code === code) || { code, nom: "Pièce", icone: "home" };
}

function ajouterTache(pieceId, [titre, famille, frequenceJours, dureeMinutes], etaler) {
  // On démarre « frais » : rien n'attend le premier jour, pas de culpabilité.
  // Les tâches de départ sont étalées, pour ne pas toutes revenir le même jour.
  let derniereFois = aujourdhuiEnTexte();
  if (etaler && frequenceJours > 1) {
    derniereFois = ajouterJours(derniereFois, -Math.floor(Math.random() * frequenceJours * 0.8));
  }
  maison.taches.push({ id: idMaison(), pieceId, titre, famille, frequenceJours, dureeMinutes, derniereFois });
}



function creerPiece(type, nom) {
  const piece = { id: idMaison(), type, nom };
  maison.pieces.push(piece);
  (TACHES_DE_DEPART[type] || []).forEach((t) => ajouterTache(piece.id, t, true));
  return piece;
}

// Les animaux de la petite famille : un coin « Animaux », et leurs tâches (une litière par bac)
function mettreAJourMaisonFamille() {
  if (!maison.installee || typeof famille === "undefined") return;
  let coin = maison.pieces.find((p) => p.type === "animaux");
  famille.animaux.forEach((animal) => {
    const cle = `animal:${animal.id}`;
    if (maison.animauxVus.includes(cle)) return;
    maison.animauxVus.push(cle);
    if (!coin) {
      coin = { id: idMaison(), type: "animaux", nom: "Animaux" };
      maison.pieces.push(coin);
    }
    const bacs = animal.type === "chat" ? Math.max(1, Number(animal.nombreBacs) || 1) : 1;
    (TACHES_ANIMAUX[animal.type] || TACHES_ANIMAUX.autre).forEach(([titre, ...reste]) => {
      if (titre === "Litière" && bacs > 1) {
        for (let b = 1; b <= bacs; b++) ajouterTache(coin.id, [`${titre} (bac ${b}) · ${animal.nom}`, ...reste]);
      } else {
        ajouterTache(coin.id, [`${titre} · ${animal.nom}`, ...reste]);
      }
    });
  });
  sauvegarderMaison();
}

// ---------- 2. La mise en place ----------

const nombresPieces = {};
let animauxBacs = {};

function afficherInstallationMaison(zone) {
  const intro = document.createElement("p");
  intro.classList.add("sous-titre");
  intro.textContent = "Dis-moi juste combien de pièces tu as. Les tâches et leurs rythmes sont des idées : tu changeras tout ce que tu veux.";
  zone.appendChild(intro);
  const carte = document.createElement("div");
  carte.classList.add("carte");
  TYPES_PIECES.forEach((t) => {
    if (nombresPieces[t.code] === undefined) nombresPieces[t.code] = t.defaut;
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-reglage");
    const nom = document.createElement("span");
    nom.classList.add("ligne-maison-type");
    nom.append(creerIcone(t.icone), t.nom);
    const compteur = document.createElement("span");
    compteur.classList.add("fiche-portions");
    const valeur = document.createElement("span");
    valeur.textContent = nombresPieces[t.code];
    [["−", -1], ["+", 1]].forEach(([signe, pas], i) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.classList.add("fiche-plus-moins");
      bouton.textContent = signe;
      bouton.setAttribute("aria-label", `${pas < 0 ? "Une" : "Une"} ${t.nom.toLowerCase()} de ${pas < 0 ? "moins" : "plus"}`);
      bouton.addEventListener("click", () => {
        nombresPieces[t.code] = Math.max(0, Math.min(6, nombresPieces[t.code] + pas));
        valeur.textContent = nombresPieces[t.code];
      });
      if (i === 0) compteur.append(bouton, valeur);
      else compteur.appendChild(bouton);
    });
    ligne.append(nom, compteur);
    carte.appendChild(ligne);
  });
  zone.appendChild(carte);

  // Plantes
  const plantes = document.createElement("label");
  plantes.classList.add("ligne-interrupteur", "carte");
  const textePlantes = document.createElement("span");
  textePlantes.classList.add("ligne-module-texte");
  const titrePlantes = document.createElement("strong");
  titrePlantes.textContent = "J'ai des plantes";
  textePlantes.appendChild(titrePlantes);
  const casePlantes = document.createElement("input");
  casePlantes.type = "checkbox";
  casePlantes.classList.add("interrupteur");
  casePlantes.checked = maison.plantes;
  casePlantes.addEventListener("change", () => (maison.plantes = casePlantes.checked));
  plantes.append(textePlantes, casePlantes);
  zone.appendChild(plantes);

  // Animaux : ceux de la petite famille (et les bacs à litière des chats)
  const animaux = document.createElement("div");
  animaux.classList.add("carte");
  const titreAnimaux = document.createElement("h2");
  titreAnimaux.textContent = "Tes animaux";
  animaux.appendChild(titreAnimaux);
  const listeAnimaux = typeof famille !== "undefined" ? famille.animaux : [];
  if (listeAnimaux.length === 0) {
    const aucun = document.createElement("p");
    aucun.classList.add("sous-titre", "petit");
    aucun.textContent = "Pas d'animal dans ta petite famille. Tu pourras en ajouter dans Réglages › Ma petite famille : ses tâches arriveront ici.";
    animaux.appendChild(aucun);
  }
  listeAnimaux.forEach((animal) => {
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-reglage");
    const nom = document.createElement("span");
    nom.textContent = animal.nom;
    ligne.appendChild(nom);
    if (animal.type === "chat") {
      const bacs = document.createElement("label");
      bacs.classList.add("sous-titre", "petit");
      bacs.append("Bacs à litière ");
      const champ = document.createElement("input");
      champ.type = "number";
      champ.min = "1";
      champ.max = "5";
      champ.inputMode = "numeric";
      champ.classList.add("champ-note", "champ-court");
      champ.value = animal.nombreBacs || 1;
      champ.addEventListener("change", () => {
        animal.nombreBacs = Math.max(1, Number(champ.value) || 1);
        sauvegarderFamille();
      });
      bacs.appendChild(champ);
      ligne.appendChild(bacs);
    }
    animaux.appendChild(ligne);
  });
  zone.appendChild(animaux);

  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add("bouton", "bouton-large");
  bouton.textContent = "Créer ma maison";
  bouton.addEventListener("click", () => {
    TYPES_PIECES.forEach((t) => {
      const combien = nombresPieces[t.code];
      for (let i = 1; i <= combien; i++) creerPiece(t.code, combien > 1 ? `${t.nom} ${i}` : t.nom);
    });
    if (maison.plantes) {
      const salon = maison.pieces.find((p) => p.type === "salon") || maison.pieces[0];
      if (salon) ajouterTache(salon.id, ["Arroser les plantes", "entretenir", 3, 5]);
    }
    maison.installee = true;
    sauvegarderMaison();
    mettreAJourMaisonFamille();
    afficherMaison();
    montrerPetitMessage("Ta maison est prête 🌱");
  });
  zone.appendChild(bouton);
}

// ---------- 3. L'état d'une tâche et d'une pièce ----------
// 0 = fraîche, 1 = commence à attendre, 2 = attend depuis un moment. Jamais de rouge.

function joursDepuis(tache) {
  if (!tache.derniereFois) return tache.frequenceJours;
  const ecart = texteEnDate(aujourdhuiEnTexte()) - texteEnDate(tache.derniereFois);
  return Math.max(0, Math.round(ecart / 86400000));
}

function attente(tache) {
  return joursDepuis(tache) / Math.max(1, tache.frequenceJours);
}

function etatTache(tache) {
  const a = attente(tache);
  if (a < 1) return 0;
  if (a < 2) return 1;
  return 2;
}

function etatPiece(piece) {
  // Une seule tâche qui attend ne « fonce » pas toute la pièce : on regarde l'ensemble
  const etats = maison.taches.filter((t) => t.pieceId === piece.id).map(etatTache);
  if (!etats.some((e) => e > 0)) return 0;
  const moyenne = etats.reduce((s, e) => s + e, 0) / etats.length;
  return moyenne >= 1 ? 2 : 1;
}

const NOMS_ETATS = ["Fraîche", "Commence à attendre", "Attend depuis un moment"];

function texteDepuis(tache) {
  const j = joursDepuis(tache);
  if (j === 0) return "fait aujourd'hui";
  if (j === 1) return "fait hier";
  return `il y a ${j} jours`;
}

function texteRythme(jours) {
  if (jours === 1) return "chaque jour";
  if (jours === 7) return "chaque semaine";
  if (jours === 14) return "toutes les 2 semaines";
  if (jours === 30) return "chaque mois";
  return `tous les ${jours} jours`;
}

// ---------- 4. Le plan de la maison ----------

let pieceOuverte = null;
let modeMaisonModifier = false;

document.querySelectorAll("[data-vue-maison]").forEach((b) =>
  b.addEventListener("click", () => {
    maison.vue = b.dataset.vueMaison;
    pieceOuverte = null;
    sauvegarderMaison();
    afficherMaison();
  }),
);

function afficherPlan(zone) {
  const plan = document.createElement("div");
  plan.classList.add("plan-maison");
  maison.pieces.forEach((piece) => {
    const type = piece.type === "animaux" ? { icone: "paw-print", grande: false } : typePiece(piece.type);
    const etat = etatPiece(piece);
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("piece", `piece-etat-${etat}`);
    if (type.grande) bouton.classList.add("piece-grande");
    const nom = document.createElement("span");
    nom.classList.add("piece-nom");
    nom.textContent = piece.nom;
    const icone = creerIcone(type.icone);
    const attendent = maison.taches.filter((t) => t.pieceId === piece.id && etatTache(t) > 0).length;
    const detail = document.createElement("span");
    detail.classList.add("piece-detail");
    detail.textContent = attendent ? `${attendent} chose${attendent > 1 ? "s" : ""} attend${attendent > 1 ? "ent" : ""}` : "Fraîche";
    bouton.setAttribute("aria-label", `${piece.nom} : ${NOMS_ETATS[etat]}`);
    bouton.append(icone, nom, detail);
    bouton.addEventListener("click", () => {
      pieceOuverte = piece.id;
      afficherMaison();
    });
    plan.appendChild(bouton);
  });
  zone.appendChild(plan);
  const legende = document.createElement("div");
  legende.classList.add("legende-placard");
  NOMS_ETATS.forEach((nom, i) => {
    const element = document.createElement("span");
    const point = document.createElement("i");
    point.classList.add("point-legende", `point-maison-${i}`);
    element.append(point, nom);
    legende.appendChild(element);
  });
  zone.appendChild(legende);
}

function afficherListeMaison(zone) {
  maison.pieces.forEach((piece) => {
    const section = document.createElement("details");
    section.classList.add("chapitre-carnet");
    const titre = document.createElement("summary");
    const nom = document.createElement("span");
    nom.textContent = piece.nom;
    const nombre = document.createElement("span");
    nombre.classList.add("chapitre-nombre");
    const attendent = maison.taches.filter((t) => t.pieceId === piece.id && etatTache(t) > 0).length;
    nombre.textContent = attendent ? `${attendent} attend${attendent > 1 ? "ent" : ""}` : "fraîche";
    titre.append(nom, nombre);
    section.open = attendent > 0;
    const carte = document.createElement("div");
    carte.classList.add("carte");
    maison.taches
      .filter((t) => t.pieceId === piece.id)
      .sort((a, b) => attente(b) - attente(a))
      .forEach((t) => carte.appendChild(creerLigneTache(t)));
    section.append(titre, carte);
    zone.appendChild(section);
  });
}

// ---------- 5. Une pièce ----------

function creerLigneTache(tache) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-tache-maison", `tache-etat-${etatTache(tache)}`);
  const point = document.createElement("span");
  point.classList.add("point-legende", `point-maison-${etatTache(tache)}`);
  const texte = document.createElement("span");
  texte.classList.add("ligne-tache-texte");
  const titre = document.createElement("strong");
  titre.textContent = tache.titre;
  const detail = document.createElement("span");
  detail.classList.add("sous-titre", "petit");
  detail.textContent = `${texteDepuis(tache)} · ${texteRythme(tache.frequenceJours)} · ${tache.dureeMinutes} min`;
  texte.append(titre, detail);
  ligne.append(point, texte);
  if (modeMaisonModifier) {
    ligne.appendChild(
      creerBoutonModifier(`Modifier ${tache.titre}`, () =>
        ouvrirEdition({
          titre: "Modifier la tâche",
          champs: [
            { cle: "titre", nom: "Tâche", valeur: tache.titre },
            { cle: "famille", nom: "Famille", type: "select", valeur: tache.famille, options: FAMILLES_MENAGE.map(([c, n]) => [c, n]) },
            { cle: "frequenceJours", nom: "Rythme (tous les … jours)", type: "number", valeur: tache.frequenceJours },
            { cle: "dureeMinutes", nom: "Durée (minutes)", type: "number", valeur: tache.dureeMinutes },
          ],
          enregistrer: (v) => {
            Object.assign(tache, {
              titre: v.titre || tache.titre,
              famille: v.famille,
              frequenceJours: Math.max(1, Math.round(v.frequenceJours) || tache.frequenceJours),
              dureeMinutes: Math.max(1, Math.round(v.dureeMinutes) || tache.dureeMinutes),
            });
            sauvegarderMaison();
            afficherMaison();
          },
        }),
      ),
    );
    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.classList.add("bouton-supprimer");
    retirer.setAttribute("aria-label", `Retirer ${tache.titre}`);
    retirer.appendChild(creerIcone("x"));
    retirer.addEventListener("click", () =>
      agirAvecAnnuler({
        tiroir: maison,
        message: `« ${tache.titre} » retirée`,
        action: () => {
          maison.taches = maison.taches.filter((t) => t.id !== tache.id);
        },
        apres: () => {
          sauvegarderMaison();
          afficherMaison();
        },
      }),
    );
    ligne.appendChild(retirer);
  } else {
    const fait = document.createElement("button");
    fait.type = "button";
    fait.classList.add("bouton-fait-maison");
    fait.classList.toggle("deja-fait", joursDepuis(tache) === 0);
    fait.setAttribute("aria-label", `${tache.titre} : c'est fait`);
    fait.appendChild(creerIcone("check"));
    fait.addEventListener("click", () => marquerFait(tache));
    ligne.appendChild(fait);
  }
  return ligne;
}

function marquerFait(tache) {
  agirAvecAnnuler({
    tiroir: maison,
    message: `${tache.titre} : c'est fait 🌱`,
    action: () => {
      maison.taches.find((t) => t.id === tache.id).derniereFois = aujourdhuiEnTexte();
    },
    apres: () => {
      sauvegarderMaison();
      afficherMaison();
    },
  });
}

function afficherPiece(zone, piece) {
  const retour = document.createElement("button");
  retour.type = "button";
  retour.classList.add("lien", "lien-retour-placard");
  retour.append(creerIcone("chevron-left"), "Toute la maison");
  retour.addEventListener("click", () => {
    pieceOuverte = null;
    afficherMaison();
  });
  const titre = document.createElement("h2");
  titre.classList.add("titre-rangement", `piece-titre-${etatPiece(piece)}`);
  titre.textContent = piece.nom;
  zone.append(retour, titre);

  FAMILLES_MENAGE.forEach(([code, nom, icone]) => {
    const taches = maison.taches.filter((t) => t.pieceId === piece.id && t.famille === code);
    if (taches.length === 0 && !modeMaisonModifier) return;
    const bloc = document.createElement("section");
    bloc.classList.add("carte", "famille-menage");
    const entete = document.createElement("h3");
    entete.append(creerIcone(icone), nom);
    bloc.appendChild(entete);
    taches.sort((a, b) => attente(b) - attente(a)).forEach((t) => bloc.appendChild(creerLigneTache(t)));
    if (modeMaisonModifier) bloc.appendChild(creerFormTache(piece.id, code));
    zone.appendChild(bloc);
  });

  if (modeMaisonModifier) {
    const actions = document.createElement("div");
    actions.classList.add("envie-boutons");
    actions.appendChild(
      creerBoutonEnvie("Renommer la pièce", () =>
        ouvrirEdition({
          titre: "Renommer la pièce",
          champs: [{ cle: "nom", nom: "Nom", valeur: piece.nom }],
          enregistrer: (v) => {
            piece.nom = v.nom || piece.nom;
            sauvegarderMaison();
            afficherMaison();
          },
        }),
      ),
    );
    zone.appendChild(actions);
    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.classList.add("lien", "lien-vider-repas");
    retirer.textContent = "Retirer cette pièce et ses tâches";
    retirer.addEventListener("click", () => {
      pieceOuverte = null;
      agirAvecAnnuler({
        tiroir: maison,
        message: `« ${piece.nom} » retirée`,
        action: () => {
          maison.pieces = maison.pieces.filter((p) => p.id !== piece.id);
          maison.taches = maison.taches.filter((t) => t.pieceId !== piece.id);
        },
        apres: () => {
          sauvegarderMaison();
          afficherMaison();
        },
      });
    });
    zone.appendChild(retirer);
  }
}

function creerFormTache(pieceId, familleCode) {
  const form = document.createElement("form");
  form.classList.add("form-article-ligne", "form-placard");
  const champ = document.createElement("input");
  champ.type = "text";
  champ.classList.add("champ-note");
  champ.placeholder = "Ajouter une tâche";
  champ.maxLength = 50;
  const bouton = document.createElement("button");
  bouton.type = "submit";
  bouton.classList.add("bouton-rond", "bouton-rond-plein");
  bouton.setAttribute("aria-label", "Ajouter");
  bouton.appendChild(creerIcone("plus"));
  form.append(champ, bouton);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const titre = champ.value.trim();
    if (!titre) return;
    ajouterTache(pieceId, [majuscule(titre), familleCode, 7, 10]);
    sauvegarderMaison();
    afficherMaison();
    montrerPetitMessage("Ajoutée (chaque semaine, 10 min : touche le crayon pour changer)");
  });
  return form;
}

function creerFormPiece() {
  const form = document.createElement("form");
  form.classList.add("form-animal");
  const choix = document.createElement("select");
  choix.classList.add("champ-note");
  choix.setAttribute("aria-label", "Type de pièce");
  TYPES_PIECES.forEach((t) => {
    const option = document.createElement("option");
    option.value = t.code;
    option.textContent = t.nom;
    choix.appendChild(option);
  });
  const nom = document.createElement("input");
  nom.type = "text";
  nom.classList.add("champ-note");
  nom.placeholder = "Son nom (ex. Chambre d'amis)";
  nom.maxLength = 30;
  const bouton = document.createElement("button");
  bouton.type = "submit";
  bouton.classList.add("bouton-rond", "bouton-rond-plein");
  bouton.setAttribute("aria-label", "Ajouter cette pièce");
  bouton.appendChild(creerIcone("plus"));
  form.append(choix, nom, bouton);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    creerPiece(choix.value, nom.value.trim() || typePiece(choix.value).nom);
    sauvegarderMaison();
    afficherMaison();
    montrerPetitMessage("Pièce ajoutée 🌱");
  });
  return form;
}

document.getElementById("modifier-maison").addEventListener("click", () => {
  modeMaisonModifier = !modeMaisonModifier;
  afficherMaison();
});

// ---------- 6. La petite session ----------
// On remplit le temps choisi avec ce qui attend le plus, sans le dépasser (3, 4 ou 6 cartes au plus)

const ecranSession = document.getElementById("session-maison");
let session = null; // { cartes: [tache], index, faites, finPrevue }
let minuteurSession = null;

function preparerSession(minutes) {
  const maxCartes = { 5: 3, 15: 4, 30: 6 }[minutes] || 4;
  // Ce qui attend d'abord ; si tout est frais, ce qui reviendra bientôt
  const candidates = [...maison.taches].filter((t) => attente(t) >= 0.7).sort((a, b) => attente(b) - attente(a));
  const cartes = [];
  let total = 0;
  // D'abord les petites choses (plusieurs cartes, c'est plus encourageant), puis on complète
  const petite = Math.max(5, minutes / 2);
  [(t) => t.dureeMinutes <= petite, () => true].forEach((accepte) => {
    for (const t of candidates) {
      if (cartes.length >= maxCartes) break;
      if (cartes.includes(t) || !accepte(t) || total + t.dureeMinutes > minutes) continue;
      cartes.push(t);
      total += t.dureeMinutes;
    }
  });
  // Dans l'ordre de ce qui attend le plus
  return cartes.sort((a, b) => attente(b) - attente(a));
}

function ouvrirSession(minutes) {
  const cartes = preparerSession(minutes);
  if (cartes.length === 0) {
    montrerPetitMessage(maison.taches.some((t) => attente(t) >= 0.7) ? "Rien qui tienne dans ce temps-là. Profite 🌸" : "Tout est frais, rien ne t'attend. Profite 🌸");
    return;
  }
  session = { minutes, cartes, index: 0, faites: 0, prevenir: false };
  ecranSession.hidden = false;
  document.body.classList.add("en-cuisine");
  afficherSession();
}

function fermerSession() {
  ecranSession.hidden = true;
  document.body.classList.remove("en-cuisine");
  if (minuteurSession) clearTimeout(minuteurSession);
  minuteurSession = null;
  session = null;
  afficherMaison();
}

function afficherSession() {
  const zone = document.getElementById("session-contenu");
  zone.replaceChildren();
  const fil = document.getElementById("session-fil");
  fil.replaceChildren();
  session.cartes.forEach((_, i) => {
    const point = document.createElement("span");
    point.classList.add("fil-point");
    point.classList.toggle("fil-fait", i < session.index);
    point.classList.toggle("fil-actuel", i === session.index);
    fil.appendChild(point);
  });

  if (session.index >= session.cartes.length) {
    const fin = document.createElement("h2");
    fin.textContent = session.faites ? "Ça suffit pour aujourd'hui 🌱" : "Pas grave, ce sera pour une autre fois 🌙";
    const detail = document.createElement("p");
    detail.classList.add("sous-titre");
    detail.textContent = session.faites ? `${session.faites} chose${session.faites > 1 ? "s" : ""} faite${session.faites > 1 ? "s" : ""}. Ta maison te dit merci.` : "La maison peut attendre.";
    const fermer = document.createElement("button");
    fermer.type = "button";
    fermer.classList.add("bouton", "bouton-large");
    fermer.textContent = "Revenir à la maison";
    fermer.addEventListener("click", fermerSession);
    zone.append(fin, detail, fermer);
    return;
  }

  const tache = session.cartes[session.index];
  const piece = pieceDe(tache.pieceId);
  const carte = document.createElement("div");
  carte.classList.add("carte", "carte-session", `tache-etat-${etatTache(tache)}`);
  const lieu = document.createElement("p");
  lieu.classList.add("etiquette");
  lieu.textContent = piece ? piece.nom : "";
  const titre = document.createElement("h2");
  titre.textContent = tache.titre;
  const detail = document.createElement("p");
  detail.classList.add("sous-titre");
  detail.textContent = `Environ ${tache.dureeMinutes} min · ${texteDepuis(tache)}`;
  carte.append(lieu, titre, detail);
  zone.appendChild(carte);

  const boutons = document.createElement("div");
  boutons.classList.add("bienvenue-boutons");
  const fait = document.createElement("button");
  fait.type = "button";
  fait.classList.add("bouton", "bouton-large");
  fait.textContent = "C'est fait";
  fait.addEventListener("click", () => {
    tache.derniereFois = aujourdhuiEnTexte();
    sauvegarderMaison();
    session.faites++;
    session.index++;
    afficherSession();
  });
  const pasMaintenant = document.createElement("button");
  pasMaintenant.type = "button";
  pasMaintenant.classList.add("bouton-demain", "bouton-large");
  pasMaintenant.textContent = "Pas maintenant";
  pasMaintenant.addEventListener("click", () => {
    session.index++;
    afficherSession();
  });
  const arreter = document.createElement("button");
  arreter.type = "button";
  arreter.classList.add("lien", "bienvenue-plus-tard");
  arreter.textContent = "J'arrête là pour aujourd'hui";
  arreter.addEventListener("click", () => {
    session.index = session.cartes.length;
    afficherSession();
  });
  boutons.append(fait, pasMaintenant, arreter);
  zone.appendChild(boutons);

  // « Me prévenir à la fin » : un signal doux, sans compte à rebours
  if (session.index === 0) {
    const prevenir = document.createElement("label");
    prevenir.classList.add("case-repas");
    const caseP = document.createElement("input");
    caseP.type = "checkbox";
    caseP.checked = session.prevenir;
    caseP.addEventListener("change", () => {
      session.prevenir = caseP.checked;
      if (minuteurSession) clearTimeout(minuteurSession);
      minuteurSession = null;
      if (caseP.checked) {
        minuteurSession = setTimeout(() => {
          if (typeof sonner === "function") sonner(); // repas.js
          montrerPetitMessage(`Tes ${session ? session.minutes : ""} minutes sont passées. Tu peux t'arrêter ou continuer 🌱`);
        }, session.minutes * 60000);
      }
    });
    prevenir.append(caseP, `Me prévenir au bout de ${session.minutes} minutes`);
    zone.appendChild(prevenir);
  }
}

document.getElementById("fermer-session").addEventListener("click", fermerSession);
document.querySelectorAll("[data-session-maison]").forEach((b) =>
  b.addEventListener("click", (e) => {
    e.stopPropagation(); // sur l'accueil, la carte elle-même mène à la Maison
    ouvrirSession(Number(b.dataset.sessionMaison));
  }),
);

// ---------- 7. La carte de l'accueil ----------

function afficherCarteMaison() {
  const carte = document.querySelector('[data-carte="maison"]');
  if (!carte) return;
  const attendent = maison.pieces.filter((p) => etatPiece(p) > 0);
  carte.dataset.vide = !maison.installee || attendent.length === 0 ? "true" : "false";
  document.getElementById("accueil-maison").textContent = attendent.length
    ? `${attendent.map((p) => p.nom).slice(0, 3).join(", ")}${attendent.length > 3 ? "…" : ""} ${attendent.length > 1 ? "attendent" : "attend"} un petit coup de main.`
    : "";
  if (typeof placerCartesAccueil === "function") placerCartesAccueil();
}

// ---------- Tout afficher ----------

function afficherMaison() {
  const zone = document.getElementById("contenu-maison");
  zone.replaceChildren();
  const installee = maison.installee;
  document.getElementById("barre-maison").hidden = !installee;
  document.getElementById("sessions-maison").hidden = !installee;
  document.querySelectorAll("[data-vue-maison]").forEach((b) => b.classList.toggle("choisie", b.dataset.vueMaison === maison.vue));
  document.getElementById("modifier-maison").textContent = modeMaisonModifier ? "Terminé" : "Modifier";
  const attendent = maison.taches.filter((t) => etatTache(t) > 0).length;
  const resume = !installee ? "Ton ménage, pièce par pièce, à ton rythme" : attendent ? `${attendent} petite${attendent > 1 ? "s" : ""} chose${attendent > 1 ? "s" : ""} attend${attendent > 1 ? "ent" : ""}` : "Tout est frais 🌱";
  document.getElementById("maison-resume").textContent = resume;
  document.getElementById("foyer-maison-resume").textContent = resume;
  if (!installee) {
    afficherInstallationMaison(zone);
  } else {
    const piece = pieceOuverte ? pieceDe(pieceOuverte) : null;
    if (piece) afficherPiece(zone, piece);
    else if (maison.vue === "liste") afficherListeMaison(zone);
    else afficherPlan(zone);
    if (modeMaisonModifier && !piece) {
      const titre = document.createElement("p");
      titre.classList.add("etiquette", "etiquette-espacee");
      titre.textContent = "Ajouter une pièce";
      zone.append(titre, creerFormPiece());
    }
  }
  afficherCarteMaison();
}

mettreAJourMaisonFamille();
afficherMaison();
