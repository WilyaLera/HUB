// =====================================================
// Module Budget — partie 3 : « Mon mois » (le suivi)
//   1. les dates et la période en cours
//   2. les comptes, les dépenses et le filtre
//   3. le résumé du mois
//   4. les bocaux (qui se vident !)
//   5. les charges du mois (« C'est payé »)
//   6. les prochaines échéances
//   7. mes comptes : solde réel, solde estimé, surplus
//   8. les dépenses du mois
//   9. la carte Budget de l'Accueil
//  10. tout « Mon mois »
//  11. noter une dépense (la feuille qui monte du bas)
// =====================================================

// ---------- 1. Les dates ----------
// Le jour où le mois commence, dans un mois donné.
// Si le salaire tombe le 31 et que le mois n'a que 30 jours : on prend le 30.
function debutDansLeMois(annee, mois) {
  const jourChoisi =
    budget.reglages.debutMois === "salaire" ? budget.reglages.jourSalaire : 1;
  const dernierJourDuMois = new Date(annee, mois + 1, 0).getDate();
  return new Date(annee, mois, Math.min(jourChoisi, dernierJourDuMois));
}

// La période en cours : du début (inclus) au début suivant (exclu)
function periodeEnCours() {
  const auj = aujourdhuiAMinuit();
  let debut = debutDansLeMois(auj.getFullYear(), auj.getMonth());
  // Pas encore arrivé au début ce mois-ci ? Alors on est dans la période d'avant.
  if (auj < debut) {
    debut = debutDansLeMois(auj.getFullYear(), auj.getMonth() - 1);
  }
  const suivant = debutDansLeMois(debut.getFullYear(), debut.getMonth() + 1);

  return {
    debut: debut,
    suivant: suivant,
    debutTexte: dateEnTexte(debut),
    suivantTexte: dateEnTexte(suivant),
    joursTotal: Math.round((suivant - debut) / UN_JOUR),
    joursRestants: Math.round((suivant - auj) / UN_JOUR), // aujourd'hui compris
  };
}

// Le nom du mois de la période. Si le mois commence le 25 octobre, c'est « novembre ».
function nomDuMoisDe(periode) {
  const milieu = new Date(periode.debut.getTime() + 15 * UN_JOUR);
  return milieu.toLocaleDateString("fr-FR", { month: "long" });
}

// « Budget de novembre », « Budget d'octobre » (ton code de l'Accueil !)
function titreDuMois(periode) {
  const nomMois = nomDuMoisDe(periode);
  let liaisonMois = "de ";
  if ("aeiou".includes(nomMois[0])) {
    liaisonMois = "d'";
  }
  return `Budget ${liaisonMois}${nomMois}`;
}

// "Dernier jour", "Plus que 2 jours", "8 jours restants"
function texteJoursRestants(jours) {
  if (jours <= 1) return "Dernier jour du mois";
  if (jours === 2) return "Plus que 2 jours";
  return `${jours} jours restants`;
}

// Ajoute des mois à une date "AAAA-MM-JJ"
function ajouterMois(texteDate, nombreMois) {
  const date = new Date(`${texteDate}T00:00`);
  date.setMonth(date.getMonth() + nombreMois);
  return dateEnTexte(date);
}

// ---------- 2. Les comptes, les dépenses et le filtre ----------

// Seul·e : un seul compte. À deux : le compte commun et ton compte perso.
function comptesSuivis() {
  return budget.reglages.aDeux ? ["commun", "perso"] : ["perso"];
}

function nomCompte(compte) {
  if (!budget.reglages.aDeux) return "Mon compte";
  return compte === "commun" ? "Compte commun" : "Mon compte perso";
}

// Sur quel compte tombe une charge, un bocal, une dépense ?
function compteDeCharge(charge) {
  return budget.reglages.aDeux ? charge.compte : "perso";
}

function compteDeBocal(bocal) {
  return budget.reglages.aDeux ? bocal.compte : "perso";
}

function compteDeDepense(depense) {
  if (!budget.reglages.aDeux) return "perso";
  if (depense.payePar === "commun") return "commun";
  if (depense.payePar === "moi") return "perso";
  return null; // payée par l'autre personne : son compte n'est pas suivi
}

// Les dépenses de la période en cours
function depensesDeLaPeriode(periode) {
  // Les dates "AAAA-MM-JJ" se comparent comme des mots : "2026-11-03" < "2026-11-25"
  return budget.depenses.filter(
    (d) => d.date >= periode.debutTexte && d.date < periode.suivantTexte,
  );
}

// Une rentrée d'argent (remboursement, vente…) ou une dépense ?
function estRentree(mouvement) {
  return mouvement.type === "rentree";
}

// Une dépense compte en « + » dans ce qui sort, une rentrée en « − »
function montantQuiSort(mouvement) {
  return estRentree(mouvement) ? -mouvement.montant : mouvement.montant;
}

