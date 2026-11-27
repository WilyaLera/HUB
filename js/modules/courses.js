// =====================================================
// Module Courses
//   1. le tiroir « courses » : les rayons et les articles
//   2. deviner le rayon d'un article
//   3. afficher la liste, rayon par rayon
//   4. ajouter, cocher, modifier, retirer
//   5. « J'ai fini mes courses » (et le total du ticket vers le Budget)
//   6. Mes rayons
//   7. les résumés (accueil, Foyer)
// =====================================================

// ---------- 1. Le tiroir « courses » ----------
// rayons   : [{ id, nom }], dans l'ordre du magasin
// articles : [{ id, nom, quantite, unite, rayonId, coche, source }]
//            (quantite : un nombre en texte, ex. "1,5" ; unite : "kg", "pièce"… ou "")
//            (source : "manuel" pour l'instant ; plus tard "repas" ou "placard")
// memoire  : { "lait": idDuRayon } : le rayon choisi la dernière fois pour un article
// unites   : { "lait": "L" } : l'unité choisie la dernière fois

const RAYONS_DE_DEPART = [
  "Fruits & légumes",
  "Boulangerie",
  "Frais & crèmerie",
  "Viande & poisson",
  "Épicerie salée",
  "Épicerie sucrée",
  "Surgelés",
  "Boissons",
  "Hygiène",
  "Entretien",
  "Animaux",
  "Autre",
];

let courses = charger("courses", null);
if (!courses) {
  courses = {
    rayons: RAYONS_DE_DEPART.map((nom) => ({ id: String(nouvelId()), nom: nom })), // en texte, comme la valeur d'un <select>
    articles: [],
    memoire: {},
  };
}

if (!courses.unites) courses.unites = {};

function sauvegarderCourses() {
  sauvegarder("courses", courses);
}

function rayonDe(id) {
  return courses.rayons.find((r) => r.id === id) || courses.rayons[courses.rayons.length - 1];
}

// ---------- 2. Deviner le rayon ----------
// D'abord ce que tu as choisi la dernière fois pour cet article,
// sinon quelques mots-clés, sinon « Autre » (le dernier rayon).

const MOTS_DES_RAYONS = {
  "Fruits & légumes": ["pomme", "banane", "tomate", "salade", "carotte", "oignon", "ail", "citron", "avocat", "courgette", "concombre", "poivron", "chou", "fruit", "légume", "patate", "papaye", "mangue", "ananas", "orange", "herbe", "persil", "gingembre", "manioc", "igname"],
  "Boulangerie": ["pain", "baguette", "brioche", "croissant", "viennoiserie"],
  "Frais & crèmerie": ["lait", "beurre", "yaourt", "fromage", "crème", "oeuf", "œuf", "jambon", "lardon", "margarine"],
  "Viande & poisson": ["poulet", "boeuf", "bœuf", "steak", "viande", "poisson", "saumon", "crevette", "cerf", "porc", "saucisse", "dinde", "agneau"],
  "Épicerie salée": ["riz", "pâte", "pates", "farine", "huile", "sel", "poivre", "conserve", "sauce", "thon", "lentille", "haricot", "épice", "bouillon", "vinaigre", "moutarde", "ketchup", "mayonnaise", "nouille", "semoule", "chips"],
  "Épicerie sucrée": ["sucre", "chocolat", "biscuit", "gâteau", "café", "thé", "confiture", "céréale", "miel", "compote", "nutella"],
  "Surgelés": ["glace", "surgelé", "frite", "pizza surgelée"],
  "Boissons": ["eau", "jus", "soda", "coca", "bière", "vin", "sirop"],
  "Hygiène": ["savon", "shampoing", "shampooing", "dentifrice", "brosse à dent", "déodorant", "papier toilette", "coton", "rasoir", "gel douche", "serviette hygiénique", "mouchoir"],
  "Entretien": ["lessive", "éponge", "liquide vaisselle", "javel", "sac poubelle", "nettoyant", "adoucissant", "essuie-tout", "sopalin", "pastille lave-vaisselle"],
  "Animaux": ["croquette", "litière", "pâtée", "friandise"],
};

