// =====================================================
// Module Agenda — partie 1 : les données et les outils
//   1. les catégories (et leurs couleurs)
//   2. le tiroir « agenda » (et le déménagement des anciennes tâches)
//   3. trouver les éléments d'un jour
//   4. reporter sans culpabilité (« Demain », « Tout glisser à demain »)
//   5. le pense-bête et sa pioche
//   6. fabriquer une ligne (tâche ou événement), utilisée partout
//   7. les répétitions et les anniversaires
//
// Un « élément » de l'agenda, c'est soit une TÂCHE (à cocher),
// soit un ÉVÉNEMENT (un moment, rien à cocher) :
//   { id, type: "tache" | "evenement", titre,
//     date: "2026-11-12" (ou "" pour une tâche du pense-bête),
//     heure: "14:30" (ou "" = sans heure / toute la journée),
//     categorie: le code d'une catégorie (voir agenda.categories), ou "anniversaire",
//     fait, urgent, dateLimite (tâches seulement),
//     recurrence: "" | "jour" | "semaine" | "mois" | "annee",
//     finRepetition: "" ou une date, faitLes: [dates] (tâches répétées),
//     anniversaire: true/false, anneeNaissance: 1996 ou "" }
// =====================================================

// ---------- 1. Les catégories ----------
// Elles vivent maintenant dans le tiroir (agenda.categories) : tu peux en
// ajouter, en modifier, en supprimer. Voici celles du départ.

const CATEGORIES_DE_DEPART = [
  { code: "perso", nom: "Perso", couleur: "#C4704F" },
  { code: "maison", nom: "Maison", couleur: "#7E9C80" },
  { code: "travail", nom: "Travail", couleur: "#5E7FA3" },
  { code: "sorties", nom: "Sorties", couleur: "#C98B8B" },
  { code: "sante", nom: "Santé & soin", couleur: "#C99A3E" },
  { code: "admin", nom: "Administratif", couleur: "#7abfd4" },
];

// Les couleurs qu'on peut choisir pour une nouvelle catégorie
const COULEURS_CATEGORIES = [
  "#C4704F", "#7E9C80", "#5E7FA3", "#C98B8B", "#C99A3E",
  "#7abfd4", "#9A86B8", "#8A9A5B", "#B89B72", "#D08C60",
];

// Deux « catégories » à part, qu'on ne peut pas supprimer :
// les anniversaires (un type à eux) et les jours fériés
const ANNIVERSAIRE = { code: "anniversaire", nom: "Anniversaire", couleur: "#B06A9C" };
const FERIE = { code: "ferie", nom: "Jour férié", couleur: "#9C8F86" };

// "maison" → { code, nom, couleur } (la première catégorie si on ne trouve pas)
function categorieDe(code) {
  if (code === ANNIVERSAIRE.code) return ANNIVERSAIRE;
  if (code === FERIE.code) return FERIE;
  return agenda.categories.find((c) => c.code === code) || agenda.categories[0];
}

// ---------- 2. Le tiroir « agenda » ----------

let agenda = charger("agenda", null);

// La première fois : on déménage tes anciennes tâches dans l'agenda
if (!agenda) {
  const anciennes = charger("taches", []);
  agenda = {
    elements: anciennes.map((tache) => ({
      id: tache.id,
      type: "tache",
      titre: tache.titre,
      date: tache.date || aujourdhuiEnTexte(),
      heure: "",
      categorie: "perso",
      fait: tache.fait,
      urgent: false,
      dateLimite: "",
    })),
  };
  sauvegarder("agenda", agenda);
}

// Les nouveautés : les catégories et le réglage des jours fériés
if (!agenda.categories) {
  agenda.categories = CATEGORIES_DE_DEPART.map((c) => ({ ...c }));
}
// Les jours fériés : le pays choisi ("" = aucun), ceux qu'on a masqués,
// et ceux qu'on a ajoutés soi-même
if (agenda.paysFeries === undefined) {
  agenda.paysFeries = agenda.joursFeries === false ? "" : "nc";
  delete agenda.joursFeries;
}
if (!agenda.feriesMasques) agenda.feriesMasques = [];
if (!agenda.feriesPerso) agenda.feriesPerso = [];

function sauvegarderAgenda() {
  sauvegarder("agenda", agenda);
}

// Redessine tout ce qui montre l'agenda (l'écran Agenda ET la carte de l'Accueil)
function rafraichirAgenda() {
  afficherAgenda(); // dans agenda-vues.js
  afficherCarteAujourdhui(); // dans accueil.js
  afficherReglagesAgenda(); // dans agenda-reglages.js
  if (typeof preparerResume === "function") preparerResume(); // agenda-notifs.js
}

