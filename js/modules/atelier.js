// =====================================================
// Atelier découverte
// Pour lever les deux blocages : oublier ses idées de loisirs,
// et ne pas savoir par où commencer.
//   1. le tiroir « atelier »
//   2. noter une idée (le bocal à idées)
//   3. afficher les idées, étape par étape
//   4. la pioche
//   5. la fiche d'une idée (premier petit pas, statut, matériel)
//   6. depuis À vivre : « À tester »
// =====================================================

// ---------- 1. Le tiroir « atelier » ----------
// idees : [{ id, titre, premierPas, premierPasFait, statut, note, ajouteLe, essayeLe, materiel: [idEnvie] }]
// statut : "idee" → "essaye" → "adopte" ou "pas_pour_moi" (les deux sont des réussites)

let atelier = charger("atelier", { idees: [] });

function sauvegarderAtelier() {
  sauvegarder("atelier", atelier);
}

function ideeAtelier(id) {
  return atelier.idees.find((i) => i.id === id);
}

const ETAPES_ATELIER = [
  { statut: "essaye", titre: "J'essaie en ce moment" },
  { statut: "idee", titre: "Mes idées" },
  { statut: "adopte", titre: "Adoptés" },
  { statut: "pas_pour_moi", titre: "Pas pour moi (et c'est très bien)" },
];

// ---------- 2. Noter une idée ----------

function nouvelleIdeeAtelier(titre, note = "") {
  const idee = {
    id: String(nouvelId()),
    titre: titre,
    premierPas: "",
    premierPasFait: false,
    statut: "idee",
    note: note,
    ajouteLe: aujourdhuiEnTexte(),
    essayeLe: "",
    materiel: [],
  };
  atelier.idees.push(idee);
  sauvegarderAtelier();
  return idee;
}

document.getElementById("form-atelier").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const champ = document.getElementById("atelier-titre");
  const titre = champ.value.trim();
  if (!titre) return;
  nouvelleIdeeAtelier(titre);
  champ.value = "";
  afficherAtelier();
  montrerPetitMessage("Dans le bocal 🌱");
});

// ---------- 3. Afficher les idées ----------

function creerLigneAtelier(idee) {
  const ligne = document.createElement("button");
  ligne.type = "button";
  ligne.classList.add("ligne-personne");

  const texte = document.createElement("span");
  texte.classList.add("ligne-occasion-texte");
  const titre = document.createElement("strong");
  titre.textContent = idee.titre;
  texte.appendChild(titre);

  // Le détail : le premier petit pas, ou ce que j'en pense
  let detail = "";
  if (idee.statut === "idee" || idee.statut === "essaye") {
    if (!idee.premierPas) detail = "Choisis un premier petit pas";
    else detail = `${idee.premierPasFait ? "Fait : " : "Premier pas : "}${idee.premierPas}`;
  } else if (idee.note) {
    detail = idee.note;
  }
  if (detail) {
    const petit = document.createElement("span");
    petit.classList.add("sous-titre", "petit");
    petit.textContent = detail;
    texte.appendChild(petit);
  }

  ligne.append(texte, creerIcone("chevron-right"));
  ligne.addEventListener("click", () => ouvrirFicheAtelier(idee.id));
  return ligne;
}

function afficherAtelier() {
  const zone = document.getElementById("liste-atelier");
  zone.replaceChildren();

  ETAPES_ATELIER.forEach((etape) => {
    const idees = atelier.idees.filter((i) => i.statut === etape.statut);
    if (idees.length === 0) return;
    const carte = document.createElement(etape.statut === "pas_pour_moi" ? "details" : "article");
    carte.classList.add("carte");
    const titre = document.createElement("h2");
    titre.textContent = etape.titre;
    // « Pas pour moi » est replié : on le garde sans qu'il prenne de place
    if (etape.statut === "pas_pour_moi") {
      carte.classList.add("carte-repliable");
      const resume = document.createElement("summary");
      resume.appendChild(titre);
      carte.appendChild(resume);
    } else {
      carte.appendChild(titre);
    }
    idees.forEach((idee) => carte.appendChild(creerLigneAtelier(idee)));
    zone.appendChild(carte);
  });

  if (atelier.idees.length === 0) {
    const vide = document.createElement("article");
    vide.classList.add("carte");
    vide.appendChild(creerMessageVide("Le bocal est vide. Note la prochaine idée de loisir qui te passe par la tête !"));
    zone.appendChild(vide);
  }

  // Tout ce qui a été essayé compte, même « pas pour moi »
  const essais = atelier.idees.filter((i) => ["essaye", "adopte", "pas_pour_moi"].includes(i.statut)).length;
  document.getElementById("nombre-essais").textContent = essais;
  document.getElementById("detail-essais").textContent =
    essais === 1 ? "nouvelle chose 🌱" : essais > 1 ? "nouvelles choses 🌱" : "nouvelles choses, pour l'instant";

  const enCours = atelier.idees.filter((i) => i.statut === "essaye").length;
  const enIdee = atelier.idees.filter((i) => i.statut === "idee").length;
  document.getElementById("moi-atelier-resume").textContent =
    enCours > 0
      ? `${enCours} en essai${enIdee > 0 ? ` · ${enIdee} idée${enIdee > 1 ? "s" : ""} dans le bocal` : ""}`
      : enIdee > 0
        ? `${enIdee} idée${enIdee > 1 ? "s" : ""} dans le bocal`
        : "Les loisirs que tu as envie d'essayer";
}

