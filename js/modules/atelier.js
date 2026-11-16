// =====================================================
// Atelier découverte
// Tester un loisir sans pression : on a le droit d'essayer, d'aimer,
// de laisser tomber ou d'y revenir.
//   1. le tiroir « atelier » (et la reprise de la v33)
//   2. les étapes et les types
//   3. le meuble à tiroirs, et les filtres
//   4. ajouter un loisir
//   5. la roue des loisirs
//   6. la fiche d'un loisir : statut, « 3 essais déjà »
//   7. le carnet d'essais
//   8. les étapes pour progresser
//   9. les ressources
//  10. le matériel (j'ai / il manque → Envies)
//  11. le budget (aucun, indicatif, suivi)
//  12. les réglages de l'atelier
//  13. depuis À vivre : « Un loisir à tester »
// =====================================================

// ---------- 1. Le tiroir « atelier » ----------
// loisirs : [{ id, nom, type, etape, dateDebut, coutEstime, raisonRange, bravoVu,
//              essais: [{ id, date, ressenti, note }],
//              etapes: [{ id, nom, fait }],
//              ressources: [{ id, titre, url }],
//              materiel: [{ id, nom, prix, jai, envieId }] }]
// etape : "envie" → "test" → "adopte" ou "range" (pas pour moi : rangé, sans regret)
// types : [{ code, nom, icone }]
// reglages : { budget: "aucun" | "indicatif" | "suivi" }

const TYPES_DE_DEPART = [
  { code: "main", nom: "Fait main", icone: "scissors" },
  { code: "cuisine", nom: "Cuisine", icone: "chef-hat" },
  { code: "sport", nom: "Sport", icone: "bike" },
  { code: "langue", nom: "Langue", icone: "languages" },
  { code: "art", nom: "Art", icone: "palette" },
  { code: "autre", nom: "Autre", icone: "sparkles" },
];

let atelier = charger("atelier", null) || {};
if (!atelier.loisirs) atelier.loisirs = [];
if (!atelier.types) atelier.types = TYPES_DE_DEPART.map((t) => ({ ...t }));
if (!atelier.reglages) atelier.reglages = { budget: "indicatif" };

// Reprise des idées de la v33 (un format plus simple) : on les range dans des tiroirs
if (atelier.idees) {
  const etapes = { idee: "envie", essaye: "test", adopte: "adopte", pas_pour_moi: "range" };
  atelier.idees.forEach((idee) => {
    atelier.loisirs.push({
      id: idee.id,
      nom: idee.titre,
      type: "autre",
      etape: etapes[idee.statut] || "envie",
      dateDebut: idee.essayeLe || idee.ajouteLe,
      coutEstime: 0,
      raisonRange: idee.statut === "pas_pour_moi" ? idee.note : "",
      bravoVu: false,
      essais: [],
      etapes: idee.premierPas ? [{ id: String(nouvelId()), nom: idee.premierPas, fait: idee.premierPasFait }] : [],
      ressources: [],
      materiel: (idee.materiel || [])
        .map((id) => envies.envies.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => ({ id: String(nouvelId()) + e.id, nom: e.nom, prix: e.prix, jai: e.statut === "eue", envieId: e.id })),
    });
  });
  delete atelier.idees;
}

function sauvegarderAtelier() {
  sauvegarder("atelier", atelier);
}

function loisirDe(id) {
  return atelier.loisirs.find((l) => l.id === id);
}

// ---------- 2. Les étapes et les types ----------

const ETAPES_LOISIR = {
  envie: { nom: "Envie d'essayer", icone: "lightbulb", couleur: "#E8C66A" },
  test: { nom: "En test", icone: "flask-conical", couleur: "#E39A80" },
  adopte: { nom: "Adopté", icone: "sprout", couleur: "#9DBB9F" },
  range: { nom: "Pas pour moi", icone: "leaf", couleur: "#BCB0D6" },
};

function typeDe(code) {
  return atelier.types.find((t) => t.code === code) || atelier.types[atelier.types.length - 1];
}

// ---------- 3. Le meuble à tiroirs ----------

const filtreAtelier = { etape: "", type: "" };