// ---------- 3. Les éléments d'un jour ----------

function estUneTache(element) {
  return element.type === "tache";
}

// Les tâches d'un jour. Aujourd'hui, on y ajoute aussi celles des jours
// passés qui ne sont pas faites : elles reviennent doucement, sans disparaître.
// (Les tâches qui se répètent, elles, ne reviennent pas : la prochaine arrive déjà.)
function tachesDuJour(dateTexte) {
  const aujourdhui = aujourdhuiEnTexte();
  return agenda.elements.filter((el) => {
    if (!estUneTache(el) || el.date === "") return false;
    if (seRepete(el)) return tombeLe(el, dateTexte);
    if (el.date === dateTexte) return true;
    return dateTexte === aujourdhui && el.date < aujourdhui && !el.fait;
  });
}

// Les événements d'un jour, ceux « toute la journée » d'abord, puis par heure.
// Un jour férié s'ajoute tout en haut.
function evenementsDuJour(dateTexte) {
  const evenements = agenda.elements
    .filter((el) => !estUneTache(el) && tombeLe(el, dateTexte))
    .sort((a, b) => a.heure.localeCompare(b.heure));

  const ferie = ferieDuJour(dateTexte);
  if (ferie) {
    evenements.unshift({
      id: `ferie-${dateTexte}`,
      type: "evenement",
      titre: ferie,
      date: dateTexte,
      heure: "",
      categorie: FERIE.code,
      estFerie: true,
    });
  }
  return evenements;
}

// Tout ce qui se passe un jour (pour les pastilles du calendrier)
function elementsDuJour(dateTexte) {
  return [...evenementsDuJour(dateTexte), ...tachesDuJour(dateTexte)];
}

// Les catégories d'un jour, sans doublon (au plus 3 pastilles)
function categoriesDuJour(dateTexte) {
  const codes = [];
  elementsDuJour(dateTexte).forEach((el) => {
    if (!codes.includes(el.categorie)) codes.push(el.categorie);
  });
  return codes.slice(0, 3);
}

// ---------- 4. Reporter sans culpabilité ----------

// Une tâche peut glisser à demain si : pas faite, pas urgente,
// et ce n'est pas déjà le jour de son échéance (le jour J, « Demain » disparaît)
function peutGlisser(tache) {
  if (seRepete(tache)) return false; // la prochaine arrive toute seule
  if (tache.fait || tache.urgent) return false;
  if (tache.dateLimite && aujourdhuiEnTexte() >= tache.dateLimite) return false;
  return true;
}

function glisserADemain(tache) {
  tache.date = ajouterJours(aujourdhuiEnTexte(), 1);
}

// « Tout glisser à demain » : seulement les tâches qui le peuvent
function toutGlisserADemain(taches) {
  agirAvecAnnuler({
    tiroir: agenda,
    message: "C'est pour demain 🌙",
    action: () => taches.filter(peutGlisser).forEach(glisserADemain),
    apres: () => {
      sauvegarderAgenda();
      rafraichirAgenda();
    },
  });
}

// Une seule tâche à demain (avec « Annuler »)
function reporterADemain(tache) {
  agirAvecAnnuler({
    tiroir: agenda,
    message: "C'est pour demain 🌙",
    action: () => glisserADemain(tache),
    apres: () => {
      sauvegarderAgenda();
      rafraichirAgenda();
    },
  });
}

// Le geste : glisser une ligne vers la droite pour la passer à demain.
// (Le bouton « Demain » reste là pour qui préfère toucher.)
function activerGlissement(ligne, quandGlisse) {
  let departX = null;
  let departY = null;
  let decalage = 0;
  ligne.classList.add("ligne-glissable");

  function remettre() {
    ligne.style.transform = "";
    ligne.classList.remove("en-glissement", "pret-a-glisser");
    departX = null;
    decalage = 0;
  }

  ligne.addEventListener(
    "touchstart",
    (e) => {
      departX = e.touches[0].clientX;
      departY = e.touches[0].clientY;
      decalage = 0;
    },
    { passive: true },
  );
  ligne.addEventListener(
    "touchmove",
    (e) => {
      if (departX === null) return;
      const dx = e.touches[0].clientX - departX;
      const dy = e.touches[0].clientY - departY;
      // Le doigt descend plutôt qu'il ne glisse : c'est qu'on fait défiler la page
      if (decalage === 0 && Math.abs(dy) > Math.abs(dx)) {
        departX = null;
        return;
      }
      if (dx > 0) {
        decalage = Math.min(dx, 140);
        ligne.style.transform = `translateX(${decalage}px)`;
        ligne.classList.add("en-glissement");
        ligne.classList.toggle("pret-a-glisser", decalage > 90);
      }
    },
    { passive: true },
  );
  ligne.addEventListener("touchend", () => {
    const assez = decalage > 90;
    remettre();
    if (assez) quandGlisse();
  });
  ligne.addEventListener("touchcancel", remettre);
}

