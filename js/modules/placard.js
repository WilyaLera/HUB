// =====================================================
// Module Placard : seulement les basiques, trois états
//   1. le tiroir « placard »
//   2. changer l'état d'un article (et le lien avec les courses)
//   3. la vue cuisine : les quatre rangements, puis les étagères
//   4. la vue liste
//   5. modifier : renommer, retirer, ajouter un article ou un rangement
//   6. les plats prêts au congélateur
//   7. ce que les autres modules demandent au placard
// =====================================================

// ---------- 1. Le tiroir « placard » ----------
// rangements : [{ id, nom, couleur, icone }]
// articles   : [{ id, nom, rangementId, forme ("bocal" | "boite" | "bouteille"), etat ("la" | "bientot" | "plus") }]
// plats      : [{ id, nom, portions, date }]   les plats prêts au congélateur
// vue        : "cuisine" | "liste"

const ETATS_PLACARD = [
  ["la", "Il y en a"],
  ["bientot", "Bientôt fini"],
  ["plus", "Plus là"],
];
const REMPLISSAGE = { la: 92, bientot: 30, plus: 0 };

const PLACARD_DE_DEPART = {
  epicerie: {
    nom: "Placard épicerie",
    couleur: "#D98B6A",
    icone: "archive",
    articles: [
      ["Huile d'olive", "bouteille"], ["Sel", "bocal"], ["Poivre", "bocal"], ["Sucre", "bocal"], ["Farine", "boite"],
      ["Riz", "bocal"], ["Pâtes", "bocal"], ["Orzo", "bocal"], ["Nouilles", "boite"], ["Chapelure", "boite"],
      ["Sauce soja", "bouteille"], ["Miel", "bocal"], ["Moutarde", "bocal"], ["Ketchup", "bouteille"],
      ["Concentré de tomate", "boite"], ["Tomates concassées", "boite"], ["Lait de coco", "boite"],
      ["Bouillon", "boite"], ["Thon en boîte", "boite"], ["Paprika", "bocal"], ["Cumin", "bocal"],
      ["Curry", "bocal"], ["Herbes italiennes", "bocal"], ["Ail", "bocal"], ["Oignons", "bocal"],
    ],
  },
  frigo: {
    nom: "Frigo",
    couleur: "#A9C8D8",
    icone: "refrigerator",
    articles: [
      ["Beurre", "boite"], ["Œufs", "boite"], ["Lait végétal", "bouteille"], ["Crème légère", "bouteille"],
      ["Fromage râpé", "boite"], ["Parmesan", "boite"], ["Yaourts", "boite"],
    ],
  },
  congel: {
    nom: "Congélateur",
    couleur: "#BFD6E2",
    icone: "snowflake",
    articles: [["Petits pois", "boite"], ["Haricots verts", "boite"], ["Légumes surgelés", "boite"]],
  },
  entretien: {
    nom: "Placard entretien",
    couleur: "#9DBB9F",
    icone: "spray-can",
    articles: [
      ["Liquide vaisselle", "bouteille"], ["Lessive", "bouteille"], ["Papier toilette", "boite"],
      ["Sacs poubelle", "boite"], ["Éponges", "boite"], ["Essuie-tout", "boite"],
    ],
  },
};

let placard = charger("placard", null);
if (!placard) {
  placard = { rangements: [], articles: [], plats: [], vue: "cuisine" };
  Object.entries(PLACARD_DE_DEPART).forEach(([id, r]) => {
    placard.rangements.push({ id, nom: r.nom, couleur: r.couleur, icone: r.icone });
    r.articles.forEach(([nom, forme]) =>
      placard.articles.push({ id: `${id}-${nouvelId()}-${placard.articles.length}`, nom, rangementId: id, forme, etat: "la" }),
    );
  });
  sauvegarder("placard", placard);
}

function sauvegarderPlacard() {
  sauvegarder("placard", placard);
}

