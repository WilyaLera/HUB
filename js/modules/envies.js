// =====================================================
// Module Envies (pour l'instant : l'onglet Cadeaux)
//   1. le tiroir « envies »
//   2. les onglets
//   3. les dates : anniversaires (tirés de l'Agenda) et Noël
//   4. les prochaines occasions (avec leur décompte)
//   5. les proches : la liste, les suggestions de l'agenda
//   6. la fiche d'un proche : ses idées, « C'est offert », déjà offert
//   7. ajouter ou modifier un proche
//   8. « Ce qui me ferait plaisir »
//   9. la carte de l'accueil et les réglages
// =====================================================

// ---------- 1. Le tiroir « envies » ----------
// personnes : [{ id, prenom, couleur, anniversaireId }]
//             (anniversaireId : l'anniversaire rangé dans l'Agenda)
// envies    : [{ id, type: "cadeau", nom, prix, pourQui, occasion, statut, offerteLe }]
//             pourQui : "moi" ou l'id d'un proche
//             occasion : "anniversaire", "noel" ou "autre"
//             statut : "notee" ou "offerte"
//             (les types « achat » et « vivre » arriveront avec les deux autres onglets)
// reglages  : { delaiAccueil: 21, noel: true }

let envies = charger("envies", null);
if (!envies) {
  envies = { personnes: [], envies: [], reglages: { delaiAccueil: 21, noel: true } };
}

function sauvegarderEnvies() {
  sauvegarder("envies", envies);
}

function personneDe(id) {
  return envies.personnes.find((p) => p.id === id);
}

// ---------- 2. Les onglets ----------

document.querySelectorAll(".onglet-envies").forEach((onglet) => {
  onglet.addEventListener("click", () => {
    document.querySelectorAll(".onglet-envies").forEach((o) => o.classList.toggle("actif", o === onglet));
    document.querySelectorAll(".panneau-envies").forEach((panneau) => {
      panneau.hidden = panneau.id !== onglet.dataset.panneauEnvies;
    });
  });
});

// ---------- 3. Les dates ----------

// Dans combien de jours ? ("2026-12-25" → 42)
function joursAvant(dateTexte) {
  return Math.round((texteEnDate(dateTexte) - aujourdhuiAMinuit()) / UN_JOUR);
}

// « aujourd'hui », « demain », « dans 12 jours »
function texteDecompte(jours) {
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  return `dans ${jours} jours`;
}

// La prochaine fois qu'un jour « MM-JJ » arrive (aujourd'hui compris)
function prochaineDate(moisJour) {
  const annee = new Date().getFullYear();
  let date = `${annee}-${moisJour}`;
  if (date < aujourdhuiEnTexte()) date = `${annee + 1}-${moisJour}`;
  return date;
}

// L'anniversaire d'un proche, lu dans l'Agenda (ou null)
function anniversaireDe(personne) {
  return agenda.elements.find((el) => el.id === personne.anniversaireId) || null;
}

// La date de son prochain anniversaire (ou null)
function prochainAnniversaire(personne) {
  const anniv = anniversaireDe(personne);
  return anniv ? prochaineDate(anniv.date.slice(5)) : null;
}

function idees(personneId) {
  return envies.envies.filter((e) => e.type === "cadeau" && e.pourQui === personneId);
}

// ---------- 4. Les prochaines occasions ----------

// Les occasions des 60 prochains jours, de la plus proche à la plus lointaine
function prochainesOccasions(limiteJours = 60) {
  const occasions = [];
  envies.personnes.forEach((personne) => {
    const date = prochainAnniversaire(personne);
    if (date && joursAvant(date) <= limiteJours) {
      occasions.push({ type: "anniversaire", date, personne });
    }
  });
  if (envies.reglages.noel) {
    const noel = prochaineDate("12-25");
    if (joursAvant(noel) <= limiteJours) occasions.push({ type: "noel", date: noel });
  }
  return occasions.sort((a, b) => a.date.localeCompare(b.date));
}

// Combien d'idées notées pour cette occasion ?
function ideesPourOccasion(occasion) {
  return envies.envies.filter(
    (e) =>
      e.type === "cadeau" &&
      e.statut === "notee" &&
      e.pourQui !== "moi" &&
      (occasion.type === "noel"
        ? e.occasion === "noel"
        : e.pourQui === occasion.personne.id && e.occasion === "anniversaire"),
  ).length;
}

