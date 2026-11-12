// =====================================================
// Module Agenda — partie 3 : ajouter et modifier
//   1. le menu du + (une tâche, un événement, un anniversaire, une dépense)
//   2. la feuille « tâche / événement / anniversaire » : ouvrir, adapter, enregistrer
// =====================================================

// ---------- 1. Le menu du + ----------

const feuillePlus = document.getElementById("feuille-plus");
let datePourLePlus = null; // la date proposée (le jour choisi dans l'Agenda)

// Ouvre le petit menu. dateTexte : le jour à proposer (sinon, aujourd'hui)
function ouvrirMenuPlus(dateTexte) {
  datePourLePlus = dateTexte || aujourdhuiEnTexte();
  feuillePlus.hidden = false;
  voile.hidden = false;
}

function fermerMenuPlus() {
  feuillePlus.hidden = true;
  voile.hidden = true;
}

// Le + de la barre du bas : dans l'Agenda, il propose le jour choisi
document.querySelector(".bouton-plus").addEventListener("click", () => {
  const dansLAgenda = document.getElementById("agenda").classList.contains("actif");
  ouvrirMenuPlus(dansLAgenda ? jourChoisi : aujourdhuiEnTexte());
});

document.getElementById("fermer-plus").addEventListener("click", fermerMenuPlus);
document.getElementById("plus-tache").addEventListener("click", () => {
  fermerMenuPlus();
  ouvrirFeuilleElement(null, { type: "tache", date: datePourLePlus });
});
document.getElementById("plus-evenement").addEventListener("click", () => {
  fermerMenuPlus();
  ouvrirFeuilleElement(null, { type: "evenement", date: datePourLePlus });
});
document.getElementById("plus-anniversaire").addEventListener("click", () => {
  fermerMenuPlus();
  ouvrirFeuilleElement(null, { type: "anniversaire", date: datePourLePlus });
});
document.getElementById("plus-depense").addEventListener("click", () => {
  fermerMenuPlus();
  ouvrirFeuilleDepense(null); // dans budget-mois.js
});

// ---------- 2. La feuille « tâche / événement » ----------

const feuilleElement = document.getElementById("feuille-element");
const formElement = document.getElementById("form-element");
const elementTitre = document.getElementById("element-titre");
const elementDate = document.getElementById("element-date");
const elementSansDate = document.getElementById("element-sans-date");
const elementHeure = document.getElementById("element-heure");
const elementJournee = document.getElementById("element-journee");
const elementUrgent = document.getElementById("element-urgent");
const elementLimite = document.getElementById("element-limite");
const elementNaissance = document.getElementById("element-naissance");
const elementRepetition = document.getElementById("element-repetition");
const elementFinRepetition = document.getElementById("element-fin-repetition");

let elementEnModification = null;

// Le type choisi : "tache", "evenement" ou "anniversaire".
// (Dans le tiroir, un anniversaire reste un événement avec anniversaire: true :
// comme ça, ceux que tu as déjà notés continuent de marcher.)
function typeElementChoisi() {
  return formElement.querySelector('input[name="element-type"]:checked').value;
}

// Les pastilles des catégories, chacune avec sa couleur
function afficherChoixCategories(codeChoisi) {
  const zone = document.getElementById("element-categories");
  zone.replaceChildren();
  agenda.categories.forEach((categorie) => {
    const pastille = document.createElement("label");
    pastille.classList.add("pastille", "pastille-categorie");
    // La couleur de la catégorie, gardée dans une « variable CSS » de la pastille
    pastille.style.setProperty("--couleur-categorie", categorie.couleur);
    const bouton = document.createElement("input");
    bouton.type = "radio";
    bouton.name = "element-categorie";
    bouton.value = categorie.code;
    bouton.checked = categorie.code === codeChoisi;
    pastille.append(bouton, creerPastilleCategorie(categorie.code), categorie.nom);
    zone.appendChild(pastille);
  });
}