function creerTiroir(loisir) {
  const etape = ETAPES_LOISIR[loisir.etape];
  const tiroir = document.createElement("button");
  tiroir.type = "button";
  tiroir.classList.add("tiroir");
  // Tout le devant du tiroir prend la couleur de l'étape
  tiroir.style.setProperty("--couleur-tiroir", etape.couleur);
  tiroir.setAttribute("aria-label", `${loisir.nom}, ${etape.nom}`);

  const etiquette = document.createElement("span");
  etiquette.classList.add("tiroir-etiquette");
  etiquette.textContent = loisir.nom;
  const poignee = document.createElement("span");
  poignee.classList.add("tiroir-poignee");
  const bas = document.createElement("span");
  bas.classList.add("tiroir-bas");
  bas.append(creerIcone(etape.icone), creerIcone(typeDe(loisir.type).icone));

  tiroir.append(etiquette, poignee, bas);
  tiroir.addEventListener("click", () => ouvrirFicheLoisir(loisir.id));
  return tiroir;
}

function afficherAtelier() {
  const meuble = document.getElementById("meuble-atelier");
  meuble.replaceChildren();
  const ordre = ["test", "envie", "adopte", "range"];
  atelier.loisirs
    .filter((l) => (!filtreAtelier.etape || l.etape === filtreAtelier.etape) && (!filtreAtelier.type || l.type === filtreAtelier.type))
    .sort((a, b) => ordre.indexOf(a.etape) - ordre.indexOf(b.etape))
    .forEach((loisir) => meuble.appendChild(creerTiroir(loisir)));

  // Un tiroir vide « + » pour la prochaine envie
  const vide = document.createElement("button");
  vide.type = "button";
  vide.classList.add("tiroir", "tiroir-vide");
  vide.setAttribute("aria-label", "Ajouter un loisir");
  vide.appendChild(creerIcone("plus"));
  vide.addEventListener("click", ouvrirNouveauLoisir);
  meuble.appendChild(vide);

  afficherFiltresAtelier();
  afficherResumeAtelier();
}

// Les filtres : des pastilles, qui servent aussi de légende
function creerPastilleFiltre(texte, couleur, actif, quandOnTouche) {
  const pastille = document.createElement("button");
  pastille.type = "button";
  pastille.classList.add("pastille-temps", "pastille-filtre");
  pastille.classList.toggle("choisie", actif);
  if (couleur) pastille.style.setProperty("--couleur-tiroir", couleur);
  pastille.textContent = texte;
  pastille.addEventListener("click", quandOnTouche);
  return pastille;
}

function afficherFiltresAtelier() {
  const etapes = document.getElementById("filtre-etapes");
  etapes.replaceChildren();
  Object.entries(ETAPES_LOISIR).forEach(([code, etape]) => {
    etapes.appendChild(
      creerPastilleFiltre(etape.nom, etape.couleur, filtreAtelier.etape === code, () => {
        filtreAtelier.etape = filtreAtelier.etape === code ? "" : code;
        afficherAtelier();
      }),
    );
  });
  const types = document.getElementById("filtre-types");
  types.replaceChildren();
  atelier.types.forEach((type) => {
    types.appendChild(
      creerPastilleFiltre(type.nom, "", filtreAtelier.type === type.code, () => {
        filtreAtelier.type = filtreAtelier.type === type.code ? "" : type.code;
        afficherAtelier();
      }),
    );
  });
  // Le filtre actif s'affiche en résumé, avec « Effacer »
  const morceaux = [];
  if (filtreAtelier.etape) morceaux.push(ETAPES_LOISIR[filtreAtelier.etape].nom);
  if (filtreAtelier.type) morceaux.push(typeDe(filtreAtelier.type).nom);
  document.getElementById("resume-filtre-atelier").textContent = morceaux.join(" · ");
  document.getElementById("effacer-filtre-atelier").hidden = morceaux.length === 0;
}

document.getElementById("ouvrir-filtre-atelier").addEventListener("click", () => {
  const panneau = document.getElementById("panneau-filtre-atelier");
  panneau.hidden = !panneau.hidden;
});
document.getElementById("effacer-filtre-atelier").addEventListener("click", () => {
  filtreAtelier.etape = "";
  filtreAtelier.type = "";
  afficherAtelier();
});

