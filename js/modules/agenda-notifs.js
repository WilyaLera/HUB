// =====================================================
// Module Agenda — partie 5 : le petit résumé du jour (notification)
//
// Une appli web ne peut pas sonner à une heure précise quand elle est
// fermée (il faudrait un serveur). Mais Chrome sur Android, appli installée,
// réveille de temps en temps le « service worker » : on en profite pour
// envoyer un résumé doux, une fois par jour.
//
// Le service worker ne sait pas lire le localStorage : on lui prépare donc
// un petit résumé des 14 prochains jours, rangé dans le « cache ».
// =====================================================

const NOM_CACHE_RESUME = "hub-resume";
const caseResume = document.getElementById("reglage-resume");
const etatResume = document.getElementById("etat-resume");

// Le résumé d'un jour : ses rendez-vous (heure + titre) et son nombre de tâches
function resumeDuJour(dateTexte) {
  return {
    evenements: evenementsDuJour(dateTexte).map((ev) => ({
      heure: ev.heure,
      titre: titreAffiche(ev, dateTexte),
    })),
    taches: tachesDuJour(dateTexte).filter((t) => !estFait(t, dateTexte)).length,
  };
}

// Range le résumé des 14 prochains jours là où le service worker peut le lire
function preparerResume() {
  if (!agenda.resumeNotif || !("caches" in window)) return;
  const jours = {};
  for (let i = 0; i < 14; i++) {
    const date = ajouterJours(aujourdhuiEnTexte(), i);
    jours[date] = resumeDuJour(date);
  }
  caches
    .open(NOM_CACHE_RESUME)
    .then((cache) => cache.put("resume.json", new Response(JSON.stringify(jours))))
    .catch(() => {}); // pas grave : on réessaiera à la prochaine modification
}

// Le texte de la notification (le même que celui du service worker)
function texteResume(jour) {
  const morceaux = jour.evenements
    .slice(0, 3)
    .map((ev) => (ev.heure ? `${ev.heure} ${ev.titre}` : ev.titre));
  if (jour.taches === 1) morceaux.push("1 tâche");
  if (jour.taches > 1) morceaux.push(`${jour.taches} tâches`);
  return morceaux.length ? morceaux.join(" · ") : "Rien de prévu. Profite 🌸";
}

function direEtat(texte) {
  etatResume.textContent = texte;
}

async function activerResume() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    direEtat("Ce navigateur ne sait pas envoyer de notifications.");
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    direEtat("Les notifications sont bloquées. Tu peux les autoriser dans les réglages du navigateur.");
    return false;
  }

  const sw = await navigator.serviceWorker.ready;
  agenda.resumeNotif = true;
  sauvegarderAgenda();
  preparerResume();

  // Un premier résumé tout de suite, pour voir à quoi ça ressemble
  sw.showNotification("Aujourd'hui", {
    body: texteResume(resumeDuJour(aujourdhuiEnTexte())),
    icon: "image/icone-192.png",
    tag: "resume-du-jour",
  }).catch(() => {}); // si le téléphone refuse, pas de souci

  // Le réveil automatique (Chrome sur Android, appli installée)
  if ("periodicSync" in sw) {
    try {
      await sw.periodicSync.register("resume-du-jour", { minInterval: 12 * 60 * 60 * 1000 });
      direEtat("C'est activé 🌱 Un petit résumé arrivera une fois par jour (c'est Chrome qui choisit l'heure exacte).");
      return true;
    } catch (erreur) {
      direEtat("Notifications autorisées, mais Chrome refuse le réveil automatique : installe l'appli sur l'écran d'accueil, puis réessaie.");
      return true;
    }
  }
  direEtat("Notifications autorisées, mais ce navigateur ne sait pas se réveiller tout seul (il faut Chrome sur Android, appli installée).");
  return true;
}

async function desactiverResume() {
  agenda.resumeNotif = false;
  sauvegarderAgenda();
  direEtat("");
  if ("serviceWorker" in navigator) {
    const sw = await navigator.serviceWorker.ready;
    if ("periodicSync" in sw) sw.periodicSync.unregister("resume-du-jour").catch(() => {});
  }
}

caseResume.addEventListener("change", async () => {
  if (caseResume.checked) {
    const ok = await activerResume();
    if (!ok) caseResume.checked = false;
  } else {
    desactiverResume();
  }
});

caseResume.checked = Boolean(agenda.resumeNotif);
preparerResume();