function rangementDe(id) {
  return placard.rangements.find((r) => r.id === id) || null;
}

function aRacheter(rangementId) {
  return placard.articles.filter((a) => (!rangementId || a.rangementId === rangementId) && a.etat !== "la");
}

// ---------- 2. Changer l'état d'un article ----------
// Bientôt fini ou Plus là → il part dans les courses ; Il y en a → il en sort (s'il n'est pas déjà pris)

function changerEtatPlacard(article, etat) {
  article.etat = etat;
  if (moduleActif("courses")) {
    const dansCourses = courses.articles.find((a) => a.placardId === article.id && !a.coche);
    if (etat === "la") {
      if (dansCourses) courses.articles = courses.articles.filter((a) => a !== dansCourses);
    } else if (!dansCourses) {
      // Peut-être qu'un repas l'a déjà mis dans la liste : on le relie simplement
      const memeNom = courses.articles.find((a) => !a.coche && cleIngredient(a.nom) === cleIngredient(article.nom));
      if (memeNom) {
        memeNom.placardId = article.id;
      } else {
        courses.articles.push({
          id: nouvelId(),
          nom: article.nom,
          quantite: "",
          unite: "",
          rayonId: devinerRayon(article.nom),
          coche: false,
          source: "placard",
          placardId: article.id,
          pour: ["le placard"],
        });
      }
    }
    sauvegarderCourses();
    afficherCourses();
  }
  sauvegarderPlacard();
  afficherPlacard();
}

// Toucher un pot : Il y en a → Bientôt fini → Plus là → Il y en a
function etatSuivant(etat) {
  return { la: "bientot", bientot: "plus", plus: "la" }[etat];
}

// Appelé par les Courses quand on coche un article : ce qui est acheté repasse à « Il y en a »
function quandArticleAchete(articleCourses) {
  if (!articleCourses.coche) return;
  const article = placard.articles.find(
    (a) => a.id === articleCourses.placardId || cleIngredient(a.nom) === cleIngredient(articleCourses.nom),
  );
  if (article && article.etat !== "la") {
    article.etat = "la";
    sauvegarderPlacard();
    afficherPlacard();
  }
}

// ---------- 3. La vue cuisine ----------

let rangementOuvert = null;
let modePlacardModifier = false;

document.querySelectorAll("[data-vue-placard]").forEach((bouton) =>
  bouton.addEventListener("click", () => {
    placard.vue = bouton.dataset.vuePlacard;
    rangementOuvert = null;
    sauvegarderPlacard();
    afficherPlacard();
  }),
);

document.getElementById("modifier-placard").addEventListener("click", () => {
  modePlacardModifier = !modePlacardModifier;
  afficherPlacard();
});

function creerPot(article, rangement) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.classList.add("pot", `pot-${article.forme || "bocal"}`, `pot-etat-${article.etat}`);
  bouton.style.setProperty("--couleur-pot", rangement.couleur);
  bouton.style.setProperty("--remplissage", `${REMPLISSAGE[article.etat]}%`);
  const etat = ETATS_PLACARD.find(([code]) => code === article.etat)[1];
  bouton.setAttribute("aria-label", `${article.nom} : ${etat}. Toucher pour changer.`);
  const forme = document.createElement("span");
  forme.classList.add("pot-forme");
  const contenu = document.createElement("span");
  contenu.classList.add("pot-contenu");
  forme.appendChild(contenu);
  const nom = document.createElement("span");
  nom.classList.add("pot-nom");
  nom.textContent = article.nom;
  const texteEtat = document.createElement("span");
  texteEtat.classList.add("pot-etat");
  texteEtat.textContent = etat;
  bouton.append(forme, nom, texteEtat);
  bouton.addEventListener("click", () => changerEtatPlacard(article, etatSuivant(article.etat)));
  return bouton;
}

