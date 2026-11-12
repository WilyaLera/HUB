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

// Carte menu //
const menu = [
  { moment: "Midi", plat: "Salade de lentilles" },
  { moment: "Soir", plat: "Curry de légumes" },
  { moment: "Goûter", plat: "Banane" },
];
const listeMenu = document.getElementById("liste-menu");

menu.forEach((repas) => {
  const ligne = document.createElement("p");

  const moment = document.createElement("strong");
  moment.textContent = repas.moment;

  ligne.appendChild(moment);
  ligne.append(` · ${repas.plat}`);
  listeMenu.appendChild(ligne);
});

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

  // D'abord les rendez-vous du jour, puis les tâches (avec « Demain »)
  evenements.forEach((ev) => listeTaches.appendChild(creerLigneElement(ev)));
  taches.forEach((tache) => {
    listeTaches.appendChild(creerLigneElement(tache, { avecDemain: true }));
  });

  const lien = creerLienToutGlisser(taches);
  if (lien) listeTaches.appendChild(lien);

  // Journée vide : on pioche une idée dans le pense-bête
  if (taches.length === 0 && evenements.length === 0) {
    const idees = penseBete();
    if (idees.length > 0) {
      if (!ideeAccueil || !idees.includes(ideeAccueil)) {
        ideeAccueil = piocherIdee(null);
      }
      listeTaches.appendChild(
        creerPioche(ideeAccueil, () => {
          ideeAccueil = piocherIdee(ideeAccueil.id);
          afficherCarteAujourdhui();
        }),
      );
    } else {
      listeTaches.appendChild(creerMessageVide("Rien de prévu aujourd'hui. Profite 🌸"));
    }
  }
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
    categorie: "perso",
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