// Ce qui a été dépensé dans un bocal pendant la période.
// Une rentrée remise dans le bocal (un remboursement) le remplit à nouveau.
function depenseDansBocal(bocal, depensesPeriode) {
  const lesSiennes = depensesPeriode.filter((d) => d.bocalId === bocal.id);
  return sommer(lesSiennes, montantQuiSort);
}

// Le filtre Tout / Commun / Perso (à deux seulement)
let filtreMois = "tout";

function passeLeFiltre(compte) {
  if (!budget.reglages.aDeux || filtreMois === "tout") return true;
  return compte === filtreMois;
}

document.querySelectorAll('input[name="filtre-mois"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    filtreMois = bouton.value;
    afficherMois();
  });
});

// ---------- 3. Le résumé du mois ----------
// La même carte sert deux fois : dans « Mon mois » (ids "mois-…")
// et sur l'Accueil (ids "accueil-…"). Le « prefixe » dit laquelle remplir.

// Les chiffres du récap (sans rien afficher) : réutilisés par le point de la semaine
function calculerRecap(periode, depensesPeriode, avecFiltre) {
  const garder = (compte) => !avecFiltre || passeLeFiltre(compte);

  // La vie courante : les bocaux
  const bocaux = budget.bocaux.filter((b) => garder(compteDeBocal(b)));
  const prevuVie = sommer(bocaux, (b) => b.montant);
  const depenseVie = sommer(bocaux, (b) =>
    depenseDansBocal(b, depensesPeriode),
  );
  const resteVie = prevuVie - depenseVie;

  // Les charges du mois : ce qui est prévu, ce qui est payé, ce qui reste à payer
  const charges = chargesDuMois(periode).filter((c) =>
    garder(compteDeCharge(c)),
  );
  const prevuCharges = sommer(charges, (c) => c.montant);
  const payeCharges = sommer(charges, (c) => {
    const paiement = paiementDuMois(c, periode);
    return paiement ? paiement.montant : 0;
  });
  const resteCharges = sommer(
    charges.filter((c) => !paiementDuMois(c, periode)),
    (c) => c.montant,
  );

  // Les rentrées « en plus » (pas remises dans un bocal) : de l'argent bonus
  const rentreesEnPlus = sommer(
    depensesPeriode.filter(
      (d) => estRentree(d) && !d.bocalId && garder(compteDeDepense(d)),
    ),
    (d) => d.montant,
  );

  // Le récap global
  return {
    rentreesEnPlus,
    prevuVie,
    depenseVie,
    resteVie,
    prevuCharges,
    resteCharges,
    prevu: prevuVie + prevuCharges,
    depense: depenseVie + payeCharges,
    resteTotal: resteVie + resteCharges,
  };
}

function afficherResume(prefixe, periode, depensesPeriode, avecFiltre) {
  // Petit raccourci : trouver un élément de CETTE carte
  const element = (nom) => document.getElementById(`${prefixe}-${nom}`);
  // Sur l'Accueil, pas de filtre : on montre toujours tout
  const {
    prevuVie,
    depenseVie,
    resteVie,
    prevuCharges,
    resteCharges,
    prevu,
    depense,
    resteTotal,
    rentreesEnPlus,
  } = calculerRecap(periode, depensesPeriode, avecFiltre);

  // Accueil : « Budget » (la date est déjà tout en haut de l'Accueil)
  // Mon mois : le nom du mois, « Novembre »
  const nomMois = nomDuMoisDe(periode);
  element("titre").textContent =
    prefixe === "accueil"
      ? "Budget"
      : nomMois[0].toUpperCase() + nomMois.slice(1);
  element("jours").textContent = texteJoursRestants(periode.joursRestants);

  // LE grand chiffre : tout ce qu'il reste à dépenser ce mois-ci
  element("reste").textContent = formaterMontant(resteTotal);
  element("reste").classList.toggle("montant-attention", resteTotal < 0);

  // Le détail, en deux lignes « étiquette …… valeur »
  const detail = element("detail");
  detail.replaceChildren(
    creerLigneInfo(
      "Bocaux",
      `${formaterMontant(resteVie)} sur ${formaterMontant(prevuVie)}`,
      resteVie < 0,
    ),
    creerLigneInfo(
      "Charges",
      `${formaterMontant(resteCharges)} sur ${formaterMontant(prevuCharges)}`,
    ),
  );
  // Les rentrées en plus : montrées à part, sans gonfler « reste à dépenser »
  if (rentreesEnPlus > 0) {
    detail.appendChild(
      creerLigneInfo(
        "Rentrées en plus",
        `+ ${formaterMontant(rentreesEnPlus)}`,
      ),
    );
  }

  // Par jour : seulement pour la vie courante (les charges ne se paient pas chaque jour)
  element("par-jour").hidden = resteVie <= 0;
  element("par-jour").textContent =
    `≈ ${formaterMontant(resteVie / periode.joursRestants)} par jour pour la vie courante`;

  // La barre : tout ce qui est dépensé (bocaux + charges payées), et « aujourd'hui »
  const partDepensee = prevu > 0 ? Math.min(depense / prevu, 1) : 0;
  const partEcoulee =
    (periode.joursTotal - periode.joursRestants) / periode.joursTotal;
  element("barre-remplie").style.width = `${partDepensee * 100}%`;
  element("barre-remplie").classList.toggle(
    "remplie-attention",
    depense > prevu,
  );
  element("repere").style.left = `${partEcoulee * 100}%`;
  element("legende-depense").textContent =
    `${formaterMontant(depense)} dépensés sur ${formaterMontant(prevu)}`;

  // La phrase douce sur le rythme (on regarde la vie courante)
  const partVie = prevuVie > 0 ? depenseVie / prevuVie : 0;
  const rythme = element("rythme");
  if (prevu === 0) {
    rythme.textContent = "Remplis « Mon budget » pour suivre ton mois.";
  } else if (resteVie < 0) {
    rythme.textContent = `Vie courante : ${formaterMontant(-resteVie)} de plus que prévu. Pas de panique, on ajustera le mois prochain.`;
  } else if (partVie <= partEcoulee + 0.05) {
    rythme.textContent = "Tu es dans le rythme du mois 🌱";
  } else {
    rythme.textContent =
      "La vie courante va un peu plus vite que le mois : rien de grave, garde juste un œil dessus.";
  }
}

