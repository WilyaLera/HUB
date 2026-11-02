// =====================================================
// Module Budget — partie 2 : la répartition de l'argent
//   - la vie courante (les bocaux)
//   - l'épargne du mois
//   - la barre « Où va ton argent » et le « sans rôle »
//   - les virements vers le compte commun (à deux)
// =====================================================

// ---------- 1. Le compteur − [montant] + ----------

const PAS_COMPTEUR = 1000; // chaque − ou + change le montant de 1 000 F

// Fabrique un petit compteur. Quand le montant change, on appelle quandChange.
function creerCompteur(valeur, quandChange) {
  const compteur = document.createElement("div");
  compteur.classList.add("compteur");

  const moins = document.createElement("button");
  moins.type = "button";
  moins.textContent = "−";
  moins.setAttribute("aria-label", "Retirer 1 000 F");

  const champ = document.createElement("input");
  champ.type = "number";
  champ.min = "0";
  champ.step = String(PAS_COMPTEUR);
  champ.inputMode = "numeric";
  champ.value = valeur;

  const plus = document.createElement("button");
  plus.type = "button";
  plus.textContent = "+";
  plus.setAttribute("aria-label", "Ajouter 1 000 F");

  // Une seule fonction pour les 3 façons de changer le montant
  function changer(nouveauMontant) {
    // Math.max(0, …) : jamais en dessous de 0
    const montant = Math.max(0, Math.round(nouveauMontant) || 0);
    champ.value = montant;
    quandChange(montant);
  }

  moins.addEventListener("click", () => changer(Number(champ.value) - PAS_COMPTEUR));
  plus.addEventListener("click", () => changer(Number(champ.value) + PAS_COMPTEUR));
  champ.addEventListener("change", () => changer(Number(champ.value)));

  compteur.append(moins, champ, plus);
  return compteur;
}

// ---------- 2. La vie courante : les bocaux ----------

const listeBocaux = document.getElementById("liste-bocaux");
const formBocal = document.getElementById("form-bocal");
const bocalNom = document.getElementById("bocal-nom");
const bocalCompte = document.getElementById("bocal-compte");

let bocalEnModification = null;

function totalBocaux() {
  return sommer(budget.bocaux, (bocal) => bocal.montant);
}

// Le total des bocaux d'un seul compte ("commun" ou "perso")
function totalBocauxDu(compte) {
  const ceuxLa = budget.bocaux.filter((b) => b.compte === compte);
  return sommer(ceuxLa, (bocal) => bocal.montant);
}

function afficherBocaux() {
  rangerFormulaire(formBocal);
  listeBocaux.replaceChildren();

  budget.bocaux.forEach((bocal) => {
    let detail = "";
    if (budget.reglages.aDeux) {
      detail = bocal.compte === "commun" ? "Commun" : "Perso";
    }

    // Le compteur change le montant SANS refabriquer la liste
    // (sinon le champ perdrait le curseur pendant qu'on tape)
    const compteur = creerCompteur(bocal.montant, (montant) => {
      bocal.montant = montant;
      sauvegarderBudget();
      afficherTotaux();
    });

    const ligne = creerLigneBudget(
      bocal.nom,
      detail,
      compteur,
      () => modifierBocal(bocal),
      () => {
        budget.bocaux = budget.bocaux.filter((b) => b.id !== bocal.id);
        sauvegarderBudget();
        fermerBocal();
        afficherTotaux();
      },
    );
    ligne.classList.add("ligne-bocal");
    listeBocaux.appendChild(ligne);

    if (bocal.id === bocalEnModification) {
      ligne.classList.add("en-cours");
      ligne.after(formBocal);
    }
  });
}

function modifierBocal(bocal) {
  if (bocalEnModification === bocal.id) {
    fermerBocal();
    return;
  }
  bocalEnModification = bocal.id;
  bocalNom.value = bocal.nom;
  bocalCompte.value = bocal.compte;
  ouvrirModification(formBocal, bocal.nom);
  afficherBocaux();
}

