// =====================================================
// Module Envies : les onglets Cadeaux, À acheter et À vivre
// (À acheter : partie 10 ; modifier : partie 11 ; À vivre : partie 12)
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
//             + pour les envies d'achat (type "achat") : voir la partie 10
// reglages  : { delaiAccueil: 21, noel: true, delai: { actif, seuil1, jours1, seuil2, jours2 } }

let envies = charger("envies", null);
if (!envies) {
  envies = { personnes: [], envies: [], reglages: { delaiAccueil: 21, noel: true } };
}

// Le délai de réflexion (ajouté en v29)
if (!envies.reglages.delai) {
  envies.reglages.delai = { actif: true, seuil1: 5000, jours1: 7, seuil2: 30000, jours2: 30 };
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

}

// Les anniversaires de l'agenda qui n'ont pas encore de fiche
// (on ne les propose pas tous d'office : tu choisis qui ajouter, dans la feuille)
function anniversairesLibres() {
  const relies = envies.personnes.map((p) => p.anniversaireId);
  return agenda.elements.filter((el) => el.anniversaire && !relies.includes(el.id));
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

  // Toucher l'idée : la modifier
  const texte = document.createElement("button");
  texte.type = "button";
  texte.classList.add("ligne-occasion-texte", "zone-modifier");
  texte.addEventListener("click", () => ouvrirFeuilleEnvie(idee));
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
let anniversaireChoisi = null; // l'anniversaire de l'agenda choisi dans le menu
const menuDepuisAgenda = document.getElementById("personne-depuis-agenda");

// Choisir quelqu'un dans le menu : on remplit le prénom et la date
menuDepuisAgenda.addEventListener("change", () => {
  const anniv = agenda.elements.find((el) => String(el.id) === menuDepuisAgenda.value);
  anniversaireChoisi = anniv ? anniv.id : null;
  if (anniv) {
    document.getElementById("personne-prenom").value = anniv.titre;
    document.getElementById("personne-anniv").value = anniv.anneeNaissance
      ? `${anniv.anneeNaissance}-${anniv.date.slice(5)}`
      : anniv.date;
  }
});

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

  // Le menu « Depuis mon agenda » : seulement pour un nouveau proche
  anniversaireChoisi = null;
  const libres = anniversairesLibres();
  document.getElementById("bloc-depuis-agenda").hidden = Boolean(personne) || libres.length === 0;
  menuDepuisAgenda.replaceChildren();
  const vide = document.createElement("option");
  vide.value = "";
  vide.textContent = "Choisir un anniversaire…";
  menuDepuisAgenda.appendChild(vide);
  libres.forEach((anniv) => {
    const option = document.createElement("option");
    option.value = anniv.id;
    option.textContent = `${anniv.titre} (${formaterDate(prochaineDate(anniv.date.slice(5)), false)})`;
    menuDepuisAgenda.appendChild(option);
  });
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
    // Choisi dans le menu de l'agenda : on se relie à cet anniversaire (pas de doublon)
    personne = { id: String(nouvelId()), prenom, couleur: couleurPersonne, anniversaireId: anniversaireChoisi };
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
  afficherAchats();
  afficherVivre();
  afficherOccasions();
  afficherPersonnes();
  afficherPourMoi();
  afficherCarteCadeaux();
  if (personneOuverte && !feuillePersonne.hidden) afficherFichePersonne();
  const nombre = envies.envies.filter(
    (e) => e.type === "cadeau" && e.statut === "notee" && e.pourQui !== "moi",
  ).length;
  document.getElementById("foyer-envies-resume").textContent =
    nombre === 0 ? "Cadeaux, achats et idées à vivre" : `${nombre} idée${nombre > 1 ? "s" : ""} de cadeau notée${nombre > 1 ? "s" : ""}`;
}

// ---------- 10. À acheter ----------
// Une envie d'achat : { id, type: "achat", nom, prix, coeurs (1 à 3), note, lien,
//   statut, dateAjout, finDelai, projetId, chemin, eueLe }
// Le parcours : "murir" (le délai) → "prete" (toujours envie ?) →
//   "epargne" (un projet dans le Budget) → "eue" (je l'ai !) ou "non" (finalement non)
// chemin : comment on l'a eue : "direct", "reflexion" ou "projet"