// ---------- 4. Les bocaux, qui se vident au fil du mois ----------

// Fabrique un petit bocal dessiné, rempli à « part » (de 0 à 1)
function creerBocalDessine(part, presqueVide) {
  const bocal = document.createElement("div");
  bocal.classList.add("bocal-dessin");
  const contenu = document.createElement("div");
  contenu.classList.add("bocal-contenu");
  contenu.classList.toggle("bocal-presque-vide", presqueVide);
  contenu.style.height = `${part * 100}%`;
  bocal.appendChild(contenu);
  return bocal;
}

// Fabrique une jauge horizontale (la vue « barres »)
function creerJauge(part, presqueVide) {
  const jauge = document.createElement("div");
  jauge.classList.add("jauge");
  const remplissage = document.createElement("div");
  remplissage.classList.add("jauge-remplie");
  remplissage.classList.toggle("jauge-presque-vide", presqueVide);
  remplissage.style.width = `${part * 100}%`;
  jauge.appendChild(remplissage);
  return jauge;
}

// Le choix de la vue : "bocaux" (dessinés) ou "barres"
document.querySelectorAll('input[name="vue-bocaux"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    budget.reglages.vueBocaux = bouton.value;
    sauvegarderBudget();
    afficherMois();
  });
});

function afficherBocauxDuMois(depensesPeriode) {
  const liste = document.getElementById("mois-bocaux");
  liste.replaceChildren();
  // Si le réglage n'existe pas encore, on prend les bocaux dessinés
  const vue = budget.reglages.vueBocaux || "bocaux";
  document.querySelector(`input[name="vue-bocaux"][value="${vue}"]`).checked =
    true;
  liste.classList.toggle("vue-barres", vue === "barres");

  budget.bocaux
    .filter((b) => passeLeFiltre(compteDeBocal(b)))
    .forEach((bocal) => {
      const depense = depenseDansBocal(bocal, depensesPeriode);
      // Un bocal vide ET sans dépense n'a rien à dire : on ne l'affiche pas
      if (bocal.montant === 0 && depense === 0) return;

      const resteBocal = bocal.montant - depense;
      // Entre 0 (vide) et 1 (plein), même après un gros remboursement
      const partRestante =
        bocal.montant > 0
          ? Math.min(Math.max(resteBocal / bocal.montant, 0), 1)
          : 0;

      const ligne = document.createElement("div");
      ligne.classList.add("bocal-mois");

      // Miel quand il reste moins d'un cinquième (jamais de rouge)
      const presqueVide = partRestante < 0.2;

      const textes = document.createElement("div");
      textes.classList.add("ligne-budget-textes");
      const nom = document.createElement("strong");
      nom.textContent = bocal.nom;
      const reste = document.createElement("span");
      reste.classList.add("bocal-reste");
      if (resteBocal >= 0) {
        reste.textContent = `reste ${formaterMontant(resteBocal)}`;
      } else {
        reste.textContent = `dépassé de ${formaterMontant(-resteBocal)}`;
        reste.classList.add("montant-attention");
      }
      const detail = document.createElement("span");
      detail.classList.add("sous-titre");
      detail.textContent =
        depense >= 0
          ? `${formaterMontant(depense)} dépensés sur ${formaterMontant(bocal.montant)}`
          : `${formaterMontant(-depense)} remboursés · prévu ${formaterMontant(bocal.montant)}`;
      if (vue === "barres") {
        // Vue « barres » : le nom et le reste sur une ligne, la jauge dessous
        const haut = document.createElement("div");
        haut.classList.add("bocal-mois-haut");
        haut.append(nom, reste);
        textes.append(haut, creerJauge(partRestante, presqueVide), detail);
        ligne.appendChild(textes);
      } else {
        // Vue « bocaux » : le petit bocal dessiné à gauche
        textes.append(nom, reste, detail);
        ligne.append(creerBocalDessine(partRestante, presqueVide), textes);
      }
      liste.appendChild(ligne);
    });

  if (liste.children.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre");
    vide.textContent = "Aucun bocal rempli pour l'instant.";
    liste.appendChild(vide);
  }
}