// ---------- 4. La pioche ----------

let ideeAtelierTiree = null;

document.getElementById("piocher-atelier").addEventListener("click", () => {
  const zone = document.getElementById("resultat-atelier");
  zone.replaceChildren();
  const possibles = atelier.idees.filter((i) => i.statut === "idee");
  if (possibles.length === 0) {
    zone.appendChild(creerMessageVide("Pas d'idée dans le bocal pour l'instant."));
    return;
  }
  const autres = possibles.length > 1 ? possibles.filter((i) => i !== ideeAtelierTiree) : possibles;
  ideeAtelierTiree = autres[Math.floor(Math.random() * autres.length)];

  const carte = document.createElement("div");
  carte.classList.add("resultat-pioche");
  const nom = document.createElement("p");
  nom.classList.add("resultat-pioche-nom");
  nom.textContent = ideeAtelierTiree.titre;
  carte.appendChild(nom);
  if (ideeAtelierTiree.premierPas) {
    const pas = document.createElement("p");
    pas.classList.add("sous-titre");
    pas.textContent = `Premier petit pas : ${ideeAtelierTiree.premierPas}`;
    carte.appendChild(pas);
  }
  const voir = document.createElement("button");
  voir.type = "button";
  voir.classList.add("bouton");
  voir.textContent = "On y va";
  const tiree = ideeAtelierTiree;
  voir.addEventListener("click", () => ouvrirFicheAtelier(tiree.id));
  carte.appendChild(voir);
  zone.appendChild(carte);
});

// ---------- 5. La fiche d'une idée ----------

const feuilleAtelier = document.getElementById("feuille-atelier");
let ideeAtelierOuverte = null;

function ouvrirFicheAtelier(id) {
  ideeAtelierOuverte = id;
  afficherFicheAtelier();
  feuilleAtelier.hidden = false;
  voile.hidden = false;
}

function fermerFicheAtelier() {
  feuilleAtelier.hidden = true;
  voile.hidden = true;
  ideeAtelierOuverte = null;
}

document.getElementById("fermer-atelier").addEventListener("click", fermerFicheAtelier);
voile.addEventListener("click", () => {
  if (!feuilleAtelier.hidden) fermerFicheAtelier();
});

function afficherFicheAtelier() {
  const idee = ideeAtelier(ideeAtelierOuverte);
  if (!idee) return;
  document.getElementById("fiche-atelier-titre").textContent = idee.titre;
  const etats = {
    idee: `Dans le bocal depuis le ${formaterDate(idee.ajouteLe)}`,
    essaye: `En essai depuis le ${formaterDate(idee.essayeLe || idee.ajouteLe)}`,
    adopte: "Adopté : un nouveau loisir 🌱",
    pas_pour_moi: "Essayé, pas pour moi : c'est une réussite aussi 🌱",
  };
  document.getElementById("fiche-atelier-etat").textContent = etats[idee.statut];
  document.getElementById("fiche-premier-pas").value = idee.premierPas;
  document.getElementById("fiche-pas-fait").checked = idee.premierPasFait;
  document.getElementById("bloc-pas-fait").hidden = !idee.premierPas;
  document.querySelectorAll('input[name="statut-atelier"]').forEach((bouton) => {
    bouton.checked = bouton.value === idee.statut;
  });
  document.getElementById("fiche-note-atelier").value = idee.note;

  // Le matériel : les envies d'achat liées, avec leur étape
  const zone = document.getElementById("fiche-materiel");
  zone.replaceChildren();
  const etapesEnvie = {
    murir: "ça mûrit",
    prete: "à acheter",
    epargne: "j'économise",
    eue: "je l'ai",
    non: "finalement non",
    notee: "à m'offrir",
  };
  idee.materiel
    .map((id) => envies.envies.find((e) => e.id === id))
    .filter(Boolean)
    .forEach((envie) => {
      const ligne = document.createElement("p");
      ligne.classList.add("sous-titre");
      ligne.textContent = `${envie.nom}${envie.prix ? ` · ${formaterMontant(envie.prix)}` : ""} · ${etapesEnvie[envie.statut] || ""}`;
      zone.appendChild(ligne);
    });
}

