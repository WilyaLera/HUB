// =====================================================
// Module Budget — partie 3 : « Mon mois » (le suivi)
//   - la période en cours (selon le début du mois choisi)
//   - ce qu'il reste, et le rythme du mois
//   - ce qu'il reste dans chaque bocal
//   - les prochaines échéances des charges
//   - noter une dépense (la « saisie express »)
//   - la carte Budget de l'Accueil
// =====================================================

// ---------- 1. Les dates ----------

const UN_JOUR = 24 * 60 * 60 * 1000; // un jour, en millisecondes

// Une date → "2026-11-03" (le format qu'on range dans le tiroir)
function dateEnTexte(date) {
  const annee = date.getFullYear();
  // padStart(2, "0") : "3" devient "03"
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

// Aujourd'hui à minuit (pour compter des jours entiers)
function aujourdhuiAMinuit() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
}

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
    joursTotal: Math.round((suivant - debut) / UN_JOUR),
    joursRestants: Math.round((suivant - auj) / UN_JOUR), // aujourd'hui compris
  };
}

// Le nom du mois de la période, avec « de » ou « d' » (ton code de l'Accueil !)
// Si le mois commence le 25 octobre, on l'appelle « novembre ».
function titreDuMois(periode) {
  const milieu = new Date(periode.debut.getTime() + 15 * UN_JOUR);
  const nomMois = milieu.toLocaleDateString("fr-FR", { month: "long" });
  let liaisonMois = "de ";
  if ("aeiou".includes(nomMois[0])) {
    liaisonMois = "d'";
  }
  return `Budget ${liaisonMois}${nomMois}`;
}

// "Plus qu'un jour", "8 jours restants"…
function texteJoursRestants(jours) {
  if (jours <= 1) return "Dernier jour du mois";
  if (jours === 2) return "Plus que 2 jours";
  return `${jours} jours restants`;
}

// ---------- 2. Les dépenses de la période ----------

// Les dépenses de la période en cours (et du filtre choisi)
function depensesDeLaPeriode(periode) {
  const debut = dateEnTexte(periode.debut);
  const suivant = dateEnTexte(periode.suivant);
  // Les dates "AAAA-MM-JJ" se comparent comme des mots : "2026-11-03" < "2026-11-25"
  return budget.depenses.filter((d) => d.date >= debut && d.date < suivant);
}

// Ce qui a été dépensé dans un bocal pendant la période
function depenseDansBocal(bocal, depensesPeriode) {
  const lesSiennes = depensesPeriode.filter((d) => d.bocalId === bocal.id);
  return sommer(lesSiennes, (d) => d.montant);
}

// Le filtre Tout / Commun / Perso (à deux seulement)
let filtreMois = "tout";

function bocauxFiltres() {
  if (!budget.reglages.aDeux || filtreMois === "tout") return budget.bocaux;
  return budget.bocaux.filter((b) => b.compte === filtreMois);
}

document.querySelectorAll('input[name="filtre-mois"]').forEach((bouton) => {
  bouton.addEventListener("change", () => {
    filtreMois = bouton.value;
    afficherMois();
  });
});

// ---------- 3. Le résumé : ce qu'il reste, et le rythme ----------

function afficherResumeMois(periode, depensesPeriode) {
  const bocaux = bocauxFiltres();
  const prevu = sommer(bocaux, (b) => b.montant);
  const depense = sommer(bocaux, (b) => depenseDansBocal(b, depensesPeriode));
  const resteMois = prevu - depense;

  document.getElementById("mois-titre").textContent = titreDuMois(periode);
  document.getElementById("mois-jours").textContent = texteJoursRestants(
    periode.joursRestants,
  );
  const elementReste = document.getElementById("mois-reste");
  elementReste.textContent = formaterMontant(resteMois);
  elementReste.classList.toggle("montant-attention", resteMois < 0);

  // Combien par jour, pour se repérer
  const parJour = document.getElementById("mois-par-jour");
  if (resteMois > 0) {
    parJour.textContent = `soit environ ${formaterMontant(resteMois / periode.joursRestants)} par jour`;
  } else if (resteMois < 0) {
    parJour.textContent = `${formaterMontant(-resteMois)} de plus que prévu : pas de panique, on ajuste au prochain mois.`;
  } else {
    parJour.textContent = "";
  }

  // La barre : ce qui est dépensé, et un petit trait pour « où on en est du mois »
  const partDepensee = prevu > 0 ? Math.min(depense / prevu, 1) : 0;
  const partEcoulee = (periode.joursTotal - periode.joursRestants) / periode.joursTotal;
  document.getElementById("mois-barre-remplie").style.width = `${partDepensee * 100}%`;
  document.getElementById("mois-repere").style.left = `${partEcoulee * 100}%`;
  document
    .getElementById("mois-barre-remplie")
    .classList.toggle("remplie-attention", depense > prevu);

  // La phrase douce sur le rythme
  const rythme = document.getElementById("mois-rythme");
  if (prevu === 0) {
    rythme.textContent = "Remplis tes bocaux dans « Mon budget » pour suivre ton mois.";
  } else if (partDepensee <= partEcoulee + 0.05) {
    rythme.textContent = "Tu es dans le rythme du mois 🌱";
  } else {
    rythme.textContent =
      "Un peu plus vite que le mois : rien de grave, garde juste un œil dessus.";
  }

  return { resteMois, periode };
}