// ---------- 5. Les charges du mois ----------

// Le paiement d'une charge pour la période en cours (ou undefined)
function paiementDuMois(charge, periode) {
  return budget.paiements.find(
    (p) => p.chargeId === charge.id && p.periode === periode.debutTexte,
  );
}

// Les charges qui tombent ce mois-ci : toutes les mensuelles,
// plus les autres si leur échéance arrive avant la fin du mois (ou est passée)
function chargesDuMois(periode) {
  return budget.chargesFixes.filter((charge) => {
    if (paiementDuMois(charge, periode)) return true;
    if (charge.frequence === 1) return true;
    return (
      Boolean(charge.prochaineEcheance) &&
      charge.prochaineEcheance < periode.suivantTexte
    );
  });
}

// L'id de la charge qu'on est en train de payer (le petit formulaire est ouvert)
let chargeEnPaiement = null;

function afficherChargesDuMois(periode) {
  const liste = document.getElementById("mois-charges");
  liste.replaceChildren();

  const charges = chargesDuMois(periode).filter((c) =>
    passeLeFiltre(compteDeCharge(c)),
  );
  // Celles à payer d'abord, les payées ensuite
  charges.sort(
    (a, b) =>
      Number(Boolean(paiementDuMois(a, periode))) -
      Number(Boolean(paiementDuMois(b, periode))),
  );

  charges.forEach((charge) => {
    const paiement = paiementDuMois(charge, periode);
    const ligne = document.createElement("div");
    ligne.classList.add("charge-mois");

    const textes = document.createElement("div");
    textes.classList.add("ligne-budget-textes");
    const nom = document.createElement("strong");
    nom.textContent = charge.nom;
    const detail = document.createElement("span");
    detail.classList.add("sous-titre");
    textes.append(nom, detail);
    ligne.appendChild(textes);

    if (paiement) {
      // Déjà payée : on l'affiche en plus discret, avec un bouton pour annuler
      ligne.classList.add("charge-payee");
      detail.textContent = `Payée le ${formaterDate(paiement.date, false)} · ${formaterMontant(paiement.montant)}`;
      const annuler = document.createElement("button");
      annuler.type = "button";
      annuler.classList.add("bouton-supprimer");
      annuler.textContent = "↺";
      annuler.setAttribute(
        "aria-label",
        `Annuler le paiement de ${charge.nom}`,
      );
      annuler.addEventListener("click", () => {
        if (!confirm(`Annuler le paiement de « ${charge.nom} » ?`)) return;
        // Si c'était une grosse échéance, on remet sa date d'avant
        if (paiement.echeanceAvant)
          charge.prochaineEcheance = paiement.echeanceAvant;
        budget.paiements = budget.paiements.filter((p) => p.id !== paiement.id);
        sauvegarderBudget();
        afficherBudget();
      });
      ligne.appendChild(annuler);
    } else {
      detail.textContent = `${formaterMontant(charge.montant)} à payer`;
      if (charge.frequence > 1 && charge.prochaineEcheance) {
        detail.textContent = `${detail.textContent} · le ${formaterDate(charge.prochaineEcheance, false)}`;
      }

      if (chargeEnPaiement === charge.id) {
        // Le petit formulaire : le montant prévu, qu'on peut corriger
        ligne.classList.add("charge-en-paiement");
        ligne.appendChild(creerFormulairePaiement(charge, periode));
      } else {
        const payer = document.createElement("button");
        payer.type = "button";
        payer.classList.add("bouton-petit");
        payer.textContent = "C'est payé ?";
        payer.addEventListener("click", () => {
          chargeEnPaiement = charge.id;
          afficherChargesDuMois(periode);
        });
        ligne.appendChild(payer);
      }
    }
    liste.appendChild(ligne);
  });

  if (charges.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre");
    vide.textContent = "Aucune charge ce mois-ci.";
    liste.appendChild(vide);
  }

  // Combien de charges restent à payer
  const aPayer = charges.filter((c) => !paiementDuMois(c, periode));
  document.getElementById("mois-charges-reste").textContent =
    aPayer.length === 0
      ? "Tout est payé 🌱"
      : `${aPayer.length} à payer · ${formaterMontant(sommer(aPayer, (c) => c.montant))}`;
}

