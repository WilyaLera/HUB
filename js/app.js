const onglets = document.querySelectorAll(".onglet");
const ecrans = document.querySelectorAll(".ecran");
console.log(onglets);

onglets.forEach((onglet) => {
  onglet.addEventListener("click", () => {
    onglets.forEach((o) => o.classList.remove("actif"));
    onglet.classList.add("actif");
    ecrans.forEach((e) => e.classList.remove("actif"));
    document.getElementById(onglet.dataset.ecran).classList.add("actif");
  });
});

const aujourdhui = new Date();
const dateEnLettre = aujourdhui.toLocaleDateString("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
document.getElementById("date-du-jour").textContent = dateEnLettre;

const heure = new Date().getHours();
let message = "Bonjour";
if (heure >= 18) {
  message = "Bonsoir";
} else if (heure >= 12) {
  message = "Bon après-midi";
}
const prenom = charger("prenom", "");
let texte = message;
if (prenom) {
  texte = `${message}, ${prenom} `;
}
document.getElementById("salutation").textContent = texte;

// Carte menu //
const menu = [
  { moment: "Midi", plat: "Salade de lentilles" },
  { moment: "Soir", plat: "Curry de légumes" },
  { moment: "Goûter", plat: "Banane" },
];
const listeMenu = document.getElementById("liste-menu");

menu.forEach((repas) => {
  const ligne = document.createElement("p");

  const moment = document.createElement("strong");
  moment.textContent = repas.moment;

  ligne.appendChild(moment);
  ligne.append(` · ${repas.plat}`);
  listeMenu.appendChild(ligne);
});

//Carte Aujourd'hui //
const tachesParDefaut = [
  { id: 1, titre: "Arroser la plante", fait: false },
  { id: 2, titre: "Appeler le garage", fait: false },
  { id: 3, titre: "Lancer une machine", fait: true },
];

const taches = charger("taches", tachesParDefaut);

const listeTaches = document.getElementById("liste-taches");

function afficherTache(tache) {
  const ligne = document.createElement("label");
  ligne.classList.add("tache");

  const caseACocher = document.createElement("input");
  caseACocher.type = "checkbox";
  caseACocher.checked = tache.fait;

  caseACocher.addEventListener("change", () => {
    tache.fait = caseACocher.checked;
    sauvegarder("taches", taches);
  });

  ligne.appendChild(caseACocher);
  ligne.append(tache.titre);
  listeTaches.appendChild(ligne);
}
taches.forEach(afficherTache);

const formTache = document.getElementById("form-tache");
const champTache = document.getElementById("champ-tache");

formTache.addEventListener("submit", (evenement) => {
  evenement.preventDefault();

  const titre = champTache.value.trim();
  if (!titre) return;

  const nouvelle = { id: Date.now(), titre: titre, fait: false };
  taches.push(nouvelle);
  sauvegarder("taches", taches);
  afficherTache(nouvelle);

  champTache.value = "";
});

//Carte Budget//
const budgetDuMois = 120000;
const depenses = [
  { libelle: "Courses", montant: 45000 },
  { libelle: "Loisirs", montant: 18500 },
  { libelle: "Essence", montant: 8000 },
];

let totalDepense = 0;
depenses.forEach((depense) => {
  totalDepense = totalDepense + depense.montant;
});

const reste = budgetDuMois - totalDepense;

document.getElementById("montant-reste").textContent =
  `${reste.toLocaleString("fr-FR")} F`;

const dernierJour = new Date(
  aujourdhui.getFullYear(),
  aujourdhui.getMonth() + 1,
  0,
).getDate();

const joursRestants = dernierJour - aujourdhui.getDate();

document.getElementById("jours-restants").textContent =
  `${joursRestants} jours restants`;

lucide.createIcons();