function afficherRangements(zone) {
  const grille = document.createElement("div");
  grille.classList.add("grille-rangements");
  placard.rangements.forEach((r) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("rangement");
    bouton.style.setProperty("--couleur-rangement", r.couleur);
    const porte = document.createElement("span");
    porte.classList.add("rangement-porte");
    porte.appendChild(creerIcone(r.icone || "archive"));
    const poignee = document.createElement("span");
    poignee.classList.add("rangement-poignee");
    porte.appendChild(poignee);
    const nom = document.createElement("span");
    nom.classList.add("rangement-nom");
    nom.textContent = r.nom;
    const manque = aRacheter(r.id).length;
    const detail = document.createElement("span");
    detail.classList.add("rangement-detail");
    const point = document.createElement("span");
    point.classList.add("point-etat");
    point.classList.toggle("point-manque", manque > 0);
    detail.append(point, manque ? `${manque} à racheter` : "Tout est là");
    bouton.append(porte, nom, detail);
    bouton.addEventListener("click", () => {
      rangementOuvert = r.id;
      afficherPlacard();
    });
    grille.appendChild(bouton);
  });
  zone.appendChild(grille);
  if (modePlacardModifier) zone.appendChild(creerFormRangement());
}

function afficherEtageres(zone, rangement) {
  const retour = document.createElement("button");
  retour.type = "button";
  retour.classList.add("lien", "lien-retour-placard");
  retour.append(creerIcone("chevron-left"), "Tous les rangements");
  retour.addEventListener("click", () => {
    rangementOuvert = null;
    afficherPlacard();
  });
  const titre = document.createElement("h2");
  titre.classList.add("titre-rangement");
  titre.textContent = rangement.nom;
  zone.append(retour, titre);

  const meuble = document.createElement("div");
  meuble.classList.add("etageres");
  meuble.style.setProperty("--couleur-rangement", rangement.couleur);
  const articles = placard.articles.filter((a) => a.rangementId === rangement.id);
  if (articles.length === 0) meuble.appendChild(creerMessageVide("Rien ici pour l'instant."));
  // Une étagère toutes les 3 étiquettes
  for (let i = 0; i < articles.length; i += 3) {
    const etagere = document.createElement("div");
    etagere.classList.add("etagere");
    articles.slice(i, i + 3).forEach((a) => etagere.appendChild(modePlacardModifier ? creerLigneModifier(a) : creerPot(a, rangement)));
    meuble.appendChild(etagere);
  }
  zone.appendChild(meuble);
  if (!modePlacardModifier) {
    const aide = document.createElement("p");
    aide.classList.add("sous-titre", "petit", "aide-placard");
    aide.textContent = "Touche un pot pour dire où tu en es. Ce qui manque part tout seul dans les courses.";
    zone.appendChild(aide);
  } else {
    zone.appendChild(creerFormArticle(rangement.id));
    zone.appendChild(creerModifierRangement(rangement));
  }
  if (rangement.id === "congel" || /cong[eé]l/i.test(rangement.nom)) zone.appendChild(creerPlatsPrets());
}

// ---------- 4. La vue liste ----------

function creerChoixEtat(article) {
  const zone = document.createElement("div");
  zone.classList.add("choix-etat");
  ETATS_PLACARD.forEach(([code, texte]) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add(`choix-etat-${code}`);
    bouton.classList.toggle("choisi", article.etat === code);
    bouton.textContent = texte;
    bouton.addEventListener("click", () => changerEtatPlacard(article, code));
    zone.appendChild(bouton);
  });
  return zone;
}

