// =====================================================
// Module Budget — partie 1
//   - les données et les petits outils
//   - les onglets du Budget
//   - mes réglages, mes revenus, mes charges fixes
// La partie 2 (bocaux, épargne, barre, virements) est
// dans budget-repartition.js.
// =====================================================

// ---------- 1. Les données ----------

// Les bocaux proposés au départ (on peut les renommer, en ajouter, en retirer)
const bocauxDeDepart = [
  { id: 1, nom: "Courses", montant: 0, compte: "commun" },
  { id: 2, nom: "Essence", montant: 0, compte: "commun" },
  { id: 3, nom: "Maison & entretien", montant: 0, compte: "commun" },
  { id: 4, nom: "Animaux", montant: 0, compte: "commun" },
  { id: 5, nom: "Sorties & restos", montant: 0, compte: "commun" },
  { id: 6, nom: "Santé", montant: 0, compte: "commun" },
  { id: 7, nom: "Imprévus", montant: 0, compte: "commun" },
  { id: 8, nom: "Plaisirs", montant: 0, compte: "perso" },
  { id: 9, nom: "Vêtements", montant: 0, compte: "perso" },
  { id: 10, nom: "Cadeaux", montant: 0, compte: "perso" },
];

// Tout le budget est rangé dans UN seul tiroir : "budget".
// La première fois, le tiroir est vide : on part de ce modèle.
const budgetParDefaut = {
  reglages: {
    aDeux: false,
    prenomPartenaire: "",
    debutMois: "premier", // "premier" ou "salaire"
    jourSalaire: 25,
    organisation: "charges", // "charges", "charges-vie" ou "tout"
    partage: "salaires", // "salaires" ou "moitie"
    virementAjuste: { moi: null, partenaire: null }, // null = calculé
    argentPerso: { moi: 0, partenaire: 0 }, // pour « Tout en commun »
  },
  revenus: [], // { id, nom, montant, personne: "moi" | "partenaire" }
  chargesFixes: [], // { id, nom, montant, frequence, prochaineEcheance, compte }
  bocaux: bocauxDeDepart, // { id, nom, montant, compte }
  epargneMensuelle: 0,
};

const budget = charger("budget", budgetParDefaut);

// Ton budget de l'étape 1 n'a pas encore les nouveautés de l'étape 2.
// On complète ce qui manque, sans rien effacer de ce qui existe.
// Les « ... » veulent dire : « recopie tout le contenu de cette boîte ici ».
// Donc : d'abord les réglages par défaut, puis TES réglages par-dessus.
budget.reglages = { ...budgetParDefaut.reglages, ...budget.reglages };
if (!budget.bocaux) budget.bocaux = bocauxDeDepart;
if (budget.epargneMensuelle === undefined) budget.epargneMensuelle = 0;

function sauvegarderBudget() {
  sauvegarder("budget", budget);
}

// ---------- 2. Petits outils ----------

// 48500 → "48 500 F"
function formaterMontant(nombre) {
  return `${Math.round(nombre).toLocaleString("fr-FR")} F`;
}

