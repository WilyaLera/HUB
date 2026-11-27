// =====================================================
// Ma petite famille : les personnes et les animaux de la maison
//   Tiroir « famille » : { personnes: [{ id, type, nom }], animaux: [{ id, type, nom }], partage: [codes] }
//   Ces fiches « membre » servent partout : le placard (rayon Animaux), et plus tard la Maison, Mon coin…
//   partage : ce qu'on partagera avec le foyer (courses, menus…), quand la version en ligne existera.
// =====================================================

const PERSONNES_FAMILLE = [
  { code: "conjoint", nom: "Conjoint·e", icone: "heart" },
  { code: "coloc", nom: "Coloc", icone: "users" },
  { code: "enfant", nom: "Enfant", icone: "baby" },
  { code: "proche", nom: "Proche", icone: "user" },
];
const ESPECES = [
  { code: "chat", nom: "Chat", icone: "cat" },
  { code: "chien", nom: "Chien", icone: "dog" },
  { code: "rongeur", nom: "Rongeur", icone: "rabbit" },
  { code: "oiseau", nom: "Oiseau", icone: "bird" },
  { code: "poisson", nom: "Poisson", icone: "fish" },
  { code: "autre", nom: "Autre animal", icone: "paw-print" },
];

let famille = charger("famille", { personnes: [], animaux: [], partage: [] });
if (!famille.personnes) famille.personnes = [];
if (!famille.animaux) famille.animaux = [];
if (!famille.partage) famille.partage = [];

function sauvegarderFamille() {
  sauvegarder("famille", famille);
}

function especesDeLaFamille() {
  return [...new Set(famille.animaux.map((a) => a.type))];
}

function typeMembre(code) {
  return PERSONNES_FAMILLE.find((t) => t.code === code) || ESPECES.find((t) => t.code === code) || ESPECES[ESPECES.length - 1];
}

function estUnAnimal(code) {
  return ESPECES.some((e) => e.code === code);
}

// Un conjoint ou un coloc : on pourra partager le foyer (version en ligne)
function foyerAPartager() {
  return famille.personnes.some((p) => p.type === "conjoint" || p.type === "coloc");
}

// Les modules qui dépendent de la famille se mettent à jour
function quandFamilleChange() {
  if (typeof mettreAJourPlacardFamille === "function") mettreAJourPlacardFamille();
  if (typeof mettreAJourMaisonFamille === "function") {
    mettreAJourMaisonFamille();
    afficherMaison();
  }
  document.querySelectorAll("[data-liste-famille]").forEach((zone) => afficherFamille(zone));
}

function ajouterMembre(type, nom) {
  const modele = typeMembre(type);
  const membre = { id: String(nouvelId()) + Math.random().toString(36).slice(2, 5), type, nom: nom || modele.nom };
  (estUnAnimal(type) ? famille.animaux : famille.personnes).push(membre);
  sauvegarderFamille();
  quandFamilleChange();
}

// Une pastille par membre : son icône, son nom (modifiable), une croix pour le retirer
function afficherFamille(zone) {
  zone.replaceChildren();
  const membres = [...famille.personnes, ...famille.animaux];
  if (membres.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre", "petit");
    vide.textContent = "Juste toi pour l'instant.";
    zone.appendChild(vide);
  }
  membres.forEach((membre) => {
    const modele = typeMembre(membre.type);
    const pastille = document.createElement("span");
    pastille.classList.add("pastille-reserve", "pastille-animal");
    const nom = document.createElement("input");
    nom.type = "text";
    nom.value = membre.nom;
    nom.maxLength = 20;
    nom.setAttribute("aria-label", `Prénom ou nom (${modele.nom.toLowerCase()})`);
    nom.addEventListener("change", () => {
      membre.nom = nom.value.trim() || modele.nom;
      sauvegarderFamille();
    });
    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.setAttribute("aria-label", `Retirer ${membre.nom}`);
    retirer.appendChild(creerIcone("x"));
    retirer.addEventListener("click", () =>
      agirAvecAnnuler({
        tiroir: famille,
        message: `${membre.nom} retiré de ta petite famille`,
        action: () => {
          famille.personnes = famille.personnes.filter((m) => m.id !== membre.id);
          famille.animaux = famille.animaux.filter((m) => m.id !== membre.id);
        },
        apres: () => {
          sauvegarderFamille();
          quandFamilleChange();
        },
      }),
    );
    pastille.append(creerIcone(modele.icone), nom, retirer);
    zone.appendChild(pastille);
  });
}

// Le petit formulaire « + Ajouter » (le même dans les Réglages et à la bienvenue)
function creerFormMembre() {
  const form = document.createElement("form");
  form.classList.add("form-animal");
  const choix = document.createElement("select");
  choix.classList.add("champ-note");
  choix.setAttribute("aria-label", "Qui ?");
  [["Personnes", PERSONNES_FAMILLE], ["Animaux", ESPECES]].forEach(([titre, liste]) => {
    const groupe = document.createElement("optgroup");
    groupe.label = titre;
    liste.forEach((t) => {
      const option = document.createElement("option");
      option.value = t.code;
      option.textContent = t.nom;
      groupe.appendChild(option);
    });
    choix.appendChild(groupe);
  });
  const nom = document.createElement("input");
  nom.type = "text";
  nom.classList.add("champ-note");
  nom.maxLength = 20;
  nom.placeholder = "Prénom ou nom";
  const bouton = document.createElement("button");
  bouton.type = "submit";
  bouton.classList.add("bouton-rond", "bouton-rond-plein");
  bouton.setAttribute("aria-label", "Ajouter à ma petite famille");
  bouton.appendChild(creerIcone("plus"));
  form.append(choix, nom, bouton);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ajouterMembre(choix.value, nom.value.trim());
    nom.value = "";
    montrerPetitMessage("Bienvenue dans ta petite famille 🌱");
  });
  return form;
}

// Dans les Réglages
document.getElementById("form-animal-zone").appendChild(creerFormMembre());
quandFamilleChange();