// ---------- 4. Chaque bocal : ce qu'il reste ----------

function afficherBocauxDuMois(depensesPeriode) {
  const liste = document.getElementById("mois-bocaux");
  liste.replaceChildren();

  bocauxFiltres().forEach((bocal) => {
    const depense = depenseDansBocal(bocal, depensesPeriode);
    // Un bocal vide ET sans dépense n'a rien à dire : on ne l'affiche pas
    if (bocal.montant === 0 && depense === 0) return;

    const resteBocal = bocal.montant - depense;

    const ligne = document.createElement("div");
    ligne.classList.add("bocal-mois");

    const haut = document.createElement("div");
    haut.classList.add("bocal-mois-haut");
    const nom = document.createElement("strong");
    nom.textContent = bocal.nom;
    const montant = document.createElement("span");
    if (resteBocal >= 0) {
      montant.textContent = `reste ${formaterMontant(resteBocal)}`;
    } else {
      montant.textContent = `dépassé de ${formaterMontant(-resteBocal)}`;
    }
    haut.append(nom, montant);

    // La jauge du bocal : elle se vide au fil des dépenses
    const jauge = document.createElement("div");
    jauge.classList.add("jauge");
    const remplissage = document.createElement("div");
    remplissage.classList.add("jauge-remplie");
    const partRestante = bocal.montant > 0 ? Math.max(resteBocal / bocal.montant, 0) : 0;
    remplissage.style.width = `${partRestante * 100}%`;
    // Miel quand il reste moins d'un cinquième (jamais de rouge)
    remplissage.classList.toggle("jauge-presque-vide", partRestante < 0.2);
    jauge.appendChild(remplissage);

    const detail = document.createElement("span");
    detail.classList.add("sous-titre");
    detail.textContent = `${formaterMontant(depense)} dépensés sur ${formaterMontant(bocal.montant)}`;

    ligne.append(haut, jauge, detail);
    liste.appendChild(ligne);
  });

  if (liste.children.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre");
    vide.textContent = "Aucun bocal rempli pour l'instant.";
    liste.appendChild(vide);
  }
}

// ---------- 5. Les prochaines échéances ----------

// Ajoute des mois à une date "AAAA-MM-JJ"
function ajouterMois(texteDate, nombreMois) {
  const date = new Date(`${texteDate}T00:00`);
  date.setMonth(date.getMonth() + nombreMois);
  return dateEnTexte(date);
}