function devinerRayon(nom) {
  const cle = nom.trim().toLowerCase();
  // 1. La mémoire (si le rayon existe encore)
  const memorise = courses.memoire[cle];
  if (memorise && courses.rayons.some((r) => r.id === memorise)) return memorise;
  // 2. Les mots-clés (seulement si tu as gardé ce rayon)
  for (const [nomRayon, mots] of Object.entries(MOTS_DES_RAYONS)) {
    const rayon = courses.rayons.find((r) => r.nom === nomRayon);
    if (rayon && mots.some((mot) => cle.includes(mot))) return rayon.id;
  }
  // 3. Le dernier rayon (« Autre », sauf si tu l'as renommé)
  return courses.rayons[courses.rayons.length - 1].id;
}

// ---------- 3. Afficher la liste ----------

const listeCourses = document.getElementById("liste-courses");
const articleNom = document.getElementById("article-nom");
const articleQuantite = document.getElementById("article-quantite");
const articleRayon = document.getElementById("article-rayon");
const articleUnite = document.getElementById("article-unite");
const articleUniteAutre = document.getElementById("article-unite-autre");

// ---------- La quantité et l'unité ----------

// Les unités qui prennent un « s » au pluriel
const UNITES_AU_PLURIEL = ["pièce", "paquet", "boîte", "bouteille"];

// "2" + "pièce" → "2 pièces" ; "500" + "g" → "500 g" ; "" → ""
function texteQuantite(article) {
  if (!article.quantite) return "";
  const nombre = Number(String(article.quantite).replace(",", "."));
  let unite = article.unite || "";
  if (UNITES_AU_PLURIEL.includes(unite) && nombre > 1) unite += "s";
  return `${article.quantite} ${unite}`.trim();
}

// L'unité choisie (le menu, ou le petit champ « autre… »)
function uniteChoisie(menu, champAutre) {
  return menu.value === "autre" ? champAutre.value.trim() : menu.value;
}

// Met une unité dans le menu (une unité perso passe par « autre… »)
function placerUnite(menu, champAutre, unite) {
  const connue = [...menu.options].some((o) => o.value === unite && unite !== "autre");
  menu.value = connue ? unite : "autre";
  champAutre.value = connue ? "" : unite;
  champAutre.hidden = menu.value !== "autre";
}

// « autre… » fait apparaître le petit champ
function activerMenuUnite(menu, champAutre) {
  menu.addEventListener("change", () => {
    champAutre.hidden = menu.value !== "autre";
    if (!champAutre.hidden) champAutre.focus();
  });
}
activerMenuUnite(articleUnite, articleUniteAutre);
activerMenuUnite(
  document.getElementById("modif-article-unite"),
  document.getElementById("modif-article-unite-autre"),
);

function remplirChoixRayons(select, choisi) {
  select.replaceChildren();
  courses.rayons.forEach((rayon) => {
    const option = document.createElement("option");
    option.value = rayon.id;
    option.textContent = rayon.nom;
    option.selected = rayon.id === choisi;
    select.appendChild(option);
  });
}

function creerLigneArticle(article) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-article");
  ligne.classList.toggle("est-coche", article.coche);

  const caseACocher = document.createElement("input");
  caseACocher.type = "checkbox";
  caseACocher.checked = article.coche;
  caseACocher.setAttribute("aria-label", `${article.nom} pris`);
  caseACocher.addEventListener("change", () => {
    article.coche = caseACocher.checked;
    // Ce qui est acheté repasse à « Il y en a » dans le placard (placard.js)
    if (typeof quandArticleAchete === "function" && moduleActif("placard")) quandArticleAchete(article);
    sauvegarderCourses();
    afficherCourses();
  });

  // Toucher le nom : modifier l'article
  const zone = document.createElement("button");
  zone.type = "button";
  zone.classList.add("ligne-article-nom");
  // Le nom (et, en petit dessous, les jours de repas pour lesquels on l'achète)
  const titre = document.createElement("span");
  titre.classList.add("ligne-article-titre");
  titre.textContent = article.nom;
  if (article.pour && article.pour.length) {
    const pour = document.createElement("span");
    pour.classList.add("ligne-article-pour");
    pour.textContent = `pour ${article.pour.join(", ")}`;
    titre.appendChild(pour);
  }
  zone.appendChild(titre);
  if (article.quantite) {
    const quantite = document.createElement("span");
    quantite.classList.add("ligne-article-quantite");
    quantite.textContent = texteQuantite(article);
    zone.appendChild(quantite);
  }
  zone.addEventListener("click", () => ouvrirFeuilleArticle(article));

  ligne.append(caseACocher, zone);
  return ligne;
}

