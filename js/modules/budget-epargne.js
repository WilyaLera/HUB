// =====================================================
// Module Budget — partie 4 : « Épargne & projets »
//   1. le total épargné et la projection sur un an
//   2. l'épargne de sécurité (objectif : 3 mois de dépenses)
//   3. les projets (objectif, déjà de côté, par mois, date)
//   4. l'argent réservé aux grosses échéances (ce n'est PAS de l'épargne)
// =====================================================

// ---------- Petits calculs ----------

function totalProjetsDeCote() {
  return sommer(budget.epargne.projets, (p) => p.dejaDeCote);
}

function totalProjetsParMois() {
  return sommer(budget.epargne.projets, (p) => p.parMois);
}

// Ce que coûte un mois « normal » : charges + bocaux
function depensesDUnMois() {
  return totalMiseDeCote() + totalBocaux();
}

// « mars 2027 »
function moisEnLettres(date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ---------- 1. Le total ----------

function afficherTotalEpargne() {
  const total = budget.epargne.securite + totalProjetsDeCote();
  const parMois = budget.epargneMensuelle;

  document.getElementById("epargne-total").textContent = formaterMontant(total);

  const projection = document.getElementById("epargne-projection");
  projection.hidden = parMois === 0;
  projection.textContent = `≈ ${formaterMontant(total + 12 * parMois)} dans un an`;

  // Comment se répartit l'épargne du mois
  const versProjets = totalProjetsParMois();
  const versSecurite = Math.max(parMois - versProjets, 0);
  document
    .getElementById("epargne-repartition")
    .replaceChildren(
      creerLigneInfo("Chaque mois, tu mets de côté", formaterMontant(parMois)),
      creerLigneInfo("→ pour tes projets", formaterMontant(versProjets)),
      creerLigneInfo("→ pour ta sécurité", formaterMontant(versSecurite)),
    );

  const message = document.getElementById("epargne-message");
  message.classList.toggle("montant-attention", versProjets > parMois);
  if (parMois === 0) {
    message.textContent = "Choisis ton épargne du mois dans « Mon budget ».";
  } else if (versProjets > parMois) {
    message.textContent = `Tes projets demandent ${formaterMontant(versProjets - parMois)} de plus que ton épargne du mois.`;
  } else {
    message.textContent = "";
  }
}

// ---------- 2. L'épargne de sécurité ----------

let securiteEnMiseAJour = false;

function afficherSecurite() {
  const deCote = budget.epargne.securite;
  const unMois = depensesDUnMois();
  const objectif = 3 * unMois;
  const moisCouverts = unMois > 0 ? deCote / unMois : 0;

  // « 2,1 mois couverts sur 3 »
  const texteMois = moisCouverts.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  document.getElementById("securite-mois").textContent =
    unMois === 0
      ? "Remplis « Mon budget » pour calculer ton objectif."
      : `${texteMois} mois couverts sur 3`;

  const part = objectif > 0 ? Math.min(deCote / objectif, 1) : 0;
  document.getElementById("securite-jauge").replaceChildren(creerJauge(part, false));

  document
    .getElementById("securite-detail")
    .replaceChildren(
      creerLigneInfo("Mis de côté", formaterMontant(deCote)),
      creerLigneInfo("Objectif (3 mois de dépenses)", formaterMontant(objectif)),
    );

  // Le petit formulaire pour noter le vrai montant de l'épargne
  const zone = document.getElementById("securite-formulaire");
  zone.replaceChildren();
  if (securiteEnMiseAJour) {
    zone.appendChild(
      creerPetitFormulaire(deCote, "Ce qu'il y a vraiment", (montant) => {
        budget.epargne.securite = montant;
        securiteEnMiseAJour = false;
        sauvegarderBudget();
        afficherEpargne();
      }, () => {
        securiteEnMiseAJour = false;
        afficherEpargne();
      }),
    );
  }
}

document.getElementById("lien-securite").addEventListener("click", () => {
  securiteEnMiseAJour = true;
  afficherSecurite();
});

// Un petit formulaire « montant + Valider + Annuler » (sert plusieurs fois)
function creerPetitFormulaire(valeur, texteAide, quandValide, quandAnnule) {
  const formulaire = document.createElement("form");
  formulaire.classList.add("form-paiement");

  const champ = document.createElement("input");
  champ.type = "number";
  champ.min = "0";
  champ.inputMode = "numeric";
  champ.placeholder = texteAide;
  champ.setAttribute("aria-label", texteAide);
  if (valeur) champ.value = valeur;

  const valider = document.createElement("button");
  valider.type = "submit";
  valider.classList.add("bouton-petit");
  valider.textContent = "Valider";

  const annuler = document.createElement("button");
  annuler.type = "button";
  annuler.classList.add("bouton-annuler");
  annuler.textContent = "Annuler";
  annuler.addEventListener("click", quandAnnule);

  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    if (champ.value === "") return;
    quandValide(Number(champ.value));
  });

  formulaire.append(champ, valider, annuler);
  setTimeout(() => champ.focus(), 0);
  return formulaire;
}

