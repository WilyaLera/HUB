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
// articles : [{ id, nom, quantite, rayonId, coche, source }]
//            (source : "manuel" pour l'instant ; plus tard "repas" ou "placard")
// memoire  : { "lait": idDuRayon } : le rayon choisi la dernière fois pour un article

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
    sauvegarderCourses();
    afficherCourses();
  });

  // Toucher le nom : modifier l'article
  const zone = document.createElement("button");
  zone.type = "button";
  zone.classList.add("ligne-article-nom");
  zone.textContent = article.nom;
  if (article.quantite) {
    const quantite = document.createElement("span");
    quantite.classList.add("ligne-article-quantite");
    quantite.textContent = article.quantite;
    zone.appendChild(quantite);
  }
  zone.addEventListener("click", () => ouvrirFeuilleArticle(article));

  ligne.append(caseACocher, zone);
  return ligne;
}

function afficherCourses() {
  listeCourses.replaceChildren();
  const aPrendre = courses.articles.filter((a) => !a.coche);
  const panier = courses.articles.filter((a) => a.coche);

  // Rayon par rayon, dans ton ordre ; les rayons vides ne s'affichent pas
  courses.rayons.forEach((rayon) => {
    const duRayon = aPrendre.filter((a) => rayonDe(a.rayonId).id === rayon.id);
    if (duRayon.length === 0) return;
    const carte = document.createElement("article");
    carte.classList.add("carte", "carte-rayon");
    const titre = document.createElement("h2");
    titre.textContent = rayon.nom;
    carte.appendChild(titre);
    duRayon.forEach((article) => carte.appendChild(creerLigneArticle(article)));
    listeCourses.appendChild(carte);
  });

  if (aPrendre.length === 0) {
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

// En tapant le nom, le rayon se devine tout seul (tu peux le changer)
articleNom.addEventListener("input", () => {
  articleRayon.value = devinerRayon(articleNom.value);
});

document.getElementById("form-article").addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = articleNom.value.trim();
  if (!nom) return;
  const rayonId = articleRayon.value;
  courses.articles.push({
    id: nouvelId(),
    nom: nom,
    quantite: articleQuantite.value.trim(),
    rayonId: rayonId,
    coche: false,
    source: "manuel",
  });
  // On retient le rayon pour la prochaine fois
  courses.memoire[nom.toLowerCase()] = rayonId;
  sauvegarderCourses();
  articleNom.value = "";
  articleQuantite.value = "";
  afficherCourses();
  articleNom.focus(); // on enchaîne facilement plusieurs articles
});

const feuilleArticle = document.getElementById("feuille-article");
let articleEnModification = null;

function ouvrirFeuilleArticle(article) {
  articleEnModification = article.id;
  document.getElementById("modif-article-nom").value = article.nom;
  document.getElementById("modif-article-quantite").value = article.quantite;
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
  article.rayonId = document.getElementById("modif-article-rayon").value;
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

// ---------- 5. « J'ai fini mes courses » ----------

const finCourses = document.getElementById("fin-courses");

function finirCourses() {
  agirAvecAnnuler({
    tiroir: courses,
    message: "Le panier est vidé",
    action: () => {
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
  const aPrendre = courses.articles.filter((a) => !a.coche);
  document.getElementById("courses-resume").textContent = texteCombien(aPrendre.length);
  document.getElementById("foyer-courses-resume").textContent = texteCombien(aPrendre.length);

  // Sur l'accueil : le nombre, puis les premiers articles
  let texte = texteCombien(aPrendre.length);
  if (aPrendre.length > 0) {
    const premiers = aPrendre.slice(0, 3).map((a) => a.nom).join(", ");
    texte += ` : ${premiers}${aPrendre.length > 3 ? "…" : ""}`;
  }
  document.getElementById("accueil-courses").textContent = texte;
}

afficherCourses();