function afficherEcheances() {
  const liste = document.getElementById("mois-echeances");
  liste.replaceChildren();
  const aujourdhuiTexte = dateEnTexte(aujourdhuiAMinuit());

  // Les charges qui ne tombent pas chaque mois, et qui ont une date
  const aVenir = budget.chargesFixes
    .filter((c) => c.frequence > 1 && c.prochaineEcheance)
    // sort range la liste : la date la plus proche d'abord
    .sort((a, b) => a.prochaineEcheance.localeCompare(b.prochaineEcheance));

  document.getElementById("carte-echeances").hidden = aVenir.length === 0;

  aVenir.forEach((charge) => {
    const ligne = document.createElement("div");
    ligne.classList.add("echeance");

    const textes = document.createElement("div");
    textes.classList.add("ligne-budget-textes");
    const nom = document.createElement("strong");
    nom.textContent = `${charge.nom} · ${formaterMontant(charge.montant)}`;
    const quand = document.createElement("span");
    quand.classList.add("sous-titre");

    const jours = Math.round(
      (new Date(`${charge.prochaineEcheance}T00:00`) - aujourdhuiAMinuit()) / UN_JOUR,
    );
    if (jours < 0) {
      quand.textContent = `Le ${formaterDate(charge.prochaineEcheance)} : c'est passé`;
    } else if (jours === 0) {
      quand.textContent = "C'est aujourd'hui";
    } else {
      quand.textContent = `Le ${formaterDate(charge.prochaineEcheance)}, dans ${jours} jour${jours > 1 ? "s" : ""}`;
    }
    textes.append(nom, quand);
    ligne.appendChild(textes);

    // Une fois l'échéance arrivée : « C'est payé » passe à la suivante
    if (charge.prochaineEcheance <= aujourdhuiTexte) {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.classList.add("bouton-petit");
      bouton.textContent = "C'est payé ✓";
      bouton.addEventListener("click", () => {
        // On avance d'une fréquence… jusqu'à tomber dans le futur
        let prochaine = ajouterMois(charge.prochaineEcheance, charge.frequence);
        while (prochaine <= aujourdhuiTexte) {
          prochaine = ajouterMois(prochaine, charge.frequence);
        }
        charge.prochaineEcheance = prochaine;
        sauvegarderBudget();
        afficherBudget();
      });
      ligne.appendChild(bouton);
    }

    liste.appendChild(ligne);
  });
}

// ---------- 6. Les dernières dépenses ----------

function nomBocal(bocalId) {
  const bocal = budget.bocaux.find((b) => b.id === bocalId);
  return bocal ? bocal.nom : "Bocal supprimé";
}

function afficherDernieresDepenses(depensesPeriode) {
  const liste = document.getElementById("mois-depenses");
  liste.replaceChildren();

  // Les plus récentes d'abord ; slice() fait une copie pour ne pas déranger l'original
  const triees = depensesPeriode
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  triees.forEach((depense) => {
    let detail = formaterDate(depense.date, false);
    if (depense.note) detail = `${detail} · ${depense.note}`;
    if (budget.reglages.aDeux && depense.payePar) {
      detail = `${detail} · ${depense.payePar === "commun" ? "compte commun" : nomPersonne(depense.payePar)}`;
    }

    const ligne = creerLigneBudget(
      nomBocal(depense.bocalId),
      detail,
      formaterMontant(depense.montant),
      () => ouvrirFeuilleDepense(depense),
      () => {
        budget.depenses = budget.depenses.filter((d) => d.id !== depense.id);
        sauvegarderBudget();
        afficherMois();
      },
    );
    liste.appendChild(ligne);
  });

  if (triees.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre");
    vide.textContent = "Pas encore de dépense notée ce mois-ci.";
    liste.appendChild(vide);
  }
}

// ---------- 7. La carte Budget de l'Accueil ----------

function afficherCarteAccueil(resume) {
  document.getElementById("titre-budget").textContent = titreDuMois(resume.periode);
  document.getElementById("jours-restants").textContent = texteJoursRestants(
    resume.periode.joursRestants,
  );
  const elementReste = document.getElementById("montant-reste");
  elementReste.textContent = formaterMontant(resume.resteMois);
  elementReste.classList.toggle("montant-attention", resume.resteMois < 0);
}

// ---------- 8. Tout « Mon mois » ----------

function afficherMois() {
  // Le filtre Tout / Commun / Perso n'existe qu'à deux
  document.querySelector(`input[name="filtre-mois"][value="${filtreMois}"]`).checked = true;

  const periode = periodeEnCours();
  const depensesPeriode = depensesDeLaPeriode(periode);

  const resume = afficherResumeMois(periode, depensesPeriode);
  afficherBocauxDuMois(depensesPeriode);
  afficherEcheances();
  afficherDernieresDepenses(depensesPeriode);

  // L'Accueil montre toujours le total de TOUS les bocaux (sans filtre)
  const resteTotal =
    sommer(budget.bocaux, (b) => b.montant) -
    sommer(budget.bocaux, (b) => depenseDansBocal(b, depensesPeriode));
  afficherCarteAccueil({ periode: resume.periode, resteMois: resteTotal });
}

// =====================================================
// 9. Noter une dépense : la « feuille » qui monte du bas
// =====================================================