// Montre ou cache les champs selon le type et les cases cochées
function adapterFeuilleElement() {
  const tache = typeElementChoisi() === "tache";
  const anniversaire = typeElementChoisi() === "anniversaire";
  const enModification = Boolean(elementEnModification);

  let titre = tache ? "Nouvelle tâche" : "Nouvel événement";
  if (anniversaire) titre = "Nouvel anniversaire";
  if (enModification) titre = tache ? "Modifier la tâche" : "Modifier l'événement";
  if (enModification && anniversaire) titre = "Modifier l'anniversaire";
  document.getElementById("element-feuille-titre").textContent = titre;
  formElement.querySelector('button[type="submit"]').textContent = enModification
    ? "Enregistrer"
    : "Ajouter";
  elementTitre.placeholder = tache ? "Ex. : Appeler le garage" : "Ex. : Dentiste";
  if (anniversaire) elementTitre.placeholder = "Son prénom (ex. : Léa)";

  // Un anniversaire : chaque année, toute la journée, sa propre catégorie.
  // On cache donc l'heure, la répétition et les catégories.
  elementNaissance.hidden = !anniversaire;
  document.getElementById("etiquette-quand").textContent = anniversaire
    ? "Le jour de l'anniversaire"
    : "Quand ?";
  document.getElementById("bloc-categories").hidden = anniversaire;

  // La répétition : pas pour le pense-bête ni pour un anniversaire
  const sansDate = tache && elementSansDate.checked;
  document.getElementById("bloc-repetition").hidden = anniversaire || sansDate;
  document.getElementById("bloc-fin-repetition").hidden = elementRepetition.value === "";
  document.getElementById("note-repetition").hidden =
    !enModification || elementRepetition.value === "";

  // Tâche : « sans date » (pense-bête), urgent, échéance
  document.getElementById("bloc-element-urgent").hidden = !tache;
  // Événement : l'heure, ou « toute la journée »
  document.getElementById("bloc-element-heure").hidden = tache || anniversaire;

  elementHeure.hidden = elementJournee.checked;
  document.getElementById("supprimer-element").hidden = !enModification;

  // Les dates rapides (pas pour un anniversaire : on choisit sa vraie date)
  document.getElementById("choix-dates").hidden = anniversaire;
  document.querySelector(".pastille-pense-bete").hidden = !tache;
  document.getElementById("bloc-sans-date").hidden = true; // remplacé par « Un jour »
  marquerDateChoisie();
  elementDate.hidden = !anniversaire && !dateLibre;
  if (tache && elementSansDate.checked) elementDate.hidden = true;

  // « Plus d'options » : répétition (pas pour un anniversaire), urgent et échéance (tâches)
  document.getElementById("element-options").hidden = anniversaire;
  document.getElementById("bloc-limite").hidden = !tache;
}

// ---------- Les dates rapides ----------

let dateLibre = false; // true : on a touché « Choisir… », le calendrier reste ouvert

// Le prochain samedi (ou aujourd'hui, si on est déjà le week-end)
function prochainWeekend() {
  const aujourdhui = aujourdhuiEnTexte();
  const jour = texteEnDate(aujourdhui).getDay(); // 0 = dimanche, 6 = samedi
  if (jour === 6 || jour === 0) return aujourdhui;
  return ajouterJours(aujourdhui, 6 - jour);
}

// Quelle pastille correspond à la date du formulaire ?
function quandActuel() {
  if (typeElementChoisi() === "tache" && elementSansDate.checked) return "pense-bete";
  if (dateLibre) return "choisir";
  const aujourdhui = aujourdhuiEnTexte();
  if (elementDate.value === aujourdhui) return "aujourdhui";
  if (elementDate.value === ajouterJours(aujourdhui, 1)) return "demain";
  if (elementDate.value === prochainWeekend()) return "weekend";
  return "choisir";
}

function marquerDateChoisie() {
  const quand = quandActuel();
  // Une autre date que les raccourcis : on montre le calendrier
  if (quand === "choisir") dateLibre = true;
  document.querySelectorAll(".pastille-date").forEach((pastille) => {
    pastille.classList.toggle("choisie", pastille.dataset.quand === quand);
  });
}

document.querySelectorAll(".pastille-date").forEach((pastille) => {
  pastille.addEventListener("click", () => {
    const quand = pastille.dataset.quand;
    const aujourdhui = aujourdhuiEnTexte();
    elementSansDate.checked = quand === "pense-bete";
    dateLibre = quand === "choisir";
    if (quand === "aujourdhui") elementDate.value = aujourdhui;
    if (quand === "demain") elementDate.value = ajouterJours(aujourdhui, 1);
    if (quand === "weekend") elementDate.value = prochainWeekend();
    adapterFeuilleElement();
    if (quand === "choisir") elementDate.focus();
  });
});

document.querySelectorAll('input[name="element-type"]').forEach((bouton) => {
  bouton.addEventListener("change", adapterFeuilleElement);
});
elementSansDate.addEventListener("change", adapterFeuilleElement);
elementJournee.addEventListener("change", adapterFeuilleElement);
elementRepetition.addEventListener("change", adapterFeuilleElement);

