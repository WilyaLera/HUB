// =====================================================
// Mes modules : chacun n'active que ce qui lui sert
//   Tiroir « modules » : { budget: true, courses: true, … }
//   Un module désactivé disparaît partout (liens, cartes, réglages, liens entre modules),
//   mais ses données restent : on le réactive, tout est là.
//   Dans le HTML, data-module="courses" (ou "repas courses" : il faut les deux) masque un élément.
// =====================================================

const MODULES = [
  { code: "notes", nom: "Notes", espace: "agenda", icone: "sticky-note", detail: "Des notes pour retrouver une info, liées à tes rendez-vous" },
  { code: "budget", nom: "Budget", espace: "foyer", icone: "wallet", detail: "Tes bocaux, ton mois, ton épargne" },
  { code: "courses", nom: "Courses", espace: "foyer", icone: "shopping-basket", detail: "La liste, rayon par rayon" },
  { code: "repas", nom: "Repas", espace: "foyer", icone: "cooking-pot", detail: "Le menu de la semaine et ton carnet" },
  { code: "placard", nom: "Placard", espace: "foyer", icone: "archive", detail: "Ce qu'il y a, ce qui manque" },
  { code: "envies", nom: "Envies", espace: "foyer", icone: "gift", detail: "Cadeaux, achats, choses à vivre" },
  { code: "atelier", nom: "Atelier découverte", espace: "moi", icone: "palette", detail: "Tester de nouveaux loisirs" },
  { code: "soin", nom: "Coin douceur", espace: "moi", icone: "flower-2", detail: "Les douceurs et la Journée difficile" },
];

let reglagesModules = charger("modules", {});
// Un module arrivé dans une nouvelle version est actif par défaut
MODULES.forEach((m) => {
  if (typeof reglagesModules[m.code] !== "boolean") reglagesModules[m.code] = true;
});

function moduleActif(code) {
  return reglagesModules[code] !== false;
}

// Mettre la page à jour : une classe « sans-xxx » par module éteint
function appliquerModules() {
  MODULES.forEach((m) => document.body.classList.toggle(`sans-${m.code}`, !moduleActif(m.code)));
  // Un espace sans aucun module actif se cache de la barre du bas
  const foyerVide = MODULES.filter((m) => m.espace === "foyer").every((m) => !moduleActif(m.code));
  document.body.classList.toggle("sans-foyer", foyerVide);
}
appliquerModules();

function afficherReglagesModules() {
  const zone = document.getElementById("liste-modules");
  zone.replaceChildren();
  [["agenda", "Agenda"], ["foyer", "Foyer"], ["moi", "Moi"]].forEach(([espace, nomEspace]) => {
    const titre = document.createElement("p");
    titre.classList.add("etiquette", "etiquette-espacee");
    titre.textContent = nomEspace;
    zone.appendChild(titre);
    MODULES.filter((m) => m.espace === espace).forEach((m) => {
      const ligne = document.createElement("label");
      ligne.classList.add("ligne-module");
      const icone = document.createElement("span");
      icone.classList.add("ligne-module-icone");
      icone.appendChild(creerIcone(m.icone));
      const texte = document.createElement("span");
      texte.classList.add("ligne-module-texte");
      const nom = document.createElement("strong");
      nom.textContent = m.nom;
      const detail = document.createElement("span");
      detail.classList.add("sous-titre", "petit");
      detail.textContent = m.detail;
      texte.append(nom, detail);
      const interrupteur = document.createElement("input");
      interrupteur.type = "checkbox";
      interrupteur.classList.add("interrupteur");
      interrupteur.checked = moduleActif(m.code);
      interrupteur.setAttribute("aria-label", `${m.nom} actif`);
      interrupteur.addEventListener("change", () => {
        reglagesModules[m.code] = interrupteur.checked;
        sauvegarder("modules", reglagesModules);
        appliquerModules();
        reafficherApresModules();
        montrerPetitMessage(
          interrupteur.checked ? `${m.nom} est de retour 🌱` : `${m.nom} est rangé. Tes données sont gardées.`,
        );
      });
      ligne.append(icone, texte, interrupteur);
      zone.appendChild(ligne);
    });
  });
}

// Les modules qui montrent des liens vers d'autres : on les redessine
function reafficherApresModules() {
  [
    "afficherCourses",
    "afficherRepas",
    "afficherEnvies",
    "afficherAtelier",
    "afficherSoin",
    "afficherPlacard",
    "placerCartesAccueil",
    "afficherListeCartesAccueil",
  ].forEach((nom) => {
    if (typeof window[nom] === "function") window[nom]();
  });
}

// Une fois tout chargé : la liste des modules dans les Réglages
window.addEventListener("load", afficherReglagesModules);