function afficherResumeAtelier() {
  const enTest = atelier.loisirs.filter((l) => l.etape === "test").length;
  const envies = atelier.loisirs.filter((l) => l.etape === "envie").length;
  const morceaux = [];
  if (enTest) morceaux.push(`${enTest} en test`);
  if (envies) morceaux.push(`${envies} envie${envies > 1 ? "s" : ""} d'essayer`);
  document.getElementById("moi-atelier-resume").textContent =
    morceaux.length ? morceaux.join(" · ") : "Les loisirs que tu as envie d'essayer";
}

// ---------- 4. Ajouter un loisir ----------

const feuilleNouveauLoisir = document.getElementById("feuille-nouveau-loisir");
let typeNouveauLoisir = "autre";

function nouveauLoisir(nom, type = "autre") {
  const loisir = {
    id: String(nouvelId()),
    nom: nom,
    type: type,
    etape: "envie",
    dateDebut: aujourdhuiEnTexte(),
    coutEstime: 0,
    raisonRange: "",
    bravoVu: false,
    essais: [],
    etapes: [],
    ressources: [],
    materiel: [],
  };
  atelier.loisirs.push(loisir);
  sauvegarderAtelier();
  return loisir;
}

function afficherChoixTypes(zone, choisi, quandOnChoisit) {
  zone.replaceChildren();
  atelier.types.forEach((type) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille-temps");
    bouton.classList.toggle("choisie", type.code === choisi);
    bouton.append(creerIcone(type.icone), type.nom);
    bouton.addEventListener("click", () => quandOnChoisit(type.code));
    zone.appendChild(bouton);
  });
}

function ouvrirNouveauLoisir() {
  typeNouveauLoisir = "autre";
  document.getElementById("form-nouveau-loisir").reset();
  const choisir = (code) => {
    typeNouveauLoisir = code;
    afficherChoixTypes(document.getElementById("nouveau-loisir-types"), code, choisir);
  };
  choisir("autre");
  feuilleNouveauLoisir.hidden = false;
  voile.hidden = false;
  document.getElementById("nouveau-loisir-nom").focus();
}

function fermerNouveauLoisir() {
  feuilleNouveauLoisir.hidden = true;
  voile.hidden = true;
}

document.getElementById("fermer-nouveau-loisir").addEventListener("click", fermerNouveauLoisir);
voile.addEventListener("click", () => {
  if (!feuilleNouveauLoisir.hidden) fermerNouveauLoisir();
});

document.getElementById("form-nouveau-loisir").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("nouveau-loisir-nom").value.trim();
  if (!nom) return;
  nouveauLoisir(nom, typeNouveauLoisir);
  fermerNouveauLoisir();
  afficherAtelier();
  montrerPetitMessage("Rangé dans un tiroir 🌱");
});

// ---------- 5. La roue des loisirs ----------

let loisirTire = null;

// Un petit conseil : le matériel qui manque, ou le budget
function conseilLoisir(loisir) {
  const manque = loisir.materiel.filter((m) => !m.jai);
  if (manque.length > 0) return `Il te manque : ${manque.map((m) => m.nom).join(", ")}.`;
  if (loisir.coutEstime && atelier.reglages.budget !== "aucun") return conseilBudget({ prix: loisir.coutEstime }); // envies.js
  const etape = loisir.etapes.find((e) => !e.fait);
  if (etape) return `Premier petit pas : ${etape.nom}`;
  return "Choisis un premier petit pas de 15 minutes dans sa fiche.";
}