// Le petit lien discret : il n'apparaît que s'il y a au moins 2 tâches à glisser
function creerLienToutGlisser(taches) {
  const aGlisser = taches.filter(peutGlisser);
  if (aGlisser.length < 2) return null;
  const lien = document.createElement("button");
  lien.type = "button";
  lien.classList.add("lien", "lien-petit", "lien-glisser");
  lien.textContent = "Tout glisser à demain";
  lien.addEventListener("click", () => toutGlisserADemain(taches));
  return lien;
}

// Cocher une tâche. Pour une tâche qui se répète, on ne coche
// QUE le jour concerné : on range ce jour dans sa liste « faitLes ».
function cocherTache(tache, fait, dateTexte) {
  if (seRepete(tache)) {
    if (!tache.faitLes) tache.faitLes = [];
    tache.faitLes = tache.faitLes.filter((d) => d !== dateTexte);
    if (fait) tache.faitLes.push(dateTexte);
  } else {
    tache.fait = fait;
  }
  sauvegarderAgenda();
  rafraichirAgenda();
}

// Une tâche est-elle faite ce jour-là ?
function estFait(tache, dateTexte) {
  if (seRepete(tache)) return (tache.faitLes || []).includes(dateTexte);
  return tache.fait;
}

// ---------- 5. Le pense-bête ----------

// Les tâches sans date, pas encore faites
function penseBete() {
  return agenda.elements.filter(
    (el) => estUneTache(el) && el.date === "" && !el.fait,
  );
}

// Pioche une idée au hasard (différente de la précédente si possible)
function piocherIdee(idPrecedente) {
  let choix = penseBete();
  if (choix.length > 1) choix = choix.filter((el) => el.id !== idPrecedente);
  if (choix.length === 0) return null;
  // Math.random() donne un nombre entre 0 et 1 : on le transforme en position
  return choix[Math.floor(Math.random() * choix.length)];
}

// ---------- 6. Une ligne d'agenda (tâche ou événement) ----------

// Une petite pastille ronde de la couleur de la catégorie
function creerPastilleCategorie(code) {
  const pastille = document.createElement("span");
  pastille.classList.add("puce-categorie");
  pastille.style.background = categorieDe(code).couleur;
  pastille.title = categorieDe(code).nom;
  return pastille;
}

