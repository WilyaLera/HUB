// Les outils de dates, partagés par tous les modules.
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
  return new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate(),
  );
}