function titreOccasion(occasion) {
  return occasion.type === "noel" ? "Noël" : `Anniversaire de ${occasion.personne.prenom}`;
}

function afficherOccasions() {
  const zone = document.getElementById("liste-occasions");
  zone.replaceChildren();
  const occasions = prochainesOccasions();
  if (occasions.length === 0) {
    zone.appendChild(creerMessageVide("Rien dans les deux prochains mois. Tout le temps de trouver des idées."));
    return;
  }
  occasions.forEach((occasion) => {
    const ligne = document.createElement("button");
    ligne.type = "button";
    ligne.classList.add("ligne-occasion");

    // Le décompte, en gros : c'est lui qu'on regarde en premier
    const decompte = document.createElement("span");
    decompte.classList.add("decompte");
    const jours = joursAvant(occasion.date);
    decompte.textContent = jours === 0 ? "J" : `J-${jours}`;

    const texte = document.createElement("span");
    texte.classList.add("ligne-occasion-texte");
    const titre = document.createElement("strong");
    titre.textContent = titreOccasion(occasion);
    const detail = document.createElement("span");
    detail.classList.add("sous-titre", "petit");
    const nombre = ideesPourOccasion(occasion);
    detail.textContent = `${formaterDate(occasion.date, false)} · ${
      nombre === 0 ? "pas encore d'idée" : nombre === 1 ? "1 idée notée" : `${nombre} idées notées`
    }`;
    texte.append(titre, detail);

    ligne.append(decompte, texte);
    // Toucher un anniversaire ouvre la fiche du proche
    if (occasion.type === "anniversaire") {
      ligne.addEventListener("click", () => ouvrirFichePersonne(occasion.personne.id));
    } else {
      ligne.disabled = true;
    }
    zone.appendChild(ligne);
  });
}

// ---------- 5. Les proches ----------

function creerPastillePersonne(personne) {
  const rond = document.createElement("span");
  rond.classList.add("rond-personne");
  rond.style.background = personne.couleur;
  rond.textContent = personne.prenom.charAt(0).toUpperCase();
  return rond;
}

function afficherPersonnes() {
  const zone = document.getElementById("liste-personnes");
  zone.replaceChildren();
  if (envies.personnes.length === 0) {
    zone.appendChild(creerMessageVide("Ajoute tes proches pour noter tes idées de cadeaux au fil de l'année."));
  }
  // Les proches, triés par prochain anniversaire (ceux sans date à la fin)
  const tries = [...envies.personnes].sort((a, b) => {
    const da = prochainAnniversaire(a) || "9999";
    const db = prochainAnniversaire(b) || "9999";
    return da.localeCompare(db);
  });
  tries.forEach((personne) => {
    const ligne = document.createElement("button");
    ligne.type = "button";
    ligne.classList.add("ligne-personne");

    const texte = document.createElement("span");
    texte.classList.add("ligne-occasion-texte");
    const nom = document.createElement("strong");
    nom.textContent = personne.prenom;
    const detail = document.createElement("span");
    detail.classList.add("sous-titre", "petit");
    const morceaux = [];
    const date = prochainAnniversaire(personne);
    if (date) morceaux.push(`anniv. ${texteDecompte(joursAvant(date))}`);
    const nombre = idees(personne.id).filter((e) => e.statut === "notee").length;
    morceaux.push(nombre === 0 ? "pas d'idée" : nombre === 1 ? "1 idée" : `${nombre} idées`);
    detail.textContent = morceaux.join(" · ");
    texte.append(nom, detail);

    ligne.append(creerPastillePersonne(personne), texte, creerIcone("chevron-right"));
    ligne.addEventListener("click", () => ouvrirFichePersonne(personne.id));
    zone.appendChild(ligne);
  });

  // Les anniversaires de l'agenda qui n'ont pas encore de fiche
  const suggestions = document.getElementById("suggestions-agenda");
  suggestions.replaceChildren();
  const relies = envies.personnes.map((p) => p.anniversaireId);
  const libres = agenda.elements.filter((el) => el.anniversaire && !relies.includes(el.id));
  if (libres.length > 0) {
    const titre = document.createElement("p");
    titre.classList.add("sous-titre", "petit");
    titre.textContent = "Depuis ton agenda :";
    suggestions.appendChild(titre);
    const choix = document.createElement("div");
    choix.classList.add("choix");
    libres.forEach((anniv) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.classList.add("pastille-date");
      bouton.textContent = `+ ${anniv.titre}`;
      bouton.addEventListener("click", () => {
        envies.personnes.push({
          id: String(nouvelId()),
          prenom: anniv.titre,
          couleur: couleurLibre(),
          anniversaireId: anniv.id,
        });
        sauvegarderEnvies();
        afficherEnvies();
        montrerPetitMessage(`${anniv.titre} est ajouté·e 🌱`);
      });
      choix.appendChild(bouton);
    });
    suggestions.appendChild(choix);
  }
}

