// =====================================================
// Module Budget — partie 5 : le petit point de la semaine
// Un moment guidé, en 3 étapes, une fois par semaine :
//   1. Tes charges : valider celles qui sont passées
//   2. Tes comptes : comparer ton vrai solde avec le solde estimé
//      (et rattraper une dépense oubliée)
//   3. Ton bilan : où tu en es, et placer le surplus
// =====================================================

const feuillePoint = document.getElementById("feuille-point");
const contenuPoint = document.getElementById("point-contenu");
const boutonPointRetour = document.getElementById("point-retour");
const boutonPointSuivant = document.getElementById("point-suivant");

let etapePoint = 1;

// ---------- La carte d'entrée, dans Mon mois ----------

function joursDepuisLeDernierPoint() {
  if (!budget.dernierPoint) return null;
  return Math.floor((Date.now() - budget.dernierPoint) / UN_JOUR);
}

function afficherCartePoint() {
  const jours = joursDepuisLeDernierPoint();
  const texte = document.getElementById("point-dernier");
  if (jours === null) texte.textContent = "Pas encore fait.";
  else if (jours === 0) texte.textContent = "Dernier point : aujourd'hui 🌸";
  else if (jours === 1) texte.textContent = "Dernier point : hier";
  else texte.textContent = `Dernier point : il y a ${jours} jours`;

  // Les soldes estimés, pour un coup d'œil
  const soldes = document.getElementById("point-soldes");
  soldes.replaceChildren();
  comptesSuivis().forEach((compte) => {
    const estime = soldeEstime(compte);
    if (estime !== null) {
      soldes.appendChild(creerLigneInfo(`${nomCompte(compte)} (estimé)`, formaterMontant(estime)));
    }
  });

  // Le bouton est bien visible quand c'est l'heure du point (7 jours ou plus)
  const cEstLHeure = jours === null || jours >= 7;
  const bouton = document.getElementById("bouton-point");
  bouton.classList.toggle("bouton", cEstLHeure);
  bouton.classList.toggle("bouton-ajout", !cEstLHeure);
}

// ---------- Ouvrir, fermer, avancer ----------

function ouvrirPoint() {
  etapePoint = 1;
  afficherEtapePoint();
  feuillePoint.hidden = false;
  voile.hidden = false;
}

function fermerPoint() {
  feuillePoint.hidden = true;
  voile.hidden = true;
  afficherBudget();
}

document.getElementById("bouton-point").addEventListener("click", ouvrirPoint);
document.getElementById("fermer-point").addEventListener("click", fermerPoint);

boutonPointRetour.addEventListener("click", () => {
  etapePoint = etapePoint - 1;
  afficherEtapePoint();
});

boutonPointSuivant.addEventListener("click", () => {
  // On enregistre ce qui a été rempli à cette étape, puis on avance
  if (etapePoint === 1) enregistrerEtapeCharges();
  if (etapePoint === 2) enregistrerEtapeComptes();
  if (etapePoint === 3) {
    terminerPoint();
    return;
  }
  sauvegarderBudget();
  etapePoint = etapePoint + 1;
  afficherEtapePoint();
});

function afficherEtapePoint() {
  document.getElementById("point-etape").textContent = `Étape ${etapePoint} sur 3`;
  boutonPointRetour.hidden = etapePoint === 1;
  boutonPointSuivant.textContent = etapePoint === 3 ? "Terminer mon point 🌸" : "Suivant";
  contenuPoint.replaceChildren();
  feuillePoint.scrollTop = 0;

  if (etapePoint === 1) afficherEtapeCharges();
  if (etapePoint === 2) afficherEtapeComptes();
  if (etapePoint === 3) afficherEtapeBilan();
}

// Un petit titre + une phrase, en haut de chaque étape
function enTeteEtape(titre, phrase) {
  const h3 = document.createElement("h3");
  h3.textContent = titre;
  const p = document.createElement("p");
  p.classList.add("sous-titre");
  p.textContent = phrase;
  contenuPoint.append(h3, p);
}

// ---------- Étape 1 : les charges ----------