function fermerBocal() {
  bocalEnModification = null;
  fermerFormulaire(formBocal);
  afficherBocaux();
}

boutonAjoutDe(formBocal).addEventListener("click", () => {
  fermerBocal();
  ouvrirAjout(formBocal);
});
formBocal.querySelector(".bouton-annuler").addEventListener("click", fermerBocal);

formBocal.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const nom = bocalNom.value.trim();
  if (!nom) return;
  const compte = budget.reglages.aDeux ? bocalCompte.value : "commun";

  if (bocalEnModification) {
    const bocal = budget.bocaux.find((b) => b.id === bocalEnModification);
    bocal.nom = nom;
    bocal.compte = compte;
  } else {
    budget.bocaux.push({ id: Date.now(), nom, montant: 0, compte });
  }

  sauvegarderBudget();
  fermerBocal();
  afficherTotaux();
});

// ---------- 3. L'épargne du mois ----------

const compteurEpargne = creerCompteur(budget.epargneMensuelle, (montant) => {
  budget.epargneMensuelle = montant;
  sauvegarderBudget();
  afficherTotaux();
});
document.getElementById("zone-compteur-epargne").appendChild(compteurEpargne);

// ---------- 4. La barre « Où va ton argent » ----------

// Les explications de chaque couleur
const explicationsBarre = {
  charges: {
    titre: "Charges fixes",
    texte:
      "Ce qui revient à coup sûr : loyer, factures, assurances, abonnements. Pour celles qui tombent tous les 3, 6 ou 12 mois, c'est la part mise de côté chaque mois.",
  },
  vie: {
    titre: "Vie courante",
    texte:
      "L'argent de tes bocaux : courses, essence, sorties… C'est ce que tu suivras au fil du mois dans « Mon mois ».",
  },
  epargne: {
    titre: "Épargne",
    texte:
      "Ce que tu mets de côté pour toi : ta sécurité et tes projets. Le détail arrivera dans l'onglet « Épargne & projets ».",
  },
  sansRole: {
    titre: "Sans rôle",
    texte:
      "L'argent qui n'a pas encore de mission. Donne-le à un bocal ou à l'épargne : chaque franc a son rôle.",
  },
};

const explicationBarre = document.getElementById("explication-barre");

function afficherBarre(montants) {
  const barre = document.getElementById("barre-argent");
  barre.replaceChildren();

  // La barre représente les revenus… ou plus, si on a prévu trop
  const totalPrevu = montants.charges + montants.vie + montants.epargne;
  const base = Math.max(totalRevenus(), totalPrevu);
  if (base === 0) return;

  ["charges", "vie", "epargne", "sansRole"].forEach((part) => {
    const montant = montants[part];
    if (montant <= 0) return;

    const morceau = document.createElement("button");
    morceau.type = "button";
    morceau.classList.add("morceau", `morceau-${part}`);
    // La largeur est un pourcentage : on la calcule et on l'écrit en CSS
    morceau.style.width = `${(montant / base) * 100}%`;
    morceau.setAttribute("aria-label", explicationsBarre[part].titre);
    morceau.addEventListener("click", () => ouvrirExplication(part, montant));
    barre.appendChild(morceau);
  });
}

function ouvrirExplication(part, montant) {
  const explication = explicationsBarre[part];
  document.getElementById("explication-titre").textContent =
    `${explication.titre} : ${formaterMontant(montant)} par mois`;
  document.getElementById("explication-texte").textContent = explication.texte;
  explicationBarre.className = `explication explication-${part}`;
  explicationBarre.hidden = false;
  document.getElementById("indice-barre").hidden = true;
}

document.getElementById("fermer-explication").addEventListener("click", () => {
  explicationBarre.hidden = true;
  document.getElementById("indice-barre").hidden = false;
});

// ---------- 5. Le « sans rôle » ----------