function creerFormulairePaiement(charge, periode) {
  const formulaire = document.createElement("form");
  formulaire.classList.add("form-paiement");

  const champ = document.createElement("input");
  champ.type = "number";
  champ.min = "0";
  champ.inputMode = "numeric";
  champ.value = charge.montant;
  champ.setAttribute("aria-label", "Montant vraiment payé");

  const valider = document.createElement("button");
  valider.type = "submit";
  valider.classList.add("bouton-petit");
  valider.textContent = "Valider";

  const annuler = document.createElement("button");
  annuler.type = "button";
  annuler.classList.add("bouton-annuler");
  annuler.textContent = "Annuler";
  annuler.addEventListener("click", () => {
    chargeEnPaiement = null;
    afficherChargesDuMois(periode);
  });

  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const montant = Number(champ.value);
    if (montant < 0) return;

    enregistrerPaiement(charge, montant, periode);
    chargeEnPaiement = null;
    sauvegarderBudget();
    afficherBudget();
    montrerPetitMessage("C'est noté 🌱");
  });

  formulaire.append(champ, valider, annuler);
  // On place le curseur dans le champ, prêt à corriger
  setTimeout(() => champ.focus(), 0);
  return formulaire;
}

// Note qu'une charge est payée (aussi utilisé par le point de la semaine)
function enregistrerPaiement(charge, montant, periode) {
  const paiement = {
    id: nouvelId(),
    chargeId: charge.id,
    montant: montant,
    date: dateEnTexte(aujourdhuiAMinuit()),
    periode: periode.debutTexte,
    compte: compteDeCharge(charge),
    echeanceAvant: null,
  };

  // Une grosse échéance passe à la suivante (on garde l'ancienne date au cas où)
  if (charge.frequence > 1 && charge.prochaineEcheance) {
    paiement.echeanceAvant = charge.prochaineEcheance;
    let prochaine = ajouterMois(charge.prochaineEcheance, charge.frequence);
    while (prochaine < periode.suivantTexte) {
      prochaine = ajouterMois(prochaine, charge.frequence);
    }
    charge.prochaineEcheance = prochaine;
  }

  budget.paiements.push(paiement);
}

// ---------- 6. Les prochaines échéances (après ce mois-ci) ----------

function afficherEcheances(periode) {
  const liste = document.getElementById("mois-echeances");
  liste.replaceChildren();

  // Les grosses charges dont l'échéance tombe APRÈS ce mois-ci
  const aVenir = budget.chargesFixes
    .filter(
      (c) => c.frequence > 1 && c.prochaineEcheance >= periode.suivantTexte,
    )
    .filter((c) => passeLeFiltre(compteDeCharge(c)))
    // sort range la liste : la date la plus proche d'abord
    .sort((a, b) => a.prochaineEcheance.localeCompare(b.prochaineEcheance));

  document.getElementById("carte-echeances").hidden = aVenir.length === 0;

  aVenir.forEach((charge) => {
    const jours = Math.round(
      (new Date(`${charge.prochaineEcheance}T00:00`) - aujourdhuiAMinuit()) /
        UN_JOUR,
    );
    const ligne = document.createElement("p");
    ligne.classList.add("ligne-info");
    const gauche = document.createElement("span");
    // On écrit l'année seulement si ce n'est pas celle d'aujourd'hui
    const autreAnnee =
      charge.prochaineEcheance.slice(0, 4) !==
      String(aujourdhuiAMinuit().getFullYear());
    gauche.textContent = `${charge.nom} · le ${formaterDate(charge.prochaineEcheance, autreAnnee)}`;
    const droite = document.createElement("strong");
    droite.textContent = `${formaterMontant(charge.montant)} · ${jours} j`;
    ligne.append(gauche, droite);
    liste.appendChild(ligne);
  });
}

// ---------- 7. Mes comptes : solde estimé et besoin d'ici la fin du mois ----------
// (ils s'affichent dans le petit point de la semaine : budget-point.js)

// Le solde estimé : le solde noté, moins tout ce qui a été noté APRÈS
function soldeEstime(compte) {
  const solde = budget.soldes[compte];
  if (!solde) return null;
  // L'id d'une dépense est l'heure à laquelle elle a été notée (Date.now())
  const depensesApres = budget.depenses.filter(
    (d) => d.id > solde.quand && compteDeDepense(d) === compte,
  );
  const paiementsApres = budget.paiements.filter(
    (p) => p.id > solde.quand && p.compte === compte,
  );
  return (
    solde.montant -
    sommer(depensesApres, montantQuiSort) -
    sommer(paiementsApres, (p) => p.montant)
  );
}

