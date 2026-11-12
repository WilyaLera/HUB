// =====================================================
// Le « service worker » : un petit assistant qui vit dans le téléphone.
// Il garde une copie des fichiers de l'appli, pour qu'elle s'ouvre
// même sans réseau (dans l'avion, en zone blanche…).
//
// Sa règle : AVEC du réseau, toujours la version la plus récente.
// SANS réseau, la dernière copie gardée.
// Comme ça, une mise à jour ne mélange jamais l'ancien et le nouveau code.
// =====================================================

const VERSION = "mon-hub-v19";

// Installation : la nouvelle version prend la main tout de suite
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activation : on jette les vieilles copies des versions d'avant
self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(
          noms.filter((nom) => nom !== VERSION).map((nom) => caches.delete(nom)),
        ),
      ),
  );
  self.clients.claim();
});

// À chaque fichier demandé par l'appli : d'abord le réseau, la copie en secours
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        // On garde une copie fraîche pour la prochaine fois sans réseau
        if (reponse.ok || reponse.type === "opaque") {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      // Pas de réseau : la dernière copie gardée (ou la page d'accueil)
      .catch(() =>
        caches
          .match(requete)
          .then((copie) => copie || caches.match("./")),
      ),
  );
});