function afficherSansRole(sansRole) {
  const elementMontant = document.getElementById("montant-sans-role");
  const elementMessage = document.getElementById("message-sans-role");

  elementMontant.textContent = formaterMontant(sansRole);
  elementMontant.classList.toggle("montant-attention", sansRole < 0);

  if (budget.revenus.length === 0) {
    elementMessage.textContent = "Ajoute tes revenus pour voir où va ton argent.";
  } else if (sansRole > 0) {
    elementMessage.textContent = `${formaterMontant(sansRole)} n'ont pas encore de rôle. Tu peux les mettre dans un bocal ou dans l'épargne.`;
  } else if (sansRole === 0) {
    elementMessage.textContent = "Chaque franc a son rôle 🌱";
  } else {
    elementMessage.textContent = `Tu as prévu ${formaterMontant(-sansRole)} de plus que tes revenus. Pas de panique : retire un peu dans un bocal ou dans l'épargne.`;
  }
}

// ---------- 6. Les virements vers le compte commun ----------

// Ce dont le compte commun a besoin chaque mois, selon l'organisation choisie
function besoinCompteCommun() {
  const organisation = budget.reglages.organisation;
  if (organisation === "tout") return totalRevenus();

  const chargesCommunes = budget.chargesFixes.filter((c) => c.compte === "commun");
  let besoin = sommer(chargesCommunes, miseDeCoteMensuelle);

  if (organisation === "charges-vie") {
    besoin = besoin + totalBocauxDu("commun") + budget.epargneMensuelle;
  }
  return besoin;
}

// Le virement CALCULÉ de chaque personne (avant ajustement)
function virementsCalcules() {
  const besoin = besoinCompteCommun();
  const revenusMoi = revenusDe("moi");
  const revenusPartenaire = revenusDe("partenaire");
  const total = revenusMoi + revenusPartenaire;

  let partMoi = besoin / 2;
  if (budget.reglages.partage === "salaires" && total > 0) {
    // Chacun verse en proportion de ce qu'il gagne
    partMoi = Math.round((besoin * revenusMoi) / total);
  }
  // L'autre verse le reste : le total tombe toujours juste
  return { moi: Math.round(partMoi), partenaire: besoin - Math.round(partMoi) };
}

// Le virement final : l'ajusté s'il existe, sinon le calculé
function virementDe(personne) {
  if (budget.reglages.organisation === "tout") return revenusDe(personne);
  const ajuste = budget.reglages.virementAjuste[personne];
  if (ajuste !== null) return ajuste;
  return virementsCalcules()[personne];
}

const listeVirements = document.getElementById("liste-virements");