// Combien de jours de réflexion pour ce prix ? (0 : pas de délai)
function joursDeReflexion(prix) {
  const d = envies.reglages.delai;
  if (!d.actif || prix < d.seuil1) return 0;
  return prix < d.seuil2 ? d.jours1 : d.jours2;
}

function achats(statut) {
  return envies.envies
    .filter((e) => e.type === "achat" && e.statut === statut)
    .sort((a, b) => b.coeurs - a.coeurs); // les plus grosses envies d'abord
}

// Le délai est fini : l'envie est « prête » (on vérifie à chaque affichage)
function murirLesEnvies() {
  let change = false;
  envies.envies.forEach((e) => {
    if (e.type === "achat" && e.statut === "murir" && e.finDelai <= aujourdhuiEnTexte()) {
      e.statut = "prete";
      change = true;
    }
  });
  if (change) sauvegarderEnvies();
}

// Le bocal « Plaisirs » (ou un bocal qui y ressemble), s'il existe
function bocalPlaisirs() {
  return budget.bocaux.find((b) => /plaisir|loisir|envie/i.test(b.nom)) || null;
}

// Ce que le Budget en pense : « ça tient dans tes Plaisirs » ou un projet
function conseilBudget(envie) {
  if (!envie.prix) return "";
  const bocal = bocalPlaisirs();
  if (bocal && bocal.montant > 0) {
    const reste = bocal.montant - depenseDansBocal(bocal, depensesDeLaPeriode(periodeEnCours()));
    if (reste >= envie.prix) {
      return `Ça tient dans ton bocal ${bocal.nom} ce mois-ci (il reste ${formaterMontant(reste)}).`;
    }
  }
  // Sinon : un projet sur 3 mois, arrondi à 500 F
  const parMois = Math.ceil(envie.prix / 3 / 500) * 500;
  return `En mettant ${formaterMontant(parMois)} de côté par mois, tu l'as dans 3 mois.`;
}

function creerCoeurs(nombre) {
  const zone = document.createElement("span");
  zone.classList.add("coeurs");
  zone.setAttribute("aria-label", `${nombre} cœur${nombre > 1 ? "s" : ""}`);
  for (let i = 0; i < nombre; i++) zone.appendChild(creerIcone("heart"));
  return zone;
}

function creerBoutonEnvie(texte, quandOnTouche, principal) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add(principal ? "bouton" : "bouton-demain");
  bouton.textContent = texte;
  bouton.addEventListener("click", quandOnTouche);
  return bouton;
}

