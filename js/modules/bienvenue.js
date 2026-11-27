// =====================================================
// La bienvenue : le tout premier lancement (environ 2 minutes)
//   0. Bienvenue           C'est parti, ou Juste regarder d'abord
//   1. Ton prénom et l'ambiance (le thème change en direct)
//   2. Ta petite famille (facultatif)
//   3. Qu'est-ce qui t'aiderait ? (les modules)
//   4. Le foyer partagé (seulement avec un·e conjoint·e ou un coloc)
//   5. Ton coin est prêt : une première petite chose, ou rien
//   Chaque étape a « Plus tard ». Tout se change ensuite dans les Réglages.
//   Tiroir « bienvenue » : { etat: "a-faire" | "regarde" | "fait" }  (créé dans stockage.js)
// =====================================================

let bienvenue = charger("bienvenue", { etat: "fait" });
const ecranBienvenue = document.getElementById("bienvenue");
let etapeBienvenue = 0;
// Les modules choisis pendant la bienvenue (rien de coché au départ : on choisit)
const choixModules = new Set();
let carnetDeDepart = true;

const ETAPES_BIENVENUE = ["accueil", "prenom", "famille", "modules", "partage", "pret"];

function ouvrirBienvenue() {
  etapeBienvenue = 0;
  // Relancée depuis les Réglages : on part de tes modules actuels
  if (bienvenue.etat !== "a-faire") {
    choixModules.clear();
    MODULES.filter((m) => moduleActif(m.code)).forEach((m) => choixModules.add(m.code));
    carnetDeDepart = false;
  }
  ecranBienvenue.hidden = false;
  document.body.classList.add("en-bienvenue");
  afficherBienvenue();
}

function etapesVisibles() {
  // Le foyer partagé seulement s'il y a quelqu'un avec qui partager
  return ETAPES_BIENVENUE.filter((e) => e !== "partage" || foyerAPartager());
}

function allerA(etape) {
  etapeBienvenue = etapesVisibles().indexOf(etape);
  afficherBienvenue();
}

function etapeSuivante() {
  etapeBienvenue = Math.min(etapeBienvenue + 1, etapesVisibles().length - 1);
  afficherBienvenue();
}

// Petits morceaux d'écran
function titreBienvenue(texte) {
  const h = document.createElement("h1");
  h.textContent = texte;
  return h;
}
function texteBienvenue(texte, petit) {
  const p = document.createElement("p");
  p.classList.add("sous-titre");
  if (petit) p.classList.add("petit");
  p.textContent = texte;
  return p;
}
function boutonsBienvenue(principal, quandPrincipal, secondaire, quandSecondaire) {
  const zone = document.createElement("div");
  zone.classList.add("bienvenue-boutons");
  const b1 = document.createElement("button");
  b1.type = "button";
  b1.classList.add("bouton", "bouton-large");
  b1.textContent = principal;
  b1.addEventListener("click", quandPrincipal);
  zone.appendChild(b1);
  if (secondaire) {
    const b2 = document.createElement("button");
    b2.type = "button";
    b2.classList.add("lien", "bienvenue-plus-tard");
    b2.textContent = secondaire;
    b2.addEventListener("click", quandSecondaire);
    zone.appendChild(b2);
  }
  return zone;
}