// Combien de mois avant une date (0 = ce mois-ci)
function moisAvant(texteDate) {
  const auj = aujourdhuiAMinuit();
  const date = new Date(`${texteDate}T00:00`);
  return (
    (date.getFullYear() - auj.getFullYear()) * 12 +
    (date.getMonth() - auj.getMonth())
  );
}

// L'argent déjà mis de côté pour les grosses échéances à venir (ce mois-ci compris)
function reserveGardee(compte, periode) {
  return sommer(
    budget.chargesFixes.filter(
      (c) =>
        c.frequence > 1 &&
        c.prochaineEcheance >= periode.suivantTexte &&
        compteDeCharge(c) === compte,
    ),
    (c) => {
      // Ex. : tous les 3 mois, échéance dans 2 mois → 2 parts déjà mises de côté
      const parts = Math.min(
        Math.max(c.frequence - moisAvant(c.prochaineEcheance) + 1, 1),
        c.frequence,
      );
      return miseDeCoteMensuelle(c) * parts;
    },
  );
}

// Ce dont le compte a encore besoin d'ici la fin du mois
function besoinJusquaFinDuMois(compte, periode, depensesPeriode) {
  const chargesAPayer = chargesDuMois(periode).filter(
    (c) => compteDeCharge(c) === compte && !paiementDuMois(c, periode),
  );
  const resteBocaux = sommer(
    budget.bocaux.filter((b) => compteDeBocal(b) === compte),
    (b) => Math.max(b.montant - depenseDansBocal(b, depensesPeriode), 0),
  );
  let besoin = sommer(chargesAPayer, (c) => c.montant) + resteBocaux;
  if (budget.reglages.reserve === "courant") {
    besoin = besoin + reserveGardee(compte, periode);
  }
  return besoin;
}

// ---------- 8. Les dépenses du mois ----------

function nomBocal(bocalId) {
  const bocal = budget.bocaux.find((b) => b.id === bocalId);
  return bocal ? bocal.nom : "Bocal supprimé";
}

function afficherDernieresDepenses(depensesPeriode) {
  const liste = document.getElementById("mois-depenses");
  liste.replaceChildren();

  // Les plus récentes d'abord ; slice() fait une copie pour ne pas déranger l'original
  const triees = depensesPeriode
    .filter((d) => passeLeFiltre(compteDeDepense(d)))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  triees.forEach((depense) => {
    let detail = formaterDate(depense.date, false);
    if (depense.note) detail = `${detail} · ${depense.note}`;
    if (budget.reglages.aDeux && depense.payePar) {
      detail = `${detail} · ${depense.payePar === "commun" ? "compte commun" : nomPersonne(depense.payePar)}`;
    }

    // Une rentrée : « + 5 000 F », avec sa note comme titre
    let titre = nomBocal(depense.bocalId);
    let montant = formaterMontant(depense.montant);
    if (estRentree(depense)) {
      titre = depense.note || "Rentrée";
      montant = `+ ${formaterMontant(depense.montant)}`;
      detail = depense.bocalId
        ? `${formaterDate(depense.date, false)} · remise dans ${nomBocal(depense.bocalId)}`
        : `${formaterDate(depense.date, false)} · en plus`;
    }

    const ligne = creerLigneBudget(
      titre,
      detail,
      montant,
      () => ouvrirFeuilleDepense(depense),
      () => {
        budget.depenses = budget.depenses.filter((d) => d.id !== depense.id);
        sauvegarderBudget();
        afficherMois();
      },
    );
    ligne.classList.toggle("ligne-rentree", estRentree(depense));
    liste.appendChild(ligne);
  });

  if (triees.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre");
    vide.textContent = "Pas encore de mouvement ce mois-ci.";
    liste.appendChild(vide);
  }
}

// ---------- 9. La carte Budget de l'Accueil ----------
// Elle utilise la même fonction que Mon mois : afficherResume("accueil", …)

// ---------- 10. Tout « Mon mois » ----------

function afficherMois() {
  document.querySelector(
    `input[name="filtre-mois"][value="${filtreMois}"]`,
  ).checked = true;

  const periode = periodeEnCours();
  const depensesPeriode = depensesDeLaPeriode(periode);

  afficherResume("mois", periode, depensesPeriode, true);
  afficherResume("accueil", periode, depensesPeriode, false);
  afficherCartePoint(); // dans budget-point.js
  afficherBocauxDuMois(depensesPeriode);
  afficherChargesDuMois(periode);
  afficherEcheances(periode);
  afficherDernieresDepenses(depensesPeriode);
  afficherEtatSauvegarde(); // dans sauvegarde.js : le petit rappel
}