// Une carte d'envie : nom, cœurs, prix, détail, et les boutons de l'étape
function creerCarteAchat(envie) {
  const carte = document.createElement("div");
  carte.classList.add("envie-achat");

  // Toucher le nom : modifier l'envie
  const haut = document.createElement("button");
  haut.type = "button";
  haut.classList.add("envie-achat-haut", "zone-modifier");
  haut.addEventListener("click", () => ouvrirFeuilleEnvie(envie));
  const nom = document.createElement("strong");
  nom.textContent = envie.nom;
  haut.append(nom, creerCoeurs(envie.coeurs));
  carte.appendChild(haut);

  const infos = [];
  if (envie.prix) infos.push(formaterMontant(envie.prix));
  if (envie.note) infos.push(envie.note);
  if (infos.length > 0) {
    const detail = document.createElement("p");
    detail.classList.add("sous-titre", "petit");
    detail.textContent = infos.join(" · ");
    carte.appendChild(detail);
  }
  if (envie.lien) {
    const lien = document.createElement("a");
    lien.href = envie.lien;
    lien.target = "_blank";
    lien.rel = "noopener";
    lien.classList.add("lien", "lien-petit");
    lien.textContent = "Voir le lien";
    carte.appendChild(lien);
  }

  const etape = document.createElement("p");
  etape.classList.add("envie-etape");
  const boutons = document.createElement("div");
  boutons.classList.add("envie-boutons");

  if (envie.statut === "murir") {
    const jours = joursAvant(envie.finDelai);
    etape.textContent = `Ça mûrit… encore ${jours} jour${jours > 1 ? "s" : ""} avant de décider.`;
    boutons.append(
      creerBoutonEnvie("Je suis sûre, pas besoin d'attendre", () => changerEnvie(envie, "prete")),
      creerBoutonEnvie("Finalement non", () => changerEnvie(envie, "non")),
    );
  } else if (envie.statut === "prete") {
    etape.textContent = conseilBudget(envie) || "Toujours envie ?";
    boutons.append(
      creerBoutonEnvie("Je l'ai !", () => changerEnvie(envie, "eue"), true),
      creerBoutonEnvie("J'économise", () => economiser(envie)),
      creerBoutonEnvie("Finalement non", () => changerEnvie(envie, "non")),
      creerBoutonEnvie("À m'offrir", () => aOffrir(envie)),
    );
  } else if (envie.statut === "epargne") {
    const projet = budget.epargne.projets.find((p) => p.id === envie.projetId);
    etape.textContent = projet
      ? `Projet : ${formaterMontant(projet.dejaDeCote)} sur ${formaterMontant(projet.objectif)} · ${etatDuProjet(projet).texte}`
      : "Le projet a été retiré du budget.";
    boutons.append(
      creerBoutonEnvie("Je l'ai !", () => changerEnvie(envie, "eue"), true),
      creerBoutonEnvie("Finalement non", () => changerEnvie(envie, "non")),
    );
  }
  carte.append(etape, boutons);

  // Retirer (sans passer par « Finalement non »)
  const supprimer = document.createElement("button");
  supprimer.type = "button";
  supprimer.classList.add("bouton-supprimer", "envie-supprimer");
  supprimer.setAttribute("aria-label", `Retirer ${envie.nom}`);
  supprimer.appendChild(creerIcone("x"));
  supprimer.addEventListener("click", () => {
    agirAvecAnnuler({
      tiroir: envies,
      message: `« ${envie.nom} » retirée`,
      action: () => {
        envies.envies = envies.envies.filter((e) => e.id !== envie.id);
      },
      apres: () => {
        sauvegarderEnvies();
        afficherEnvies();
      },
    });
  });
  carte.appendChild(supprimer);
  return carte;
}

function creerSectionAchats(titre, liste) {
  const carte = document.createElement("article");
  carte.classList.add("carte");
  const h2 = document.createElement("h2");
  h2.textContent = titre;
  carte.appendChild(h2);
  liste.forEach((envie) => carte.appendChild(creerCarteAchat(envie)));
  return carte;
}

function afficherAchats() {
  murirLesEnvies();
  const zone = document.getElementById("liste-achats");
  zone.replaceChildren();
  const pretes = achats("prete");
  const murir = achats("murir");
  const epargne = achats("epargne");
  if (pretes.length) zone.appendChild(creerSectionAchats("Toujours envie ?", pretes));
  if (murir.length) zone.appendChild(creerSectionAchats("Ça mûrit", murir));
  if (epargne.length) zone.appendChild(creerSectionAchats("J'économise", epargne));

  // Les deux bocaux du bas
  const non = achats("non");
  document.getElementById("total-finalement-non").textContent = formaterMontant(
    non.reduce((total, e) => total + (e.prix || 0), 0),
  );
  const eues = achats("eue").sort((a, b) => b.eueLe.localeCompare(a.eueLe));
  document.getElementById("nombre-realisees").textContent = eues.length;
  const liste = document.getElementById("liste-realisees");
  liste.replaceChildren();
  const chemins = { direct: "sans délai", reflexion: "après réflexion", projet: "après un projet" };
  eues.forEach((e) => {
    const ligne = document.createElement("p");
    ligne.classList.add("sous-titre", "petit");
    ligne.textContent = `${e.nom} · ${formaterDate(e.eueLe, false)}${e.prix ? ` · ${formaterMontant(e.prix)}` : ""} · ${chemins[e.chemin]}`;
    liste.appendChild(ligne);
  });
}

