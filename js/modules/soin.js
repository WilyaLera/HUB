// =====================================================
// Prendre soin de moi, et le mode « Journée difficile »
//   1. le tiroir « soin »
//   2. le menu des douceurs (l'espace Prendre soin de moi)
//   3. Journée difficile : « De quoi as-tu besoin aujourd'hui ? »
//   4. la carte douceur de l'accueil, une idée à la fois
// L'humeur choisie n'est jamais gardée dans un historique :
// seulement le choix du jour, oublié le lendemain.
// =====================================================

// ---------- 1. Le tiroir « soin » ----------
// douceurs : [{ id, nom, famille, duree }]   le menu (duree : 5, 15 ou 30 minutes et plus)
// faites   : [{ date, douceurId }]          les douceurs faites (on compte, sans séries)
// journee  : { date, besoin } ou null       le mode Journée difficile du jour
// Pas de « bases du quotidien » (eau, sommeil…) : ce serait une liste de contraintes de plus.

const FAMILLES_DOUCEURS = {
  pause: { nom: "Pause", icone: "coffee" },
  proches: { nom: "Proches", icone: "heart" },
  ecouter: { nom: "Écouter", icone: "headphones" },
  creer: { nom: "Créer", icone: "pencil" },
  cocon: { nom: "Cocon", icone: "sofa" },
  dehors: { nom: "Dehors", icone: "trees" },
  bouger: { nom: "Bouger", icone: "footprints" },
};

const DOUCEURS_DE_DEPART = [
  ["Un thé ou une tisane", "pause", 5],
  ["Ne rien faire, vraiment", "pause", 15],
  ["Envoyer un petit mot à quelqu'un", "proches", 5],
  ["Appeler quelqu'un que j'aime", "proches", 15],
  ["Une musique que j'aime", "ecouter", 5],
  ["Un podcast ou un livre audio", "ecouter", 30],
  ["Gribouiller ou colorier", "creer", 15],
  ["Écrire quelques lignes", "creer", 5],
  ["Un plaid et un coussin", "cocon", 15],
  ["Une douche ou un bain bien chaud", "cocon", 30],
  ["Sortir 5 minutes", "dehors", 5],
  ["Une petite marche", "dehors", 15],
  ["M'étirer", "bouger", 5],
  ["Danser sur une chanson", "bouger", 5],
];

let soin = charger("soin", null);
if (!soin) {
  soin = {
    douceurs: DOUCEURS_DE_DEPART.map(([nom, famille, duree], i) => ({
      id: `d${i}-${nouvelId()}`,
      nom,
      famille,
      duree,
    })),
    faites: [],
    journee: null,
  };
}
// Reprise de la toute première version (jamais publiée) : rien à garder
if (!soin.douceurs) {
  soin.douceurs = DOUCEURS_DE_DEPART.map(([nom, famille, duree], i) => ({ id: `d${i}-${nouvelId()}`, nom, famille, duree }));
  soin.faites = [];
  delete soin.activites;
  delete soin.moments;
}

function sauvegarderSoin() {
  sauvegarder("soin", soin);
}

// ---------- 2. Mon coin douceur ----------

// Les douceurs de la semaine (du lundi à aujourd'hui)
function douceursDeLaSemaine() {
  const lundi = lundiDe(aujourdhuiEnTexte()); // agenda-vues.js
  return soin.faites.filter((f) => f.date >= lundi);
}

function faiteAujourdhui(douceur) {
  return soin.faites.some((f) => f.douceurId === douceur.id && f.date === aujourdhuiEnTexte());
}

// « Je le fais » : on compte une douceur (ou on la retire si on s'est trompé)
function basculerDouceur(douceur) {
  if (faiteAujourdhui(douceur)) {
    soin.faites = soin.faites.filter((f) => !(f.douceurId === douceur.id && f.date === aujourdhuiEnTexte()));
  } else {
    soin.faites.push({ date: aujourdhuiEnTexte(), douceurId: douceur.id });
    montrerPetitMessage("Une douceur pour toi 🌸");
  }
  sauvegarderSoin();
  afficherSoin();
}