// ---------- 3. Les projets ----------

const listeProjets = document.getElementById("liste-projets");
const formProjet = document.getElementById("form-projet");
const projetNom = document.getElementById("projet-nom");
const projetObjectif = document.getElementById("projet-objectif");
const projetDeja = document.getElementById("projet-deja");
const projetParMois = document.getElementById("projet-par-mois");
const projetDate = document.getElementById("projet-date");

let projetEnModification = null;
let projetEnAjoutArgent = null; // le projet où l'on ajoute de l'argent

// Où en est un projet ? « Dans les temps », « Atteint en mars 2027 »…
function etatDuProjet(projet) {
  const reste = projet.objectif - projet.dejaDeCote;
  if (reste <= 0) return { texte: "Objectif atteint 🌱", attention: false };

  if (projet.parMois <= 0) {
    return { texte: "Choisis un montant par mois pour voir quand tu y seras.", attention: false };
  }

  // Combien de mois il faut au rythme choisi
  const moisNecessaires = Math.ceil(reste / projet.parMois);
  const arrivee = aujourdhuiAMinuit();
  arrivee.setMonth(arrivee.getMonth() + moisNecessaires);

  if (!projet.date) {
    return { texte: `Atteint en ${moisEnLettres(arrivee)}`, attention: false };
  }

  // Avec une date : est-on dans les temps ?
  const moisDispo = Math.max(moisAvant(projet.date), 1);
  if (moisNecessaires <= moisDispo) {
    return { texte: `Dans les temps 🌱 · atteint en ${moisEnLettres(arrivee)}`, attention: false };
  }
  const parMoisNecessaire = Math.ceil(reste / moisDispo);
  return {
    texte: `Pour le ${formaterDate(projet.date)}, il faudrait ≈ ${formaterMontant(parMoisNecessaire)} par mois`,
    attention: true,
  };
}

function afficherProjets() {
  rangerFormulaire(formProjet);
  listeProjets.replaceChildren();

  budget.epargne.projets.forEach((projet) => {
    const ligne = document.createElement("div");
    ligne.classList.add("projet");

    // Le nom et la progression : on les touche pour modifier le projet
    const zone = document.createElement("button");
    zone.type = "button";
    zone.classList.add("ligne-budget-ouvrir", "projet-zone");
    zone.addEventListener("click", () => modifierProjet(projet));

    const haut = document.createElement("span");
    haut.classList.add("bocal-mois-haut");
    const nom = document.createElement("strong");
    nom.textContent = projet.nom;
    const montants = document.createElement("span");
    montants.textContent = `${formaterMontant(projet.dejaDeCote)} / ${formaterMontant(projet.objectif)}`;
    haut.append(nom, montants);

    const part = projet.objectif > 0 ? Math.min(projet.dejaDeCote / projet.objectif, 1) : 0;
    const jauge = creerJauge(part, false);

    const etat = etatDuProjet(projet);
    const texteEtat = document.createElement("span");
    texteEtat.classList.add("sous-titre");
    texteEtat.classList.toggle("montant-attention", etat.attention);
    texteEtat.textContent = `${formaterMontant(projet.parMois)} par mois · ${etat.texte}`;

    const textes = document.createElement("span");
    textes.classList.add("ligne-budget-textes");
    textes.append(haut, jauge, texteEtat);
    zone.appendChild(textes);
    ligne.appendChild(zone);

    // Ajouter de l'argent au projet (quand on a fait un virement vers lui)
    if (projetEnAjoutArgent === projet.id) {
      ligne.appendChild(
        creerPetitFormulaire(null, "Montant ajouté", (montant) => {
          projet.dejaDeCote = projet.dejaDeCote + montant;
          projetEnAjoutArgent = null;
          sauvegarderBudget();
          afficherEpargne();
          montrerPetitMessage("Bien joué 🌱");
        }, () => {
          projetEnAjoutArgent = null;
          afficherProjets();
        }),
      );
    } else {
      const ajouter = document.createElement("button");
      ajouter.type = "button";
      ajouter.classList.add("lien", "lien-petit");
      ajouter.textContent = "+ Ajouter de l'argent";
      ajouter.addEventListener("click", () => {
        projetEnAjoutArgent = projet.id;
        afficherProjets();
      });
      ligne.appendChild(ajouter);
    }

    listeProjets.appendChild(ligne);

    if (projet.id === projetEnModification) {
      ligne.classList.add("en-cours");
      ligne.after(formProjet);
    }
  });

  if (budget.epargne.projets.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre");
    vide.textContent = "Pas encore de projet. Un voyage, un canapé, une machine à coudre… ?";
    listeProjets.appendChild(vide);
  }
  // Le bouton « Supprimer » n'apparaît qu'en modification
  document.getElementById("supprimer-projet").hidden = projetEnModification === null;
}