function afficherListePlacard(zone) {
  placard.rangements.forEach((r) => {
    const section = document.createElement("details");
    section.classList.add("chapitre-carnet");
    section.open = true;
    const titre = document.createElement("summary");
    const nom = document.createElement("span");
    nom.textContent = r.nom;
    const nombre = document.createElement("span");
    nombre.classList.add("chapitre-nombre");
    const manque = aRacheter(r.id).length;
    nombre.textContent = manque ? `${manque} à racheter` : "tout est là";
    titre.append(nom, nombre);
    const carte = document.createElement("div");
    carte.classList.add("carte");
    placard.articles
      .filter((a) => a.rangementId === r.id)
      .forEach((a) => {
        if (modePlacardModifier) {
          carte.appendChild(creerLigneModifier(a));
          return;
        }
        const ligne = document.createElement("div");
        ligne.classList.add("ligne-placard");
        const texte = document.createElement("span");
        texte.textContent = a.nom;
        ligne.append(texte, creerChoixEtat(a));
        carte.appendChild(ligne);
      });
    if (modePlacardModifier) carte.appendChild(creerFormArticle(r.id));
    section.append(titre, carte);
    if (r.id === "congel" || /cong[eé]l/i.test(r.nom)) section.appendChild(creerPlatsPrets());
    zone.appendChild(section);
  });
  if (modePlacardModifier) zone.appendChild(creerFormRangement());
}

// ---------- 5. Modifier ----------

// Une ligne pour renommer (et retirer) un article
function creerLigneModifier(article) {
  const ligne = document.createElement("div");
  ligne.classList.add("ligne-modifier-placard");
  const champ = document.createElement("input");
  champ.type = "text";
  champ.classList.add("champ-note");
  champ.value = article.nom;
  champ.maxLength = 40;
  champ.setAttribute("aria-label", "Nom de l'article");
  champ.addEventListener("change", () => {
    article.nom = champ.value.trim() || article.nom;
    sauvegarderPlacard();
  });
  const forme = document.createElement("select");
  forme.classList.add("champ-note");
  forme.setAttribute("aria-label", "Forme");
  [["bocal", "Bocal"], ["boite", "Boîte"], ["bouteille", "Bouteille"]].forEach(([code, texte]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = texte;
    forme.appendChild(option);
  });
  forme.value = article.forme || "bocal";
  forme.addEventListener("change", () => {
    article.forme = forme.value;
    sauvegarderPlacard();
  });
  const retirer = document.createElement("button");
  retirer.type = "button";
  retirer.classList.add("bouton-supprimer");
  retirer.setAttribute("aria-label", `Retirer ${article.nom}`);
  retirer.appendChild(creerIcone("x"));
  retirer.addEventListener("click", () =>
    agirAvecAnnuler({
      tiroir: placard,
      message: `« ${article.nom} » retiré du placard`,
      action: () => {
        placard.articles = placard.articles.filter((a) => a.id !== article.id);
      },
      apres: () => {
        sauvegarderPlacard();
        afficherPlacard();
      },
    }),
  );
  ligne.append(champ, forme, retirer);
  return ligne;
}

function creerFormArticle(rangementId) {
  const form = document.createElement("form");
  form.classList.add("form-article-ligne", "form-placard");
  const champ = document.createElement("input");
  champ.type = "text";
  champ.classList.add("champ-note");
  champ.placeholder = "Ajouter un article";
  champ.maxLength = 40;
  champ.required = true;
  const bouton = document.createElement("button");
  bouton.type = "submit";
  bouton.classList.add("bouton-rond", "bouton-rond-plein");
  bouton.setAttribute("aria-label", "Ajouter");
  bouton.appendChild(creerIcone("plus"));
  form.append(champ, bouton);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nom = champ.value.trim();
    if (!nom) return;
    placard.articles.push({ id: String(nouvelId()), nom: majuscule(nom), rangementId, forme: "bocal", etat: "la" });
    sauvegarderPlacard();
    afficherPlacard();
    montrerPetitMessage("Ajouté au placard 🌱");
  });
  return form;
}

const COULEURS_RANGEMENT = ["#D98B6A", "#A9C8D8", "#BFD6E2", "#9DBB9F", "#E8C66A", "#D7B8D6", "#E6A9A0"];