function modifierIdeeAtelier(changement) {
  const idee = ideeAtelier(ideeAtelierOuverte);
  if (!idee) return;
  changement(idee);
  sauvegarderAtelier();
  afficherAtelier();
  afficherFicheAtelier();
}

document.getElementById("fiche-premier-pas").addEventListener("change", (e) => {
  modifierIdeeAtelier((idee) => {
    idee.premierPas = e.target.value.trim();
  });
});

document.getElementById("fiche-pas-fait").addEventListener("change", (e) => {
  modifierIdeeAtelier((idee) => {
    idee.premierPasFait = e.target.checked;
    // Le premier pas fait : l'idée passe d'elle-même « en essai »
    if (idee.premierPasFait && idee.statut === "idee") {
      idee.statut = "essaye";
      idee.essayeLe = aujourdhuiEnTexte();
    }
  });
  if (e.target.checked) montrerPetitMessage("Premier pas fait, bravo 🌱");
});

document.querySelectorAll('input[name="statut-atelier"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    modifierIdeeAtelier((idee) => {
      idee.statut = bouton.value;
      if (bouton.value === "essaye" && !idee.essayeLe) idee.essayeLe = aujourdhuiEnTexte();
    });
    const messages = {
      essaye: "C'est parti 🌱",
      adopte: "Un nouveau loisir 🌱",
      pas_pour_moi: "Tu as essayé, c'est ça qui compte 🌱",
    };
    if (messages[bouton.value]) montrerPetitMessage(messages[bouton.value]);
  });
});

document.getElementById("fiche-note-atelier").addEventListener("change", (e) => {
  modifierIdeeAtelier((idee) => {
    idee.note = e.target.value.trim();
  });
});

// Le matériel devient une envie d'achat (Envies › À acheter), avec le délai habituel
document.getElementById("form-materiel").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("materiel-nom").value.trim();
  if (!nom) return;
  const prix = Number(document.getElementById("materiel-prix").value.replace(/\s/g, "")) || 0;
  const jours = joursDeReflexion(prix); // envies.js
  const envie = {
    id: String(nouvelId()),
    type: "achat",
    nom: nom,
    prix: prix,
    coeurs: 2,
    note: `Pour l'atelier : ${ideeAtelier(ideeAtelierOuverte).titre}`,
    lien: "",
    statut: jours > 0 ? "murir" : "prete",
    dateAjout: aujourdhuiEnTexte(),
    finDelai: ajouterJours(aujourdhuiEnTexte(), jours),
    projetId: null,
    chemin: jours > 0 ? "reflexion" : "direct",
    eueLe: "",
  };
  envies.envies.push(envie);
  sauvegarderEnvies();
  afficherEnvies();
  modifierIdeeAtelier((idee) => idee.materiel.push(envie.id));
  document.getElementById("materiel-nom").value = "";
  document.getElementById("materiel-prix").value = "";
  montrerPetitMessage("Ajouté à tes envies 🌱");
});

// Planifier un moment pour essayer : la feuille de l'Agenda, titre rempli
document.getElementById("planifier-atelier").addEventListener("click", () => {
  const idee = ideeAtelier(ideeAtelierOuverte);
  fermerFicheAtelier();
  ouvrirFeuilleElement(null, { type: "evenement", date: prochainWeekend() }); // agenda-feuille.js
  document.getElementById("element-titre").value = idee.premierPas
    ? `${idee.titre} : ${idee.premierPas}`
    : `Essayer : ${idee.titre}`;
});

document.getElementById("supprimer-atelier").addEventListener("click", () => {
  const idee = ideeAtelier(ideeAtelierOuverte);
  fermerFicheAtelier();
  agirAvecAnnuler({
    tiroir: atelier,
    message: `« ${idee.titre} » retirée`,
    action: () => {
      atelier.idees = atelier.idees.filter((i) => i.id !== idee.id);
    },
    apres: () => {
      sauvegarderAtelier();
      afficherAtelier();
    },
  });
});

// ---------- 6. Depuis À vivre : « À tester » ----------
// Une idée à vivre qui ressemble plutôt à un loisir à essayer part dans l'atelier

function versAtelier(ideeVivre) {
  agirAvecAnnuler({
    tiroir: envies,
    message: "Elle est dans l'Atelier découverte 🌱",
    action: () => {
      envies.envies = envies.envies.filter((e) => e.id !== ideeVivre.id);
    },
    apres: () => {
      sauvegarderEnvies();
      afficherEnvies();
    },
  });
  // (si on annule, l'idée revient dans À vivre ; on la retire alors de l'atelier)
  const idee = nouvelleIdeeAtelier(ideeVivre.nom, ideeVivre.note || "");
  const annulerAvant = quandOnAnnule;
  quandOnAnnule = () => {
    annulerAvant();
    atelier.idees = atelier.idees.filter((i) => i.id !== idee.id);
    sauvegarderAtelier();
    afficherAtelier();
  };
  afficherAtelier();
}

afficherAtelier();