// Un article qui sert seulement à remplir le placard (aucun repas prévu n'en a besoin) : pas urgent
function pourLePlacardSeulement(article) {
  return article.source === "placard" && !(article.apports && article.apports.length);
}

function afficherCourses() {
  listeCourses.replaceChildren();
  const aPrendre = courses.articles.filter((a) => !a.coche);
  const panier = courses.articles.filter((a) => a.coche);
  const placardSeul = aPrendre.filter(pourLePlacardSeulement);
  const necessaires = aPrendre.filter((a) => !pourLePlacardSeulement(a));

  // Rayon par rayon, dans ton ordre ; les rayons vides ne s'affichent pas
  courses.rayons.forEach((rayon) => {
    const duRayon = necessaires.filter((a) => rayonDe(a.rayonId).id === rayon.id);
    if (duRayon.length === 0) return;
    const carte = document.createElement("article");
    carte.classList.add("carte", "carte-rayon");
    const titre = document.createElement("h2");
    titre.textContent = rayon.nom;
    carte.appendChild(titre);
    duRayon.forEach((article) => carte.appendChild(creerLigneArticle(article)));
    listeCourses.appendChild(carte);
  });

  // Pour remplir le placard : à part, en dessous, parce que ce n'est pas urgent
  if (placardSeul.length > 0) {
    const carte = document.createElement("details");
    carte.classList.add("carte", "carte-repliable", "carte-pour-placard");
    carte.open = true;
    const resume = document.createElement("summary");
    const titre = document.createElement("h2");
    titre.textContent = `Pour remplir le placard · ${placardSeul.length}`;
    resume.appendChild(titre);
    const aide = document.createElement("p");
    aide.classList.add("sous-titre", "petit");
    aide.textContent = "Pas urgent : aucun repas prévu n'en a besoin. Si un plat en a besoin, il remonte dans son rayon.";
    carte.append(resume, aide);
    // Dans l'ordre de tes rayons, avec « plus là » d'abord
    const rang = (a) => courses.rayons.findIndex((r) => r.id === rayonDe(a.rayonId).id);
    const etat = (a) =>
      typeof placard !== "undefined" && placard.articles
        ? (placard.articles.find((x) => x.id === a.placardId) || {}).etat
        : "";
    placardSeul
      .sort((a, b) => (etat(a) === "plus" ? 0 : 1) - (etat(b) === "plus" ? 0 : 1) || rang(a) - rang(b))
      .forEach((article) => {
        const ligne = creerLigneArticle(article);
        const pour = ligne.querySelector(".ligne-article-pour");
        if (pour) pour.textContent = etat(article) === "plus" ? "plus là" : "bientôt fini";
        carte.appendChild(ligne);
      });
    listeCourses.appendChild(carte);
  }

  if (necessaires.length === 0 && placardSeul.length === 0) {
    const vide = document.createElement("article");
    vide.classList.add("carte");
    vide.appendChild(
      creerMessageVide(
        panier.length > 0 ? "Tout est dans le panier 🌱" : "Ta liste est vide. Ajoute ce qui manque au fil de la semaine.",
      ),
    );
    listeCourses.appendChild(vide);
  }

  // Le panier : ce qui est déjà pris
  if (panier.length > 0) {
    const carte = document.createElement("details");
    carte.classList.add("carte", "carte-repliable", "carte-panier");
    carte.open = aPrendre.length === 0;
    const resume = document.createElement("summary");
    const titre = document.createElement("h2");
    titre.textContent = `Dans le panier · ${panier.length}`;
    resume.appendChild(titre);
    carte.appendChild(resume);
    panier.forEach((article) => carte.appendChild(creerLigneArticle(article)));

    const fini = document.createElement("button");
    fini.type = "button";
    fini.classList.add("bouton", "bouton-large");
    fini.textContent = "J'ai fini mes courses";
    fini.addEventListener("click", finirCourses);
    carte.appendChild(fini);
    listeCourses.appendChild(carte);
  }

  // Repartir de zéro : vider toute la liste (avec « Annuler »)
  if (courses.articles.length > 0) {
    const vider = document.createElement("button");
    vider.type = "button";
    vider.classList.add("lien", "lien-vider-courses");
    vider.appendChild(creerIcone("rotate-ccw"));
    vider.append(" Vider toute la liste");
    vider.addEventListener("click", viderToutesLesCourses);
    listeCourses.appendChild(vider);
  }

  // Les articles déjà connus, proposés quand on tape
  const connus = document.getElementById("articles-connus");
  connus.replaceChildren();
  Object.keys(courses.memoire).forEach((nom) => {
    const option = document.createElement("option");
    option.value = nom;
    connus.appendChild(option);
  });

  remplirChoixRayons(articleRayon, devinerRayon(articleNom.value || ""));
  afficherListeRayons();
  afficherResumesCourses();
}