// Noter une nouvelle envie
document.getElementById("form-achat").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("achat-nom").value.trim();
  if (!nom) return;
  const prix = Number(document.getElementById("achat-prix").value.replace(/\s/g, "")) || 0;
  const jours = joursDeReflexion(prix);
  envies.envies.push({
    id: String(nouvelId()),
    type: "achat",
    nom: nom,
    prix: prix,
    coeurs: Number(document.querySelector('input[name="achat-coeurs"]:checked').value),
    note: document.getElementById("achat-note").value.trim(),
    lien: document.getElementById("achat-lien").value.trim(),
    statut: jours > 0 ? "murir" : "prete",
    dateAjout: aujourdhuiEnTexte(),
    finDelai: ajouterJours(aujourdhuiEnTexte(), jours),
    projetId: null,
    chemin: jours > 0 ? "reflexion" : "direct",
    eueLe: "",
  });
  sauvegarderEnvies();
  evenement.target.reset();
  afficherEnvies();
  montrerPetitMessage(jours > 0 ? `Notée. On en reparle dans ${jours} jours 🌱` : "C'est noté 🌱");
});

let achatDepense = null; // l'envie qu'on vient d'avoir (pour noter la dépense)

// Passer une envie à une autre étape (avec « Annuler »)
function changerEnvie(envie, statut) {
  const messages = {
    prete: "Elle est prête : à toi de voir 🌱",
    non: "Finalement non : c'est de l'argent gardé 🌱",
    eue: "Profite bien 🌱",
  };
  agirAvecAnnuler({
    tiroir: envies,
    message: messages[statut],
    action: () => {
      const e = envies.envies.find((x) => x.id === envie.id);
      // « Je suis sûre » : on a sauté le délai
      if (statut === "prete" && e.statut === "murir") e.chemin = "direct";
      e.statut = statut;
      if (statut === "eue") e.eueLe = aujourdhuiEnTexte();
    },
    apres: () => {
      sauvegarderEnvies();
      afficherEnvies();
    },
  });
  // Achetée avec l'argent du mois (pas un projet) : on propose de noter la dépense
  const depense = document.getElementById("achat-depense");
  depense.hidden = !(statut === "eue" && envie.prix > 0 && envie.statut !== "epargne");
  if (!depense.hidden) achatDepense = envie;
}

// « J'économise » : un projet dans Budget › Épargne & projets
function economiser(envie) {
  const parMois = Math.ceil((envie.prix || 0) / 3 / 500) * 500;
  const projet = {
    id: nouvelId(),
    nom: envie.nom,
    objectif: envie.prix || 0,
    dejaDeCote: 0,
    parMois: parMois,
    date: "",
  };
  budget.epargne.projets.push(projet);
  sauvegarderBudget();
  afficherBudget();
  const e = envies.envies.find((x) => x.id === envie.id);
  e.statut = "epargne";
  e.projetId = projet.id;
  e.chemin = "projet";
  sauvegarderEnvies();
  afficherEnvies();
  montrerPetitMessage("Projet créé dans ton budget 🌱");
}

// « À m'offrir » : elle part dans « Ce qui me ferait plaisir » (onglet Cadeaux)
function aOffrir(envie) {
  agirAvecAnnuler({
    tiroir: envies,
    message: "Elle est dans « Ce qui me ferait plaisir »",
    action: () => {
      const e = envies.envies.find((x) => x.id === envie.id);
      e.type = "cadeau";
      e.pourQui = "moi";
      e.occasion = "autre";
      e.statut = "notee";
      e.offerteLe = "";
    },
    apres: () => {
      sauvegarderEnvies();
      afficherEnvies();
    },
  });
}

document.getElementById("achat-depense-non").addEventListener("click", () => {
  document.getElementById("achat-depense").hidden = true;
});

document.getElementById("achat-depense-oui").addEventListener("click", () => {
  document.getElementById("achat-depense").hidden = true;
  ouvrirFeuilleDepense(null); // budget-mois.js
  const bocal = bocalPlaisirs();
  if (bocal) document.getElementById("depense-bocal").value = bocal.id;
  document.getElementById("depense-montant").value = achatDepense.prix;
  document.getElementById("depense-note").value = achatDepense.nom;
});

