// =====================================================
// Module Agenda — partie 1 : les données et les outils
//   1. les catégories (et leurs couleurs)
//   2. le tiroir « agenda » (et le déménagement des anciennes tâches)
//   3. trouver les éléments d'un jour
//   4. reporter sans culpabilité (« Demain », « Tout glisser à demain »)
//   5. le pense-bête et sa pioche
//   6. fabriquer une ligne (tâche ou événement), utilisée partout
//
// Un « élément » de l'agenda, c'est soit une TÂCHE (à cocher),
// soit un ÉVÉNEMENT (un moment, rien à cocher) :
//   { id, type: "tache" | "evenement", titre,
//     date: "2026-11-12" (ou "" pour une tâche du pense-bête),
//     heure: "14:30" (ou "" = sans heure / toute la journée),
//     categorie: "perso" | "maison" | "travail" | "sorties" | "sante" | "anniversaire" | "admin",
//     fait, urgent, dateLimite (tâches seulement) }
// =====================================================

// ---------- 1. Les catégories ----------

const CATEGORIES = [
  { code: "perso", nom: "Perso", couleur: "#C4704F" },
  { code: "maison", nom: "Maison", couleur: "#7E9C80" },
  { code: "travail", nom: "Travail", couleur: "#5E7FA3" },
  { code: "sorties", nom: "Sorties", couleur: "#C98B8B" },
  { code: "sante", nom: "Santé & soin", couleur: "#C99A3E" },
  { code: "anniversaire", nom: "Anniversaire", couleur: "#B06A9C" },
  { code: "admin", nom: "Administratif", couleur: "#7abfd4" },
];

// "maison" → { code, nom, couleur } (Perso si on ne trouve pas)
function categorieDe(code) {
  return CATEGORIES.find((c) => c.code === code) || CATEGORIES[0];
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

function sauvegarderAgenda() {
  sauvegarder("agenda", agenda);
}

// Redessine tout ce qui montre l'agenda (l'écran Agenda ET la carte de l'Accueil)
function rafraichirAgenda() {
  afficherAgenda(); // dans agenda-vues.js
  afficherCarteAujourdhui(); // dans accueil.js
}

// ---------- 3. Les éléments d'un jour ----------

function estUneTache(element) {
  return element.type === "tache";
}

// Les tâches d'un jour. Aujourd'hui, on y ajoute aussi celles des jours
// passés qui ne sont pas faites : elles reviennent doucement, sans disparaître.
function tachesDuJour(dateTexte) {
  const aujourdhui = aujourdhuiEnTexte();
  return agenda.elements.filter((el) => {
    if (!estUneTache(el) || el.date === "") return false;
    if (el.date === dateTexte) return true;
    return dateTexte === aujourdhui && el.date < aujourdhui && !el.fait;
  });
}

// Les événements d'un jour, ceux « toute la journée » d'abord, puis par heure
function evenementsDuJour(dateTexte) {
  return agenda.elements
    .filter((el) => !estUneTache(el) && el.date === dateTexte)
    .sort((a, b) => a.heure.localeCompare(b.heure));
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
  if (tache.fait || tache.urgent) return false;
  if (tache.dateLimite && aujourdhuiEnTexte() >= tache.dateLimite) return false;
  return true;
}

function glisserADemain(tache) {
  tache.date = ajouterJours(aujourdhuiEnTexte(), 1);
}

// « Tout glisser à demain » : seulement les tâches qui le peuvent
function toutGlisserADemain(taches) {
  taches.filter(peutGlisser).forEach(glisserADemain);
  sauvegarderAgenda();
  rafraichirAgenda();
  montrerPetitMessage("C'est pour demain 🌙");
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

function cocherTache(tache, fait) {
  tache.fait = fait;
  sauvegarderAgenda();
  rafraichirAgenda();
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
function creerLigneElement(element, options = {}) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-agenda");

  if (estUneTache(element)) {
    // La case à cocher
    const caseACocher = document.createElement("input");
    caseACocher.type = "checkbox";
    caseACocher.checked = element.fait;
    caseACocher.setAttribute("aria-label", `Fait : ${element.titre}`);
    caseACocher.addEventListener("change", () =>
      cocherTache(element, caseACocher.checked),
    );
    ligne.appendChild(caseACocher);
    ligne.classList.toggle("ligne-faite", element.fait);
  } else {
    // L'heure de l'événement (ou « Journée »)
    const heure = document.createElement("span");
    heure.classList.add("agenda-heure");
    heure.textContent = element.heure || "Journée";
    ligne.appendChild(heure);
  }

  // Le titre et les petits détails : on les touche pour modifier
  const zone = document.createElement("button");
  zone.type = "button";
  zone.classList.add("ligne-agenda-ouvrir");
  zone.addEventListener("click", () => ouvrirFeuilleElement(element)); // agenda-feuille.js

  const titre = document.createElement("span");
  titre.classList.add("ligne-agenda-titre");
  titre.append(creerPastilleCategorie(element.categorie), element.titre);
  zone.appendChild(titre);

  // Les petites étiquettes : urgent, reportée, échéance
  const details = [];
  if (element.urgent && !element.fait) details.push("Urgent");
  const aujourdhui = aujourdhuiEnTexte();
  if (
    estUneTache(element) &&
    element.date &&
    element.date < aujourdhui &&
    !element.fait
  ) {
    details.push(`du ${formaterDate(element.date, false)}`);
  }
  if (element.dateLimite && !element.fait) {
    details.push(
      element.dateLimite === aujourdhui
        ? "à faire aujourd'hui"
        : `avant le ${formaterDate(element.dateLimite, false)}`,
    );
  }
  if (details.length > 0) {
    const petit = document.createElement("span");
    petit.classList.add("ligne-agenda-details");
    petit.classList.toggle("est-urgent", element.urgent && !element.fait);
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
    demain.addEventListener("click", () => {
      glisserADemain(element);
      sauvegarderAgenda();
      rafraichirAgenda();
      montrerPetitMessage("C'est pour demain 🌙");
    });
    ligne.appendChild(demain);
  }

  return ligne;
}