// ---------- 4. Ajouter, cocher, modifier, retirer ----------

// En tapant le nom, le rayon se devine tout seul (tu peux le changer),
// et l'unité utilisée la dernière fois revient
let uniteMiseToutSeule = false; // true : c'est l'appli qui a choisi l'unité, pas toi

articleNom.addEventListener("input", () => {
  articleRayon.value = devinerRayon(articleNom.value);
  const unite = courses.unites[articleNom.value.trim().toLowerCase()];
  if (unite !== undefined) {
    placerUnite(articleUnite, articleUniteAutre, unite);
    uniteMiseToutSeule = true;
  } else if (uniteMiseToutSeule) {
    // Le nom ne correspond plus : on retire l'unité qu'on avait mise
    placerUnite(articleUnite, articleUniteAutre, "");
    uniteMiseToutSeule = false;
  }
});
articleUnite.addEventListener("change", () => {
  uniteMiseToutSeule = false; // tu as choisi toi-même : on n'y touche plus
});

document.getElementById("form-article").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = articleNom.value.trim();
  if (!nom) return;
  const rayonId = articleRayon.value;
  const quantite = articleQuantite.value.trim();
  const unite = quantite ? uniteChoisie(articleUnite, articleUniteAutre) : "";
  courses.articles.push({
    id: nouvelId(),
    nom: nom,
    quantite: quantite,
    unite: unite,
    rayonId: rayonId,
    coche: false,
    source: "manuel",
  });
  // On retient le rayon (et l'unité) pour la prochaine fois
  courses.memoire[nom.toLowerCase()] = rayonId;
  if (unite) courses.unites[nom.toLowerCase()] = unite;
  sauvegarderCourses();
  articleNom.value = "";
  articleQuantite.value = "";
  placerUnite(articleUnite, articleUniteAutre, "");
  afficherCourses();
  articleNom.focus(); // on enchaîne facilement plusieurs articles
});

const feuilleArticle = document.getElementById("feuille-article");
let articleEnModification = null;

function ouvrirFeuilleArticle(article) {
  articleEnModification = article.id;
  document.getElementById("modif-article-nom").value = article.nom;
  document.getElementById("modif-article-quantite").value = article.quantite;
  placerUnite(
    document.getElementById("modif-article-unite"),
    document.getElementById("modif-article-unite-autre"),
    article.unite || "",
  );
  remplirChoixRayons(document.getElementById("modif-article-rayon"), rayonDe(article.rayonId).id);
  feuilleArticle.hidden = false;
  voile.hidden = false;
}

