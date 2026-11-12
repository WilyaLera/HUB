// =====================================================
// Écran Accueil
// =====================================================

// Date et salutation //
const aujourdhui = new Date();
const dateEnLettre = aujourdhui.toLocaleDateString("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
document.getElementById("date-du-jour").textContent = dateEnLettre;

const heure = new Date().getHours();
let message = "Bonjour";
if (heure >= 18) {
  message = "Bonsoir";
} else if (heure >= 12) {
  message = "Bon après-midi";
}
const prenom = charger("prenom", "");
let texte = message;
if (prenom) {
  texte = `${message}, ${prenom} `;
}
document.getElementById("salutation").textContent = texte;

// (La carte « Au menu » reviendra avec le module Repas)

//Carte Aujourd'hui //
// Elle montre les tâches et les événements du jour, tirés de l'Agenda
// (le tiroir « agenda » : voir agenda.js).
// Les tâches pas faites des jours d'avant reviennent ici, doucement.

const listeTaches = document.getElementById("liste-taches");
let ideeAccueil = null; // l'idée du pense-bête proposée quand la journée est vide

function afficherCarteAujourdhui() {
  const aujourdhui = aujourdhuiEnTexte();
  listeTaches.replaceChildren();

  const evenements = evenementsDuJour(aujourdhui);
  const taches = tachesDuJour(aujourdhui);

  // Le petit rappel de la veille : « Demain, c'est l'anniversaire de Léa »
  anniversairesDeDemain().forEach((anniv) => {
    const rappel = document.createElement("p");
    rappel.classList.add("rappel-anniversaire");
    rappel.append(
      creerIcone("cake"),
      `Demain, c'est l'${titreAffiche(anniv, ajouterJours(aujourdhui, 1)).replace("Anniversaire", "anniversaire")}`,
    );
    listeTaches.appendChild(rappel);
  });

  // D'abord les rendez-vous du jour, puis les tâches (avec « Demain »)
  evenements.forEach((ev) => {
    listeTaches.appendChild(creerLigneElement(ev, { date: aujourdhui }));
  });
  taches.forEach((tache) => {
    listeTaches.appendChild(creerLigneElement(tache, { avecDemain: true, date: aujourdhui }));
  });

  const lien = creerLienToutGlisser(taches);
  if (lien) listeTaches.appendChild(lien);

  // Journée vide : un petit mot doux
  if (taches.length === 0 && evenements.length === 0 && anniversairesDeDemain().length === 0) {
    listeTaches.appendChild(creerMessageVide("Rien de prévu aujourd'hui. Profite 🌸"));
  }

  afficherCarteDemain();
  afficherCarteIdee();
}

// Carte Demain //
// Un aperçu doux du lendemain : les rendez-vous, et combien de tâches.
function afficherCarteDemain() {
  const zone = document.getElementById("liste-demain");
  zone.replaceChildren();
  const demain = ajouterJours(aujourdhuiEnTexte(), 1);

  evenementsDuJour(demain).forEach((ev) => {
    zone.appendChild(creerLigneElement(ev, { date: demain }));
  });
  const nombre = tachesDuJour(demain).length;
  if (nombre > 0) {
    const ligne = document.createElement("p");
    ligne.classList.add("sous-titre");
    ligne.textContent = nombre === 1 ? "1 tâche prévue" : `${nombre} tâches prévues`;
    zone.appendChild(ligne);
  }
  if (zone.children.length === 0) {
    zone.appendChild(creerMessageVide("Rien de prévu demain. Une journée à toi 🌙"));
    zone.appendChild(
      creerBoutonAjouter("Ajouter pour demain", () => ouvrirMenuPlus(demain)), // agenda-feuille.js
    );
  }
}

document.getElementById("titre-demain").addEventListener("click", () => {
  ouvrirMenuPlus(ajouterJours(aujourdhuiEnTexte(), 1));
});

// Carte Idée //
// Une tâche du pense-bête, piochée au hasard (« Une autre » en pioche une nouvelle)
function afficherCarteIdee() {
  const zone = document.getElementById("zone-idee");
  zone.replaceChildren();
  const idees = penseBete();
  if (idees.length === 0) {
    zone.appendChild(creerMessageVide("Ton pense-bête est vide. Les idées sans date viendront ici."));
    return;
  }
  if (!ideeAccueil || !idees.includes(ideeAccueil)) {
    ideeAccueil = piocherIdee(null);
  }
  zone.appendChild(
    creerPioche(ideeAccueil, () => {
      ideeAccueil = piocherIdee(ideeAccueil.id);
      afficherCarteIdee();
    }),
  );
}

// Ajouter vite une tâche pour aujourd'hui
const formTache = document.getElementById("form-tache");
const champTache = document.getElementById("champ-tache");

formTache.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const titre = champTache.value.trim();
  if (!titre) return;

  agenda.elements.push({
    id: nouvelId(),
    type: "tache",
    titre: titre,
    date: aujourdhuiEnTexte(),
    heure: "",
    categorie: agenda.categories[0].code,
    fait: false,
    urgent: false,
    dateLimite: "",
  });
  sauvegarderAgenda();
  rafraichirAgenda();

  champTache.value = "";
});

//Carte Budget//
// Elle affiche maintenant les VRAIES données du Budget :
// c'est budget-mois.js qui la remplit, avec la même fonction que la carte
// de « Mon mois » : afficherResume("accueil", …).
