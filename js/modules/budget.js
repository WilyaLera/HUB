// =====================================================
// Module Budget
// Étape 1 : « Mon budget » (le plan)
//   - mes réglages (seul·e ou à deux, début du mois)
//   - mes revenus
//   - mes charges fixes, avec la mise de côté mensuelle
// =====================================================

// ---------- 1. Les données ----------

// Tout le budget est rangé dans UN seul tiroir : "budget".
// La première fois, le tiroir est vide : on part de ce modèle.
const budgetParDefaut = {
  reglages: {
    aDeux: false,
    prenomPartenaire: "",
    debutMois: "premier", // "premier" ou "salaire"
    jourSalaire: 25,
  },
  revenus: [], // { id, nom, montant, personne: "moi" | "partenaire" }
  chargesFixes: [], // { id, nom, montant, frequence, prochaineEcheance, compte }
};

const budget = charger("budget", budgetParDefaut);

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

// Fabrique une ligne de liste : titre, détail, montant et bouton ✕.
// Elle sert aux revenus ET aux charges, pour ne pas écrire le code deux fois.
function creerLigneBudget(titre, detail, montant, quandOnSupprime) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-budget");

  const textes = document.createElement("div");
  textes.classList.add("ligne-budget-textes");

  const elementTitre = document.createElement("strong");
  elementTitre.textContent = titre;
  textes.appendChild(elementTitre);

  if (detail) {
    const elementDetail = document.createElement("span");
    elementDetail.classList.add("sous-titre");
    elementDetail.textContent = detail;
    textes.appendChild(elementDetail);
  }

  const elementMontant = document.createElement("span");
  elementMontant.classList.add("ligne-budget-montant");
  elementMontant.textContent = montant;

  const boutonSupprimer = document.createElement("button");
  boutonSupprimer.classList.add("bouton-supprimer");
  boutonSupprimer.setAttribute("aria-label", `Supprimer ${titre}`);
  boutonSupprimer.textContent = "✕";
  boutonSupprimer.addEventListener("click", () => {
    if (confirm(`Supprimer « ${titre} » ?`)) {
      quandOnSupprime();
    }
  });

  ligne.append(textes, elementMontant, boutonSupprimer);
  return ligne;
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
  let total = 0;
  budget.revenus.forEach((revenu) => {
    total = total + revenu.montant;
  });
  return total;
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
      () => {
        // filter garde tous les revenus SAUF celui-ci
        budget.revenus = budget.revenus.filter((r) => r.id !== revenu.id);
        sauvegarderBudget();
        afficherBudget();
      },
    );
    listeRevenus.appendChild(ligne);
  });

  document.getElementById("total-revenus").textContent = formaterMontant(
    totalRevenus(),
  );
}

formRevenu.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const nom = revenuNom.value.trim();
  const montant = Number(revenuMontant.value);
  if (!nom || montant <= 0) return;

  budget.revenus.push({
    id: Date.now(),
    nom: nom,
    montant: montant,
    personne: budget.reglages.aDeux ? revenuPersonne.value : "moi",
  });
  sauvegarderBudget();
  afficherBudget();

  formRevenu.reset();
  afficherChoixPersonne();
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

// La date d'échéance ne sert que pour les charges qui ne tombent pas chaque mois
function afficherChampEcheance() {
  blocChargeEcheance.hidden = chargeFrequence.value === "1";
}
chargeFrequence.addEventListener("change", afficherChampEcheance);

function totalMiseDeCote() {
  let total = 0;
  budget.chargesFixes.forEach((charge) => {
    total = total + miseDeCoteMensuelle(charge);
  });
  return total;
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
      () => {
        budget.chargesFixes = budget.chargesFixes.filter((c) => c.id !== charge.id);
        sauvegarderBudget();
        afficherBudget();
      },
    );
    listeCharges.appendChild(ligne);
  });

  document.getElementById("total-charges").textContent = formaterMontant(
    totalMiseDeCote(),
  );
}

formCharge.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const nom = chargeNom.value.trim();
  const montant = Number(chargeMontant.value);
  if (!nom || montant <= 0) return;

  const frequence = Number(chargeFrequence.value);

  budget.chargesFixes.push({
    id: Date.now(),
    nom: nom,
    montant: montant,
    frequence: frequence,
    prochaineEcheance: frequence > 1 ? chargeEcheance.value : "",
    compte: budget.reglages.aDeux ? chargeCompte.value : "perso",
  });
  sauvegarderBudget();
  afficherBudget();

  formCharge.reset();
  afficherChampEcheance();
});

// ---------- 7. Ce qu'il reste après les charges ----------

function afficherReste() {
  const resteApresCharges = totalRevenus() - totalMiseDeCote();
  const elementReste = document.getElementById("reste-apres-charges");
  const elementMessage = document.getElementById("message-reste");

  elementReste.textContent = formaterMontant(resteApresCharges);
  elementReste.classList.toggle("montant-attention", resteApresCharges < 0);

  if (budget.revenus.length === 0) {
    elementMessage.textContent = "Ajoute tes revenus pour voir ce qu'il reste.";
  } else if (resteApresCharges < 0) {
    elementMessage.textContent = `Il manque ${formaterMontant(-resteApresCharges)}. Pas de panique : on regardera ensemble où ajuster.`;
  } else {
    elementMessage.textContent =
      "C'est ce qui servira à la vie courante et à l'épargne. On le répartira à l'étape 2.";
  }
}

// ---------- 8. Tout afficher ----------

function afficherBudget() {
  afficherReglages();
  afficherRevenus();
  afficherCharges();
  afficherReste();
}

afficherChoixPersonne();
afficherChampEcheance();
afficherBudget();