// options.avecDemain : afficher le bouton « Demain » (vue du jour, Accueil)
// options.date : le jour qu'on regarde (utile pour les répétitions et les âges)
function creerLigneElement(element, options = {}) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-agenda");
  const jour = options.date || element.date || aujourdhuiEnTexte();
  const fait = estUneTache(element) && estFait(element, jour);

  if (estUneTache(element)) {
    // La case à cocher
    const caseACocher = document.createElement("input");
    caseACocher.type = "checkbox";
    caseACocher.checked = fait;
    caseACocher.setAttribute("aria-label", `Fait : ${element.titre}`);
    caseACocher.addEventListener("change", () =>
      cocherTache(element, caseACocher.checked, jour),
    );
    ligne.appendChild(caseACocher);
    ligne.classList.toggle("ligne-faite", fait);
  } else {
    // L'heure de l'événement (ou « Journée »)
    const heure = document.createElement("span");
    heure.classList.add("agenda-heure");
    heure.textContent = element.heure || "Journée";
    if (element.anniversaire) heure.textContent = "🎂";
    if (element.estFerie) heure.textContent = "Férié";
    ligne.appendChild(heure);
  }

  // Le titre et les petits détails : on les touche pour modifier
  // (un jour férié ne se modifie pas : un simple <span> au lieu d'un bouton)
  const zone = document.createElement(element.estFerie ? "span" : "button");
  zone.classList.add("ligne-agenda-ouvrir");
  if (!element.estFerie) {
    zone.type = "button";
    zone.addEventListener("click", () => ouvrirFeuilleElement(element)); // agenda-feuille.js
  }

  const titre = document.createElement("span");
  titre.classList.add("ligne-agenda-titre");
  titre.append(creerPastilleCategorie(element.categorie), titreAffiche(element, jour));
  zone.appendChild(titre);

  // Les petites étiquettes : urgent, reportée, échéance, répétition
  const details = [];
  if (element.urgent && !fait) details.push("Urgent");
  const aujourdhui = aujourdhuiEnTexte();
  if (
    estUneTache(element) &&
    !seRepete(element) &&
    element.date &&
    element.date < aujourdhui &&
    !fait
  ) {
    details.push(`du ${formaterDate(element.date, false)}`);
  }
  if (seRepete(element) && !element.anniversaire) {
    details.push(`🔁 ${MOTS_REPETITION[element.recurrence]}`);
  }
  if (element.dateLimite && !fait) {
    details.push(
      element.dateLimite === aujourdhui
        ? "à faire aujourd'hui"
        : `avant le ${formaterDate(element.dateLimite, false)}`,
    );
  }
  if (details.length > 0) {
    const petit = document.createElement("span");
    petit.classList.add("ligne-agenda-details");
    petit.classList.toggle("est-urgent", element.urgent && !fait);
    petit.textContent = details.join(" · ");
    zone.appendChild(petit);
  }
  ligne.appendChild(zone);

  // Le bouton « Demain »
  if (options.avecDemain && estUneTache(element) && peutGlisser(element)) {
    const demain = document.createElement("button");
    demain.type = "button";
    demain.classList.add("bouton-demain");
    demain.textContent = "Demain";
    demain.addEventListener("click", () => reporterADemain(element));
    ligne.appendChild(demain);
    activerGlissement(ligne, () => reporterADemain(element));
  }

  return ligne;
}

// ---------- 7. Les répétitions et les anniversaires ----------

const MOTS_REPETITION = {
  jour: "chaque jour",
  semaine: "chaque semaine",
  mois: "chaque mois",
  annee: "chaque année",
};

function seRepete(element) {
  return Boolean(element.recurrence);
}

// Un élément tombe-t-il ce jour-là ?
function tombeLe(element, dateTexte) {
  if (!seRepete(element)) return element.date === dateTexte;

  // Pas avant son premier jour, et pas après sa date de fin
  if (dateTexte < element.date) return false;
  if (element.finRepetition && dateTexte > element.finRepetition) return false;

  const debut = texteEnDate(element.date);
  const jour = texteEnDate(dateTexte);
  if (element.recurrence === "jour") return true;
  if (element.recurrence === "semaine") return jour.getDay() === debut.getDay();
  if (element.recurrence === "mois") return jour.getDate() === debut.getDate();
  // Chaque année : même jour, même mois
  return jour.getDate() === debut.getDate() && jour.getMonth() === debut.getMonth();
}

// Le titre qu'on affiche : pour un anniversaire, « Anniversaire de Léa · 30 ans »
function titreAffiche(element, dateTexte) {
  if (!element.anniversaire) return element.titre;
  let texte = `Anniversaire de ${element.titre}`;
  if (element.anneeNaissance) {
    const age = texteEnDate(dateTexte).getFullYear() - element.anneeNaissance;
    if (age > 0) texte = `${texte} · ${age} an${age > 1 ? "s" : ""}`;
  }
  return texte;
}

// Les anniversaires de demain (pour le petit rappel de l'Accueil)
function anniversairesDeDemain() {
  const demain = ajouterJours(aujourdhuiEnTexte(), 1);
  return agenda.elements.filter((el) => el.anniversaire && tombeLe(el, demain));
}

// ---------- 8. Les jours fériés ----------

// La date de Pâques d'une année (le calcul de Meeus : un vieux calcul
// d'astronome, qu'on recopie tel quel sans avoir besoin de le comprendre !)
function dateDePaques(annee) {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return dateEnTexte(new Date(annee, mois - 1, jour));
}

// Le n-ième lundi d'un mois (ex. : le 1er lundi de septembre)
function nemeLundi(annee, mois, n) {
  const date = new Date(annee, mois - 1, 1);
  while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
  date.setDate(date.getDate() + 7 * (n - 1));
  return dateEnTexte(date);
}

// Le lundi juste avant un jour (ex. : le lundi avant le 25 mai)
function lundiAvant(annee, mois, jour) {
  const date = new Date(annee, mois - 1, jour - 1);
  while (date.getDay() !== 1) date.setDate(date.getDate() - 1);
  return dateEnTexte(date);
}

