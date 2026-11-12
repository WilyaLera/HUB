// =====================================================
// Démarrage de l'appli
// Chaque module a son propre fichier dans js/modules/.
// Ici, on ne garde que ce qui doit se faire à la toute fin,
// quand TOUS les fichiers sont chargés.
// =====================================================

// L'appli installable : on lance le petit assistant hors ligne
// (en premier, pour qu'il démarre même si autre chose coince plus bas)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

// On demande au navigateur de ne JAMAIS vider notre tiroir tout seul
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}

// Le Budget est réparti sur plusieurs fichiers : on le dessine une fois qu'ils sont là
afficherBudget();

// L'Agenda, et la carte « Aujourd'hui » de l'Accueil
afficherAgenda();
afficherReglagesAgenda();
afficherCarteAujourdhui();

// Dessine toutes les icônes Lucide (en dernier, quand tout le HTML est prêt).
// Le « if » : si Lucide n'a pas pu se charger (pas de réseau), on n'insiste pas
if (window.lucide) {
  lucide.createIcons();
}
