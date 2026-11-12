// =====================================================
// Écran Accueil : choisir ses cartes et leur ordre
// Rangé dans le tiroir « accueil » : { ordre: [...], masquees: [...] }
// =====================================================

const CARTES_ACCUEIL = [
  { code: "aujourdhui", nom: "Aujourd'hui", detail: "Tes rendez-vous et tâches du jour" },
  { code: "demain", nom: "Demain", detail: "L'aperçu du lendemain, le soir à partir de 17 h" },
  { code: "idee", nom: "Une idée du pense-bête", detail: "Une tâche sans date, piochée au hasard" },
  { code: "budget", nom: "Mon mois", detail: "Ce qu'il te reste pour vivre" },
];

let reglagesAccueil = charger("accueil", {
  ordre: CARTES_ACCUEIL.map((c) => c.code),
  masquees: [],
});
// Une carte arrivée dans une nouvelle version : on l'ajoute à la fin
CARTES_ACCUEIL.forEach((c) => {
  if (!reglagesAccueil.ordre.includes(c.code)) reglagesAccueil.ordre.push(c.code);
});

function nomCarte(code) {
  return CARTES_ACCUEIL.find((c) => c.code === code);
}

// Range les cartes dans l'ordre choisi, et cache les masquées
function placerCartesAccueil() {
  const leSoir = new Date().getHours() >= 17;
  reglagesAccueil.ordre.forEach((code, position) => {
    const carte = document.querySelector(`.carte-accueil[data-carte="${code}"]`);
    if (!carte) return;
    // « order » : la place de la carte dans la colonne (ou la grille, sur ordinateur)
    carte.style.order = position + 1;
    let cachee = reglagesAccueil.masquees.includes(code);
    if (code === "demain" && !leSoir) cachee = true; // Demain : seulement le soir
    carte.hidden = cachee;
  });
}

// ---------- La feuille « Mon accueil » ----------

const feuilleAccueil = document.getElementById("feuille-accueil");
const listeCartesAccueil = document.getElementById("liste-cartes-accueil");

function enregistrerAccueil() {
  sauvegarder("accueil", reglagesAccueil);
  placerCartesAccueil();
  afficherListeCartesAccueil();
}

// Monte (-1) ou descend (+1) une carte dans la liste
function deplacerCarte(code, sens) {
  const ordre = reglagesAccueil.ordre;
  const i = ordre.indexOf(code);
  const j = i + sens;
  if (j < 0 || j >= ordre.length) return;
  [ordre[i], ordre[j]] = [ordre[j], ordre[i]]; // on échange les deux places
  enregistrerAccueil();
}

function creerFleche(texte, etiquette, desactive, quandOnTouche) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add("bouton-rond", "bouton-rond-petit");
  bouton.textContent = texte;
  bouton.setAttribute("aria-label", etiquette);
  bouton.disabled = desactive;
  bouton.addEventListener("click", quandOnTouche);
  return bouton;
}

function afficherListeCartesAccueil() {
  listeCartesAccueil.replaceChildren();
  const ordre = reglagesAccueil.ordre;
  ordre.forEach((code, i) => {
    const carte = nomCarte(code);
    if (!carte) return;
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-carte-accueil");

    const caseACocher = document.createElement("input");
    caseACocher.type = "checkbox";
    caseACocher.checked = !reglagesAccueil.masquees.includes(code);
    caseACocher.setAttribute("aria-label", `Afficher ${carte.nom}`);
    caseACocher.addEventListener("change", () => {
      reglagesAccueil.masquees = reglagesAccueil.masquees.filter((c) => c !== code);
      if (!caseACocher.checked) reglagesAccueil.masquees.push(code);
      enregistrerAccueil();
    });

    const texte = document.createElement("span");
    texte.classList.add("ligne-carte-accueil-texte");
    const nom = document.createElement("strong");
    nom.textContent = carte.nom;
    const detail = document.createElement("span");
    detail.classList.add("sous-titre", "petit");
    detail.textContent = carte.detail;
    texte.append(nom, detail);

    ligne.append(
      caseACocher,
      texte,
      creerFleche("↑", `Monter ${carte.nom}`, i === 0, () => deplacerCarte(code, -1)),
      creerFleche("↓", `Descendre ${carte.nom}`, i === ordre.length - 1, () => deplacerCarte(code, 1)),
    );
    listeCartesAccueil.appendChild(ligne);
  });
}

function fermerFeuilleAccueil() {
  feuilleAccueil.hidden = true;
  voile.hidden = true;
}

document.getElementById("modifier-accueil").addEventListener("click", () => {
  afficherListeCartesAccueil();
  feuilleAccueil.hidden = false;
  voile.hidden = false;
});
document.getElementById("fermer-accueil").addEventListener("click", fermerFeuilleAccueil);
voile.addEventListener("click", () => {
  if (!feuilleAccueil.hidden) fermerFeuilleAccueil();
});

placerCartesAccueil();