// =====================================================
// 11. Noter une dépense (ou une rentrée) : la « feuille » qui monte du bas
// =====================================================

const feuille = document.getElementById("feuille-depense");
const voile = document.getElementById("voile");
const formDepense = document.getElementById("form-depense");
const depenseMontant = document.getElementById("depense-montant");
const depenseBocal = document.getElementById("depense-bocal");
const depenseNote = document.getElementById("depense-note");
const depenseDateAutre = document.getElementById("depense-date-autre");
const depensePayePar = document.getElementById("depense-paye-par");

let depenseEnModification = null;

// Le type choisi dans la feuille : "depense" ou "rentree"
function typeChoisi() {
  return formDepense.querySelector('input[name="depense-type"]:checked').value;
}

// Remplit un menu déroulant avec les bocaux (rangés en Commun / Perso à deux).
// premiereOption : une option en plus, tout en haut (ex. « Non, c'est en plus »)
function remplirMenuBocaux(menu, bocalChoisi, premiereOption) {
  menu.replaceChildren();

  if (premiereOption) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = premiereOption;
    menu.appendChild(option);
  }

  function ajouterOption(parent, bocal) {
    const option = document.createElement("option");
    option.value = bocal.id;
    option.textContent = bocal.nom;
    parent.appendChild(option);
  }

  if (budget.reglages.aDeux) {
    [
      ["commun", "Commun"],
      ["perso", "Perso"],
    ].forEach(([compte, titre]) => {
      // <optgroup> : un petit titre dans le menu déroulant
      const groupe = document.createElement("optgroup");
      groupe.label = titre;
      budget.bocaux
        .filter((b) => b.compte === compte)
        .forEach((b) => ajouterOption(groupe, b));
      menu.appendChild(groupe);
    });
  } else {
    budget.bocaux.forEach((b) => ajouterOption(menu, b));
  }

  const existe = budget.bocaux.some((b) => b.id === bocalChoisi);
  if (existe) menu.value = bocalChoisi;
  else if (premiereOption) menu.value = "";
}

// Remplit le menu « payé par » (dépense) ou « reçue sur » (rentrée)
function remplirMenuPayePar(menu, valeur, pourUneRentree) {
  menu.replaceChildren();
  const choix = pourUneRentree
    ? [
        ["moi", "Mon compte perso"],
        ["commun", "Compte commun"],
      ]
    : [
        ["moi", "Moi"],
        ["partenaire", nomPersonne("partenaire")],
        ["commun", "Compte commun"],
      ];
  choix.forEach(([code, texte]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = texte;
    menu.appendChild(option);
  });
  if (valeur) menu.value = valeur;
}

// Adapte la feuille au type choisi : les mots changent, les raccourcis aussi
function adapterFeuilleAuType(depense) {
  const rentree = typeChoisi() === "rentree";

  let titre = rentree ? "Nouvelle rentrée" : "Nouvelle dépense";
  if (depense) titre = rentree ? "Modifier la rentrée" : "Modifier la dépense";
  document.getElementById("feuille-titre").textContent = titre;
  formDepense.querySelector('button[type="submit"]').textContent = depense
    ? "Enregistrer"
    : "Noter";

  document.getElementById("etiquette-bocal").textContent = rentree
    ? "Remettre dans un bocal ? (un remboursement, par exemple)"
    : "Dans quel bocal ?";
  const bocalChoisi = depense
    ? depense.bocalId
    : rentree
      ? null
      : budget.reglages.dernierBocal;
  remplirMenuBocaux(
    depenseBocal,
    bocalChoisi,
    rentree ? "Non, c'est de l'argent en plus" : null,
  );

  document.getElementById("etiquette-paye-par").textContent = rentree
    ? "Reçue sur"
    : "Payé par";
  const parDefaut = budget.reglages.aDeux ? "commun" : "moi";
  remplirMenuPayePar(
    depensePayePar,
    depense ? depense.payePar : parDefaut,
    rentree,
  );

  depenseNote.placeholder = rentree
    ? "Ex. : remboursement mutuelle"
    : "Ex. : marché du samedi";

  // Les raccourcis ne servent qu'aux dépenses, et pas en modification
  afficherRaccourcisDansFeuille(!rentree && !depense);
  document.getElementById("bloc-garder-raccourci").hidden =
    rentree || Boolean(depense);
}

document.querySelectorAll('input[name="depense-type"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    const depense = budget.depenses.find((d) => d.id === depenseEnModification);
    adapterFeuilleAuType(depense);
  });
});