const NOMS_DUREES = { 5: "5 min", 15: "15 min", 30: "plus" };

function afficherSoin() {
  const zone = document.getElementById("menu-soin");
  zone.replaceChildren();
  // Rangées par famille, comme les objets du coin douceur
  Object.entries(FAMILLES_DOUCEURS).forEach(([code, famille]) => {
    const douceurs = soin.douceurs.filter((d) => d.famille === code);
    if (douceurs.length === 0) return;
    const titre = document.createElement("p");
    titre.classList.add("titre-moment", "titre-famille");
    titre.append(creerIcone(famille.icone), famille.nom);
    zone.appendChild(titre);
    douceurs.forEach((douceur) => {
      const ligne = document.createElement("div");
      ligne.classList.add("ligne-article");
      const caseACocher = document.createElement("input");
      caseACocher.type = "checkbox";
      caseACocher.checked = faiteAujourdhui(douceur);
      caseACocher.setAttribute("aria-label", `${douceur.nom} : faite aujourd'hui`);
      caseACocher.addEventListener("change", () => basculerDouceur(douceur));
      const nom = document.createElement("span");
      nom.classList.add("ligne-article-nom");
      nom.textContent = douceur.nom;
      const duree = document.createElement("span");
      duree.classList.add("ligne-article-quantite");
      duree.textContent = NOMS_DUREES[douceur.duree];
      nom.appendChild(duree);
      const supprimer = document.createElement("button");
      supprimer.type = "button";
      supprimer.classList.add("bouton-supprimer");
      supprimer.setAttribute("aria-label", `Retirer ${douceur.nom}`);
      supprimer.appendChild(creerIcone("x"));
      supprimer.addEventListener("click", () => {
        agirAvecAnnuler({
          tiroir: soin,
          message: `« ${douceur.nom} » retirée`,
          action: () => {
            soin.douceurs = soin.douceurs.filter((d) => d.id !== douceur.id);
          },
          apres: () => {
            sauvegarderSoin();
            afficherSoin();
          },
        });
      });
      ligne.append(caseACocher, nom, supprimer);
      zone.appendChild(ligne);
    });
  });

  // Un compteur doux de la semaine, sans série à tenir
  const nombre = douceursDeLaSemaine().length;
  document.getElementById("nombre-moments").textContent = nombre;
  document.getElementById("detail-moments").textContent =
    nombre === 1 ? "douceur cette semaine 🌸" : `douceurs cette semaine${nombre > 1 ? " 🌸" : ""}`;
  document.getElementById("moi-soin-resume").textContent =
    nombre > 0 ? `Cette semaine : ${nombre} douceur${nombre > 1 ? "s" : ""}` : "Un petit menu de douceurs";
}

// Ajouter sa propre douceur (nom, famille, durée)
document.getElementById("form-soin").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const champ = document.getElementById("soin-nom");
  const nom = champ.value.trim();
  if (!nom) return;
  soin.douceurs.push({
    id: String(nouvelId()),
    nom,
    famille: document.getElementById("soin-famille").value,
    duree: Number(document.getElementById("soin-duree").value),
  });
  sauvegarderSoin();
  champ.value = "";
  afficherSoin();
  montrerPetitMessage("Ajoutée à ton menu 🌱");
});

// La boîte à douceurs : on pioche selon le temps qu'on a
let douceurTiree = null;

function piocherDouceurSelonTemps(temps) {
  const possibles = soin.douceurs.filter((d) => d.duree <= temps);
  const autres = possibles.length > 1 && douceurTiree ? possibles.filter((d) => d.id !== douceurTiree.id) : possibles;
  douceurTiree = autres[Math.floor(Math.random() * autres.length)] || null;
}