function afficherVirements() {
  if (!budget.reglages.aDeux) return;
  const reglages = budget.reglages;
  const toutEnCommun = reglages.organisation === "tout";

  document.querySelector(`input[name="organisation"][value="${reglages.organisation}"]`).checked = true;
  document.querySelector(`input[name="partage"][value="${reglages.partage}"]`).checked = true;
  document.getElementById("choix-partage").hidden = toutEnCommun;

  const besoin = besoinCompteCommun();
  document.getElementById("besoin-commun").textContent = formaterMontant(besoin);

  listeVirements.replaceChildren();

  ["moi", "partenaire"].forEach((personne) => {
    const bloc = document.createElement("div");
    bloc.classList.add("virement");

    const nom = document.createElement("strong");
    nom.textContent = nomPersonne(personne);
    bloc.appendChild(nom);

    if (toutEnCommun) {
      // Tout le salaire va sur le commun, qui reverse de l'argent perso
      const verse = document.createElement("p");
      verse.classList.add("sous-titre");
      verse.textContent = `verse tout son revenu : ${formaterMontant(revenusDe(personne))}`;

      const ligne = document.createElement("div");
      ligne.classList.add("virement-ligne");
      const etiquette = document.createElement("span");
      etiquette.textContent = "Argent perso reversé";
      const compteur = creerCompteur(reglages.argentPerso[personne], (montant) => {
        reglages.argentPerso[personne] = montant;
        sauvegarderBudget();
        afficherVirements();
      });
      ligne.append(etiquette, compteur);
      bloc.append(verse, ligne);
    } else {
      const ligne = document.createElement("div");
      ligne.classList.add("virement-ligne");

      const etiquette = document.createElement("span");
      const estAjuste = reglages.virementAjuste[personne] !== null;
      etiquette.textContent = estAjuste ? "Verse (ajusté)" : "Verse (calculé)";

      const compteur = creerCompteur(virementDe(personne), (montant) => {
        reglages.virementAjuste[personne] = montant;
        sauvegarderBudget();
        afficherVirements();
      });
      ligne.append(etiquette, compteur);

      const reste = document.createElement("p");
      reste.classList.add("sous-titre");
      reste.textContent = `Il reste ${formaterMontant(revenusDe(personne) - virementDe(personne))} sur son compte perso`;

      bloc.append(ligne, reste);
    }

    // Pour moi : ce qu'il reste une fois mes charges perso et mes bocaux perso prévus
    if (personne === "moi") {
      const argentPerso = toutEnCommun
        ? reglages.argentPerso.moi
        : revenusDe("moi") - virementDe("moi");
      const chargesPerso = budget.chargesFixes.filter((c) => c.compte === "perso");
      const depensesPerso = sommer(chargesPerso, miseDeCoteMensuelle) + totalBocauxDu("perso");
      const apres = document.createElement("p");
      apres.classList.add("sous-titre", "apres-perso");
      apres.textContent = `Après tes charges et bocaux perso : ${formaterMontant(argentPerso - depensesPerso)}`;
      apres.classList.toggle("montant-attention", argentPerso - depensesPerso < 0);
      bloc.appendChild(apres);
    }

    listeVirements.appendChild(bloc);
  });

  afficherMessageVirements();
}

// Le petit message doux sous les virements
function afficherMessageVirements() {
  const message = document.getElementById("message-virements");
  const reglages = budget.reglages;

  if (reglages.organisation === "tout") {
    const reverse = reglages.argentPerso.moi + reglages.argentPerso.partenaire;
    message.textContent = `Le compte commun reverse ${formaterMontant(reverse)} en argent perso. Les bocaux perso se remplissent avec cet argent.`;
    return;
  }

  const verse = virementDe("moi") + virementDe("partenaire");
  const ecart = verse - besoinCompteCommun();
  if (ecart > 0) {
    message.textContent = `${formaterMontant(ecart)} de plus que le nécessaire : un petit coussin 🛋️`;
  } else if (ecart < 0) {
    message.textContent = `Il manque ${formaterMontant(-ecart)} sur le compte commun.`;
  } else {
    message.textContent = "Le compte commun a exactement ce qu'il lui faut 🌱";
  }
}

// Changer d'organisation ou de partage remet les montants calculés
function remettreCalcule() {
  budget.reglages.virementAjuste = { moi: null, partenaire: null };
}

document.querySelectorAll('input[name="organisation"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    budget.reglages.organisation = bouton.value;
    remettreCalcule();
    sauvegarderBudget();
    afficherVirements();
  });
});

document.querySelectorAll('input[name="partage"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    budget.reglages.partage = bouton.value;
    remettreCalcule();
    sauvegarderBudget();
    afficherVirements();
  });
});

// ---------- 7. Tous les totaux ----------
// Appelée dès qu'un montant change : elle recalcule tout ce qui en dépend.

function afficherTotaux() {
  const montants = {
    charges: totalMiseDeCote(),
    vie: totalBocaux(),
    epargne: budget.epargneMensuelle,
  };
  montants.sansRole =
    totalRevenus() - montants.charges - montants.vie - montants.epargne;

  document.getElementById("total-bocaux").textContent = formaterMontant(montants.vie);
  afficherBarre(montants);
  afficherSansRole(montants.sansRole);
  afficherVirements();
}