function afficherEtapeCharges() {
  const periode = periodeEnCours();
  const aPayer = chargesDuMois(periode).filter((c) => !paiementDuMois(c, periode));

  enTeteEtape(
    "Tes charges",
    aPayer.length === 0
      ? "Toutes les charges du mois sont déjà validées 🌱"
      : "Coche celles qui sont passées sur ton compte. Corrige le montant si besoin.",
  );

  aPayer.forEach((charge) => {
    const ligne = document.createElement("label");
    ligne.classList.add("point-charge");

    const caseACocher = document.createElement("input");
    caseACocher.type = "checkbox";
    caseACocher.dataset.chargeId = charge.id;

    const nom = document.createElement("span");
    nom.classList.add("point-charge-nom");
    nom.textContent = charge.nom;

    const montant = document.createElement("input");
    montant.type = "number";
    montant.inputMode = "numeric";
    montant.value = charge.montant;
    montant.classList.add("point-montant");
    montant.setAttribute("aria-label", `Montant payé pour ${charge.nom}`);

    ligne.append(caseACocher, nom, montant);
    contenuPoint.appendChild(ligne);
  });

  // Tes habitudes (les raccourcis) : celles de la semaine qu'on a oublié de noter
  if (budget.raccourcis.length > 0) {
    const titre = document.createElement("p");
    titre.classList.add("etiquette");
    titre.textContent = "Tes habitudes : as-tu oublié d'en noter une cette semaine ?";
    contenuPoint.appendChild(titre);

    budget.raccourcis.forEach((raccourci) => {
      const ligne = document.createElement("label");
      ligne.classList.add("point-charge", "point-habitude");

      const caseACocher = document.createElement("input");
      caseACocher.type = "checkbox";
      caseACocher.dataset.raccourciId = raccourci.id;

      const nom = document.createElement("span");
      nom.classList.add("point-charge-nom");
      nom.textContent = raccourci.nom;

      const montant = document.createElement("input");
      montant.type = "number";
      montant.inputMode = "numeric";
      montant.value = raccourci.montant;
      montant.classList.add("point-montant");
      montant.setAttribute("aria-label", `Montant pour ${raccourci.nom}`);

      ligne.append(caseACocher, nom, montant);
      contenuPoint.appendChild(ligne);
    });
  }
}

function enregistrerEtapeCharges() {
  const periode = periodeEnCours();
  contenuPoint.querySelectorAll(".point-charge:not(.point-habitude)").forEach((ligne) => {
    const caseACocher = ligne.querySelector('input[type="checkbox"]');
    if (!caseACocher.checked) return;
    const charge = budget.chargesFixes.find((c) => c.id === Number(caseACocher.dataset.chargeId));
    const montant = Number(ligne.querySelector(".point-montant").value);
    enregistrerPaiement(charge, montant, periode);
  });

  // Les habitudes cochées deviennent des dépenses d'aujourd'hui
  contenuPoint.querySelectorAll(".point-habitude").forEach((ligne) => {
    const caseACocher = ligne.querySelector('input[type="checkbox"]');
    if (!caseACocher.checked) return;
    const raccourci = budget.raccourcis.find(
      (r) => r.id === Number(caseACocher.dataset.raccourciId),
    );
    budget.depenses.push({
      id: nouvelId(),
      montant: Number(ligne.querySelector(".point-montant").value),
      bocalId: raccourci.bocalId,
      date: dateEnTexte(aujourdhuiAMinuit()),
      note: raccourci.nom,
      payePar: raccourci.payePar || "moi",
      auteurId: "moi",
    });
  });
}

// ---------- Étape 2 : les comptes ----------

