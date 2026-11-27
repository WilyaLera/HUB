// =====================================================
// Modifier quelque chose qu'on a écrit : une petite feuille commune à tous les modules
//   ouvrirEdition({ titre, champs: [{ cle, nom, type, valeur, options }], enregistrer(valeurs) })
//   type : "text" (par défaut), "number", "date", "url", "select" (options : [[valeur, texte]])
// =====================================================

const feuilleModifier = document.getElementById("feuille-modifier");
const formModifier = document.getElementById("form-modifier");
let modificationEnCours = null;

function ouvrirEdition(modification) {
  modificationEnCours = modification;
  document.getElementById("modifier-titre").textContent = modification.titre || "Modifier";
  const zone = document.getElementById("modifier-champs");
  zone.replaceChildren();
  modification.champs.forEach((champ, i) => {
    const label = document.createElement("label");
    label.classList.add("champ");
    label.append(champ.nom);
    let element;
    if (champ.type === "select") {
      element = document.createElement("select");
      champ.options.forEach(([valeur, texte]) => {
        const option = document.createElement("option");
        option.value = valeur;
        option.textContent = texte;
        element.appendChild(option);
      });
    } else {
      element = document.createElement("input");
      element.type = champ.type || "text";
      if (champ.type === "number") element.inputMode = "decimal";
    }
    element.classList.add("champ-note");
    element.name = champ.cle;
    element.value = champ.valeur ?? "";
    label.appendChild(element);
    zone.appendChild(label);
    if (i === 0) setTimeout(() => element.focus(), 50);
  });
  feuilleModifier.hidden = false;
  voile.hidden = false;
}

function fermerEdition() {
  feuilleModifier.hidden = true;
  voile.hidden = true;
  modificationEnCours = null;
}

document.getElementById("fermer-modifier").addEventListener("click", fermerEdition);
voile.addEventListener("click", () => {
  if (!feuilleModifier.hidden) fermerEdition();
});

formModifier.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!modificationEnCours) return;
  const valeurs = {};
  modificationEnCours.champs.forEach((champ) => {
    const brut = formModifier.elements[champ.cle].value;
    valeurs[champ.cle] = champ.type === "number" ? Number(String(brut).replace(/\s/g, "").replace(",", ".")) || 0 : brut.trim();
  });
  const enregistrer = modificationEnCours.enregistrer;
  // Une feuille ouverte en dessous (la fiche d'un loisir…) reste visible : on ne cache que celle-ci
  feuilleModifier.hidden = true;
  modificationEnCours = null;
  if (!document.querySelector(".feuille:not([hidden])")) voile.hidden = true;
  enregistrer(valeurs);
  montrerPetitMessage("C'est modifié 🌱");
});

// Un petit bouton crayon, pour les lignes
function creerBoutonModifier(etiquette, quandOnTouche) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add("bouton-supprimer", "bouton-modifier");
  bouton.setAttribute("aria-label", etiquette);
  bouton.appendChild(creerIcone("pencil"));
  bouton.addEventListener("click", quandOnTouche);
  return bouton;
}