// Tous les jours fériés qu'on sait calculer : un nom, et sa date pour une année
const FERIES = {
  jourDeLAn: { nom: "Jour de l'an", date: (an) => `${an}-01-01` },
  evangile: { nom: "Arrivée de l'Évangile", date: (an) => `${an}-03-05` },
  vendrediSaint: { nom: "Vendredi saint", date: (an) => ajouterJours(dateDePaques(an), -2) },
  lundiPaques: { nom: "Lundi de Pâques", date: (an) => ajouterJours(dateDePaques(an), 1) },
  travail: { nom: "Fête du travail", date: (an) => `${an}-05-01` },
  victoire: { nom: "Victoire 1945", date: (an) => `${an}-05-08` },
  ascension: { nom: "Ascension", date: (an) => ajouterJours(dateDePaques(an), 39) },
  lundiPentecote: { nom: "Lundi de Pentecôte", date: (an) => ajouterJours(dateDePaques(an), 50) },
  patriotes: { nom: "Journée des patriotes", date: (an) => lundiAvant(an, 5, 25) },
  saintJean: { nom: "Fête nationale du Québec", date: (an) => `${an}-06-24` },
  autonomie: { nom: "Fête de l'autonomie", date: (an) => `${an}-06-29` },
  canada: { nom: "Fête du Canada", date: (an) => `${an}-07-01` },
  quatorze: { nom: "Fête nationale", date: (an) => `${an}-07-14` },
  belgique: { nom: "Fête nationale", date: (an) => `${an}-07-21` },
  assomption: { nom: "Assomption", date: (an) => `${an}-08-15` },
  travailQc: { nom: "Fête du travail", date: (an) => nemeLundi(an, 9, 1) },
  citoyennete: { nom: "Fête de la citoyenneté", date: (an) => `${an}-09-24` },
  actionDeGrace: { nom: "Action de grâce", date: (an) => nemeLundi(an, 10, 2) },
  toussaint: { nom: "Toussaint", date: (an) => `${an}-11-01` },
  armistice: { nom: "Armistice", date: (an) => `${an}-11-11` },
  noel: { nom: "Noël", date: (an) => `${an}-12-25` },
};

// Les pays : leur nom et la liste de leurs jours fériés
const PAYS_FERIES = {
  nc: {
    nom: "Nouvelle-Calédonie",
    feries: ["jourDeLAn", "lundiPaques", "travail", "victoire", "ascension", "lundiPentecote",
      "quatorze", "assomption", "citoyennete", "toussaint", "armistice", "noel"],
  },
  pf: {
    nom: "Polynésie française",
    feries: ["jourDeLAn", "evangile", "vendrediSaint", "lundiPaques", "travail", "victoire",
      "ascension", "lundiPentecote", "autonomie", "quatorze", "assomption", "toussaint",
      "armistice", "noel"],
  },
  fr: {
    nom: "France métropolitaine",
    feries: ["jourDeLAn", "lundiPaques", "travail", "victoire", "ascension", "lundiPentecote",
      "quatorze", "assomption", "toussaint", "armistice", "noel"],
  },
  be: {
    nom: "Belgique",
    feries: ["jourDeLAn", "lundiPaques", "travail", "ascension", "lundiPentecote", "belgique",
      "assomption", "toussaint", "armistice", "noel"],
  },
  qc: {
    nom: "Québec",
    feries: ["jourDeLAn", "vendrediSaint", "lundiPaques", "patriotes", "saintJean", "canada",
      "travailQc", "actionDeGrace", "noel"],
  },
};

// Les jours fériés d'une année : { "2026-12-25": "Noël", … }
// (ceux du pays choisi, sans ceux masqués, plus ceux que tu as ajoutés)
function joursFeriesDe(annee) {
  const resultat = {};
  const pays = PAYS_FERIES[agenda.paysFeries];
  if (pays) {
    pays.feries.forEach((cle) => {
      if (agenda.feriesMasques.includes(cle)) return;
      resultat[FERIES[cle].date(annee)] = FERIES[cle].nom;
    });
  }
  // Les tiens : { id, nom, jourMois: "03-15" }, chaque année
  agenda.feriesPerso.forEach((ferie) => {
    resultat[`${annee}-${ferie.jourMois}`] = ferie.nom;
  });
  return resultat;
}

// Le nom du jour férié, ou null
function ferieDuJour(dateTexte) {
  const annee = Number(dateTexte.slice(0, 4));
  return joursFeriesDe(annee)[dateTexte] || null;
}