// Ouvre la feuille. Sans dépense : on en note une nouvelle. Avec : on la modifie.
function ouvrirFeuilleDepense(depense) {
  formDepense.reset();
  depenseEnModification = depense ? depense.id : null;

  const type = depense && estRentree(depense) ? "rentree" : "depense";
  document.querySelector(
    `input[name="depense-type"][value="${type}"]`,
  ).checked = true;
  adapterFeuilleAuType(depense);
  document.getElementById("depense-options-a-deux").hidden =
    !budget.reglages.aDeux;

  // La date : aujourd'hui par défaut
  const aujourdhuiTexte = dateEnTexte(aujourdhuiAMinuit());
  const hierTexte = dateEnTexte(new Date(aujourdhuiAMinuit() - UN_JOUR));
  let quand = "aujourdhui";
  if (depense && depense.date === hierTexte) quand = "hier";
  if (depense && depense.date !== aujourdhuiTexte && depense.date !== hierTexte)
    quand = "autre";
  document.querySelector(
    `input[name="depense-quand"][value="${quand}"]`,
  ).checked = true;
  depenseDateAutre.value = depense ? depense.date : aujourdhuiTexte;
  depenseDateAutre.hidden = quand !== "autre";

  if (depense) {
    depenseMontant.value = depense.montant;
    depenseNote.value = depense.note;
  }
  // Les options s'ouvrent seules si la dépense en utilise
  document.getElementById("depense-options").open =
    Boolean(depense) && (Boolean(depense.note) || quand !== "aujourdhui");

  feuille.hidden = false;
  voile.hidden = false;
  depenseMontant.focus();
}

function fermerFeuilleDepense() {
  feuille.hidden = true;
  voile.hidden = true;
  depenseEnModification = null;
}

// « Autre jour » fait apparaître le calendrier
document.querySelectorAll('input[name="depense-quand"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    depenseDateAutre.hidden = bouton.value !== "autre";
  });
});

// Le bouton qui ouvre la feuille dans Mon mois
// (le + de la barre ouvre maintenant un petit menu : voir agenda-feuille.js)
document
  .getElementById("bouton-noter-depense")
  .addEventListener("click", () => ouvrirFeuilleDepense(null));

document
  .getElementById("fermer-feuille")
  .addEventListener("click", fermerFeuilleDepense);
voile.addEventListener("click", fermerFeuilleDepense);

formDepense.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const rentree = typeChoisi() === "rentree";
  const montant = Number(depenseMontant.value);
  // Pour une rentrée, le bocal est facultatif ("" = en plus)
  const bocalId = depenseBocal.value ? Number(depenseBocal.value) : null;
  if (montant <= 0 || (!rentree && !bocalId)) return;

  // La date choisie
  const quand = formDepense.querySelector(
    'input[name="depense-quand"]:checked',
  ).value;
  let date = dateEnTexte(aujourdhuiAMinuit());
  if (quand === "hier")
    date = dateEnTexte(new Date(aujourdhuiAMinuit() - UN_JOUR));
  if (quand === "autre" && depenseDateAutre.value)
    date = depenseDateAutre.value;

  const valeurs = {
    montant: montant,
    bocalId: bocalId,
    date: date,
    note: depenseNote.value.trim(),
    payePar: budget.reglages.aDeux ? depensePayePar.value : "moi",
    type: rentree ? "rentree" : undefined,
  };

  const etaitUneModification = Boolean(depenseEnModification);
  if (depenseEnModification) {
    const depense = budget.depenses.find((d) => d.id === depenseEnModification);
    Object.assign(depense, valeurs);
  } else {
    // auteurId : qui a noté la dépense (utile le jour où le foyer sera partagé)
    budget.depenses.push({ id: nouvelId(), ...valeurs, auteurId: "moi" });
  }

  if (!rentree) {
    // On retient le bocal, pour le proposer la prochaine fois
    budget.reglages.dernierBocal = bocalId;
    // « Garder comme raccourci » : la note sert de nom (sinon, le nom du bocal)
    if (document.getElementById("garder-raccourci").checked) {
      budget.raccourcis.push({
        id: nouvelId(),
        nom: valeurs.note || nomBocal(bocalId),
        montant: montant,
        bocalId: bocalId,
        payePar: valeurs.payePar,
      });
    }
  }

  sauvegarderBudget();
  fermerFeuilleDepense();
  afficherBudget();
  let message = rentree ? "Rentrée notée 🌱" : "Dépense notée 🌱";
  if (etaitUneModification) message = "C'est modifié 🌱";
  montrerPetitMessage(message);
});

// Un petit message qui apparaît puis disparaît tout seul
function montrerPetitMessage(texte) {
  const message = document.getElementById("petit-message");
  message.textContent = texte;
  message.hidden = false;
  // setTimeout : « fais ceci dans 2 secondes »
  setTimeout(() => {
    message.hidden = true;
  }, 2000);
}