// "2027-01-15" → "15 janvier 2027"
function formaterDate(texteDate) {
  // On ajoute l'heure pour éviter un décalage de fuseau horaire
  const date = new Date(`${texteDate}T00:00`);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Les mots pour chaque fréquence (en nombre de mois)
const motsFrequence = {
  1: "par mois",
  3: "tous les 3 mois",
  6: "tous les 6 mois",
  12: "par an",
};

// Combien mettre de côté chaque mois pour une charge.
// Math.ceil arrondit au-dessus : mieux vaut 1 F de trop que 1 F de moins.
function miseDeCoteMensuelle(charge) {
  return Math.ceil(charge.montant / charge.frequence);
}

// "moi" → "Moi" ; "partenaire" → son prénom
function nomPersonne(code) {
  if (code === "moi") return "Moi";
  return budget.reglages.prenomPartenaire || "L'autre personne";
}

// Additionne une propriété dans une liste.
// Ex. : sommer(budget.revenus, (r) => r.montant)
function sommer(liste, quoiAdditionner) {
  let total = 0;
  liste.forEach((element) => {
    total = total + quoiAdditionner(element);
  });
  return total;
}

// Fabrique une ligne de liste : titre, détail, montant et bouton ✕.
// Toucher le titre appelle quandOnTouche (pour modifier la ligne).
// Elle sert aux revenus, aux charges et aux bocaux.
function creerLigneBudget(titre, detail, droite, quandOnTouche, quandOnSupprime) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-budget");

  // Les textes sont dans un <button> : on peut les toucher pour modifier
  const textes = document.createElement("button");
  textes.type = "button";
  textes.classList.add("ligne-budget-textes");
  textes.addEventListener("click", quandOnTouche);

  const elementTitre = document.createElement("strong");
  elementTitre.textContent = titre;
  textes.appendChild(elementTitre);

  if (detail) {
    const elementDetail = document.createElement("span");
    elementDetail.classList.add("sous-titre");
    elementDetail.textContent = detail;
    textes.appendChild(elementDetail);
  }

  // « droite » peut être un texte (un montant) ou un élément déjà fabriqué
  // (le compteur − + des bocaux)
  let elementDroite = droite;
  if (typeof droite === "string") {
    elementDroite = document.createElement("span");
    elementDroite.classList.add("ligne-budget-montant");
    elementDroite.textContent = droite;
  }

  const boutonSupprimer = document.createElement("button");
  boutonSupprimer.type = "button";
  boutonSupprimer.classList.add("bouton-supprimer");
  boutonSupprimer.setAttribute("aria-label", `Supprimer ${titre}`);
  boutonSupprimer.textContent = "✕";
  boutonSupprimer.addEventListener("click", () => {
    if (confirm(`Supprimer « ${titre} » ?`)) {
      quandOnSupprime();
    }
  });

  ligne.append(textes, elementDroite, boutonSupprimer);
  return ligne;
}

// Met un formulaire en mode « modifier » ou « ajouter »
function changerModeFormulaire(formulaire, titreModification) {
  const titre = formulaire.querySelector(".formulaire-titre");
  const boutonValider = formulaire.querySelector('button[type="submit"]');
  const boutonAnnuler = formulaire.querySelector(".bouton-annuler");

  if (titreModification) {
    titre.textContent = `Modifier « ${titreModification} »`;
    boutonValider.textContent = "Enregistrer";
    boutonAnnuler.hidden = false;
    formulaire.classList.add("en-modification");
    // On fait glisser l'écran jusqu'au formulaire
    formulaire.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    titre.textContent = titre.dataset.titreAjout;
    boutonValider.textContent = "Ajouter";
    boutonAnnuler.hidden = true;
    formulaire.classList.remove("en-modification");
  }
}

// ---------- 3. Les onglets du Budget ----------
// (exactement la même logique que ta barre de navigation !)

const ongletsBudget = document.querySelectorAll(".onglet-budget");
const panneauxBudget = document.querySelectorAll(".panneau-budget");

ongletsBudget.forEach((ongletBudget) => {
  ongletBudget.addEventListener("click", () => {
    ongletsBudget.forEach((o) => o.classList.remove("actif"));
    ongletBudget.classList.add("actif");
    panneauxBudget.forEach((p) => p.classList.remove("actif"));
    document.getElementById(ongletBudget.dataset.panneau).classList.add("actif");
  });
});

// ---------- 4. Mes réglages ----------

const champPrenomPartenaire = document.getElementById("champ-prenom-partenaire");
const champJourSalaire = document.getElementById("champ-jour-salaire");
const blocJourSalaire = document.getElementById("bloc-jour-salaire");

// La première fois (pas encore de revenus), les réglages sont ouverts
document.getElementById("carte-reglages").open = budget.revenus.length === 0;

function afficherReglages() {
  const reglages = budget.reglages;

  // Coche le bon bouton rond
  const valeurMode = reglages.aDeux ? "deux" : "seul";
  document.querySelector(`input[name="mode"][value="${valeurMode}"]`).checked = true;
  document.querySelector(`input[name="debut"][value="${reglages.debutMois}"]`).checked = true;

  champPrenomPartenaire.value = reglages.prenomPartenaire;
  champJourSalaire.value = reglages.jourSalaire;

  // On cache ce qui ne sert pas.
  // hidden = true → l'élément disparaît ; false → il réapparaît.
  document.querySelectorAll(".si-a-deux").forEach((element) => {
    element.hidden = !reglages.aDeux;
  });
  blocJourSalaire.hidden = reglages.debutMois !== "salaire";
}