// La première couleur pas encore prise par un proche
function couleurLibre() {
  return (
    COULEURS_CATEGORIES.find((c) => !envies.personnes.some((p) => p.couleur === c)) ||
    COULEURS_CATEGORIES[envies.personnes.length % COULEURS_CATEGORIES.length]
  );
}

// ---------- 6. La fiche d'un proche ----------

const feuillePersonne = document.getElementById("feuille-personne");
const offertDepense = document.getElementById("offert-depense");
let personneOuverte = null;
let cadeauOffert = null; // le cadeau qu'on vient d'offrir (pour noter la dépense)

function ouvrirFichePersonne(id) {
  personneOuverte = id;
  offertDepense.hidden = true;
  afficherFichePersonne();
  feuillePersonne.hidden = false;
  voile.hidden = false;
}

function fermerFichePersonne() {
  feuillePersonne.hidden = true;
  voile.hidden = true;
  personneOuverte = null;
}

document.getElementById("fermer-personne").addEventListener("click", fermerFichePersonne);
voile.addEventListener("click", () => {
  if (!feuillePersonne.hidden) fermerFichePersonne();
});

function creerLigneIdee(idee, avecOffert) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-idee");

  const texte = document.createElement("span");
  texte.classList.add("ligne-occasion-texte");
  const nom = document.createElement("span");
  nom.textContent = idee.nom;
  texte.appendChild(nom);
  const morceaux = [];
  if (idee.prix) morceaux.push(formaterMontant(idee.prix));
  if (idee.pourQui !== "moi") {
    morceaux.push({ anniversaire: "anniversaire", noel: "Noël", autre: "autre occasion" }[idee.occasion]);
  }
  if (morceaux.length > 0) {
    const detail = document.createElement("span");
    detail.classList.add("sous-titre", "petit");
    detail.textContent = morceaux.join(" · ");
    texte.appendChild(detail);
  }
  ligne.appendChild(texte);

  if (avecOffert) {
    const offert = document.createElement("button");
    offert.type = "button";
    offert.classList.add("bouton-demain");
    offert.textContent = idee.pourQui === "moi" ? "Je l'ai eu" : "C'est offert";
    offert.addEventListener("click", () => offrir(idee));
    ligne.appendChild(offert);
  }

  const supprimer = document.createElement("button");
  supprimer.type = "button";
  supprimer.classList.add("bouton-supprimer");
  supprimer.setAttribute("aria-label", `Retirer ${idee.nom}`);
  supprimer.appendChild(creerIcone("x"));
  supprimer.addEventListener("click", () => {
    agirAvecAnnuler({
      tiroir: envies,
      message: `« ${idee.nom} » retiré`,
      action: () => {
        envies.envies = envies.envies.filter((e) => e.id !== idee.id);
      },
      apres: () => {
        sauvegarderEnvies();
        afficherEnvies();
      },
    });
  });
  ligne.appendChild(supprimer);
  return ligne;
}

