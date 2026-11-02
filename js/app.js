// =====================================================
// Démarrage de l'appli
// Chaque module a son propre fichier dans js/modules/.
// Ici, on ne garde que ce qui doit se faire à la toute fin,
// quand TOUS les fichiers sont chargés.
// =====================================================

// Le Budget est réparti sur 2 fichiers : on le dessine une fois qu'ils sont là
afficherBudget();

// Dessine toutes les icônes Lucide (en dernier, quand tout le HTML est prêt)
lucide.createIcons();
