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
  perso: {
    titre: "Argent perso",
    texte:
      "L'argent de chacun pour ses dépenses perso. En « Tout en commun », c'est ce que le compte commun vous reverse ; tes bocaux et charges perso se paient avec le tien. Sinon, c'est ce qui reste à l'autre personne après son virement.",
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
  const totalPrevu = montants.charges + montants.vie + montants.epargne + montants.perso;
  const base = Math.max(totalRevenus(), totalPrevu);
  if (base === 0) return;

  ["charges", "vie", "epargne", "perso", "sansRole"].forEach((part) => {
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
}

document.getElementById("fermer-explication").addEventListener("click", () => {
  explicationBarre.hidden = true;
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

// Fabrique une ligne « étiquette …… valeur », sur une seule ligne
function creerLigneInfo(etiquette, valeur, enAttention) {
  const ligne = document.createElement("p");
  ligne.classList.add("ligne-info");
  const elementEtiquette = document.createElement("span");
  elementEtiquette.textContent = etiquette;
  const elementValeur = document.createElement("strong");
  elementValeur.textContent = valeur;
  elementValeur.classList.toggle("montant-attention", enAttention === true);
  ligne.append(elementEtiquette, elementValeur);
  return ligne;
}

// Ce que JE dépense en perso chaque mois (charges perso + bocaux perso)
function depensesPersoPrevues() {
  const chargesPerso = budget.chargesFixes.filter((c) => c.compte === "perso");
  return sommer(chargesPerso, miseDeCoteMensuelle) + totalBocauxDu("perso");
}

function afficherVirements() {
  if (!budget.reglages.aDeux) return;
  const reglages = budget.reglages;
  const toutEnCommun = reglages.organisation === "tout";

  // Les boutons ronds des réglages
  document.querySelector(`input[name="organisation"][value="${reglages.organisation}"]`).checked = true;
  document.querySelector(`input[name="partage"][value="${reglages.partage}"]`).checked = true;
  document.getElementById("choix-partage").hidden = toutEnCommun;

  // Le titre et la phrase d'introduction changent selon l'organisation
  const titre = document.getElementById("titre-virements");
  const intro = document.getElementById("intro-virements");
  if (toutEnCommun) {
    titre.textContent = "Ce que chacun reçoit";
    intro.textContent = "Vos revenus arrivent tous sur le compte commun, soit chaque mois :";
  } else {
    titre.textContent = "Ce que chacun verse";
    intro.textContent = "Chaque mois, le compte commun a besoin de :";
  }
  document.getElementById("besoin-commun").textContent = formaterMontant(besoinCompteCommun());

  listeVirements.replaceChildren();

  ["moi", "partenaire"].forEach((personne) => {
    const bloc = document.createElement("div");
    bloc.classList.add("virement");

    // 1re ligne : le prénom à gauche, le compteur à droite
    const haut = document.createElement("div");
    haut.classList.add("virement-haut");

    const nom = document.createElement("span");
    nom.classList.add("virement-nom");
    const prenomVirement = document.createElement("strong");
    prenomVirement.textContent = nomPersonne(personne);
    const action = document.createElement("span");
    action.classList.add("sous-titre");
    action.textContent = toutEnCommun ? "reçoit chaque mois" : "vire chaque mois";
    nom.append(prenomVirement, action);

    let compteur;
    if (toutEnCommun) {
      compteur = creerCompteur(reglages.argentPerso[personne], (montant) => {
        reglages.argentPerso[personne] = montant;
        sauvegarderBudget();
        afficherTotaux(); // la barre et le « sans rôle » changent aussi
      });
    } else {
      compteur = creerCompteur(virementDe(personne), (montant) => {
        reglages.virementAjuste[personne] = montant;
        sauvegarderBudget();
        afficherTotaux();
      });
    }
    haut.append(nom, compteur);
    bloc.appendChild(haut);

    // Si le montant a été ajusté à la main : un petit lien pour revenir au calcul
    if (!toutEnCommun && reglages.virementAjuste[personne] !== null) {
      const remettre = document.createElement("button");
      remettre.type = "button";
      remettre.classList.add("lien", "lien-petit");
      remettre.textContent = `↺ Ajusté · revenir au calcul (${formaterMontant(virementsCalcules()[personne])})`;
      remettre.addEventListener("click", () => {
        reglages.virementAjuste[personne] = null;
        sauvegarderBudget();
        afficherTotaux();
      });
      bloc.appendChild(remettre);
    }

    // Les lignes d'info, « étiquette …… valeur »
    const argentPerso = toutEnCommun
      ? reglages.argentPerso[personne]
      : revenusDe(personne) - virementDe(personne);

    if (personne === "moi") {
      const etiquette = toutEnCommun ? "Ton argent perso" : "Il te reste";
      if (!toutEnCommun) bloc.appendChild(creerLigneInfo(etiquette, formaterMontant(argentPerso)));
      const apres = argentPerso - depensesPersoPrevues();
      bloc.appendChild(
        creerLigneInfo("Après tes dépenses perso", formaterMontant(apres), apres < 0),
      );
    } else if (!toutEnCommun) {
      bloc.appendChild(creerLigneInfo("Il lui reste", formaterMontant(argentPerso)));
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
    // Ce qui reste sur le compte commun une fois l'argent perso reversé
    // et les charges, bocaux communs et épargne prévus
    const montants = calculerRepartition();
    const reste =
      totalRevenus() - montants.charges - montants.vie - montants.epargne - montants.perso;
    if (reste > 0) {
      message.textContent = `Il reste ${formaterMontant(reste)} sans rôle sur le compte commun.`;
    } else if (reste === 0) {
      message.textContent = "Chaque franc a son rôle 🌱";
    } else {
      message.textContent = `Il manque ${formaterMontant(-reste)} : baisse un peu l'argent perso, un bocal commun ou l'épargne.`;
    }
    return;
  }

  const verse = virementDe("moi") + virementDe("partenaire");
  const ecart = verse - besoinCompteCommun();
  if (ecart > 0) {
    message.textContent = `${formaterMontant(ecart)} de plus que le nécessaire : un petit coussin 🛋️`;
  } else if (ecart < 0) {
    message.textContent = `Il manque ${formaterMontant(-ecart)} sur le compte commun.`;
  } else {
    const motPartage = reglages.partage === "salaires" ? "selon vos salaires" : "à 50 / 50";
    message.textContent = `Partagé ${motPartage}, le compte a exactement ce qu'il lui faut 🌱`;
  }
}

// « Changer l'organisation » : ouvre les réglages et y fait glisser l'écran
document.getElementById("lien-reglages-commun").addEventListener("click", () => {
  const carteReglages = document.getElementById("carte-reglages");
  carteReglages.open = true;
  carteReglages.scrollIntoView({ behavior: "smooth", block: "start" });
});

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

// Où va l'argent du foyer ? Ça dépend de l'organisation choisie.
function calculerRepartition() {
  const reglages = budget.reglages;
  const chargesDu = (compte) =>
    sommer(budget.chargesFixes.filter((c) => c.compte === compte), miseDeCoteMensuelle);

  // Seul·e : tout est à toi, on compte tout
  if (!reglages.aDeux) {
    return {
      charges: totalMiseDeCote(),
      vie: totalBocaux(),
      epargne: budget.epargneMensuelle,
      perso: 0,
    };
  }

  // « Tout en commun » : le compte commun paie les charges communes,
  // les bocaux communs et l'épargne, puis reverse l'argent perso de chacun.
  // Tes charges et bocaux perso se paient AVEC ton argent perso :
  // on ne les compte donc pas une deuxième fois.
  if (reglages.organisation === "tout") {
    return {
      charges: chargesDu("commun"),
      vie: totalBocauxDu("commun"),
      epargne: budget.epargneMensuelle,
      perso: reglages.argentPerso.moi + reglages.argentPerso.partenaire,
    };
  }

  // Les autres organisations : chacun garde le reste de son salaire.
  // Tes dépenses perso sont comptées ; ce qui reste à l'autre personne
  // après son virement, c'est son argent perso (on ne le détaille pas).
  return {
    charges: totalMiseDeCote(),
    vie: totalBocaux(),
    epargne: budget.epargneMensuelle,
    perso: Math.max(revenusDe("partenaire") - virementDe("partenaire"), 0),
  };
}

function afficherTotaux() {
  const montants = calculerRepartition();
  montants.sansRole =
    totalRevenus() - montants.charges - montants.vie - montants.epargne - montants.perso;

  document.getElementById("total-bocaux").textContent = formaterMontant(totalBocaux());
  afficherBarre(montants);
  afficherSansRole(montants.sansRole);
  afficherVirements();
  afficherMois(); // dans budget-mois.js : le suivi dépend aussi du plan
}
