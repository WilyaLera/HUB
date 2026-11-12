// =====================================================
// Module Agenda — partie 4 : les réglages
//   1. les jours fériés : le pays, ceux qu'on garde, ceux qu'on ajoute
//   2. tes catégories : ajouter, renommer, changer la couleur, supprimer
// =====================================================

// ---------- 1. Les jours fériés ----------

const reglagePays = document.getElementById("reglage-pays");
const listeFeries = document.getElementById("liste-feries");
const formFerie = document.getElementById("form-ferie");
const boutonAjouterFerie = document.getElementById("ajouter-ferie");

// Le menu des pays (une seule fois, au chargement)
[["", "Aucun"], ...Object.entries(PAYS_FERIES).map(([code, pays]) => [code, pays.nom])].forEach(
  ([code, nom]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code ? nom : "Pas de jours fériés de pays";
    reglagePays.appendChild(option);
  },
);

reglagePays.addEventListener("change", () => {
  agenda.paysFeries = reglagePays.value;
  sauvegarderAgenda();
  rafraichirAgenda();
});

// « 25 déc. » : la date de cette année, pour s'y retrouver
function dateCourte(dateTexte) {
  return texteEnDate(dateTexte).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// La liste : une case par jour férié du pays, puis les tiens (avec ✕)
function afficherFeries() {
  reglagePays.value = agenda.paysFeries;
  listeFeries.replaceChildren();
  const annee = new Date().getFullYear();
  const pays = PAYS_FERIES[agenda.paysFeries];

  if (pays) {
    pays.feries.forEach((cle) => {
      const ligne = document.createElement("label");
      ligne.classList.add("reglage-case", "ligne-ferie");
      const caseACocher = document.createElement("input");
      caseACocher.type = "checkbox";
      caseACocher.checked = !agenda.feriesMasques.includes(cle);
      caseACocher.addEventListener("change", () => {
        if (caseACocher.checked) {
          agenda.feriesMasques = agenda.feriesMasques.filter((c) => c !== cle);
        } else {
          agenda.feriesMasques.push(cle);
        }
        sauvegarderAgenda();
        rafraichirAgenda();
      });
      const date = document.createElement("span");
      date.classList.add("sous-titre", "petit");
      date.textContent = dateCourte(FERIES[cle].date(annee));
      ligne.append(caseACocher, FERIES[cle].nom, date);
      listeFeries.appendChild(ligne);
    });
  }

  agenda.feriesPerso.forEach((ferie) => {
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-categorie");
    const nom = document.createElement("span");
    nom.classList.add("ligne-categorie-nom");
    const date = document.createElement("span");
    date.classList.add("sous-titre", "petit");
    date.textContent = dateCourte(`${annee}-${ferie.jourMois}`);
    nom.append(ferie.nom, date);
    const supprimer = document.createElement("button");
    supprimer.type = "button";
    supprimer.classList.add("bouton-supprimer");
    supprimer.appendChild(creerIcone("x"));
    supprimer.setAttribute("aria-label", `Supprimer ${ferie.nom}`);
    supprimer.addEventListener("click", () => {
      agenda.feriesPerso = agenda.feriesPerso.filter((f) => f.id !== ferie.id);
      sauvegarderAgenda();
      rafraichirAgenda();
    });
    ligne.append(nom, supprimer);
    listeFeries.appendChild(ligne);
  });
}

function fermerFormFerie() {
  formFerie.hidden = true;
  boutonAjouterFerie.hidden = false;
}

boutonAjouterFerie.addEventListener("click", () => {
  formFerie.reset();
  formFerie.hidden = false;
  boutonAjouterFerie.hidden = true;
  document.getElementById("ferie-nom").focus();
});
document.getElementById("annuler-ferie").addEventListener("click", fermerFormFerie);

formFerie.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = document.getElementById("ferie-nom").value.trim();
  const date = document.getElementById("ferie-date").value; // "2026-03-15"
  if (!nom || !date) return;
  // On ne garde que le mois et le jour : il revient chaque année
  agenda.feriesPerso.push({ id: nouvelId(), nom: nom, jourMois: date.slice(5) });
  sauvegarderAgenda();
  fermerFormFerie();
  rafraichirAgenda();
  montrerPetitMessage("C'est noté 🌱");
});

// ---------- 2. Les catégories ----------

const listeCategories = document.getElementById("liste-categories");
const formCategorie = document.getElementById("form-categorie");
const categorieNom = document.getElementById("categorie-nom");
const boutonAjouterCategorie = document.getElementById("ajouter-categorie");