document.getElementById("tourner-roue").addEventListener("click", () => {
  const zone = document.getElementById("resultat-roue");
  zone.replaceChildren();
  const possibles = atelier.loisirs.filter((l) => l.etape === "envie");
  if (possibles.length === 0) {
    zone.appendChild(creerMessageVide("Pas d'envie d'essayer pour l'instant. Ajoute un tiroir !"));
    return;
  }
  const autres = possibles.length > 1 ? possibles.filter((l) => l !== loisirTire) : possibles;
  loisirTire = autres[Math.floor(Math.random() * autres.length)];
  const bloc = document.createElement("div");
  bloc.classList.add("resultat-pioche");
  const nom = document.createElement("p");
  nom.classList.add("resultat-pioche-nom");
  nom.textContent = loisirTire.nom;
  const conseil = document.createElement("p");
  conseil.classList.add("sous-titre");
  conseil.textContent = conseilLoisir(loisirTire);
  const tire = loisirTire;
  const voir = creerBoutonEnvie("On y va", () => ouvrirFicheLoisir(tire.id), true); // envies.js
  bloc.append(nom, conseil, voir);
  zone.appendChild(bloc);
});

// ---------- 6. La fiche d'un loisir ----------

const feuilleLoisir = document.getElementById("feuille-loisir");
let loisirOuvert = null;

function ouvrirFicheLoisir(id) {
  loisirOuvert = id;
  document.getElementById("essai-date").value = aujourdhuiEnTexte();
  afficherFicheLoisir();
  feuilleLoisir.hidden = false;
  voile.hidden = false;
}

function fermerFicheLoisir() {
  feuilleLoisir.hidden = true;
  voile.hidden = true;
  loisirOuvert = null;
}

document.getElementById("fermer-loisir").addEventListener("click", fermerFicheLoisir);
voile.addEventListener("click", () => {
  if (!feuilleLoisir.hidden) fermerFicheLoisir();
});

// Modifier le loisir ouvert, puis tout réafficher
function changerLoisir(changement) {
  const loisir = loisirDe(loisirOuvert);
  if (!loisir) return;
  changement(loisir);
  sauvegarderAtelier();
  afficherAtelier();
  afficherFicheLoisir();
}

function creerLigneSimple(texte, quandOnSupprime, avant) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-idee");
  if (avant) ligne.appendChild(avant);
  const zone = document.createElement("span");
  zone.classList.add("ligne-occasion-texte");
  if (typeof texte === "string") zone.textContent = texte;
  else zone.appendChild(texte);
  ligne.appendChild(zone);
  const supprimer = document.createElement("button");
  supprimer.type = "button";
  supprimer.classList.add("bouton-supprimer");
  supprimer.setAttribute("aria-label", "Retirer");
  supprimer.appendChild(creerIcone("x"));
  supprimer.addEventListener("click", quandOnSupprime);
  ligne.appendChild(supprimer);
  return ligne;
}

function afficherFicheLoisir() {
  const loisir = loisirDe(loisirOuvert);
  if (!loisir) return;
  document.getElementById("loisir-titre").textContent = loisir.nom;
  document.getElementById("loisir-etape").value = loisir.etape;
  const menuType = document.getElementById("loisir-type");
  menuType.replaceChildren();
  atelier.types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.code;
    option.textContent = type.nom;
    menuType.appendChild(option);
  });
  menuType.value = typeDe(loisir.type).code;
  const raison = document.getElementById("loisir-raison");
  raison.hidden = loisir.etape !== "range";
  raison.value = loisir.raisonRange || "";

  // « 3 essais déjà, bravo ! » : une seule fois
  document.getElementById("loisir-bravo").hidden = !(
    loisir.etape === "test" &&
    loisir.essais.length >= 3 &&
    !loisir.bravoVu
  );

  afficherEssais(loisir);
  afficherEtapesLoisir(loisir);
  afficherRessources(loisir);
  afficherMateriel(loisir);
  afficherBudgetLoisir(loisir);
}

document.getElementById("loisir-etape").addEventListener("change", (e) => {
  changerLoisir((loisir) => {
    loisir.etape = e.target.value;
  });
  const messages = {
    test: "C'est parti 🌱",
    adopte: "Un nouveau loisir 🌱",
    range: "Tu as essayé, c'est ça qui compte 🌱",
  };
  if (messages[e.target.value]) montrerPetitMessage(messages[e.target.value]);
});

document.getElementById("loisir-type").addEventListener("change", (e) => {
  changerLoisir((loisir) => {
    loisir.type = e.target.value;
  });
});