function afficherBoite(temps) {
  const zone = document.getElementById("resultat-boite");
  zone.replaceChildren();
  piocherDouceurSelonTemps(temps);
  if (!douceurTiree) {
    zone.appendChild(creerMessageVide("Pas de douceur de cette durée dans ton menu."));
    return;
  }
  const bloc = document.createElement("div");
  bloc.classList.add("resultat-pioche");
  const nom = document.createElement("p");
  nom.classList.add("resultat-pioche-nom");
  nom.textContent = douceurTiree.nom;
  const boutons = document.createElement("div");
  boutons.classList.add("envie-boutons");
  const douceur = douceurTiree;
  boutons.append(
    creerBoutonEnvie("Je le fais", () => {
      if (!faiteAujourdhui(douceur)) basculerDouceur(douceur);
      zone.replaceChildren();
    }, true),
    creerBoutonEnvie("Une autre", () => afficherBoite(temps)),
  );
  bloc.append(nom, boutons);
  zone.appendChild(bloc);
}

document.querySelectorAll("[data-temps]").forEach((bouton) => {
  bouton.addEventListener("click", () => afficherBoite(Number(bouton.dataset.temps)));
});

// ---------- 3. Journée difficile ----------

// Le mode est-il actif aujourd'hui ? (il s'oublie tout seul le lendemain)
function journeeDifficile() {
  return Boolean(soin.journee && soin.journee.date === aujourdhuiEnTexte());
}

const feuilleJournee = document.getElementById("feuille-journee");

function fermerFeuilleJournee() {
  feuilleJournee.hidden = true;
  voile.hidden = true;
}

document.getElementById("ouvrir-journee").addEventListener("click", () => {
  feuilleJournee.hidden = false;
  voile.hidden = false;
});
document.getElementById("fermer-journee").addEventListener("click", fermerFeuilleJournee);
voile.addEventListener("click", () => {
  if (!feuilleJournee.hidden) fermerFeuilleJournee();
});

document.querySelectorAll(".choix-besoin").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    soin.journee = { date: aujourdhuiEnTexte(), besoin: bouton.dataset.besoin };
    sauvegarderSoin();
    fermerFeuilleJournee();
    ideeDouceur = null;
    afficherCarteDouceur();
    if (typeof preparerResume === "function") preparerResume(); // la notification se met en pause
  });
});

document.getElementById("douceur-fin").addEventListener("click", () => {
  soin.journee = null;
  sauvegarderSoin();
  afficherCarteDouceur();
  if (typeof preparerResume === "function") preparerResume();
  montrerPetitMessage("Contente que ça aille mieux 🌱");
});

// ---------- 4. La carte douceur ----------

const BESOINS = {
  reposer: {
    titre: "Repos validé",
    message: "Aujourd'hui, tu te reposes. Rien d'autre à faire, et c'est très bien comme ça 🌱",
  },
  soin: { titre: "Prendre soin de toi", message: "Une petite chose à la fois. Rien n'est obligatoire." },
  idees: { titre: "Te changer les idées", message: "Juste un petit mouvement, sans pression." },
  evader: { titre: "T'évader un peu", message: "Un petit moment rien que pour toi." },
  avancer: {
    titre: "Avancer un tout petit peu",
    message: "Juste une ou deux choses. Le reste peut attendre demain.",
  },
};

const IDEES_CHANGER = [
  "Une petite marche de 10 minutes",
  "Ranger un seul tiroir",
  "5 minutes de rangement, pas plus",
  "Mettre une musique et bouger un peu",
  "Arroser les plantes",
  "Appeler ou écrire à quelqu'un que j'aime",
];

const IDEES_EVADER = [
  "Quelques pages d'un livre",
  "Un épisode de ta série",
  "Une partie de ton jeu",
  "Un livre audio ou un podcast",
];