let categorieEnModification = null; // le code de celle qu'on modifie (ou null)
let couleurChoisie = COULEURS_CATEGORIES[0];

// Une ligne par catégorie : sa pastille, son nom, une corbeille
function afficherReglagesAgenda() {
  afficherFeries();
  listeCategories.replaceChildren();

  agenda.categories.forEach((categorie) => {
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-categorie");

    const nom = document.createElement("button");
    nom.type = "button";
    nom.classList.add("ligne-categorie-nom");
    nom.append(creerPastilleCategorie(categorie.code), categorie.nom);
    nom.addEventListener("click", () => ouvrirFormCategorie(categorie));

    ligne.appendChild(nom);

    // On garde toujours au moins une catégorie
    if (agenda.categories.length > 1) {
      const supprimer = document.createElement("button");
      supprimer.type = "button";
      supprimer.classList.add("bouton-supprimer");
      supprimer.appendChild(creerIcone("x"));
      supprimer.setAttribute("aria-label", `Supprimer ${categorie.nom}`);
      supprimer.addEventListener("click", () => supprimerCategorie(categorie));
      ligne.appendChild(supprimer);
    }
    listeCategories.appendChild(ligne);
  });
}

// Les ronds de couleur à choisir
function afficherChoixCouleurs() {
  const zone = document.getElementById("categorie-couleurs");
  zone.replaceChildren();
  COULEURS_CATEGORIES.forEach((couleur) => {
    const rond = document.createElement("button");
    rond.type = "button";
    rond.classList.add("rond-couleur");
    rond.classList.toggle("choisi", couleur === couleurChoisie);
    rond.style.background = couleur;
    rond.setAttribute("aria-label", `Couleur ${couleur}`);
    rond.addEventListener("click", () => {
      couleurChoisie = couleur;
      afficherChoixCouleurs();
    });
    zone.appendChild(rond);
  });
}

// Ouvre le petit formulaire. Avec une catégorie : on la modifie.
function ouvrirFormCategorie(categorie) {
  categorieEnModification = categorie ? categorie.code : null;
  categorieNom.value = categorie ? categorie.nom : "";
  // Pour une nouvelle : la première couleur pas encore prise
  const libre = COULEURS_CATEGORIES.find(
    (couleur) => !agenda.categories.some((c) => c.couleur === couleur),
  );
  couleurChoisie = categorie ? categorie.couleur : libre || COULEURS_CATEGORIES[0];
  formCategorie.querySelector('button[type="submit"]').textContent = categorie
    ? "Enregistrer"
    : "Ajouter";
  afficherChoixCouleurs();
  formCategorie.hidden = false;
  boutonAjouterCategorie.hidden = true;
  categorieNom.focus();
}

function fermerFormCategorie() {
  formCategorie.hidden = true;
  boutonAjouterCategorie.hidden = false;
  categorieEnModification = null;
}

boutonAjouterCategorie.addEventListener("click", () => ouvrirFormCategorie(null));
document.getElementById("annuler-categorie").addEventListener("click", fermerFormCategorie);

formCategorie.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = categorieNom.value.trim();
  if (!nom) return;

  if (categorieEnModification) {
    const categorie = agenda.categories.find((c) => c.code === categorieEnModification);
    categorie.nom = nom;
    categorie.couleur = couleurChoisie;
  } else {
    // Un code unique, qui ne bouge plus même si on renomme
    agenda.categories.push({ code: `cat-${nouvelId()}`, nom: nom, couleur: couleurChoisie });
  }

  sauvegarderAgenda();
  fermerFormCategorie();
  rafraichirAgenda();
  montrerPetitMessage("C'est noté 🌱");
});

// Supprimer : ses tâches et événements passent dans la première catégorie qui reste
// (et « Annuler » remet tout comme avant)
function supprimerCategorie(categorie) {
  const autres = agenda.categories.filter((c) => c.code !== categorie.code);
  fermerFormCategorie();
  agirAvecAnnuler({
    tiroir: agenda,
    message: `Catégorie « ${categorie.nom} » supprimée`,
    action: () => {
      agenda.elements.forEach((el) => {
        if (el.categorie === categorie.code) el.categorie = autres[0].code;
      });
      agenda.categories = autres;
    },
    apres: () => {
      sauvegarderAgenda();
      rafraichirAgenda();
    },
  });
}
