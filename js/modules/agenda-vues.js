// =====================================================
// Module Agenda — partie 2 : les vues
//   1. l'état : quelle vue, quel jour
//   2. la vue mois (le calendrier en grille)
//   3. la vue semaine (une carte par jour)
//   4. la vue jour (tâches du jour + ma journée)
//   5. le pense-bête
//   6. tout afficher
// =====================================================

// ---------- 1. L'état ----------

let vueAgenda = "mois"; // "mois", "semaine" ou "jour"
let jourChoisi = aujourdhuiEnTexte(); // le jour sélectionné, "AAAA-MM-JJ"

const contenuAgenda = document.getElementById("agenda-contenu");

// Les onglets Mois / Semaine / Jour
document.querySelectorAll(".onglet-agenda").forEach((onglet) => {
  onglet.addEventListener("click", () => {
    vueAgenda = onglet.dataset.vue;
    afficherAgenda();
  });
});

// Les flèches : un mois, une semaine ou un jour de plus ou de moins
function deplacer(sens) {
  if (vueAgenda === "mois") {
    const date = texteEnDate(jourChoisi);
    // Le 1er du mois d'à côté (pour ne pas sauter de mois avec les 31)
    jourChoisi = dateEnTexte(new Date(date.getFullYear(), date.getMonth() + sens, 1));
  } else if (vueAgenda === "semaine") {
    jourChoisi = ajouterJours(jourChoisi, 7 * sens);
  } else {
    jourChoisi = ajouterJours(jourChoisi, sens);
  }
  afficherAgenda();
}

document.getElementById("agenda-precedent").addEventListener("click", () => deplacer(-1));
document.getElementById("agenda-suivant").addEventListener("click", () => deplacer(1));
document.getElementById("agenda-aujourdhui").addEventListener("click", () => {
  jourChoisi = aujourdhuiEnTexte();
  afficherAgenda();
});

// Ouvre la vue jour sur une date
function ouvrirJour(dateTexte) {
  jourChoisi = dateTexte;
  vueAgenda = "jour";
  afficherAgenda();
}

// « mercredi 12 novembre »
function jourEnLettres(dateTexte, options = { weekday: "long", day: "numeric", month: "long" }) {
  return texteEnDate(dateTexte).toLocaleDateString("fr-FR", options);
}

// Une majuscule au début : « Mercredi 12 novembre »
function majuscule(texte) {
  return texte[0].toUpperCase() + texte.slice(1);
}

// Le lundi de la semaine d'une date
function lundiDe(dateTexte) {
  const date = texteEnDate(dateTexte);
  // getDay() : 0 = dimanche, 1 = lundi… On recule jusqu'au lundi.
  const reculer = (date.getDay() + 6) % 7;
  return ajouterJours(dateTexte, -reculer);
}

// Un petit message doux quand il n'y a rien
function creerMessageVide(texte) {
  const message = document.createElement("p");
  message.classList.add("sous-titre", "agenda-vide");
  message.textContent = texte;
  return message;
}

// Un bouton « + Ajouter… » en pointillés
function creerBoutonAjouter(texte, quandOnTouche) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add("bouton-ajout");
  const plus = document.createElement("span");
  plus.classList.add("plus-rond");
  plus.textContent = "+";
  bouton.append(plus, ` ${texte}`);
  bouton.addEventListener("click", quandOnTouche);
  return bouton;
}

// La liste des éléments d'un jour (événements puis tâches)
function creerListeDuJour(dateTexte, avecDemain) {
  const liste = document.createElement("div");
  elementsDuJour(dateTexte).forEach((el) => {
    liste.appendChild(creerLigneElement(el, { avecDemain }));
  });
  return liste;
}

// ---------- 2. La vue mois ----------