function afficherEtapeComptes() {
  enTeteEtape(
    "Tes comptes",
    "Ouvre l'appli de ta banque et note ce qu'il y a vraiment. On compare avec ce que l'appli a calculé.",
  );

  comptesSuivis().forEach((compte) => {
    const bloc = document.createElement("div");
    bloc.classList.add("compte", "point-compte");
    bloc.dataset.compte = compte;

    const nom = document.createElement("strong");
    nom.textContent = nomCompte(compte);
    bloc.appendChild(nom);

    const estime = soldeEstime(compte);
    if (estime !== null) {
      bloc.appendChild(creerLigneInfo("D'après l'appli", formaterMontant(estime)));
    }

    const champ = document.createElement("input");
    champ.type = "number";
    champ.inputMode = "numeric";
    champ.placeholder = "Ton vrai solde aujourd'hui";
    champ.classList.add("champ-note", "point-solde");
    bloc.appendChild(champ);

    // Le message sur l'écart, qui se met à jour pendant qu'on tape
    const ecartTexte = document.createElement("p");
    ecartTexte.classList.add("message-compte");
    bloc.appendChild(ecartTexte);

    // « C'est une dépense oubliée » (seulement s'il manque de l'argent)
    const oubli = document.createElement("label");
    oubli.classList.add("point-oubli");
    oubli.hidden = true;
    const caseOubli = document.createElement("input");
    caseOubli.type = "checkbox";
    caseOubli.classList.add("point-oubli-case");
    const texteOubli = document.createElement("span");
    texteOubli.textContent = "C'est une dépense oubliée, la noter dans :";
    const choixBocal = document.createElement("select");
    choixBocal.classList.add("champ-note", "point-oubli-bocal");
    budget.bocaux.forEach((bocal) => {
      const option = document.createElement("option");
      option.value = bocal.id;
      option.textContent = bocal.nom;
      choixBocal.appendChild(option);
    });
    oubli.append(caseOubli, texteOubli, choixBocal);
    bloc.appendChild(oubli);

    champ.addEventListener("input", () => {
      if (champ.value === "" || estime === null) {
        ecartTexte.textContent = estime === null && champ.value !== "" ? "Noté, l'appli partira de ce solde 🌱" : "";
        oubli.hidden = true;
        return;
      }
      const ecart = Number(champ.value) - estime;
      ecartTexte.classList.toggle("montant-attention", ecart < 0);
      if (ecart === 0) {
        ecartTexte.textContent = "Pile pareil, bravo 🌱";
      } else if (ecart > 0) {
        ecartTexte.textContent = `${formaterMontant(ecart)} de plus que prévu. Un remboursement, ou une dépense notée en double ?`;
      } else {
        ecartTexte.textContent = `${formaterMontant(-ecart)} de moins que prévu.`;
      }
      oubli.hidden = ecart >= 0;
    });

    contenuPoint.appendChild(bloc);
  });
}

function enregistrerEtapeComptes() {
  contenuPoint.querySelectorAll(".point-compte").forEach((bloc) => {
    const compte = bloc.dataset.compte;
    const champ = bloc.querySelector(".point-solde");
    if (champ.value === "") return; // pas rempli : on ne touche à rien

    const vraiSolde = Number(champ.value);
    const estime = soldeEstime(compte);

    // La dépense oubliée : on la note d'abord…
    if (estime !== null && vraiSolde < estime && bloc.querySelector(".point-oubli-case").checked) {
      budget.depenses.push({
        id: nouvelId(),
        montant: estime - vraiSolde,
        bocalId: Number(bloc.querySelector(".point-oubli-bocal").value),
        date: dateEnTexte(aujourdhuiAMinuit()),
        note: "Rattrapée au petit point",
        payePar: compte === "commun" ? "commun" : "moi",
        auteurId: "moi",
      });
    }
    // … puis le vrai solde (son « quand » est plus récent : la dépense n'est pas retirée deux fois)
    budget.soldes[compte] = { montant: vraiSolde, quand: nouvelId() };
  });
}

// ---------- Étape 3 : le bilan ----------

