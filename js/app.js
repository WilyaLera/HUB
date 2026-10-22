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

lucide.createIcons();
