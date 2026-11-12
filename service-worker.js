// =====================================================
// Le « service worker » : un petit assistant qui vit dans le téléphone.
// Il garde une copie des fichiers de l'appli, pour qu'elle s'ouvre
// même sans réseau (dans l'avion, en zone blanche…).
//
// Sa règle : AVEC du réseau, toujours la version la plus récente.
// SANS réseau, la dernière copie gardée.
// Comme ça, une mise à jour ne mélange jamais l'ancien et le nouveau code.
// =====================================================

const VERSION = "mon-hub-v23";
const CACHE_RESUME = "hub-resume"; // le résumé préparé par l'appli (agenda-notifs.js)

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
          noms
            .filter((nom) => nom !== VERSION && nom !== CACHE_RESUME)
            .map((nom) => caches.delete(nom)),
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

// =====================================================
// Le petit résumé du jour
// Chrome réveille le service worker de temps en temps (« periodicsync »).
// Une fois par jour au plus, on envoie un résumé doux.
// =====================================================

function dateEnTexteSW(date) {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function texteResumeSW(jour) {
  const morceaux = jour.evenements
    .slice(0, 3)
    .map((ev) => (ev.heure ? `${ev.heure} ${ev.titre}` : ev.titre));
  if (jour.taches === 1) morceaux.push("1 tâche");
  if (jour.taches > 1) morceaux.push(`${jour.taches} tâches`);
  return morceaux.length ? morceaux.join(" · ") : "Rien de prévu. Profite 🌸";
}

async function envoyerResume() {
  const maintenant = new Date();
  const heure = maintenant.getHours();
  // Pas la nuit : on ne réveille personne
  if (heure < 6 || heure >= 21) return;

  const cache = await caches.open(CACHE_RESUME);
  const aujourdhui = dateEnTexteSW(maintenant);
  const deja = await cache.match("dernier.txt");
  if (deja && (await deja.text()) === aujourdhui) return; // déjà fait aujourd'hui

  const reponse = await cache.match("resume.json");
  if (!reponse) return;
  const jours = await reponse.json();

  // Avant 17 h : la journée en cours. Après : demain.
  let titre = "Mon Hub · Aujourd'hui";
  let date = aujourdhui;
  if (heure >= 17) {
    const demain = new Date(maintenant);
    demain.setDate(demain.getDate() + 1);
    titre = "Mon Hub · Demain";
    date = dateEnTexteSW(demain);
  }
  const jour = jours[date];
  if (!jour) return;

  await self.registration.showNotification(titre, {
    body: texteResumeSW(jour),
    icon: "image/icone-192.png",
    badge: "image/badge-96.png",
    tag: "resume-du-jour",
  });
  await cache.put("dernier.txt", new Response(aujourdhui));
}

self.addEventListener("periodicsync", (evenement) => {
  if (evenement.tag === "resume-du-jour") evenement.waitUntil(envoyerResume());
});

// Toucher la notification ouvre l'appli
self.addEventListener("notificationclick", (evenement) => {
  evenement.notification.close();
  evenement.waitUntil(
    self.clients.matchAll({ type: "window" }).then((fenetres) => {
      if (fenetres.length > 0) return fenetres[0].focus();
      return self.clients.openWindow("./");
    }),
  );
});
