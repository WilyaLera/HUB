// =====================================================
// Ma petite famille : pour l'instant, les animaux
//   Tiroir « famille » : { animaux: [{ id, type, nom }] }
//   (comme prévu dans le document : animal = { id, type, nom }).
//   Le placard (et plus tard la Maison, Mon coin) s'en servent.
// =====================================================

const ESPECES = [
  { code: "chat", nom: "Chat", icone: "cat" },
  { code: "chien", nom: "Chien", icone: "dog" },
  { code: "rongeur", nom: "Rongeur", icone: "rabbit" },
  { code: "oiseau", nom: "Oiseau", icone: "bird" },
  { code: "poisson", nom: "Poisson", icone: "fish" },
  { code: "autre", nom: "Autre", icone: "paw-print" },
];

let famille = charger("famille", { animaux: [] });

function sauvegarderFamille() {
  sauvegarder("famille", famille);
}

function especesDeLaFamille() {
  return [...new Set(famille.animaux.map((a) => a.type))];
}

// Les modules qui dépendent de la famille se mettent à jour
function quandFamilleChange() {
  if (typeof mettreAJourPlacardFamille === "function") mettreAJourPlacardFamille();
}

function afficherFamille() {
  const zone = document.getElementById("liste-animaux");
  zone.replaceChildren();
  if (famille.animaux.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre", "petit");
    vide.textContent = "Pas d'animal pour l'instant.";
    zone.appendChild(vide);
  }
  famille.animaux.forEach((animal) => {
    const espece = ESPECES.find((e) => e.code === animal.type) || ESPECES[ESPECES.length - 1];
    const pastille = document.createElement("span");
    pastille.classList.add("pastille-reserve", "pastille-animal");
    const icone = creerIcone(espece.icone);
    const nom = document.createElement("input");
    nom.type = "text";
    nom.value = animal.nom;
    nom.maxLength = 20;
    nom.setAttribute("aria-label", `Nom de ton ${espece.nom.toLowerCase()}`);
    nom.addEventListener("change", () => {
      animal.nom = nom.value.trim() || espece.nom;
      sauvegarderFamille();
    });
    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.setAttribute("aria-label", `Retirer ${animal.nom}`);
    retirer.appendChild(creerIcone("x"));
    retirer.addEventListener("click", () =>
      agirAvecAnnuler({
        tiroir: famille,
        message: `${animal.nom} retiré de ta petite famille`,
        action: () => {
          famille.animaux = famille.animaux.filter((a) => a.id !== animal.id);
        },
        apres: () => {
          sauvegarderFamille();
          afficherFamille();
          quandFamilleChange();
        },
      }),
    );
    pastille.append(icone, nom, retirer);
    zone.appendChild(pastille);
  });
}

const choixEspece = document.getElementById("animal-espece");
ESPECES.forEach((e) => {
  const option = document.createElement("option");
  option.value = e.code;
  option.textContent = e.nom;
  choixEspece.appendChild(option);
});

document.getElementById("form-animal").addEventListener("submit", (e) => {
  e.preventDefault();
  const espece = ESPECES.find((x) => x.code === choixEspece.value);
  const champ = document.getElementById("animal-nom");
  famille.animaux.push({ id: String(nouvelId()), type: espece.code, nom: champ.value.trim() || espece.nom });
  champ.value = "";
  sauvegarderFamille();
  afficherFamille();
  quandFamilleChange();
  montrerPetitMessage("Bienvenue dans ta petite famille 🌱");
});

afficherFamille();