function afficherBienvenue() {
  const etapes = etapesVisibles();
  const etape = etapes[etapeBienvenue];
  const zone = document.getElementById("bienvenue-contenu");
  zone.replaceChildren();

  // Le fil : des petits points, sans pression
  const fil = document.getElementById("bienvenue-fil");
  fil.replaceChildren();
  fil.hidden = etape === "accueil";
  etapes.slice(1).forEach((e, i) => {
    const point = document.createElement("span");
    point.classList.add("fil-point");
    point.classList.toggle("fil-fait", i + 1 < etapeBienvenue);
    point.classList.toggle("fil-actuel", i + 1 === etapeBienvenue);
    fil.appendChild(point);
  });

  if (etape === "accueil") {
    const feuille = document.createElement("div");
    feuille.classList.add("bienvenue-feuille");
    feuille.appendChild(creerIcone("sprout"));
    zone.append(
      feuille,
      titreBienvenue("Bienvenue"),
      texteBienvenue("Un petit coin pour organiser ta vie, à ton rythme. Pas besoin de tout remplir."),
      boutonsBienvenue("C'est parti", etapeSuivante, "Juste regarder d'abord", afficherRegarder),
    );
  }

  if (etape === "prenom") {
    const champ = document.createElement("input");
    champ.type = "text";
    champ.classList.add("champ-note", "bienvenue-champ");
    champ.placeholder = "Ton prénom";
    champ.maxLength = 30;
    champ.value = charger("prenom", "");
    const ambiance = document.createElement("div");
    ambiance.classList.add("choix-refaire", "bienvenue-ambiances");
    [["", "Terracotta"], ["lagon", "Lagon"], ["lavande", "Lavande"]].forEach(([code, nom]) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.classList.add("pastille-temps", `ambiance-${code || "terracotta"}`);
      bouton.classList.toggle("choisie", apparence.theme === code);
      bouton.textContent = nom;
      bouton.addEventListener("click", () => {
        apparence.theme = code; // moi.js : l'écran change de couleur tout de suite
        enregistrerApparence();
        document.querySelectorAll('input[name="theme"]').forEach((r) => (r.checked = r.value === code));
        afficherBienvenue();
      });
      ambiance.appendChild(bouton);
    });
    const enregistrerPrenom = () => {
      const prenom = champ.value.trim();
      sauvegarder("prenom", prenom);
      document.getElementById("champ-prenom").value = prenom;
    };
    // Gardé à chaque lettre : changer d'ambiance ne fait pas perdre le prénom
    champ.addEventListener("input", enregistrerPrenom);
    zone.append(
      titreBienvenue("Comment tu t'appelles ?"),
      champ,
      texteBienvenue("Et l'ambiance qui te plaît (le mode sombre suit ton téléphone) :", true),
      ambiance,
      boutonsBienvenue("Continuer", () => {
        enregistrerPrenom();
        etapeSuivante();
      }, "Plus tard", etapeSuivante),
    );
    setTimeout(() => champ.focus(), 50);
  }

  if (etape === "famille") {
    const liste = document.createElement("div");
    liste.classList.add("liste-reserve");
    liste.dataset.listeFamille = "";
    afficherFamille(liste);
    zone.append(
      titreBienvenue("Ta petite famille"),
      texteBienvenue("Conjoint·e, coloc, enfant, proche, chat, chien… Facultatif : ça sert juste à adapter le hub.", true),
      liste,
      creerFormMembre(),
      boutonsBienvenue(
        famille.personnes.length + famille.animaux.length ? "Continuer" : "Juste moi pour l'instant",
        etapeSuivante,
      ),
    );
  }

  if (etape === "modules") {
    const liste = document.createElement("div");
    const conseil = texteBienvenue("", true);
    conseil.classList.add("bienvenue-conseil");
    const majConseil = () => {
      const n = choixModules.size;
      conseil.textContent =
        n === 0 ? "Choisis 2 ou 3 choses pour commencer." : n <= 3 ? "Parfait pour commencer 🌱" : "Vas-y doucement, rien ne presse : tu pourras en ajouter plus tard.";
    };
    MODULES.forEach((m) => {
      const ligne = document.createElement("label");
      ligne.classList.add("ligne-module");
      const icone = document.createElement("span");
      icone.classList.add("ligne-module-icone");
      icone.appendChild(creerIcone(m.icone));
      const texte = document.createElement("span");
      texte.classList.add("ligne-module-texte");
      const nom = document.createElement("strong");
      nom.textContent = m.nom;
      const detail = document.createElement("span");
      detail.classList.add("sous-titre", "petit");
      detail.textContent = m.detail;
      texte.append(nom, detail);
      const caseACocher = document.createElement("input");
      caseACocher.type = "checkbox";
      caseACocher.classList.add("interrupteur");
      caseACocher.checked = choixModules.has(m.code);
      caseACocher.setAttribute("aria-label", m.nom);
      caseACocher.addEventListener("change", () => {
        if (caseACocher.checked) choixModules.add(m.code);
        else choixModules.delete(m.code);
        majConseil();
        optionCarnet.hidden = !choixModules.has("repas");
      });
      ligne.append(icone, texte, caseACocher);
      liste.appendChild(ligne);
    });
    // Repas : proposer un carnet de départ (sans les notes ni les avis de quelqu'un d'autre)
    const optionCarnet = document.createElement("label");
    optionCarnet.classList.add("case-repas", "bienvenue-option");
    const caseCarnet = document.createElement("input");
    caseCarnet.type = "checkbox";
    caseCarnet.checked = carnetDeDepart;
    caseCarnet.addEventListener("change", () => (carnetDeDepart = caseCarnet.checked));
    optionCarnet.append(caseCarnet, "Repas : commencer avec un carnet de 143 recettes, que tu pourras modifier ou vider");
    optionCarnet.hidden = !choixModules.has("repas");
    majConseil();
    zone.append(
      titreBienvenue("Qu'est-ce qui t'aiderait ?"),
      texteBienvenue("L'Agenda est toujours là. Les autres restent rangés, et s'ajoutent d'un tap quand tu veux.", true),
      conseil,
      liste,
      optionCarnet,
      boutonsBienvenue("Continuer", etapeSuivante, "Plus tard (je garde tout)", () => {
        MODULES.forEach((m) => choixModules.add(m.code));
        etapeSuivante();
      }),
    );
  }

  if (etape === "partage") {
    const pastilles = document.createElement("div");
    pastilles.classList.add("choix-refaire");
    [["courses", "Courses"], ["repas", "Menus"], ["placard", "Placard"], ["budget", "Budget commun"], ["agenda", "Agenda"]].forEach(([code, nom]) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.classList.add("pastille-temps");
      bouton.classList.toggle("choisie", famille.partage.includes(code));
      bouton.textContent = nom;
      bouton.addEventListener("click", () => {
        famille.partage = famille.partage.includes(code) ? famille.partage.filter((c) => c !== code) : [...famille.partage, code];
        sauvegarderFamille();
        afficherBienvenue();
      });
      pastilles.appendChild(bouton);
    });
    const avec = famille.personnes.filter((p) => p.type === "conjoint" || p.type === "coloc").map((p) => p.nom).join(", ");
    zone.append(
      titreBienvenue("Partager le foyer ?"),
      texteBienvenue(`Avec ${avec}, qu'est-ce que vous aimeriez partager ?`),
      pastilles,
      texteBienvenue("Tes choix sont gardés. L'invitation partira avec la version en ligne du hub : chacun aura alors son compte.", true),
      boutonsBienvenue("Continuer", etapeSuivante, "Plus tard", etapeSuivante),
    );
  }

  if (etape === "pret") {
    const actifs = choixModules.size ? choixModules : new Set(MODULES.map((m) => m.code));
    const idees = [
      ["agenda", "Noter un rendez-vous", "calendar-plus"],
      ["repas", "Choisir le repas de ce soir", "cooking-pot"],
      ["budget", "Créer mes bocaux", "wallet"],
      ["courses", "Commencer ma liste de courses", "shopping-basket"],
      ["placard", "Faire le tour du placard", "archive"],
      ["notes", "Écrire une note", "sticky-note"],
      ["envies", "Noter une envie", "gift"],
      ["soin", "Ouvrir mon coin douceur", "flower-2"],
      ["atelier", "Noter un loisir à tester", "palette"],
    ].filter(([code]) => code === "agenda" || actifs.has(code));
    const liste = document.createElement("div");
    liste.classList.add("choix-besoins");
    idees.slice(0, 3).forEach(([code, texte, icone]) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.classList.add("choix-changement");
      bouton.append(creerIcone(icone), texte);
      bouton.addEventListener("click", () => terminerBienvenue("fait", code));
      liste.appendChild(bouton);
    });
    const prenom = charger("prenom", "");
    zone.append(
      titreBienvenue(prenom ? `Ton coin est prêt, ${prenom}` : "Ton coin est prêt"),
      texteBienvenue("Une première petite chose ?"),
      liste,
      boutonsBienvenue("Rien pour l'instant, juste découvrir", () => terminerBienvenue("fait", null)),
    );
  }
}

