// =====================================================
// Module Agenda — partie 3 : ajouter et modifier
//   1. le menu du + (une tâche, un événement, une dépense)
//   2. la feuille « tâche / événement » : ouvrir, adapter, enregistrer
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

let elementEnModification = null;

// Le type choisi : "tache" ou "evenement"
function typeElementChoisi() {
  return formElement.querySelector('input[name="element-type"]:checked').value;
}

// Les pastilles des catégories, chacune avec sa couleur
function afficherChoixCategories(codeChoisi) {
  const zone = document.getElementById("element-categories");
  zone.replaceChildren();
  CATEGORIES.forEach((categorie) => {
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
  const enModification = Boolean(elementEnModification);

  let titre = tache ? "Nouvelle tâche" : "Nouvel événement";
  if (enModification) titre = tache ? "Modifier la tâche" : "Modifier l'événement";
  document.getElementById("element-feuille-titre").textContent = titre;
  formElement.querySelector('button[type="submit"]').textContent = enModification
    ? "Enregistrer"
    : "Ajouter";
  elementTitre.placeholder = tache ? "Ex. : Appeler le garage" : "Ex. : Dentiste";

  // Tâche : « sans date » (pense-bête), urgent, échéance
  document.getElementById("bloc-sans-date").hidden = !tache;
  document.getElementById("bloc-element-urgent").hidden = !tache;
  document.getElementById("element-options").hidden = !tache;
  // Événement : l'heure, ou « toute la journée »
  document.getElementById("bloc-element-heure").hidden = tache;

  elementDate.hidden = tache && elementSansDate.checked;
  elementHeure.hidden = elementJournee.checked;
  document.getElementById("supprimer-element").hidden = !enModification;
}

document.querySelectorAll('input[name="element-type"]').forEach((bouton) => {
  bouton.addEventListener("change", adapterFeuilleElement);
});
elementSansDate.addEventListener("change", adapterFeuilleElement);
elementJournee.addEventListener("change", adapterFeuilleElement);

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
    categorie: "perso",
    urgent: false,
    dateLimite: "",
  };

  document.querySelector(`input[name="element-type"][value="${valeurs.type}"]`).checked = true;
  elementTitre.value = valeurs.titre;
  elementSansDate.checked = valeurs.date === "";
  elementDate.value = valeurs.date || aujourdhuiEnTexte();
  // « Toute la journée » : seulement pour un événement existant sans heure
  elementJournee.checked = Boolean(element) && element.type === "evenement" && !element.heure;
  elementHeure.value = valeurs.heure || "09:00";
  elementUrgent.checked = Boolean(valeurs.urgent);
  elementLimite.value = valeurs.dateLimite || "";
  document.getElementById("element-options").open = Boolean(valeurs.dateLimite);
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
  if (!element || !confirm(`Supprimer « ${element.titre} » ?`)) return;
  agenda.elements = agenda.elements.filter((el) => el.id !== element.id);
  sauvegarderAgenda();
  fermerFeuilleElement();
  rafraichirAgenda();
});

// Enregistrer
formElement.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const titre = elementTitre.value.trim();
  if (!titre) return;

  const tache = typeElementChoisi() === "tache";
  const categorieCochee = formElement.querySelector('input[name="element-categorie"]:checked');

  const valeurs = {
    type: tache ? "tache" : "evenement",
    titre: titre,
    // Une tâche « sans date » va dans le pense-bête
    date: tache && elementSansDate.checked ? "" : elementDate.value,
    heure: !tache && !elementJournee.checked ? elementHeure.value : "",
    categorie: categorieCochee ? categorieCochee.value : "perso",
    urgent: tache && elementUrgent.checked,
    dateLimite: tache ? elementLimite.value : "",
  };

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