// Seul·e / À deux
document.querySelectorAll('input[name="mode"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    budget.reglages.aDeux = bouton.value === "deux";
    sauvegarderBudget();
    afficherBudget();
  });
});

// Le 1er / Le jour du salaire
document.querySelectorAll('input[name="debut"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    budget.reglages.debutMois = bouton.value;
    sauvegarderBudget();
    afficherReglages();
  });
});

// Le prénom : on sauvegarde à chaque lettre tapée ("input")
champPrenomPartenaire.addEventListener("input", () => {
  budget.reglages.prenomPartenaire = champPrenomPartenaire.value.trim();
  sauvegarderBudget();
  afficherChoixPersonne();
  afficherRevenus();
  afficherVirements();
});

// Le jour du salaire : entre 1 et 31
champJourSalaire.addEventListener("change", () => {
  let jour = Number(champJourSalaire.value);
  if (jour < 1) jour = 1;
  if (jour > 31) jour = 31;
  budget.reglages.jourSalaire = jour;
  champJourSalaire.value = jour;
  sauvegarderBudget();
});

// ---------- 5. Mes revenus ----------

const listeRevenus = document.getElementById("liste-revenus");
const formRevenu = document.getElementById("form-revenu");
const revenuNom = document.getElementById("revenu-nom");
const revenuMontant = document.getElementById("revenu-montant");
const revenuPersonne = document.getElementById("revenu-personne");

// L'id du revenu en cours de modification (null = on ajoute)
let revenuEnModification = null;

// Le menu « à qui est ce revenu ? » (Moi / son prénom)
function afficherChoixPersonne() {
  const choixActuel = revenuPersonne.value || "moi";
  revenuPersonne.replaceChildren();
  ["moi", "partenaire"].forEach((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = nomPersonne(code);
    revenuPersonne.appendChild(option);
  });
  revenuPersonne.value = choixActuel;
}

function totalRevenus() {
  return sommer(budget.revenus, (revenu) => revenu.montant);
}

// Les revenus d'une seule personne ("moi" ou "partenaire")
function revenusDe(personne) {
  const sesRevenus = budget.revenus.filter((r) => r.personne === personne);
  return sommer(sesRevenus, (revenu) => revenu.montant);
}

function afficherRevenus() {
  // On vide la liste, puis on la refabrique entièrement
  listeRevenus.replaceChildren();

  budget.revenus.forEach((revenu) => {
    // À deux, on précise à qui est le revenu
    const detail = budget.reglages.aDeux ? nomPersonne(revenu.personne) : "";

    const ligne = creerLigneBudget(
      revenu.nom,
      detail,
      formaterMontant(revenu.montant),
      () => modifierRevenu(revenu),
      () => {
        // filter garde tous les revenus SAUF celui-ci
        budget.revenus = budget.revenus.filter((r) => r.id !== revenu.id);
        sauvegarderBudget();
        annulerRevenu();
        afficherBudget();
      },
    );
    ligne.classList.toggle("en-cours", revenu.id === revenuEnModification);
    listeRevenus.appendChild(ligne);
  });

  document.getElementById("total-revenus").textContent = formaterMontant(
    totalRevenus(),
  );
}

// Toucher une ligne : le formulaire se remplit avec ses valeurs
function modifierRevenu(revenu) {
  revenuEnModification = revenu.id;
  revenuNom.value = revenu.nom;
  revenuMontant.value = revenu.montant;
  revenuPersonne.value = revenu.personne;
  changerModeFormulaire(formRevenu, revenu.nom);
  afficherRevenus();
}

function annulerRevenu() {
  revenuEnModification = null;
  formRevenu.reset();
  afficherChoixPersonne();
  changerModeFormulaire(formRevenu, null);
  afficherRevenus();
}

formRevenu.querySelector(".bouton-annuler").addEventListener("click", annulerRevenu);

formRevenu.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const nom = revenuNom.value.trim();
  const montant = Number(revenuMontant.value);
  if (!nom || montant <= 0) return;

  const personne = budget.reglages.aDeux ? revenuPersonne.value : "moi";

  if (revenuEnModification) {
    // find trouve LE revenu qui a cet id, et on change ses valeurs
    const revenu = budget.revenus.find((r) => r.id === revenuEnModification);
    revenu.nom = nom;
    revenu.montant = montant;
    revenu.personne = personne;
  } else {
    budget.revenus.push({ id: Date.now(), nom, montant, personne });
  }

  sauvegarderBudget();
  annulerRevenu();
  afficherBudget();
});

