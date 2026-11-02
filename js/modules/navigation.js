// =====================================================
// Navigation entre les écrans
// =====================================================

const onglets = document.querySelectorAll(".onglet");
const ecrans = document.querySelectorAll(".ecran");

// Affiche un écran (par son id) et allume le bon onglet
function afficherEcran(idEcran) {
  ecrans.forEach((e) => e.classList.remove("actif"));
  const ecran = document.getElementById(idEcran);
  ecran.classList.add("actif");

  // Certains écrans n'ont pas d'onglet à eux (ex. : Budget).
  // Leur data-parent dit quel onglet allumer (ex. : Foyer).
  const idOnglet = ecran.dataset.parent || idEcran;
  onglets.forEach((o) => {
    o.classList.toggle("actif", o.dataset.ecran === idOnglet);
  });

  // On remonte en haut de la page
  window.scrollTo(0, 0);
}

// Tout bouton qui a un data-ecran mène à cet écran :
// les onglets du bas, mais aussi la carte Budget, le bouton retour…
document.querySelectorAll("[data-ecran]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    afficherEcran(bouton.dataset.ecran);
  });
});