const feuille = document.getElementById("feuille-depense");
const voile = document.getElementById("voile");
const formDepense = document.getElementById("form-depense");
const depenseMontant = document.getElementById("depense-montant");
const depenseNote = document.getElementById("depense-note");
const depenseDateAutre = document.getElementById("depense-date-autre");
const choixBocaux = document.getElementById("choix-bocaux");

let depenseEnModification = null;

// Les bocaux, en pastilles à toucher
function afficherChoixBocaux(bocalChoisi) {
  choixBocaux.replaceChildren();
  budget.bocaux.forEach((bocal) => {
    const pastille = document.createElement("label");
    pastille.classList.add("pastille");
    const bouton = document.createElement("input");
    bouton.type = "radio";
    bouton.name = "depense-bocal";
    bouton.value = bocal.id;
    bouton.required = true;
    bouton.checked = bocal.id === bocalChoisi;
    pastille.append(bouton, bocal.nom);
    choixBocaux.appendChild(pastille);
  });
}

// Le menu « payé par » (à deux seulement)
function afficherChoixPayePar(valeur) {
  const menu = document.getElementById("depense-paye-par");
  menu.replaceChildren();
  [
    ["moi", "Moi"],
    ["partenaire", nomPersonne("partenaire")],
    ["commun", "Compte commun"],
  ].forEach(([code, texte]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = texte;
    menu.appendChild(option);
  });
  menu.value = valeur;
}

// Ouvre la feuille. Sans dépense : on en note une nouvelle. Avec : on la modifie.
function ouvrirFeuilleDepense(depense) {
  formDepense.reset();
  depenseEnModification = depense ? depense.id : null;

  document.getElementById("feuille-titre").textContent = depense
    ? "Modifier la dépense"
    : "Nouvelle dépense";
  formDepense.querySelector('button[type="submit"]').textContent = depense
    ? "Enregistrer"
    : "Noter";

  afficherChoixBocaux(depense ? depense.bocalId : null);
  afficherChoixPayePar(depense ? depense.payePar : budget.reglages.aDeux ? "commun" : "moi");
  document.getElementById("depense-options-a-deux").hidden = !budget.reglages.aDeux;

  // La date : aujourd'hui par défaut
  const aujourdhuiTexte = dateEnTexte(aujourdhuiAMinuit());
  const hierTexte = dateEnTexte(new Date(aujourdhuiAMinuit() - UN_JOUR));
  let quand = "aujourdhui";
  if (depense && depense.date === hierTexte) quand = "hier";
  if (depense && depense.date !== aujourdhuiTexte && depense.date !== hierTexte) quand = "autre";
  document.querySelector(`input[name="depense-quand"][value="${quand}"]`).checked = true;
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

// Les boutons qui ouvrent la feuille : le + de la barre du bas, et celui de Mon mois
document.querySelector(".bouton-plus").addEventListener("click", () => ouvrirFeuilleDepense(null));
document.getElementById("bouton-noter-depense").addEventListener("click", () => ouvrirFeuilleDepense(null));

document.getElementById("fermer-feuille").addEventListener("click", fermerFeuilleDepense);
voile.addEventListener("click", fermerFeuilleDepense);

formDepense.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const montant = Number(depenseMontant.value);
  const bocalCoche = formDepense.querySelector('input[name="depense-bocal"]:checked');
  if (montant <= 0 || !bocalCoche) return;

  // La date choisie
  const quand = formDepense.querySelector('input[name="depense-quand"]:checked').value;
  let date = dateEnTexte(aujourdhuiAMinuit());
  if (quand === "hier") date = dateEnTexte(new Date(aujourdhuiAMinuit() - UN_JOUR));
  if (quand === "autre" && depenseDateAutre.value) date = depenseDateAutre.value;

  const valeurs = {
    montant: montant,
    bocalId: Number(bocalCoche.value),
    date: date,
    note: depenseNote.value.trim(),
    payePar: budget.reglages.aDeux
      ? document.getElementById("depense-paye-par").value
      : "moi",
  };

  if (depenseEnModification) {
    const depense = budget.depenses.find((d) => d.id === depenseEnModification);
    Object.assign(depense, valeurs);
  } else {
    // auteurId : qui a noté la dépense (utile le jour où le foyer sera partagé)
    budget.depenses.push({ id: Date.now(), ...valeurs, auteurId: "moi" });
  }

  sauvegarderBudget();
  fermerFeuilleDepense();
  afficherMois();
  montrerPetitMessage("Dépense notée 🌱");
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