// ---------- 11. Modifier une envie ou une idée de cadeau ----------

const feuilleEnvie = document.getElementById("feuille-envie");
let envieEnModification = null;
let ficheARouvrir = null; // si on venait de la fiche d'un proche, on y retourne

function ouvrirFeuilleEnvie(envie) {
  envieEnModification = envie.id;
  // On vient de la fiche d'un proche : on la cache le temps de modifier
  ficheARouvrir = feuillePersonne.hidden ? null : personneOuverte;
  feuillePersonne.hidden = true;

  const achat = envie.type === "achat";
  const pourUnProche = envie.type === "cadeau" && envie.pourQui !== "moi";
  document.getElementById("envie-nom").value = envie.nom;
  document.getElementById("envie-prix").value = envie.prix || "";
  document.getElementById("envie-prix").closest("label").hidden = envie.type === "vivre";
  document.getElementById("bloc-envie-coeurs").hidden = !achat;
  document.querySelectorAll('input[name="envie-coeurs"]').forEach((bouton) => {
    bouton.checked = Number(bouton.value) === (envie.coeurs || 1);
  });
  document.getElementById("bloc-envie-occasion").hidden = !pourUnProche;
  document.getElementById("envie-occasion").value = envie.occasion || "autre";
  document.getElementById("bloc-envie-note").hidden = !achat && envie.type !== "vivre";
  document.getElementById("bloc-envie-lien").hidden = !achat;
  document.getElementById("envie-note").value = envie.note || "";
  document.getElementById("envie-lien").value = envie.lien || "";

  feuilleEnvie.hidden = false;
  voile.hidden = false;
}

function fermerFeuilleEnvie() {
  feuilleEnvie.hidden = true;
  voile.hidden = true;
  envieEnModification = null;
  if (ficheARouvrir) ouvrirFichePersonne(ficheARouvrir);
  ficheARouvrir = null;
}

document.getElementById("fermer-envie").addEventListener("click", fermerFeuilleEnvie);
voile.addEventListener("click", () => {
  if (!feuilleEnvie.hidden) fermerFeuilleEnvie();
});

document.getElementById("form-envie").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const envie = envies.envies.find((e) => e.id === envieEnModification);
  if (!envie) return;
  envie.nom = document.getElementById("envie-nom").value.trim() || envie.nom;
  envie.prix = Number(document.getElementById("envie-prix").value.replace(/\s/g, "")) || 0;
  if (envie.type === "achat") {
    envie.coeurs = Number(document.querySelector('input[name="envie-coeurs"]:checked').value);
    envie.note = document.getElementById("envie-note").value.trim();
    envie.lien = document.getElementById("envie-lien").value.trim();
  } else if (envie.type === "vivre") {
    envie.note = document.getElementById("envie-note").value.trim();
  } else if (envie.pourQui !== "moi") {
    envie.occasion = document.getElementById("envie-occasion").value;
  }
  sauvegarderEnvies();
  afficherEnvies();
  fermerFeuilleEnvie();
  montrerPetitMessage("C'est modifié 🌱");
});

// Les réglages du délai (dans Moi › Réglages des envies)
const caseDelai = document.getElementById("reglage-delai");
const champsPaliers = ["seuil1", "jours1", "seuil2", "jours2"];
caseDelai.checked = envies.reglages.delai.actif;
document.getElementById("bloc-paliers").hidden = !caseDelai.checked;
caseDelai.addEventListener("change", () => {
  envies.reglages.delai.actif = caseDelai.checked;
  document.getElementById("bloc-paliers").hidden = !caseDelai.checked;
  sauvegarderEnvies();
});
champsPaliers.forEach((cle) => {
  const champ = document.getElementById(`palier-${cle}`);
  champ.value = envies.reglages.delai[cle];
  champ.addEventListener("change", () => {
    const valeur = Number(champ.value.replace(/\s/g, ""));
    if (valeur >= 0) envies.reglages.delai[cle] = valeur;
    champ.value = envies.reglages.delai[cle];
    sauvegarderEnvies();
  });
});