function afficherEtapeBilan() {
  const periode = periodeEnCours();
  const depensesPeriode = depensesDeLaPeriode(periode);
  const recap = calculerRecap(periode, depensesPeriode, false);

  // Les dépenses des 7 derniers jours
  const ilYA7Jours = dateEnTexte(new Date(aujourdhuiAMinuit() - 6 * UN_JOUR));
  const semaine = sommer(
    budget.depenses.filter((d) => d.date >= ilYA7Jours && !estRentree(d)),
    (d) => d.montant,
  );

  const partEcoulee = (periode.joursTotal - periode.joursRestants) / periode.joursTotal;
  const partVie = recap.prevuVie > 0 ? recap.depenseVie / recap.prevuVie : 0;
  const motDoux =
    partVie <= partEcoulee + 0.05
      ? "Tu tiens ton rythme, bravo 🌱"
      : "Un peu plus vite que le mois : la semaine prochaine peut rattraper ça, sans stress.";

  enTeteEtape("Ton bilan", motDoux);

  const resume = document.createElement("div");
  resume.classList.add("resume-detail");
  resume.append(
    creerLigneInfo("Cette semaine, tu as dépensé", formaterMontant(semaine)),
    creerLigneInfo("Il reste à dépenser ce mois-ci", formaterMontant(recap.resteTotal)),
    creerLigneInfo("Dont pour tes bocaux", formaterMontant(recap.resteVie)),
  );
  contenuPoint.appendChild(resume);

  // Le surplus de chaque compte : de l'argent qui pourrait aller à l'épargne
  comptesSuivis().forEach((compte) => {
    const estime = soldeEstime(compte);
    if (estime === null) return;
    const surplus = estime - besoinJusquaFinDuMois(compte, periode, depensesPeriode);
    if (surplus <= 5000) return;
    contenuPoint.appendChild(creerBlocSurplus(compte, surplus));
  });
}

function creerBlocSurplus(compte, surplus) {
  const bloc = document.createElement("div");
  bloc.classList.add("compte", "point-surplus");

  const titre = document.createElement("p");
  titre.classList.add("message-compte");
  titre.textContent = `${nomCompte(compte)} : environ ${formaterMontant(surplus)} ne servent pas ce mois-ci. Pourquoi ne pas en mettre de côté ? 🌱`;
  bloc.appendChild(titre);

  // Combien, et vers où
  const champ = document.createElement("input");
  champ.type = "number";
  champ.inputMode = "numeric";
  champ.classList.add("champ-note");
  // Un montant rond proposé : arrondi au millier en dessous
  champ.value = Math.floor(surplus / 1000) * 1000;
  champ.setAttribute("aria-label", "Montant mis de côté");

  const destination = document.createElement("select");
  destination.classList.add("champ-note");
  const optionSecurite = document.createElement("option");
  optionSecurite.value = "securite";
  optionSecurite.textContent = "Mon épargne de sécurité";
  destination.appendChild(optionSecurite);
  budget.epargne.projets.forEach((projet) => {
    const option = document.createElement("option");
    option.value = projet.id;
    option.textContent = `Projet : ${projet.nom}`;
    destination.appendChild(option);
  });

  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add("bouton-petit");
  bouton.textContent = "Je l'ai mis de côté";
  bouton.addEventListener("click", () => {
    const montant = Number(champ.value);
    if (montant <= 0) return;

    // L'épargne augmente…
    if (destination.value === "securite") {
      budget.epargne.securite = budget.epargne.securite + montant;
    } else {
      const projet = budget.epargne.projets.find((p) => p.id === Number(destination.value));
      projet.dejaDeCote = projet.dejaDeCote + montant;
    }
    // … et le compte courant baisse d'autant
    budget.soldes[compte] = { montant: soldeEstime(compte) - montant, quand: nouvelId() };
    sauvegarderBudget();

    bloc.replaceChildren();
    const merci = document.createElement("p");
    merci.classList.add("message-compte");
    merci.textContent = `${formaterMontant(montant)} mis de côté. Ton toi du futur te dit merci 🌸`;
    bloc.appendChild(merci);
  });

  bloc.append(champ, destination, bouton);
  return bloc;
}

function terminerPoint() {
  budget.dernierPoint = Date.now();
  sauvegarderBudget();
  fermerPoint();
  montrerPetitMessage("Point fait, à la semaine prochaine 🌸");
}

// Toucher le voile sombre ferme aussi le point
voile.addEventListener("click", () => {
  if (!feuillePoint.hidden) fermerPoint();
});