function afficherVueMois() {
  const date = texteEnDate(jourChoisi);
  const annee = date.getFullYear();
  const mois = date.getMonth();
  document.getElementById("agenda-titre").textContent = majuscule(
    date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  );

  const carte = document.createElement("article");
  carte.classList.add("carte", "carte-calendrier");

  // Les initiales des jours : L M M J V S D
  const grille = document.createElement("div");
  grille.classList.add("calendrier");
  ["L", "M", "M", "J", "V", "S", "D"].forEach((initiale) => {
    const entete = document.createElement("span");
    entete.classList.add("calendrier-entete");
    entete.textContent = initiale;
    grille.appendChild(entete);
  });

  // Des cases vides avant le 1er, pour qu'il tombe sous le bon jour
  const premier = new Date(annee, mois, 1);
  const casesVides = (premier.getDay() + 6) % 7;
  for (let i = 0; i < casesVides; i++) {
    grille.appendChild(document.createElement("span"));
  }

  // Une case par jour du mois
  const nombreDeJours = new Date(annee, mois + 1, 0).getDate();
  const aujourdhui = aujourdhuiEnTexte();
  for (let jour = 1; jour <= nombreDeJours; jour++) {
    const dateTexte = dateEnTexte(new Date(annee, mois, jour));
    const caseJour = document.createElement("button");
    caseJour.type = "button";
    caseJour.classList.add("calendrier-jour");
    caseJour.classList.toggle("est-aujourdhui", dateTexte === aujourdhui);
    caseJour.classList.toggle("est-choisi", dateTexte === jourChoisi);

    const numero = document.createElement("span");
    numero.textContent = jour;
    const pastilles = document.createElement("span");
    pastilles.classList.add("calendrier-pastilles");
    categoriesDuJour(dateTexte).forEach((code) => {
      pastilles.appendChild(creerPastilleCategorie(code));
    });
    caseJour.append(numero, pastilles);

    // Toucher un jour le choisit (et l'affiche en dessous)
    caseJour.addEventListener("click", () => {
      jourChoisi = dateTexte;
      afficherAgenda();
    });
    grille.appendChild(caseJour);
  }
  carte.appendChild(grille);
  contenuAgenda.appendChild(carte);

  // Le jour choisi, en dessous du calendrier
  const carteJour = document.createElement("article");
  carteJour.classList.add("carte");
  const titreJour = document.createElement("button");
  titreJour.type = "button";
  titreJour.classList.add("titre-lien");
  titreJour.textContent = `${majuscule(jourEnLettres(jourChoisi))} ›`;
  titreJour.addEventListener("click", () => ouvrirJour(jourChoisi));
  carteJour.appendChild(titreJour);

  if (elementsDuJour(jourChoisi).length === 0) {
    carteJour.appendChild(
      creerMessageVide("Rien de prévu ce jour-là. Un peu d'air, c'est bien aussi."),
    );
  } else {
    carteJour.appendChild(creerListeDuJour(jourChoisi, false));
  }
  carteJour.appendChild(
    creerBoutonAjouter("Ajouter à ce jour", () => ouvrirMenuPlus(jourChoisi)),
  );
  contenuAgenda.appendChild(carteJour);
}

// ---------- 3. La vue semaine ----------

function afficherVueSemaine() {
  const lundi = lundiDe(jourChoisi);
  const dimanche = ajouterJours(lundi, 6);
  document.getElementById("agenda-titre").textContent =
    `${jourEnLettres(lundi, { day: "numeric", month: "short" })} – ${jourEnLettres(dimanche, { day: "numeric", month: "short" })}`;

  // La bande des 7 jours, avec leurs pastilles
  const bande = document.createElement("div");
  bande.classList.add("bande-semaine");
  const aujourdhui = aujourdhuiEnTexte();
  for (let i = 0; i < 7; i++) {
    const dateTexte = ajouterJours(lundi, i);
    const jour = document.createElement("button");
    jour.type = "button";
    jour.classList.add("bande-jour");
    jour.classList.toggle("est-aujourdhui", dateTexte === aujourdhui);
    const initiale = document.createElement("span");
    initiale.textContent = jourEnLettres(dateTexte, { weekday: "short" }).slice(0, 3);
    const numero = document.createElement("strong");
    numero.textContent = texteEnDate(dateTexte).getDate();
    const pastilles = document.createElement("span");
    pastilles.classList.add("calendrier-pastilles");
    categoriesDuJour(dateTexte).forEach((code) => pastilles.appendChild(creerPastilleCategorie(code)));
    jour.append(initiale, numero, pastilles);
    jour.addEventListener("click", () => ouvrirJour(dateTexte));
    bande.appendChild(jour);
  }
  contenuAgenda.appendChild(bande);

  // Une carte par jour
  for (let i = 0; i < 7; i++) {
    const dateTexte = ajouterJours(lundi, i);
    const carte = document.createElement("article");
    carte.classList.add("carte", "carte-jour-semaine");
    carte.classList.toggle("est-aujourdhui", dateTexte === aujourdhui);

    const titre = document.createElement("button");
    titre.type = "button";
    titre.classList.add("titre-lien");
    titre.textContent = majuscule(jourEnLettres(dateTexte, { weekday: "long", day: "numeric" }));
    if (dateTexte === aujourdhui) titre.textContent = `${titre.textContent} · aujourd'hui`;
    titre.addEventListener("click", () => ouvrirJour(dateTexte));
    carte.appendChild(titre);

    if (elementsDuJour(dateTexte).length === 0) {
      carte.appendChild(creerMessageVide("Journée libre. Profite !"));
    } else {
      carte.appendChild(creerListeDuJour(dateTexte, false));
    }
    contenuAgenda.appendChild(carte);
  }
}

// ---------- 4. La vue jour ----------