// ---------- 12. À vivre ----------
// Une idée à vivre : { id, type: "vivre", nom, note, moments: [...], avecQui: [...], mois,
//   statut: "notee" | "vecue" | "partie", dateAjout, triee, planifieeLe, vecueLe }
// moments : "heure", "weekend", "vacances", "pluie", "beau" ; avecQui : "seule", "couple", "amis", "famille"
// mois : "" (n'importe quand) ou "07" (juillet)

const NOMS_MOMENTS = {
  heure: "1 h",
  weekend: "week-end",
  vacances: "vacances",
  pluie: "pluie",
  beau: "beau temps",
  seule: "seule",
  couple: "en couple",
  amis: "entre amis",
  famille: "en famille",
};

function casesCochees(nom) {
  return [...document.querySelectorAll(`input[name="${nom}"]:checked`)].map((c) => c.value);
}

function ideesAVivre() {
  return envies.envies.filter((e) => e.type === "vivre" && e.statut === "notee");
}

// Une idée correspond-elle à ce qu'on a choisi ?
// Ce que l'idée ne précise pas ne l'empêche jamais d'être proposée.
function correspond(idee, moments, avecQui) {
  const ok = (siIdee, choisis) =>
    siIdee.length === 0 || choisis.length === 0 || siIdee.some((x) => choisis.includes(x));
  const moisOk = !idee.mois || idee.mois === aujourdhuiEnTexte().slice(5, 7);
  return ok(idee.moments, moments) && ok(idee.avecQui, avecQui) && moisOk;
}

function piocherAuHasard(liste, sauf) {
  const choix = liste.length > 1 ? liste.filter((e) => e.id !== sauf) : liste;
  return choix[Math.floor(Math.random() * choix.length)] || null;
}

// Les petites étiquettes d'une idée : « week-end · en couple · en juillet »
function etiquettesIdee(idee) {
  const morceaux = [...idee.moments, ...idee.avecQui].map((x) => NOMS_MOMENTS[x]);
  if (idee.mois) {
    morceaux.push(`en ${texteEnDate(`2000-${idee.mois}-01`).toLocaleDateString("fr-FR", { month: "long" })}`);
  }
  return morceaux.join(" · ");
}

// « Le planifier » : la feuille de l'Agenda, avec le titre et le prochain samedi
function planifierIdee(idee) {
  ouvrirFeuilleElement(null, { type: "evenement", date: prochainWeekend() }); // agenda-feuille.js
  document.getElementById("element-titre").value = idee.nom;
  const e = envies.envies.find((x) => x.id === idee.id);
  e.planifieeLe = aujourdhuiEnTexte();
  sauvegarderEnvies();
  afficherEnvies();
}

// « C'est vécu ! » : l'idée part dans le bocal à souvenirs
function vivre(idee) {
  agirAvecAnnuler({
    tiroir: envies,
    message: "Un joli souvenir de plus 🌱",
    action: () => {
      const e = envies.envies.find((x) => x.id === idee.id);
      e.statut = "vecue";
      e.vecueLe = aujourdhuiEnTexte();
    },
    apres: () => {
      sauvegarderEnvies();
      afficherEnvies();
    },
  });
}