function creerModifierRangement(rangement) {
  const zone = document.createElement("div");
  zone.classList.add("modifier-rangement");
  const etiquette = document.createElement("p");
  etiquette.classList.add("etiquette");
  etiquette.textContent = "Ce rangement";
  const nom = document.createElement("input");
  nom.type = "text";
  nom.classList.add("champ-note");
  nom.value = rangement.nom;
  nom.maxLength = 30;
  nom.setAttribute("aria-label", "Nom du rangement");
  nom.addEventListener("change", () => {
    rangement.nom = nom.value.trim() || rangement.nom;
    sauvegarderPlacard();
    afficherPlacard();
  });
  const couleurs = document.createElement("div");
  couleurs.classList.add("couleurs-rangement");
  COULEURS_RANGEMENT.forEach((couleur) => {
    const pastille = document.createElement("button");
    pastille.type = "button";
    pastille.classList.add("pastille-couleur");
    pastille.classList.toggle("choisie", rangement.couleur === couleur);
    pastille.style.background = couleur;
    pastille.setAttribute("aria-label", "Choisir cette couleur");
    pastille.addEventListener("click", () => {
      rangement.couleur = couleur;
      sauvegarderPlacard();
      afficherPlacard();
    });
    couleurs.appendChild(pastille);
  });
  const retirer = document.createElement("button");
  retirer.type = "button";
  retirer.classList.add("lien", "lien-vider-repas");
  retirer.textContent = "Retirer ce rangement et ce qu'il contient";
  retirer.addEventListener("click", () => {
    rangementOuvert = null;
    agirAvecAnnuler({
      tiroir: placard,
      message: `« ${rangement.nom} » retiré`,
      action: () => {
        placard.rangements = placard.rangements.filter((r) => r.id !== rangement.id);
        placard.articles = placard.articles.filter((a) => a.rangementId !== rangement.id);
      },
      apres: () => {
        sauvegarderPlacard();
        afficherPlacard();
      },
    });
  });
  zone.append(etiquette, nom, couleurs, retirer);
  return zone;
}

function creerFormRangement() {
  const form = document.createElement("form");
  form.classList.add("form-article-ligne", "form-placard");
  const champ = document.createElement("input");
  champ.type = "text";
  champ.classList.add("champ-note");
  champ.placeholder = "Nouveau rangement (ex. Cellier)";
  champ.maxLength = 30;
  champ.required = true;
  const bouton = document.createElement("button");
  bouton.type = "submit";
  bouton.classList.add("bouton-rond", "bouton-rond-plein");
  bouton.setAttribute("aria-label", "Ajouter un rangement");
  bouton.appendChild(creerIcone("plus"));
  form.append(champ, bouton);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nom = champ.value.trim();
    if (!nom) return;
    placard.rangements.push({
      id: String(nouvelId()),
      nom: majuscule(nom),
      couleur: COULEURS_RANGEMENT[placard.rangements.length % COULEURS_RANGEMENT.length],
      icone: "archive",
    });
    sauvegarderPlacard();
    afficherPlacard();
  });
  return form;
}

// ---------- 6. Les plats prêts au congélateur ----------