// « Juste regarder d'abord » : on explore, et une carte attend sur l'accueil
function afficherRegarder() {
  const zone = document.getElementById("bienvenue-contenu");
  zone.replaceChildren();
  document.getElementById("bienvenue-fil").hidden = true;
  zone.append(
    titreBienvenue("Fais comme chez toi"),
    texteBienvenue("Promène-toi, touche à tout. Une carte « Finir de m'installer » t'attend sur l'accueil, pour plus tard."),
    boutonsBienvenue("Découvrir", () => terminerBienvenue("regarde", null)),
  );
}

// Enregistrer les choix, puis relancer le hub proprement (et faire la petite chose choisie)
function terminerBienvenue(etat, premiereChose) {
  if (etat === "fait" && choixModules.size) {
    MODULES.forEach((m) => (reglagesModules[m.code] = choixModules.has(m.code)));
    sauvegarder("modules", reglagesModules);
    if (choixModules.has("repas") && carnetDeDepart && repas.recettes.length === 0) importerCarnetDeDepart();
  }
  bienvenue.etat = etat;
  sauvegarder("bienvenue", bienvenue);
  if (premiereChose) sessionStorage.setItem("apres-bienvenue", premiereChose);
  location.reload();
}

// La petite chose choisie, juste après le rechargement
window.addEventListener("load", () => {
  const chose = sessionStorage.getItem("apres-bienvenue");
  if (!chose) return;
  sessionStorage.removeItem("apres-bienvenue");
  const actions = {
    agenda: () => ouvrirFeuilleElement(null, { type: "evenement" }),
    repas: () => {
      afficherEcran("repas");
      ouvrirFeuilleJourRepas(aujourdhuiEnTexte(), "soir");
    },
    budget: () => afficherEcran("budget"),
    courses: () => {
      afficherEcran("courses");
      document.getElementById("article-nom").focus();
    },
    placard: () => afficherEcran("placard"),
    notes: () => {
      afficherEcran("notes");
      ouvrirNote(nouvelleNote().id);
    },
    envies: () => afficherEcran("envies"),
    soin: () => afficherEcran("soin"),
    atelier: () => afficherEcran("atelier"),
  };
  if (actions[chose]) actions[chose]();
});

// La carte « Finir de m'installer » et le bouton « Relancer la bienvenue »
document.getElementById("carte-installation").hidden = bienvenue.etat !== "regarde";
document.getElementById("finir-installation").addEventListener("click", ouvrirBienvenue);
document.getElementById("relancer-bienvenue").addEventListener("click", ouvrirBienvenue);

if (bienvenue.etat === "a-faire") ouvrirBienvenue();