function creerLigneVivre(idee) {
  const carte = document.createElement("div");
  carte.classList.add("envie-achat");

  const haut = document.createElement("button");
  haut.type = "button";
  haut.classList.add("envie-achat-haut", "zone-modifier");
  haut.addEventListener("click", () => ouvrirFeuilleEnvie(idee));
  const nom = document.createElement("strong");
  nom.textContent = idee.nom;
  haut.appendChild(nom);
  carte.appendChild(haut);

  const infos = [etiquettesIdee(idee), idee.note].filter(Boolean);
  if (idee.planifieeLe) infos.push("dans ton agenda");
  if (infos.length) {
    const detail = document.createElement("p");
    detail.classList.add("sous-titre", "petit");
    detail.textContent = infos.join(" · ");
    carte.appendChild(detail);
  }

  const boutons = document.createElement("div");
  boutons.classList.add("envie-boutons");
  boutons.append(
    creerBoutonEnvie("Le planifier", () => planifierIdee(idee)),
    creerBoutonEnvie("C'est vécu !", () => vivre(idee)),
  );
  carte.appendChild(boutons);

  const supprimer = document.createElement("button");
  supprimer.type = "button";
  supprimer.classList.add("bouton-supprimer", "envie-supprimer");
  supprimer.setAttribute("aria-label", `Retirer ${idee.nom}`);
  supprimer.appendChild(creerIcone("x"));
  supprimer.addEventListener("click", () => {
    agirAvecAnnuler({
      tiroir: envies,
      message: `« ${idee.nom} » retirée`,
      action: () => {
        envies.envies = envies.envies.filter((e) => e.id !== idee.id);
      },
      apres: () => {
        sauvegarderEnvies();
        afficherEnvies();
      },
    });
  });
  carte.appendChild(supprimer);
  return carte;
}

function afficherVivre() {
  const zone = document.getElementById("liste-vivre");
  zone.replaceChildren();
  const idees = ideesAVivre();
  if (idees.length === 0) {
    zone.appendChild(
      creerMessageVide("Note ici les sorties et les petites aventures qui te font envie, pour qu'elles ne dorment plus."),
    );
  }
  idees.forEach((idee) => zone.appendChild(creerLigneVivre(idee)));

  // Le petit tri : une seule idée qui dort depuis plus de 3 mois remonte
  const dort = document.getElementById("idee-qui-dort");
  dort.replaceChildren();
  const vieille = idees.find((e) => !e.triee && joursAvant(e.dateAjout) <= -90);
  if (vieille) {
    const carte = document.createElement("article");
    carte.classList.add("carte", "carte-fin-courses");
    const texte = document.createElement("p");
    texte.textContent = `« ${vieille.nom} » attend depuis un moment. Toujours envie ?`;
    const boutons = document.createElement("div");
    boutons.classList.add("form-categorie-boutons");
    const partir = document.createElement("button");
    partir.type = "button";
    partir.classList.add("lien");
    partir.textContent = "Laisser partir";
    partir.addEventListener("click", () => {
      agirAvecAnnuler({
        tiroir: envies,
        message: "Elle est partie, en douceur 🌱",
        action: () => {
          envies.envies.find((e) => e.id === vieille.id).statut = "partie";
        },
        apres: () => {
          sauvegarderEnvies();
          afficherEnvies();
        },
      });
    });
    const garder = document.createElement("button");
    garder.type = "button";
    garder.classList.add("bouton");
    garder.textContent = "Garder";
    garder.addEventListener("click", () => {
      envies.envies.find((e) => e.id === vieille.id).triee = true; // on ne la redemande plus
      sauvegarderEnvies();
      afficherEnvies();
    });
    boutons.append(partir, garder);
    carte.append(texte, boutons);
    dort.appendChild(carte);
  }

  // Le bocal à souvenirs
  const vecues = envies.envies
    .filter((e) => e.type === "vivre" && e.statut === "vecue")
    .sort((a, b) => b.vecueLe.localeCompare(a.vecueLe));
  document.getElementById("nombre-souvenirs").textContent = vecues.length;
  const souvenirs = document.getElementById("liste-souvenirs");
  souvenirs.replaceChildren();
  vecues.forEach((e) => {
    const ligne = document.createElement("p");
    ligne.classList.add("sous-titre", "petit");
    ligne.textContent = `${e.nom} · ${formaterDate(e.vecueLe)}`;
    souvenirs.appendChild(ligne);
  });

  afficherCarteVivre();
}

// Noter une idée
document.getElementById("form-vivre").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("vivre-nom").value.trim();
  if (!nom) return;
  envies.envies.push({
    id: String(nouvelId()),
    type: "vivre",
    nom: nom,
    note: document.getElementById("vivre-note").value.trim(),
    moments: casesCochees("vivre-moment"),
    avecQui: casesCochees("vivre-qui"),
    mois: document.getElementById("vivre-mois").value,
    statut: "notee",
    dateAjout: aujourdhuiEnTexte(),
    triee: false,
    planifieeLe: "",
    vecueLe: "",
  });
  sauvegarderEnvies();
  evenement.target.reset();
  evenement.target.querySelectorAll("details").forEach((d) => (d.open = false));
  afficherEnvies();
  montrerPetitMessage("C'est noté 🌱");
});