function creerPlatsPrets() {
  const bloc = document.createElement("section");
  bloc.classList.add("carte", "plats-prets");
  const titre = document.createElement("h3");
  titre.textContent = "Plats prêts";
  bloc.appendChild(titre);
  if (placard.plats.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre", "petit");
    vide.textContent = "Quand tu congèles des portions d'avance, note-les ici : elles te seront proposées dans les repas.";
    bloc.appendChild(vide);
  }
  placard.plats.forEach((plat) => {
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-placard");
    const texte = document.createElement("span");
    texte.classList.add("plat-pret-texte");
    const nom = document.createElement("strong");
    nom.textContent = plat.nom;
    const detail = document.createElement("span");
    detail.classList.add("sous-titre", "petit");
    detail.textContent = `${plat.portions} portion${plat.portions > 1 ? "s" : ""} · depuis le ${formaterDate(plat.date, false)}`;
    texte.append(nom, detail);
    const sortir = document.createElement("button");
    sortir.type = "button";
    sortir.classList.add("bouton-demain");
    sortir.textContent = "Sortir 1";
    sortir.addEventListener("click", () => sortirUnePortion(plat));
    ligne.append(texte, sortir);
    bloc.appendChild(ligne);
  });
  const form = document.createElement("form");
  form.classList.add("form-plat-pret");
  const nom = document.createElement("input");
  nom.type = "text";
  nom.classList.add("champ-note");
  nom.placeholder = "Ex. : lentilles aux saucisses";
  nom.maxLength = 60;
  nom.required = true;
  const portions = document.createElement("input");
  portions.type = "number";
  portions.inputMode = "numeric";
  portions.min = "1";
  portions.value = "2";
  portions.classList.add("champ-note", "champ-court");
  portions.setAttribute("aria-label", "Portions");
  const ajouter = document.createElement("button");
  ajouter.type = "submit";
  ajouter.classList.add("bouton-rond", "bouton-rond-plein");
  ajouter.setAttribute("aria-label", "Ajouter ce plat");
  ajouter.appendChild(creerIcone("plus"));
  form.append(nom, portions, ajouter);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!nom.value.trim()) return;
    placard.plats.push({
      id: String(nouvelId()),
      nom: majuscule(nom.value.trim()),
      portions: Math.max(1, Number(portions.value) || 1),
      date: aujourdhuiEnTexte(),
    });
    sauvegarderPlacard();
    afficherPlacard();
    montrerPetitMessage("Rangé au congélateur ❄");
  });
  bloc.appendChild(form);
  return bloc;
}

function sortirUnePortion(plat) {
  agirAvecAnnuler({
    tiroir: placard,
    message: plat.portions > 1 ? `Une portion sortie, il en reste ${plat.portions - 1}` : `Dernière portion de « ${plat.nom} » sortie`,
    action: () => {
      const p = placard.plats.find((x) => x.id === plat.id);
      p.portions -= 1;
      if (p.portions <= 0) placard.plats = placard.plats.filter((x) => x.id !== plat.id);
    },
    apres: () => {
      sauvegarderPlacard();
      afficherPlacard();
    },
  });
}

// ---------- 7. Ce que les autres modules demandent au placard ----------

// Un ingrédient de recette déjà au placard (il y en a, ou bientôt fini) : on ne l'ajoute pas aux courses
function auPlacard(nomIngredient) {
  if (!moduleActif("placard")) return false;
  const cle = cleIngredient(nomIngredient);
  return placard.articles.some((a) => {
    if (a.etat === "plus") return false;
    const sienne = cleIngredient(a.nom);
    return sienne === cle || cle.startsWith(`${sienne} `);
  });
}

// ---------- Tout afficher ----------

function afficherPlacard() {
  const zone = document.getElementById("contenu-placard");
  zone.replaceChildren();
  document.querySelectorAll("[data-vue-placard]").forEach((b) => b.classList.toggle("choisie", b.dataset.vuePlacard === placard.vue));
  const bouton = document.getElementById("modifier-placard");
  bouton.textContent = modePlacardModifier ? "Terminé" : "Modifier";
  const total = aRacheter().length;
  const resume = total ? `${total} chose${total > 1 ? "s" : ""} à racheter` : "Tout est là 🌱";
  document.getElementById("placard-resume").textContent = resume;
  document.getElementById("foyer-placard-resume").textContent = total ? resume : "Ce qu'il y a, ce qui manque";
  const rangement = rangementOuvert ? rangementDe(rangementOuvert) : null;
  if (placard.vue === "liste") afficherListePlacard(zone);
  else if (rangement) afficherEtageres(zone, rangement);
  else afficherRangements(zone);
}

afficherPlacard();