// Les idées possibles pour le besoin du jour (une seule sera montrée à la fois)
function ideesDuBesoin(besoin) {
  if (besoin === "soin") return soin.douceurs.filter((d) => d.duree <= 15).map((d) => ({ texte: d.nom, douceur: d }));
  if (besoin === "idees") return IDEES_CHANGER.map((texte) => ({ texte }));
  if (besoin === "evader") {
    // Le premier petit pas d'un loisir de l'atelier, les idées « 1 h » d'À vivre, et quelques classiques
    const atelierPas = (moduleActif("atelier") ? atelier.loisirs : [])
      .filter((l) => l.etape === "envie" || l.etape === "test")
      .map((l) => ({ loisir: l, etape: l.etapes.find((e) => !e.fait) }))
      .filter((x) => x.etape)
      .map((x) => ({ texte: `${x.loisir.nom} : ${x.etape.nom}` }));
    const vivreCourt = envies.envies
      .filter((e) => e.type === "vivre" && e.statut === "notee" && e.moments.includes("heure"))
      .map((e) => ({ texte: e.nom }));
    return [...atelierPas, ...vivreCourt, ...IDEES_EVADER.map((texte) => ({ texte }))];
  }
  return [];
}

let ideeDouceur = null;

function piocherDouceur() {
  const idees = ideesDuBesoin(soin.journee.besoin);
  const autres = idees.length > 1 && ideeDouceur ? idees.filter((i) => i.texte !== ideeDouceur.texte) : idees;
  ideeDouceur = autres[Math.floor(Math.random() * autres.length)] || null;
}

function afficherCarteDouceur() {
  const carte = document.getElementById("carte-douceur");
  carte.hidden = !journeeDifficile();
  placerCartesAccueil(); // accueil-cartes.js : cache ou remontre les autres cartes
  if (carte.hidden) return;

  const besoin = soin.journee.besoin;
  document.getElementById("douceur-titre").textContent = BESOINS[besoin].titre;
  document.getElementById("douceur-message").textContent = BESOINS[besoin].message;
  const zone = document.getElementById("douceur-contenu");
  zone.replaceChildren();

  if (besoin === "avancer") {
    // Une ou deux tâches seulement : les urgentes d'abord
    const taches = tachesDuJour(aujourdhuiEnTexte())
      .filter((t) => !estFait(t, aujourdhuiEnTexte()))
      .sort((a, b) => Number(b.urgent) - Number(a.urgent))
      .slice(0, 2);
    if (taches.length === 0) {
      zone.appendChild(creerMessageVide("Rien d'essentiel aujourd'hui. Tu peux souffler."));
    }
    taches.forEach((t) => zone.appendChild(creerLigneElement(t, { date: aujourdhuiEnTexte() })));
    return;
  }

  if (besoin === "reposer") return;

  if (!ideeDouceur) piocherDouceur();
  if (!ideeDouceur) return;
  const bloc = document.createElement("div");
  bloc.classList.add("resultat-pioche");
  const texte = document.createElement("p");
  texte.classList.add("resultat-pioche-nom");
  texte.textContent = ideeDouceur.texte;
  const boutons = document.createElement("div");
  boutons.classList.add("envie-boutons");
  // Une douceur du menu : « Je le fais » la compte dans la semaine
  if (ideeDouceur.douceur) {
    const douceur = ideeDouceur.douceur;
    boutons.appendChild(
      creerBoutonEnvie(faiteAujourdhui(douceur) ? "Fait 🌸" : "Je le fais", () => {
        if (!faiteAujourdhui(douceur)) basculerDouceur(douceur);
        afficherCarteDouceur();
      }, true),
    );
  }
  boutons.appendChild(
    creerBoutonEnvie("Une autre", () => {
      piocherDouceur();
      afficherCarteDouceur();
    }),
  );
  bloc.append(texte, boutons);
  zone.appendChild(bloc);
}

afficherSoin();
afficherCarteDouceur();