function afficherFichePersonne() {
  const personne = personneDe(personneOuverte);
  if (!personne) return;
  document.getElementById("personne-titre").textContent = personne.prenom;

  const date = prochainAnniversaire(personne);
  const anniv = anniversaireDe(personne);
  let occasion = "Pas d'anniversaire noté. Tu peux l'ajouter avec « Modifier ».";
  if (date) {
    occasion = `Anniversaire le ${formaterDate(date, false)}, ${texteDecompte(joursAvant(date))}`;
    if (anniv.anneeNaissance) occasion += ` (${Number(date.slice(0, 4)) - anniv.anneeNaissance} ans)`;
  }
  document.getElementById("personne-occasion").textContent = occasion;

  // La date la plus proche choisit l'occasion proposée par défaut
  const noel = prochaineDate("12-25");
  document.getElementById("idee-occasion").value =
    date && (!envies.reglages.noel || date < noel) ? "anniversaire" : envies.reglages.noel ? "noel" : "autre";

  const zone = document.getElementById("personne-idees");
  zone.replaceChildren();
  const aOffrir = idees(personne.id).filter((e) => e.statut === "notee");
  if (aOffrir.length === 0) {
    zone.appendChild(creerMessageVide("Pas encore d'idée. Note-la dès qu'elle te vient !"));
  }
  aOffrir.forEach((idee) => zone.appendChild(creerLigneIdee(idee, true)));

  // Déjà offert : pour ne pas offrir deux fois la même chose
  const offerts = idees(personne.id).filter((e) => e.statut === "offerte");
  const deja = document.getElementById("personne-deja-offert");
  deja.hidden = offerts.length === 0;
  const liste = document.getElementById("liste-deja-offert");
  liste.replaceChildren();
  offerts
    .sort((a, b) => b.offerteLe.localeCompare(a.offerteLe))
    .forEach((idee) => {
      const ligne = document.createElement("p");
      ligne.classList.add("sous-titre");
      ligne.textContent = `${idee.nom} · ${formaterDate(idee.offerteLe)}`;
      liste.appendChild(ligne);
    });
}

// Ajouter une idée pour ce proche
document.getElementById("form-idee").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("idee-nom").value.trim();
  if (!nom || !personneOuverte) return;
  envies.envies.push({
    id: String(nouvelId()),
    type: "cadeau",
    nom: nom,
    prix: Number(document.getElementById("idee-prix").value.replace(/\s/g, "")) || 0,
    pourQui: personneOuverte,
    occasion: document.getElementById("idee-occasion").value,
    statut: "notee",
    offerteLe: "",
  });
  sauvegarderEnvies();
  document.getElementById("idee-nom").value = "";
  document.getElementById("idee-prix").value = "";
  afficherEnvies();
  document.getElementById("idee-nom").focus();
});

// « C'est offert » (ou « Je l'ai eu ») : le cadeau passe dans « Déjà offert »
function offrir(idee) {
  agirAvecAnnuler({
    tiroir: envies,
    message: idee.pourQui === "moi" ? "Profite bien 🌱" : "C'est offert 🌱",
    action: () => {
      const cadeau = envies.envies.find((e) => e.id === idee.id);
      cadeau.statut = "offerte";
      cadeau.offerteLe = aujourdhuiEnTexte();
    },
    apres: () => {
      sauvegarderEnvies();
      afficherEnvies();
    },
  });
  // Un cadeau qu'on a payé : on propose de le noter dans le Budget
  if (idee.pourQui !== "moi" && idee.prix > 0) {
    cadeauOffert = idee;
    offertDepense.hidden = false;
  }
}

document.getElementById("offert-depense-non").addEventListener("click", () => {
  offertDepense.hidden = true;
});

// La feuille de dépense du Budget, déjà réglée sur le bocal Cadeaux
document.getElementById("offert-depense-oui").addEventListener("click", () => {
  const cadeau = cadeauOffert;
  const personne = personneDe(cadeau.pourQui);
  fermerFichePersonne();
  ouvrirFeuilleDepense(null); // budget-mois.js
  const bocal = budget.bocaux.find((b) => b.nom.toLowerCase().includes("cadeau"));
  if (bocal) document.getElementById("depense-bocal").value = bocal.id;
  document.getElementById("depense-montant").value = cadeau.prix;
  document.getElementById("depense-note").value = `Cadeau pour ${personne ? personne.prenom : ""} : ${cadeau.nom}`;
});

// Retirer ce proche (ses idées partent avec lui ; son anniversaire reste dans l'agenda)
document.getElementById("supprimer-personne").addEventListener("click", () => {
  const personne = personneDe(personneOuverte);
  if (!personne) return;
  fermerFichePersonne();
  agirAvecAnnuler({
    tiroir: envies,
    message: `${personne.prenom} est retiré·e`,
    action: () => {
      envies.personnes = envies.personnes.filter((p) => p.id !== personne.id);
      envies.envies = envies.envies.filter((e) => e.pourQui !== personne.id);
    },
    apres: () => {
      sauvegarderEnvies();
      afficherEnvies();
    },
  });
});