function fermerFeuilleArticle() {
  feuilleArticle.hidden = true;
  voile.hidden = true;
  articleEnModification = null;
}

document.getElementById("fermer-article").addEventListener("click", fermerFeuilleArticle);
voile.addEventListener("click", () => {
  if (!feuilleArticle.hidden) fermerFeuilleArticle();
});

document.getElementById("form-modif-article").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const article = courses.articles.find((a) => a.id === articleEnModification);
  if (!article) return;
  article.nom = document.getElementById("modif-article-nom").value.trim() || article.nom;
  article.quantite = document.getElementById("modif-article-quantite").value.trim();
  article.unite = article.quantite
    ? uniteChoisie(
        document.getElementById("modif-article-unite"),
        document.getElementById("modif-article-unite-autre"),
      )
    : "";
  if (article.unite) courses.unites[article.nom.toLowerCase()] = article.unite;
  article.rayonId = document.getElementById("modif-article-rayon").value;
  delete article.apports;
  delete article.quantiteManuelle;
  article.source = "manuel";
  courses.memoire[article.nom.toLowerCase()] = article.rayonId;
  sauvegarderCourses();
  fermerFeuilleArticle();
  afficherCourses();
});

document.getElementById("supprimer-article").addEventListener("click", () => {
  const article = courses.articles.find((a) => a.id === articleEnModification);
  if (!article) return;
  fermerFeuilleArticle();
  agirAvecAnnuler({
    tiroir: courses,
    message: `« ${article.nom} » retiré`,
    action: () => {
      courses.articles = courses.articles.filter((a) => a.id !== article.id);
    },
    apres: () => {
      sauvegarderCourses();
      afficherCourses();
    },
  });
});

// Depuis le menu + : on va sur l'écran Courses, prêt à taper
document.getElementById("plus-courses").addEventListener("click", () => {
  fermerMenuPlus(); // agenda-feuille.js
  afficherEcran("courses"); // navigation.js
  articleNom.focus();
});

// Vider toute la liste : les repas envoyés aux courses redeviennent « à envoyer »
function viderToutesLesCourses() {
  const copieCourses = JSON.stringify(courses);
  const copieRepas = typeof repas !== "undefined" ? JSON.stringify(repas) : null;
  courses.articles = [];
  if (copieRepas) {
    Object.values(repas.jours).forEach((jour) => Object.values(jour).forEach((r) => (r.envoye = false)));
    sauvegarderRepas();
    afficherRepas();
  }
  sauvegarderCourses();
  afficherCourses();
  montrerPetitMessage("La liste est vide, on repart de zéro 🌱", () => {
    remettreCommeAvant(courses, copieCourses);
    sauvegarderCourses();
    afficherCourses();
    if (copieRepas) {
      remettreCommeAvant(repas, copieRepas);
      sauvegarderRepas();
      afficherRepas();
    }
  });
}

// ---------- 5. « J'ai fini mes courses » ----------

const finCourses = document.getElementById("fin-courses");

function finirCourses() {
  agirAvecAnnuler({
    tiroir: courses,
    message: "Le panier est vidé",
    action: () => {
      // Tout ce qui est dans le panier repasse à « Il y en a » au placard (placard.js)
      if (typeof quandArticleAchete === "function" && moduleActif("placard")) {
        courses.articles.filter((a) => a.coche).forEach((a) => quandArticleAchete(a));
      }
      courses.articles = courses.articles.filter((a) => !a.coche);
    },
    apres: () => {
      sauvegarderCourses();
      afficherCourses();
    },
  });
  finCourses.hidden = false;
}

document.getElementById("fin-courses-non").addEventListener("click", () => {
  finCourses.hidden = true;
});

// Noter le total : la feuille de dépense du Budget, déjà réglée sur « Courses »
document.getElementById("fin-courses-oui").addEventListener("click", () => {
  finCourses.hidden = true;
  ouvrirFeuilleDepense(null); // budget-mois.js
  const bocal = budget.bocaux.find((b) => b.nom.toLowerCase().includes("course"));
  if (bocal) document.getElementById("depense-bocal").value = bocal.id;
  document.getElementById("depense-note").value = "Courses";
});