// ---------- 6. Mes charges fixes ----------

const listeCharges = document.getElementById("liste-charges");
const formCharge = document.getElementById("form-charge");
const chargeNom = document.getElementById("charge-nom");
const chargeMontant = document.getElementById("charge-montant");
const chargeFrequence = document.getElementById("charge-frequence");
const chargeEcheance = document.getElementById("charge-echeance");
const chargeCompte = document.getElementById("charge-compte");
const blocChargeEcheance = document.getElementById("bloc-charge-echeance");

let chargeEnModification = null;

// La date d'échéance ne sert que pour les charges qui ne tombent pas chaque mois
function afficherChampEcheance() {
  blocChargeEcheance.hidden = chargeFrequence.value === "1";
}
chargeFrequence.addEventListener("change", afficherChampEcheance);

function totalMiseDeCote() {
  return sommer(budget.chargesFixes, miseDeCoteMensuelle);
}

function afficherCharges() {
  listeCharges.replaceChildren();

  budget.chargesFixes.forEach((charge) => {
    // Le détail explique le calcul, pour qu'il ne soit jamais mystérieux
    let detail = `${formaterMontant(charge.montant)} ${motsFrequence[charge.frequence]}`;
    if (charge.frequence > 1) {
      detail = `${detail} → ${formaterMontant(miseDeCoteMensuelle(charge))} à mettre de côté chaque mois`;
      if (charge.prochaineEcheance) {
        detail = `${detail} · prochaine le ${formaterDate(charge.prochaineEcheance)}`;
      }
    }
    if (budget.reglages.aDeux) {
      const motCompte = charge.compte === "commun" ? "compte commun" : "compte perso";
      detail = `${detail} · ${motCompte}`;
    }

    const ligne = creerLigneBudget(
      charge.nom,
      detail,
      `${formaterMontant(miseDeCoteMensuelle(charge))} / mois`,
      () => modifierCharge(charge),
      () => {
        budget.chargesFixes = budget.chargesFixes.filter((c) => c.id !== charge.id);
        sauvegarderBudget();
        annulerCharge();
        afficherBudget();
      },
    );
    ligne.classList.toggle("en-cours", charge.id === chargeEnModification);
    listeCharges.appendChild(ligne);
  });

  document.getElementById("total-charges").textContent = formaterMontant(
    totalMiseDeCote(),
  );
}

function modifierCharge(charge) {
  chargeEnModification = charge.id;
  chargeNom.value = charge.nom;
  chargeMontant.value = charge.montant;
  chargeFrequence.value = charge.frequence;
  chargeEcheance.value = charge.prochaineEcheance;
  chargeCompte.value = charge.compte;
  afficherChampEcheance();
  changerModeFormulaire(formCharge, charge.nom);
  afficherCharges();
}

function annulerCharge() {
  chargeEnModification = null;
  formCharge.reset();
  afficherChampEcheance();
  changerModeFormulaire(formCharge, null);
  afficherCharges();
}

formCharge.querySelector(".bouton-annuler").addEventListener("click", annulerCharge);

formCharge.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const nom = chargeNom.value.trim();
  const montant = Number(chargeMontant.value);
  if (!nom || montant <= 0) return;

  const frequence = Number(chargeFrequence.value);
  const valeurs = {
    nom: nom,
    montant: montant,
    frequence: frequence,
    prochaineEcheance: frequence > 1 ? chargeEcheance.value : "",
    compte: budget.reglages.aDeux ? chargeCompte.value : "perso",
  };

  if (chargeEnModification) {
    const charge = budget.chargesFixes.find((c) => c.id === chargeEnModification);
    // Object.assign recopie les nouvelles valeurs dans la charge existante
    Object.assign(charge, valeurs);
  } else {
    budget.chargesFixes.push({ id: Date.now(), ...valeurs });
  }

  sauvegarderBudget();
  annulerCharge();
  afficherBudget();
});

// ---------- 7. Tout afficher ----------
// (appelée au démarrage par app.js, et après chaque changement important)

function afficherBudget() {
  afficherReglages();
  afficherChoixPersonne();
  afficherChampEcheance();
  afficherRevenus();
  afficherCharges();
  afficherBocaux(); // dans budget-repartition.js
  afficherTotaux(); // dans budget-repartition.js
}