document.getElementById("loisir-raison").addEventListener("change", (e) => {
  changerLoisir((loisir) => {
    loisir.raisonRange = e.target.value.trim();
  });
});

document.querySelectorAll("#loisir-bravo [data-decision]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    const decision = bouton.dataset.decision;
    changerLoisir((loisir) => {
      loisir.bravoVu = true;
      if (decision !== "encore") loisir.etape = decision;
    });
    montrerPetitMessage(
      decision === "adopte" ? "Un nouveau loisir 🌱" : decision === "range" ? "Rangé, sans regret 🌱" : "On continue 🌱",
    );
  });
});

// ---------- 7. Le carnet d'essais ----------

const RESSENTIS = ["J'ai adoré", "J'ai aimé", "Mitigé", "Pas pour moi", "Raté mais drôle"];
let ressentiChoisi = "";

function afficherChoixRessentis() {
  const zone = document.getElementById("essai-ressentis");
  zone.replaceChildren();
  RESSENTIS.forEach((ressenti) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille-temps");
    bouton.classList.toggle("choisie", ressenti === ressentiChoisi);
    bouton.textContent = ressenti;
    bouton.addEventListener("click", () => {
      ressentiChoisi = ressentiChoisi === ressenti ? "" : ressenti;
      afficherChoixRessentis();
    });
    zone.appendChild(bouton);
  });
}

function afficherEssais(loisir) {
  document.getElementById("compte-essais").textContent = loisir.essais.length ? `· ${loisir.essais.length}` : "";
  const zone = document.getElementById("liste-essais");
  zone.replaceChildren();
  [...loisir.essais]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((essai) => {
      const texte = [formaterDate(essai.date, false), essai.ressenti, essai.note].filter(Boolean).join(" · ");
      zone.appendChild(
        creerLigneSimple(texte, () =>
          changerLoisir((l) => {
            l.essais = l.essais.filter((x) => x.id !== essai.id);
          }),
        ),
      );
    });
  afficherChoixRessentis();
}

document.getElementById("form-essai").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const premier = loisirDe(loisirOuvert).essais.length === 0;
  changerLoisir((loisir) => {
    loisir.essais.push({
      id: String(nouvelId()),
      date: document.getElementById("essai-date").value || aujourdhuiEnTexte(),
      ressenti: ressentiChoisi,
      note: document.getElementById("essai-note").value.trim(),
    });
    // Au premier essai noté, le loisir passe « En test »
    if (loisir.etape === "envie") {
      loisir.etape = "test";
      loisir.dateDebut = aujourdhuiEnTexte();
    }
  });
  ressentiChoisi = "";
  document.getElementById("essai-note").value = "";
  afficherChoixRessentis();
  montrerPetitMessage(premier ? "Premier essai, bravo 🌱" : "Essai noté 🌱");
});

// ---------- 8. Les étapes pour progresser ----------

function afficherEtapesLoisir(loisir) {
  const faites = loisir.etapes.filter((e) => e.fait).length;
  document.getElementById("compte-etapes").textContent = loisir.etapes.length ? `· ${faites}/${loisir.etapes.length}` : "";
  const zone = document.getElementById("liste-etapes-loisir");
  zone.replaceChildren();
  loisir.etapes.forEach((etape) => {
    const caseACocher = document.createElement("input");
    caseACocher.type = "checkbox";
    caseACocher.checked = etape.fait;
    caseACocher.setAttribute("aria-label", etape.nom);
    caseACocher.addEventListener("change", () =>
      changerLoisir(() => {
        etape.fait = caseACocher.checked;
      }),
    );
    zone.appendChild(
      creerLigneSimple(
        etape.nom,
        () =>
          changerLoisir((l) => {
            l.etapes = l.etapes.filter((x) => x.id !== etape.id);
          }),
        caseACocher,
      ),
    );
  });
}

document.getElementById("form-etape-loisir").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const champ = document.getElementById("etape-loisir-nom");
  const nom = champ.value.trim();
  if (!nom) return;
  changerLoisir((loisir) => loisir.etapes.push({ id: String(nouvelId()), nom, fait: false }));
  champ.value = "";
});

// ---------- 9. Les ressources ----------