// ---------- 7. Ajouter ou modifier un proche ----------

const feuilleFormPersonne = document.getElementById("feuille-form-personne");
let personneEnModification = null;
let couleurPersonne = COULEURS_CATEGORIES[0];

function afficherCouleursPersonne() {
  const zone = document.getElementById("personne-couleurs");
  zone.replaceChildren();
  COULEURS_CATEGORIES.forEach((couleur) => {
    const rond = document.createElement("button");
    rond.type = "button";
    rond.classList.add("rond-couleur");
    rond.classList.toggle("choisi", couleur === couleurPersonne);
    rond.style.background = couleur;
    rond.setAttribute("aria-label", `Couleur ${couleur}`);
    rond.addEventListener("click", () => {
      couleurPersonne = couleur;
      afficherCouleursPersonne();
    });
    zone.appendChild(rond);
  });
}

function ouvrirFormPersonne(personne) {
  personneEnModification = personne ? personne.id : null;
  document.getElementById("form-personne-titre").textContent = personne ? "Modifier" : "Un proche";
  document.getElementById("personne-prenom").value = personne ? personne.prenom : "";
  const anniv = personne ? anniversaireDe(personne) : null;
  // On montre la date de naissance si on la connaît
  document.getElementById("personne-anniv").value = anniv
    ? anniv.anneeNaissance
      ? `${anniv.anneeNaissance}-${anniv.date.slice(5)}`
      : anniv.date
    : "";
  couleurPersonne = personne ? personne.couleur : couleurLibre();
  afficherCouleursPersonne();
  feuilleFormPersonne.hidden = false;
  voile.hidden = false;
  document.getElementById("personne-prenom").focus();
}

function fermerFormPersonne() {
  feuilleFormPersonne.hidden = true;
  voile.hidden = true;
  personneEnModification = null;
}

document.getElementById("ajouter-personne").addEventListener("click", () => ouvrirFormPersonne(null));
document.getElementById("modifier-personne").addEventListener("click", () => {
  const personne = personneDe(personneOuverte);
  feuillePersonne.hidden = true;
  ouvrirFormPersonne(personne);
});
document.getElementById("fermer-form-personne").addEventListener("click", fermerFormPersonne);
voile.addEventListener("click", () => {
  if (!feuilleFormPersonne.hidden) fermerFormPersonne();
});

document.getElementById("form-personne").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const prenom = document.getElementById("personne-prenom").value.trim();
  if (!prenom) return;
  const dateAnniv = document.getElementById("personne-anniv").value; // "1996-03-14" ou ""

  let personne = personneDe(personneEnModification);
  if (!personne) {
    personne = { id: String(nouvelId()), prenom, couleur: couleurPersonne, anniversaireId: null };
    envies.personnes.push(personne);
  }
  personne.prenom = prenom;
  personne.couleur = couleurPersonne;

  // L'anniversaire vit dans l'Agenda : on le crée ou on le met à jour
  let anniv = anniversaireDe(personne);
  if (dateAnniv) {
    const annee = Number(dateAnniv.slice(0, 4));
    const anneeNaissance = annee < new Date().getFullYear() ? annee : "";
    if (!anniv) {
      anniv = {
        id: nouvelId(),
        type: "evenement",
        titre: prenom,
        date: dateAnniv,
        heure: "",
        categorie: ANNIVERSAIRE.code,
        fait: false,
        urgent: false,
        dateLimite: "",
        recurrence: "annee",
        finRepetition: "",
        anniversaire: true,
        anneeNaissance: anneeNaissance,
      };
      agenda.elements.push(anniv);
      personne.anniversaireId = anniv.id;
    } else {
      anniv.date = dateAnniv;
      anniv.anneeNaissance = anneeNaissance;
      anniv.titre = prenom;
    }
    sauvegarderAgenda();
    rafraichirAgenda();
  }

  sauvegarderEnvies();
  const etaitUneModification = Boolean(personneEnModification);
  fermerFormPersonne();
  afficherEnvies();
  if (etaitUneModification) ouvrirFichePersonne(personne.id);
  montrerPetitMessage("C'est noté 🌱");
});

