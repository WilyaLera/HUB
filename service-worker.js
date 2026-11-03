// =====================================================
// Le « service worker » : un petit assistant qui vit dans le téléphone.
// Il garde une copie des fichiers de l'appli, pour qu'elle s'ouvre
// même sans réseau (dans l'avion, en zone blanche…).
//
// ⚠️ À chaque nouvelle version de l'appli, change le numéro ci-dessous
// (comme les ?v= dans index.html) : l'assistant saura qu'il doit se mettre à jour.
// =====================================================

const VERSION = "mon-hub-v14";

// Installation : rien à préparer, on prendra les fichiers au fil de l'eau
self.addEventListener("install", () => {
  self.skipWaiting(); // la nouvelle version prend la main tout de suite
});

// Activation : on jette les vieilles copies des versions d'avant
self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((nom) => nom !== VERSION).map((nom) => caches.delete(nom))),
    ),
  );
  self.clients.claim();
});

// À chaque fichier demandé par l'appli
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  // La page elle-même : d'abord le réseau (pour avoir la dernière version),
  // la copie seulement si on est hors ligne
  if (requete.mode === "navigate") {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put(requete, copie));
          return reponse;
        })
        .catch(() => caches.match(requete).then((r) => r || caches.match("./"))),
    );
    return;
  }

  // Le reste (CSS, JS, icônes, polices) : la copie tout de suite si on l'a,
  // et on va chercher une version fraîche en arrière-plan pour la prochaine fois
  evenement.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(requete).then((copie) => {
        const frais = fetch(requete)
          .then((reponse) => {
            if (reponse.ok || reponse.type === "opaque") cache.put(requete, reponse.clone());
            return reponse;
          })
          .catch(() => copie);
        return copie || frais;
      }),
    ),
  );
});