function modifierProjet(projet) {
  if (projetEnModification === projet.id) {
    fermerProjet();
    return;
  }
  projetEnModification = projet.id;
  projetNom.value = projet.nom;
  projetObjectif.value = projet.objectif;
  projetDeja.value = projet.dejaDeCote;
  projetParMois.value = projet.parMois;
  projetDate.value = projet.date;
  ouvrirModification(formProjet, projet.nom);
  afficherProjets();
}

function fermerProjet() {
  projetEnModification = null;
  fermerFormulaire(formProjet);
  afficherProjets();
}

boutonAjoutDe(formProjet).addEventListener("click", () => {
  fermerProjet();
  ouvrirAjout(formProjet);
});
formProjet.querySelector(".bouton-annuler").addEventListener("click", fermerProjet);

// Supprimer le projet en cours de modification
document.getElementById("supprimer-projet").addEventListener("click", () => {
  const projet = budget.epargne.projets.find((p) => p.id === projetEnModification);
  if (!projet) return;
  fermerProjet();
  agirAvecAnnuler({
    tiroir: budget,
    message: `Projet « ${projet.nom} » supprimé`,
    action: () => {
      budget.epargne.projets = budget.epargne.projets.filter((p) => p.id !== projet.id);
    },
    apres: () => {
      sauvegarderBudget();
      afficherEpargne();
    },
  });
});

formProjet.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = projetNom.value.trim();
  const objectif = Number(projetObjectif.value);
  if (!nom || objectif <= 0) return;

  const valeurs = {
    nom: nom,
    objectif: objectif,
    dejaDeCote: Number(projetDeja.value) || 0,
    parMois: Number(projetParMois.value) || 0,
    date: projetDate.value,
  };

  if (projetEnModification) {
    const projet = budget.epargne.projets.find((p) => p.id === projetEnModification);
    Object.assign(projet, valeurs);
  } else {
    budget.epargne.projets.push({ id: nouvelId(), ...valeurs });
  }
  sauvegarderBudget();
  fermerProjet();
  afficherEpargne();
});

// ---------- 4. L'argent réservé aux grosses échéances ----------

function afficherReserve() {
  const periode = periodeEnCours();
  const liste = document.getElementById("liste-reserve");
  liste.replaceChildren();

  const grosses = budget.chargesFixes.filter(
    (c) => c.frequence > 1 && c.prochaineEcheance >= periode.suivantTexte,
  );
  document.getElementById("carte-reserve").hidden = grosses.length === 0;

  let total = 0;
  grosses.forEach((charge) => {
    // Combien de parts sont déjà mises de côté (même calcul que dans Mon mois)
    const parts = Math.min(
      Math.max(charge.frequence - moisAvant(charge.prochaineEcheance) + 1, 1),
      charge.frequence,
    );
    const garde = miseDeCoteMensuelle(charge) * parts;
    total = total + garde;
    liste.appendChild(
      creerLigneInfo(charge.nom, `${formaterMontant(garde)} sur ${formaterMontant(charge.montant)}`),
    );
  });

  document.getElementById("reserve-total").textContent = formaterMontant(total);
  document.getElementById("reserve-ou").textContent =
    budget.reglages.reserve === "courant"
      ? "Gardé sur le compte courant"
      : "Gardé sur un livret à part";
}

// ---------- Tout « Épargne & projets » ----------

function afficherEpargne() {
  afficherTotalEpargne();
  afficherSecurite();
  afficherProjets();
  afficherReserve();
}