// ---------- 6. Mes rayons ----------

const listeRayons = document.getElementById("liste-rayons");

function deplacerRayon(id, sens) {
  const i = courses.rayons.findIndex((r) => r.id === id);
  const j = i + sens;
  if (j < 0 || j >= courses.rayons.length) return;
  [courses.rayons[i], courses.rayons[j]] = [courses.rayons[j], courses.rayons[i]];
  sauvegarderCourses();
  afficherCourses();
}

function afficherListeRayons() {
  listeRayons.replaceChildren();
  courses.rayons.forEach((rayon, i) => {
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-carte-accueil");

    // Le nom se modifie directement
    const nom = document.createElement("input");
    nom.type = "text";
    nom.value = rayon.nom;
    nom.maxLength = 30;
    nom.classList.add("champ-rayon");
    nom.setAttribute("aria-label", "Nom du rayon");
    nom.addEventListener("change", () => {
      rayon.nom = nom.value.trim() || rayon.nom;
      sauvegarderCourses();
      afficherCourses();
    });
    ligne.appendChild(nom);

    ligne.append(
      creerFleche("↑", `Monter ${rayon.nom}`, i === 0, () => deplacerRayon(rayon.id, -1)),
      creerFleche("↓", `Descendre ${rayon.nom}`, i === courses.rayons.length - 1, () => deplacerRayon(rayon.id, 1)),
    );

    // On garde toujours au moins un rayon
    if (courses.rayons.length > 1) {
      const supprimer = document.createElement("button");
      supprimer.type = "button";
      supprimer.classList.add("bouton-supprimer");
      supprimer.setAttribute("aria-label", `Supprimer ${rayon.nom}`);
      supprimer.appendChild(creerIcone("x"));
      supprimer.addEventListener("click", () => supprimerRayon(rayon));
      ligne.appendChild(supprimer);
    }
    listeRayons.appendChild(ligne);
  });
}

// Supprimer un rayon : ses articles vont dans le dernier rayon qui reste
function supprimerRayon(rayon) {
  agirAvecAnnuler({
    tiroir: courses,
    message: `Rayon « ${rayon.nom} » supprimé`,
    action: () => {
      courses.rayons = courses.rayons.filter((r) => r.id !== rayon.id);
      const dernier = courses.rayons[courses.rayons.length - 1].id;
      courses.articles.forEach((a) => {
        if (a.rayonId === rayon.id) a.rayonId = dernier;
      });
    },
    apres: () => {
      sauvegarderCourses();
      afficherCourses();
    },
  });
}

document.getElementById("form-rayon").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const champ = document.getElementById("rayon-nom");
  const nom = champ.value.trim();
  if (!nom) return;
  // Un nouveau rayon se place juste avant « Autre » (le dernier)
  courses.rayons.splice(courses.rayons.length - 1, 0, { id: String(nouvelId()), nom: nom });
  sauvegarderCourses();
  champ.value = "";
  afficherCourses();
  montrerPetitMessage("C'est noté 🌱");
});

// ---------- 7. Les résumés ----------

function texteCombien(nombre) {
  if (nombre === 0) return "Rien à prendre pour l'instant";
  return nombre === 1 ? "1 article à prendre" : `${nombre} articles à prendre`;
}

function afficherResumesCourses() {
  // Ce qui sert seulement au placard n'est pas compté comme « à prendre »
  const aPrendre = courses.articles.filter((a) => !a.coche && !pourLePlacardSeulement(a));
  const placardSeul = courses.articles.filter((a) => !a.coche && pourLePlacardSeulement(a)).length;
  const enPlus = placardSeul ? ` (+ ${placardSeul} pour le placard)` : "";
  document.getElementById("courses-resume").textContent = texteCombien(aPrendre.length) + enPlus;
  document.getElementById("foyer-courses-resume").textContent = texteCombien(aPrendre.length) + enPlus;

  // Sur l'accueil : le nombre, puis les premiers articles
  let texte = texteCombien(aPrendre.length);
  if (aPrendre.length > 0) {
    const premiers = aPrendre.slice(0, 3).map((a) => a.nom).join(", ");
    texte += ` : ${premiers}${aPrendre.length > 3 ? "…" : ""}`;
  }
  document.getElementById("accueil-courses").textContent = texte;
}