// La pioche
let ideeTireeVivre = null;

function afficherPioche() {
  const zone = document.getElementById("resultat-pioche");
  zone.replaceChildren();
  const possibles = ideesAVivre().filter((e) =>
    correspond(e, casesCochees("pioche-moment"), casesCochees("pioche-qui")),
  );
  ideeTireeVivre = piocherAuHasard(possibles, ideeTireeVivre ? ideeTireeVivre.id : null);
  if (!ideeTireeVivre) {
    zone.appendChild(creerMessageVide("Rien ne correspond pour l'instant. Et si tu notais une nouvelle idée ?"));
    return;
  }
  const carte = document.createElement("div");
  carte.classList.add("resultat-pioche");
  const nom = document.createElement("p");
  nom.classList.add("resultat-pioche-nom");
  nom.textContent = ideeTireeVivre.nom;
  const boutons = document.createElement("div");
  boutons.classList.add("envie-boutons");
  const idee = ideeTireeVivre;
  boutons.append(
    creerBoutonEnvie("Le planifier", () => planifierIdee(idee), true),
    creerBoutonEnvie("Une autre", afficherPioche),
  );
  carte.append(nom, boutons);
  zone.appendChild(carte);
}

document.getElementById("piocher-vivre").addEventListener("click", afficherPioche);

// ---------- La carte « Et si… » de l'accueil ----------
// Le vendredi après-midi, le samedi et le dimanche : si le jour du week-end
// à venir est libre dans l'agenda, on propose une idée (une seule, discrète).

let ideeAccueilVivre = null;

function jourLibreDuWeekend() {
  const maintenant = new Date();
  const jour = maintenant.getDay(); // 5 = vendredi, 6 = samedi, 0 = dimanche
  const aujourdhui = aujourdhuiEnTexte();
  let candidats = [];
  if (jour === 5 && maintenant.getHours() >= 12) candidats = [ajouterJours(aujourdhui, 1), ajouterJours(aujourdhui, 2)];
  if (jour === 6) candidats = [aujourdhui, ajouterJours(aujourdhui, 1)];
  if (jour === 0) candidats = [aujourdhui];
  return candidats.find((date) => elementsDuJour(date).length === 0) || null;
}

function afficherCarteVivre() {
  const carte = document.querySelector('.carte-accueil[data-carte="vivre"]');
  const date = jourLibreDuWeekend();
  // Pas cette fois : on ne la remontre pas avant le week-end suivant
  const masquee = envies.reglages.vivreMasqueJusqua && envies.reglages.vivreMasqueJusqua >= aujourdhuiEnTexte();
  const possibles = ideesAVivre().filter((e) => correspond(e, ["weekend"], []));
  if (!date || masquee || possibles.length === 0) {
    carte.dataset.vide = true;
  } else {
    if (!ideeAccueilVivre || !possibles.includes(ideeAccueilVivre)) {
      ideeAccueilVivre = piocherAuHasard(possibles, null);
    }
    const quel = texteEnDate(date).toLocaleDateString("fr-FR", { weekday: "long" });
    document.getElementById("accueil-vivre-texte").textContent =
      `Ton ${quel} est libre. Et si : ${ideeAccueilVivre.nom} ?`;
    carte.dataset.vide = false;
  }
  placerCartesAccueil(); // accueil-cartes.js
}

document.getElementById("accueil-vivre-oui").addEventListener("click", () => {
  if (ideeAccueilVivre) planifierIdee(ideeAccueilVivre);
});
document.getElementById("accueil-vivre-non").addEventListener("click", () => {
  // Masquée jusqu'à la fin de ce week-end
  envies.reglages.vivreMasqueJusqua = ajouterJours(aujourdhuiEnTexte(), 2);
  sauvegarderEnvies();
  afficherCarteVivre();
});

afficherEnvies();