function afficherVueJour() {
  const aujourdhui = aujourdhuiEnTexte();
  document.getElementById("agenda-titre").textContent = majuscule(jourEnLettres(jourChoisi));

  // Les tâches du jour
  const carteTaches = document.createElement("article");
  carteTaches.classList.add("carte");
  const titreTaches = document.createElement("h2");
  titreTaches.textContent = "Tâches du jour";
  carteTaches.appendChild(titreTaches);

  const taches = tachesDuJour(jourChoisi);
  if (taches.length === 0) {
    carteTaches.appendChild(creerMessageVide("Aucune tâche ce jour-là."));
  }
  // « Demain » n'a de sens que pour aujourd'hui (ou un jour passé)
  const avecDemain = jourChoisi <= aujourdhui;
  taches.forEach((tache) => carteTaches.appendChild(creerLigneElement(tache, { avecDemain })));
  if (avecDemain) {
    const lien = creerLienToutGlisser(taches);
    if (lien) carteTaches.appendChild(lien);
  }
  carteTaches.appendChild(
    creerBoutonAjouter("Ajouter une tâche", () =>
      ouvrirFeuilleElement(null, { type: "tache", date: jourChoisi }),
    ),
  );
  contenuAgenda.appendChild(carteTaches);

  // Ma journée : les événements, par heure
  const carteJournee = document.createElement("article");
  carteJournee.classList.add("carte");
  const titreJournee = document.createElement("h2");
  titreJournee.textContent = "Ma journée";
  carteJournee.appendChild(titreJournee);

  const evenements = evenementsDuJour(jourChoisi);
  if (evenements.length === 0) {
    carteJournee.appendChild(creerMessageVide("Rien de prévu. Un peu d'air, c'est bien aussi."));
  }
  evenements.forEach((ev) => carteJournee.appendChild(creerLigneElement(ev)));
  carteJournee.appendChild(
    creerBoutonAjouter("Ajouter un événement", () =>
      ouvrirFeuilleElement(null, { type: "evenement", date: jourChoisi }),
    ),
  );
  contenuAgenda.appendChild(carteJournee);
}

// ---------- 5. Le pense-bête ----------

let ideePiochee = null; // l'idée proposée par la pioche

function afficherPenseBete() {
  const liste = document.getElementById("liste-pense-bete");
  liste.replaceChildren();
  const idees = penseBete();

  idees.forEach((tache) => liste.appendChild(creerLigneElement(tache)));
  if (idees.length === 0) {
    liste.appendChild(
      creerMessageVide("Rien dans le pense-bête. Les idées sans date viendront ici."),
    );
  }

  // La pioche : « Et si aujourd'hui, on avançait sur… ? »
  const zone = document.getElementById("pioche");
  zone.replaceChildren();
  if (idees.length === 0) return;

  if (!ideePiochee || !idees.includes(ideePiochee)) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("lien", "lien-petit");
    bouton.textContent = "🎲 Piocher une idée";
    bouton.addEventListener("click", () => {
      ideePiochee = piocherIdee(null);
      afficherPenseBete();
    });
    zone.appendChild(bouton);
    return;
  }
  zone.appendChild(creerPioche(ideePiochee, () => {
    ideePiochee = piocherIdee(ideePiochee.id);
    afficherPenseBete();
  }));
}

// La petite carte de la pioche (aussi utilisée par l'Accueil)
function creerPioche(idee, uneAutre) {
  const bloc = document.createElement("div");
  bloc.classList.add("pioche");
  const question = document.createElement("p");
  question.textContent = `Et si aujourd'hui, on avançait sur « ${idee.titre} » ?`;

  const oui = document.createElement("button");
  oui.type = "button";
  oui.classList.add("bouton-petit");
  oui.textContent = "Oui, aujourd'hui";
  oui.addEventListener("click", () => {
    idee.date = aujourdhuiEnTexte();
    ideePiochee = null;
    sauvegarderAgenda();
    rafraichirAgenda();
    montrerPetitMessage("C'est parti 🌱");
  });

  const autre = document.createElement("button");
  autre.type = "button";
  autre.classList.add("bouton-annuler");
  autre.textContent = "Une autre";
  autre.addEventListener("click", uneAutre);

  const boutons = document.createElement("div");
  boutons.classList.add("pioche-boutons");
  boutons.append(oui);
  if (penseBete().length > 1) boutons.append(autre);
  bloc.append(question, boutons);
  return bloc;
}

document.getElementById("ajouter-pense-bete").addEventListener("click", () => {
  ouvrirFeuilleElement(null, { type: "tache", date: "" });
});

// ---------- 6. Tout afficher ----------

function afficherAgenda() {
  // Les onglets : celui de la vue choisie est allumé
  document.querySelectorAll(".onglet-agenda").forEach((onglet) => {
    onglet.classList.toggle("actif", onglet.dataset.vue === vueAgenda);
  });
  // Le bouton « Aujourd'hui » n'apparaît que si on s'est éloigné d'aujourd'hui
  document.getElementById("agenda-aujourdhui").hidden = jourChoisi === aujourdhuiEnTexte();

  contenuAgenda.replaceChildren();
  if (vueAgenda === "mois") afficherVueMois();
  if (vueAgenda === "semaine") afficherVueSemaine();
  if (vueAgenda === "jour") afficherVueJour();

  afficherPenseBete();
}

// Le titre « Aujourd'hui › » de l'Accueil ouvre l'Agenda sur la vue du jour
document.getElementById("lien-aujourdhui").addEventListener("click", () => {
  ouvrirJour(aujourdhuiEnTexte());
});