afficherCourses();

// ---------- 7. Dicter ses courses ----------
// « Gel douche, dentifrice et 2 kg de pommes » → trois articles, chacun dans son rayon.
// La reconnaissance vocale est celle du téléphone (si elle n'est pas là, on propose le micro du clavier).

const boutonDicter = document.getElementById("dicter-courses");
const Reconnaissance = window.SpeechRecognition || window.webkitSpeechRecognition;
let ecoute = null;

// Couper la phrase en articles
function articlesDicte(phrase) {
  return phrase
    .split(/,|;|\s+(?:et|puis|aussi|ensuite|avec)\s+/i)
    .map((morceau) => morceau.trim().replace(/^(il (me )?faut|ajoute|rajoute|acheter|du|de la|de l'|des|un|une)\s+/i, "").trim())
    .filter((morceau) => morceau.length > 1);
}

function ajouterArticlesDictes(phrase) {
  const morceaux = articlesDicte(phrase);
  if (morceaux.length === 0) return;
  const copie = JSON.stringify(courses);
  const noms = [];
  morceaux.forEach((morceau) => {
    // « 2 kg de pommes » : on garde la quantité (lireMorceau vient de repas.js)
    const lu = typeof lireMorceau === "function" ? lireMorceau(morceau) : null;
    const nom = majuscule(lu ? lu.nom : morceau);
    const quantite = lu && lu.quantite !== null ? String(lu.quantite).replace(".", ",") : "";
    courses.articles.push({
      id: nouvelId(),
      nom,
      quantite,
      unite: quantite ? lu.unite : "",
      rayonId: devinerRayon(nom),
      coche: false,
      source: "manuel",
    });
    noms.push(nom.toLowerCase());
  });
  sauvegarderCourses();
  afficherCourses();
  montrerPetitMessage(`Ajouté : ${noms.join(", ")} 🌱`, () => {
    remettreCommeAvant(courses, copie);
    sauvegarderCourses();
    afficherCourses();
  });
}

boutonDicter.addEventListener("click", () => {
  if (!Reconnaissance) {
    montrerPetitMessage("La dictée n'est pas possible ici : utilise le micro de ton clavier");
    articleNom.focus();
    return;
  }
  if (ecoute) {
    ecoute.stop();
    return;
  }
  ecoute = new Reconnaissance();
  ecoute.lang = "fr-FR";
  ecoute.interimResults = false;
  ecoute.maxAlternatives = 1;
  boutonDicter.classList.add("en-ecoute");
  montrerPetitMessage("Je t'écoute…");
  ecoute.addEventListener("result", (e) => ajouterArticlesDictes(e.results[0][0].transcript));
  ecoute.addEventListener("error", (e) => {
    if (e.error === "not-allowed") montrerPetitMessage("Le micro n'est pas autorisé pour le hub");
    else if (e.error !== "aborted") montrerPetitMessage("Je n'ai pas bien entendu, on réessaie ?");
  });
  ecoute.addEventListener("end", () => {
    boutonDicter.classList.remove("en-ecoute");
    ecoute = null;
  });
  ecoute.start();
});

// ---------- 8. Le raccourci de l'icône : « Ajouter aux courses » ----------
// Un appui long sur l'icône du hub ouvre directement les courses, prêtes à remplir.
window.addEventListener("load", () => {
  const action = new URLSearchParams(location.search).get("action");
  if (action !== "courses") return;
  history.replaceState(null, "", location.pathname);
  if (typeof moduleActif === "function" && !moduleActif("courses")) return;
  afficherEcran("courses");
  articleNom.focus();
});