// Ouvre la feuille. Avec un élément : on le modifie.
// Sans : on en crée un, avec les valeurs proposées (type, date).
function ouvrirFeuilleElement(element, propose = {}) {
  formElement.reset();
  elementEnModification = element ? element.id : null;

  const valeurs = element || {
    type: propose.type || "tache",
    titre: "",
    date: propose.date === undefined ? aujourdhuiEnTexte() : propose.date,
    heure: "",
    categorie: agenda.categories[0].code,
    urgent: false,
    dateLimite: "",
    recurrence: "",
    finRepetition: "",
    anniversaire: false,
    anneeNaissance: "",
  };

  let type = valeurs.type;
  if (valeurs.anniversaire || type === "anniversaire") type = "anniversaire";
  document.querySelector(`input[name="element-type"][value="${type}"]`).checked = true;
  elementTitre.value = valeurs.titre;
  elementSansDate.checked = valeurs.date === "";
  elementDate.value = valeurs.date || aujourdhuiEnTexte();
  // « Toute la journée » : seulement pour un événement existant sans heure
  elementJournee.checked = Boolean(element) && element.type === "evenement" && !element.heure;
  elementHeure.value = valeurs.heure || "09:00";
  elementUrgent.checked = Boolean(valeurs.urgent);
  elementLimite.value = valeurs.dateLimite || "";
  // « Plus d'options » s'ouvre tout seul si l'élément en a déjà
  document.getElementById("element-options").open = Boolean(
    valeurs.dateLimite || valeurs.urgent || (valeurs.recurrence && !valeurs.anniversaire),
  );
  dateLibre = false;
  elementNaissance.value = valeurs.anneeNaissance || "";
  elementRepetition.value = valeurs.recurrence || "";
  elementFinRepetition.value = valeurs.finRepetition || "";
  afficherChoixCategories(valeurs.categorie);
  adapterFeuilleElement();

  feuilleElement.hidden = false;
  voile.hidden = false;
  elementTitre.focus();
}

function fermerFeuilleElement() {
  feuilleElement.hidden = true;
  voile.hidden = true;
  elementEnModification = null;
}

document.getElementById("fermer-element").addEventListener("click", fermerFeuilleElement);

// Toucher le voile sombre ferme aussi le menu et cette feuille
voile.addEventListener("click", () => {
  if (!feuillePlus.hidden) fermerMenuPlus();
  if (!feuilleElement.hidden) fermerFeuilleElement();
});

// Supprimer
document.getElementById("supprimer-element").addEventListener("click", () => {
  const element = agenda.elements.find((el) => el.id === elementEnModification);
  if (!element) return;
  fermerFeuilleElement();
  agirAvecAnnuler({
    tiroir: agenda,
    message: `« ${element.titre} » supprimé`,
    action: () => {
      agenda.elements = agenda.elements.filter((el) => el.id !== element.id);
    },
    apres: () => {
      sauvegarderAgenda();
      rafraichirAgenda();
    },
  });
});

// Enregistrer
formElement.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const titre = elementTitre.value.trim();
  if (!titre) return;

  const tache = typeElementChoisi() === "tache";
  const categorieCochee = formElement.querySelector('input[name="element-categorie"]:checked');
  const anniversaire = typeElementChoisi() === "anniversaire";
  const sansDate = tache && elementSansDate.checked;

  const valeurs = {
    type: tache ? "tache" : "evenement",
    titre: titre,
    // Une tâche « sans date » va dans le pense-bête
    date: tache && elementSansDate.checked ? "" : elementDate.value,
    heure: !tache && !elementJournee.checked ? elementHeure.value : "",
    categorie: categorieCochee ? categorieCochee.value : agenda.categories[0].code,
    urgent: tache && elementUrgent.checked,
    dateLimite: tache ? elementLimite.value : "",
    recurrence: sansDate ? "" : elementRepetition.value,
    finRepetition: sansDate || !elementRepetition.value ? "" : elementFinRepetition.value,
    anniversaire: anniversaire,
    anneeNaissance: anniversaire && elementNaissance.value ? Number(elementNaissance.value) : "",
  };

  // Un anniversaire : chaque année, toute la journée, sa couleur à lui
  if (anniversaire) {
    valeurs.recurrence = "annee";
    valeurs.finRepetition = "";
    valeurs.heure = "";
    valeurs.categorie = ANNIVERSAIRE.code;
  }

  const etaitUneModification = Boolean(elementEnModification);
  if (elementEnModification) {
    const element = agenda.elements.find((el) => el.id === elementEnModification);
    Object.assign(element, valeurs);
  } else {
    agenda.elements.push({ id: nouvelId(), ...valeurs, fait: false });
  }

  sauvegarderAgenda();
  fermerFeuilleElement();
  rafraichirAgenda();
  montrerPetitMessage(etaitUneModification ? "C'est modifié 🌱" : "C'est noté 🌱");
});