function afficherRessources(loisir) {
  document.getElementById("compte-ressources").textContent = loisir.ressources.length ? `· ${loisir.ressources.length}` : "";
  const zone = document.getElementById("liste-ressources");
  zone.replaceChildren();
  loisir.ressources.forEach((ressource) => {
    const lien = document.createElement("a");
    lien.href = ressource.url;
    lien.target = "_blank";
    lien.rel = "noopener";
    lien.textContent = ressource.titre;
    zone.appendChild(
      creerLigneSimple(lien, () =>
        changerLoisir((l) => {
          l.ressources = l.ressources.filter((x) => x.id !== ressource.id);
        }),
      ),
    );
  });
}

document.getElementById("form-ressource").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const titre = document.getElementById("ressource-titre").value.trim();
  const url = document.getElementById("ressource-url").value.trim();
  if (!titre || !url) return;
  changerLoisir((loisir) => loisir.ressources.push({ id: String(nouvelId()), titre, url }));
  evenement.target.reset();
});

// ---------- 10. Le matériel ----------

const ETAPES_ENVIE = {
  murir: "ça mûrit",
  prete: "à acheter",
  epargne: "j'économise",
  eue: "acheté",
  non: "finalement non",
  notee: "à m'offrir",
};

function afficherMateriel(loisir) {
  document.getElementById("compte-materiel").textContent = loisir.materiel.length ? `· ${loisir.materiel.length}` : "";
  // Avant un achat, l'appli rappelle ce qu'on a déjà
  const deja = loisir.materiel.filter((m) => m.jai).map((m) => m.nom);
  document.getElementById("materiel-deja").textContent = deja.length ? `Tu as déjà : ${deja.join(", ")}.` : "";

  const zone = document.getElementById("liste-materiel");
  zone.replaceChildren();
  loisir.materiel.forEach((objet) => {
    const envie = objet.envieId ? envies.envies.find((e) => e.id === objet.envieId) : null;
    // Acheté dans Envies : on l'a maintenant
    if (envie && envie.statut === "eue" && !objet.jai) objet.jai = true;

    const texte = document.createElement("span");
    texte.classList.add("ligne-occasion-texte");
    const nom = document.createElement("span");
    nom.textContent = objet.nom;
    const detail = document.createElement("span");
    detail.classList.add("sous-titre", "petit");
    const morceaux = [objet.jai ? "j'ai" : "il manque"];
    if (objet.prix) morceaux.push(formaterMontant(objet.prix));
    if (envie && !objet.jai) morceaux.push(`dans tes envies : ${ETAPES_ENVIE[envie.statut] || ""}`);
    detail.textContent = morceaux.join(" · ");
    texte.append(nom, detail);

    const ligne = creerLigneSimple(texte, () =>
      changerLoisir((l) => {
        l.materiel = l.materiel.filter((x) => x.id !== objet.id);
      }),
    );
    // Les boutons : « Je l'ai » / « Il manque », et « Vers mes envies »
    const basculer = creerBoutonEnvie(objet.jai ? "Il manque" : "Je l'ai", () =>
      changerLoisir(() => {
        objet.jai = !objet.jai;
      }),
    );
    ligne.insertBefore(basculer, ligne.lastChild);
    if (!objet.jai && !envie) {
      const versEnvies = creerBoutonEnvie("Vers mes envies", () => envoyerVersEnvies(loisir, objet));
      ligne.insertBefore(versEnvies, basculer);
    }
    zone.appendChild(ligne);
  });
}

// Ce qui manque part dans Envies › À acheter, avec le délai de réflexion habituel
function envoyerVersEnvies(loisir, objet) {
  const jours = joursDeReflexion(objet.prix || 0); // envies.js
  const envie = {
    id: String(nouvelId()),
    type: "achat",
    nom: objet.nom,
    prix: objet.prix || 0,
    coeurs: 2,
    note: `Pour l'atelier : ${loisir.nom}`,
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
  changerLoisir(() => {
    objet.envieId = envie.id;
  });
  montrerPetitMessage(jours > 0 ? `Dans tes envies, ça mûrit ${jours} jours 🌱` : "Dans tes envies 🌱");
}

document.getElementById("form-materiel").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("materiel-nom").value.trim();
  if (!nom) return;
  const prix = Number(document.getElementById("materiel-prix").value.replace(/\s/g, "")) || 0;
  const jai = document.getElementById("materiel-jai").checked;
  changerLoisir((loisir) => loisir.materiel.push({ id: String(nouvelId()), nom, prix, jai, envieId: null }));
  evenement.target.reset();
});