// ---------- 8. Ce qui me ferait plaisir ----------

function afficherPourMoi() {
  const zone = document.getElementById("liste-pour-moi");
  zone.replaceChildren();
  const miennes = idees("moi").filter((e) => e.statut === "notee");
  if (miennes.length === 0) {
    zone.appendChild(creerMessageVide("Note ici ce qui te ferait plaisir : pratique quand on te demande une idée."));
  }
  miennes.forEach((idee) => zone.appendChild(creerLigneIdee(idee, true)));
  document.getElementById("copier-pour-moi").hidden = miennes.length === 0;
}

document.getElementById("form-pour-moi").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("pour-moi-nom").value.trim();
  if (!nom) return;
  envies.envies.push({
    id: String(nouvelId()),
    type: "cadeau",
    nom: nom,
    prix: Number(document.getElementById("pour-moi-prix").value.replace(/\s/g, "")) || 0,
    pourQui: "moi",
    occasion: "autre",
    statut: "notee",
    offerteLe: "",
  });
  sauvegarderEnvies();
  document.getElementById("pour-moi-nom").value = "";
  document.getElementById("pour-moi-prix").value = "";
  afficherEnvies();
});

// Copier la liste en texte, pour l'envoyer à un proche
document.getElementById("copier-pour-moi").addEventListener("click", () => {
  const lignes = idees("moi")
    .filter((e) => e.statut === "notee")
    .map((e) => `- ${e.nom}${e.prix ? ` (${formaterMontant(e.prix)})` : ""}`);
  const texte = `Ce qui me ferait plaisir :\n${lignes.join("\n")}`;
  navigator.clipboard
    .writeText(texte)
    .then(() => montrerPetitMessage("Ta liste est copiée 🌱"))
    .catch(() => montrerPetitMessage("Impossible de copier ici"));
});

// ---------- 9. La carte de l'accueil et les réglages ----------

function afficherCarteCadeaux() {
  const carte = document.querySelector('.carte-accueil[data-carte="cadeaux"]');
  const occasions = prochainesOccasions(envies.reglages.delaiAccueil);
  // Pas d'occasion proche : la carte se cache (accueil-cartes.js lit data-vide)
  carte.dataset.vide = occasions.length === 0;
  if (occasions.length > 0) {
    const occasion = occasions[0];
    const nombre = ideesPourOccasion(occasion);
    let texte = `${titreOccasion(occasion)} ${texteDecompte(joursAvant(occasion.date))}`;
    texte += nombre === 0 ? " · pas encore d'idée" : nombre === 1 ? " · 1 idée notée" : ` · ${nombre} idées notées`;
    if (occasions.length > 1) texte += ` (et ${occasions.length - 1} autre${occasions.length > 2 ? "s" : ""})`;
    document.getElementById("accueil-cadeaux").textContent = texte;
  }
  placerCartesAccueil(); // accueil-cartes.js
}

document.querySelectorAll('input[name="delai-cadeaux"]').forEach((bouton) => {
  bouton.checked = Number(bouton.value) === envies.reglages.delaiAccueil;
  bouton.addEventListener("change", () => {
    envies.reglages.delaiAccueil = Number(bouton.value);
    sauvegarderEnvies();
    afficherEnvies();
  });
});

const caseNoel = document.getElementById("reglage-noel");
caseNoel.checked = envies.reglages.noel;
caseNoel.addEventListener("change", () => {
  envies.reglages.noel = caseNoel.checked;
  sauvegarderEnvies();
  afficherEnvies();
});

// ---------- Tout réafficher ----------

function afficherEnvies() {
  afficherOccasions();
  afficherPersonnes();
  afficherPourMoi();
  afficherCarteCadeaux();
  if (personneOuverte && !feuillePersonne.hidden) afficherFichePersonne();
  const nombre = envies.envies.filter((e) => e.statut === "notee" && e.pourQui !== "moi").length;
  document.getElementById("foyer-envies-resume").textContent =
    nombre === 0 ? "Cadeaux, achats et idées à vivre" : `${nombre} idée${nombre > 1 ? "s" : ""} de cadeau notée${nombre > 1 ? "s" : ""}`;
}

afficherEnvies();