// ---------- 11. Le budget ----------

// Les dépenses du Budget reliées à ce loisir (niveau « suivi »)
function depensesDuLoisir(loisir) {
  return budget.depenses.filter((d) => d.loisirId === loisir.id && !estRentree(d));
}

function afficherBudgetLoisir(loisir) {
  const niveau = atelier.reglages.budget;
  const section = document.getElementById("section-budget-loisir");
  section.hidden = niveau === "aucun";
  const zone = document.getElementById("budget-loisir");
  zone.replaceChildren();
  if (niveau === "aucun") return;

  if (niveau === "indicatif") {
    // Le coût estimé de l'essai, et si ça tient dans les Plaisirs ce mois-ci
    const label = document.createElement("label");
    label.classList.add("champ");
    label.textContent = "Coût estimé pour essayer (F)";
    const champ = document.createElement("input");
    champ.classList.add("champ-note");
    champ.inputMode = "numeric";
    champ.value = loisir.coutEstime || "";
    champ.addEventListener("change", () =>
      changerLoisir((l) => {
        l.coutEstime = Number(champ.value.replace(/\s/g, "")) || 0;
      }),
    );
    label.appendChild(champ);
    zone.appendChild(label);
    if (loisir.coutEstime) {
      const conseil = document.createElement("p");
      conseil.classList.add("envie-etape");
      conseil.textContent = conseilBudget({ prix: loisir.coutEstime }); // envies.js
      zone.appendChild(conseil);
    }
    return;
  }

  // Suivi : le total depuis le début, le détail par mois, et la liste
  const depenses = depensesDuLoisir(loisir).sort((a, b) => b.date.localeCompare(a.date));
  const total = depenses.reduce((somme, d) => somme + d.montant, 0);
  const titre = document.createElement("p");
  titre.innerHTML = "";
  titre.textContent = depenses.length
    ? `Depuis le début : ${formaterMontant(total)}`
    : "Aucune dépense reliée pour l'instant. Dans une dépense du Budget, choisis « Pour un loisir de l'atelier ».";
  zone.appendChild(titre);

  const parMois = {};
  depenses.forEach((d) => {
    const mois = d.date.slice(0, 7);
    parMois[mois] = (parMois[mois] || 0) + d.montant;
  });
  Object.entries(parMois).forEach(([mois, montant]) => {
    const ligne = document.createElement("p");
    ligne.classList.add("sous-titre", "petit");
    const nomMois = texteEnDate(`${mois}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    ligne.textContent = `${majuscule(nomMois)} : ${formaterMontant(montant)}`;
    zone.appendChild(ligne);
  });
  if (depenses.length) {
    const details = document.createElement("details");
    details.classList.add("options");
    const resume = document.createElement("summary");
    resume.textContent = "Voir les dépenses";
    details.appendChild(resume);
    depenses.forEach((d) => {
      const bocal = budget.bocaux.find((b) => b.id === d.bocalId);
      const ligne = document.createElement("p");
      ligne.classList.add("sous-titre", "petit");
      ligne.textContent = [formaterDate(d.date, false), formaterMontant(d.montant), bocal ? bocal.nom : "", d.note]
        .filter(Boolean)
        .join(" · ");
      details.appendChild(ligne);
    });
    zone.appendChild(details);
  }
}

// Le menu « Pour un loisir de l'atelier ? » dans la feuille de dépense (budget-mois.js)
function remplirChoixLoisirs(choisi) {
  const bloc = document.getElementById("bloc-depense-loisir");
  const menu = document.getElementById("depense-loisir");
  const loisirs = atelier.loisirs.filter((l) => l.etape !== "range" || l.id === choisi);
  bloc.hidden = atelier.reglages.budget !== "suivi" || loisirs.length === 0;
  menu.replaceChildren();
  const aucun = document.createElement("option");
  aucun.value = "";
  aucun.textContent = "Non";
  menu.appendChild(aucun);
  loisirs.forEach((loisir) => {
    const option = document.createElement("option");
    option.value = loisir.id;
    option.textContent = loisir.nom;
    menu.appendChild(option);
  });
  menu.value = choisi || "";
}

// Planifier un moment pour essayer
document.getElementById("planifier-loisir").addEventListener("click", () => {
  const loisir = loisirDe(loisirOuvert);
  const etape = loisir.etapes.find((e) => !e.fait);
  fermerFicheLoisir();
  ouvrirFeuilleElement(null, { type: "evenement", date: prochainWeekend() }); // agenda-feuille.js
  document.getElementById("element-titre").value = etape ? `${loisir.nom} : ${etape.nom}` : `${loisir.nom}`;
});

document.getElementById("supprimer-loisir").addEventListener("click", () => {
  const loisir = loisirDe(loisirOuvert);
  fermerFicheLoisir();
  agirAvecAnnuler({
    tiroir: atelier,
    message: `« ${loisir.nom} » retiré`,
    action: () => {
      atelier.loisirs = atelier.loisirs.filter((l) => l.id !== loisir.id);
    },
    apres: () => {
      sauvegarderAtelier();
      afficherAtelier();
    },
  });
});

// ---------- 12. Les réglages de l'atelier ----------

document.querySelectorAll('input[name="budget-atelier"]').forEach((bouton) => {
  bouton.checked = bouton.value === atelier.reglages.budget;
  bouton.addEventListener("change", () => {
    atelier.reglages.budget = bouton.value;
    sauvegarderAtelier();
  });
});

function afficherTypesLoisirs() {
  const zone = document.getElementById("liste-types-loisirs");
  zone.replaceChildren();
  atelier.types.forEach((type) => {
    const nom = document.createElement("span");
    nom.append(creerIcone(type.icone), type.nom);
    const ligne = creerLigneSimple(nom, () => {
      // Ses loisirs passent dans « Autre » (le dernier type)
      agirAvecAnnuler({
        tiroir: atelier,
        message: `Type « ${type.nom} » retiré`,
        action: () => {
          atelier.types = atelier.types.filter((t) => t.code !== type.code);
          const dernier = atelier.types[atelier.types.length - 1].code;
          atelier.loisirs.forEach((l) => {
            if (l.type === type.code) l.type = dernier;
          });
        },
        apres: () => {
          sauvegarderAtelier();
          afficherTypesLoisirs();
          afficherAtelier();
        },
      });
    });
    // On garde toujours au moins un type
    if (atelier.types.length === 1) ligne.lastChild.hidden = true;
    zone.appendChild(ligne);
  });
}

document.getElementById("form-type-loisir").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const champ = document.getElementById("type-loisir-nom");
  const nom = champ.value.trim();
  if (!nom) return;
  // Un nouveau type se place avant « Autre », avec une icône d'étoile
  atelier.types.splice(Math.max(atelier.types.length - 1, 0), 0, {
    code: `type-${nouvelId()}`,
    nom,
    icone: "star",
  });
  sauvegarderAtelier();
  champ.value = "";
  afficherTypesLoisirs();
  afficherAtelier();
});

// ---------- 13. Depuis À vivre : « Un loisir à tester » ----------

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
  const loisir = nouveauLoisir(ideeVivre.nom);
  if (ideeVivre.note) loisir.etapes.push({ id: String(nouvelId()), nom: ideeVivre.note, fait: false });
  sauvegarderAtelier();
  // Si on annule, l'idée revient dans À vivre : on retire alors le tiroir
  const annulerAvant = quandOnAnnule;
  quandOnAnnule = () => {
    annulerAvant();
    atelier.loisirs = atelier.loisirs.filter((l) => l.id !== loisir.id);
    sauvegarderAtelier();
    afficherAtelier();
  };
  afficherAtelier();
}

sauvegarderAtelier();
afficherTypesLoisirs();
afficherAtelier();
