// =====================================================
// Mes notes : retrouver une info facilement
//   1. le tiroir « notes »
//   2. la liste des notes (épinglées d'abord, recherche, archivées)
//   3. la feuille d'une note (texte ou liste à cocher, couleur, rendez-vous lié)
//   4. le lien avec l'agenda (dans la fiche d'un événement)
//   5. la carte de l'accueil : les notes de tes rendez-vous du jour
// =====================================================

// ---------- 1. Le tiroir « notes » ----------
// notes : [{ id, titre, type ("texte" | "liste"), texte, items: [{ id, texte, fait }],
//            couleur, epinglee, archivee, evenementId, creeLe, modifieLe }]

const COULEURS_NOTES = ["#F3E6DC", "#F1E1B8", "#DEE7CF", "#DCE8EF", "#EADDF0", "#F4D9D3"];

let carnetNotes = charger("notes", { notes: [] });

function sauvegarderNotes() {
  sauvegarder("notes", carnetNotes);
}

function noteDe(id) {
  return carnetNotes.notes.find((n) => n.id === id) || null;
}

function evenementDe(id) {
  return agenda.elements.find((e) => e.id === id) || null;
}

// « ven. 28 · 9 h 00 · Banque »
function texteEvenement(evenement) {
  const d = texteEnDate(evenement.date);
  const jour = `${["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][d.getDay()]} ${d.getDate()}`;
  return [jour, evenement.heure ? evenement.heure.replace(":", " h ") : "", evenement.titre].filter(Boolean).join(" · ");
}

// Un petit résumé : « 3 sur 5 cochées » ou le début du texte
function resumeNote(note) {
  if (note.type === "liste") {
    const faits = note.items.filter((i) => i.fait).length;
    if (note.items.length === 0) return "Liste vide";
    return faits === 0 ? `${note.items.length} à cocher` : `${faits} sur ${note.items.length} cochée${faits > 1 ? "s" : ""}`;
  }
  const texte = (note.texte || "").replace(/\s+/g, " ").trim();
  return texte ? (texte.length > 70 ? `${texte.slice(0, 70)}…` : texte) : "Note vide";
}

// ---------- 2. La liste ----------

let rechercheNotes = "";

document.getElementById("recherche-notes").addEventListener("input", (e) => {
  rechercheNotes = e.target.value.trim().toLowerCase();
  afficherNotes();
});

function noteVisible(note) {
  if (!rechercheNotes) return true;
  const contenu = [note.titre, note.texte, ...note.items.map((i) => i.texte)].join(" ").toLowerCase();
  return contenu.includes(rechercheNotes);
}

function creerCarteNote(note) {
  const carte = document.createElement("button");
  carte.type = "button";
  carte.classList.add("carte-note");
  carte.style.setProperty("--couleur-note", note.couleur || COULEURS_NOTES[0]);
  const haut = document.createElement("span");
  haut.classList.add("carte-note-haut");
  const titre = document.createElement("strong");
  titre.textContent = note.titre || "Sans titre";
  haut.appendChild(titre);
  if (note.epinglee) haut.appendChild(creerIcone("pin"));
  const resume = document.createElement("span");
  resume.classList.add("carte-note-resume");
  resume.textContent = resumeNote(note);
  carte.append(haut, resume);
  const evenement = note.evenementId ? evenementDe(note.evenementId) : null;
  if (evenement) {
    const lien = document.createElement("span");
    lien.classList.add("carte-note-lien");
    lien.append(creerIcone("calendar"), texteEvenement(evenement));
    carte.appendChild(lien);
  }
  carte.addEventListener("click", () => ouvrirNote(note.id));
  return carte;
}

function afficherNotes() {
  const zone = document.getElementById("liste-notes");
  zone.replaceChildren();
  const actives = carnetNotes.notes
    .filter((n) => !n.archivee && noteVisible(n))
    .sort((a, b) => Number(b.epinglee) - Number(a.epinglee) || (b.modifieLe || "").localeCompare(a.modifieLe || ""));
  if (actives.length === 0) {
    zone.appendChild(
      creerMessageVide(rechercheNotes ? "Aucune note ne correspond." : "Pas encore de note. Une liste de questions, un code, une idée : note-la ici 🌱"),
    );
  }
  actives.forEach((n) => zone.appendChild(creerCarteNote(n)));

  const archivees = carnetNotes.notes.filter((n) => n.archivee && noteVisible(n));
  const blocArchives = document.getElementById("notes-archivees");
  blocArchives.hidden = archivees.length === 0;
  document.getElementById("titre-notes-archivees").textContent = `Archivées · ${archivees.length}`;
  const listeArchives = document.getElementById("liste-notes-archivees");
  listeArchives.replaceChildren();
  archivees.forEach((n) => listeArchives.appendChild(creerCarteNote(n)));

  const total = carnetNotes.notes.filter((n) => !n.archivee).length;
  const texte = total ? `${total} note${total > 1 ? "s" : ""}` : "Tes notes, à portée de main";
  document.getElementById("notes-resume").textContent = texte;
  document.getElementById("compte-notes").textContent = total ? total : "";
  afficherCarteNotes();
}

// ---------- 3. La feuille d'une note ----------

const feuilleNote = document.getElementById("feuille-note");
let noteOuverte = null;

function nouvelleNote(valeurs = {}) {
  const maintenant = new Date().toISOString();
  const note = {
    id: String(nouvelId()),
    titre: "",
    type: "texte",
    texte: "",
    items: [],
    couleur: COULEURS_NOTES[carnetNotes.notes.length % COULEURS_NOTES.length],
    epinglee: false,
    archivee: false,
    evenementId: null,
    creeLe: maintenant,
    modifieLe: maintenant,
    ...valeurs,
  };
  carnetNotes.notes.push(note);
  sauvegarderNotes();
  return note;
}

function ouvrirNote(id) {
  noteOuverte = id;
  afficherFeuilleNote(true);
  feuilleNote.hidden = false;
  voile.hidden = false;
}

function fermerNote() {
  const note = noteDe(noteOuverte);
  // Une note créée puis laissée vide : on ne la garde pas
  if (note && !note.titre.trim() && !note.texte.trim() && note.items.length === 0) {
    carnetNotes.notes = carnetNotes.notes.filter((n) => n.id !== note.id);
    sauvegarderNotes();
  }
  feuilleNote.hidden = true;
  voile.hidden = true;
  noteOuverte = null;
  afficherNotes();
}
document.getElementById("fermer-note").addEventListener("click", fermerNote);
voile.addEventListener("click", () => {
  if (!feuilleNote.hidden) fermerNote();
});

function noteModifiee(note) {
  note.modifieLe = new Date().toISOString();
  sauvegarderNotes();
}

function afficherFeuilleNote(focusTitre) {
  const note = noteDe(noteOuverte);
  if (!note) return;
  feuilleNote.style.setProperty("--couleur-note", note.couleur);
  const zone = document.getElementById("note-contenu");
  zone.replaceChildren();

  // Le titre
  const titre = document.createElement("input");
  titre.type = "text";
  titre.classList.add("champ-note", "note-titre");
  titre.placeholder = "Titre (ex. Questions pour la banque)";
  titre.maxLength = 80;
  titre.value = note.titre;
  titre.addEventListener("input", () => {
    note.titre = titre.value;
    noteModifiee(note);
  });
  zone.appendChild(titre);

  // Texte libre ou liste à cocher
  const sorte = document.createElement("div");
  sorte.classList.add("choix-refaire");
  [["texte", "Texte"], ["liste", "Liste à cocher"]].forEach(([code, nom]) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille-temps");
    bouton.classList.toggle("choisie", note.type === code);
    bouton.textContent = nom;
    bouton.addEventListener("click", () => {
      if (note.type === code) return;
      // On garde ce qui est écrit : chaque ligne devient une case, et inversement
      if (code === "liste") {
        note.items = note.texte
          .split("\n")
          .map((l) => l.replace(/^[-•*]\s*/, "").trim())
          .filter(Boolean)
          .map((texte) => ({ id: String(nouvelId()) + Math.random().toString(36).slice(2, 6), texte, fait: false }));
      } else {
        note.texte = note.items.map((i) => `${i.fait ? "✓ " : ""}${i.texte}`).join("\n");
      }
      note.type = code;
      noteModifiee(note);
      afficherFeuilleNote();
    });
    sorte.appendChild(bouton);
  });
  zone.appendChild(sorte);

  if (note.type === "texte") {
    const texte = document.createElement("textarea");
    texte.classList.add("champ-note", "note-texte");
    texte.rows = 8;
    texte.placeholder = "Écris ce que tu veux retrouver…";
    texte.value = note.texte;
    texte.addEventListener("input", () => {
      note.texte = texte.value;
      noteModifiee(note);
    });
    zone.appendChild(texte);
  } else {
    zone.appendChild(creerListeNote(note));
  }

  // Le rendez-vous lié : la note remonte sur l'accueil ce jour-là
  const lien = document.createElement("label");
  lien.classList.add("champ", "note-lien");
  lien.append(creerIcone("calendar"), "Pour un rendez-vous");
  const choix = document.createElement("select");
  choix.classList.add("champ-note");
  const aucun = document.createElement("option");
  aucun.value = "";
  aucun.textContent = "Aucun";
  choix.appendChild(aucun);
  const hier = ajouterJours(aujourdhuiEnTexte(), -1);
  const limite = ajouterJours(aujourdhuiEnTexte(), 120);
  agenda.elements
    .filter((e) => e.type === "evenement" && e.date && ((e.date >= hier && e.date <= limite) || e.id === note.evenementId))
    .sort((a, b) => `${a.date}${a.heure}`.localeCompare(`${b.date}${b.heure}`))
    .forEach((e) => {
      const option = document.createElement("option");
      option.value = String(e.id);
      option.textContent = texteEvenement(e);
      choix.appendChild(option);
    });
  choix.value = note.evenementId ? String(note.evenementId) : "";
  choix.addEventListener("change", () => {
    const evenement = agenda.elements.find((e) => String(e.id) === choix.value);
    note.evenementId = evenement ? evenement.id : null;
    noteModifiee(note);
    if (evenement) montrerPetitMessage("Elle remontera sur ton accueil ce jour-là 🌱");
  });
  lien.appendChild(choix);
  zone.appendChild(lien);

  // La couleur
  const couleurs = document.createElement("div");
  couleurs.classList.add("couleurs-rangement");
  COULEURS_NOTES.forEach((couleur) => {
    const pastille = document.createElement("button");
    pastille.type = "button";
    pastille.classList.add("pastille-couleur");
    pastille.classList.toggle("choisie", note.couleur === couleur);
    pastille.style.background = couleur;
    pastille.setAttribute("aria-label", "Choisir cette couleur");
    pastille.addEventListener("click", () => {
      note.couleur = couleur;
      noteModifiee(note);
      afficherFeuilleNote();
    });
    couleurs.appendChild(pastille);
  });
  zone.appendChild(couleurs);

  // Épingler, archiver, supprimer
  const actions = document.createElement("div");
  actions.classList.add("envie-boutons");
  actions.append(
    creerBoutonEnvie(note.epinglee ? "Désépingler" : "Épingler en haut", () => {
      note.epinglee = !note.epinglee;
      noteModifiee(note);
      afficherFeuilleNote();
    }),
    creerBoutonEnvie(note.archivee ? "Sortir des archives" : "Archiver", () => {
      note.archivee = !note.archivee;
      noteModifiee(note);
      montrerPetitMessage(note.archivee ? "Rangée dans les archives" : "De retour dans tes notes");
      fermerNote();
    }),
  );
  zone.appendChild(actions);
  const supprimer = document.createElement("button");
  supprimer.type = "button";
  supprimer.classList.add("lien", "lien-vider-repas");
  supprimer.textContent = "Supprimer cette note";
  supprimer.addEventListener("click", () => {
    const id = note.id;
    feuilleNote.hidden = true;
    voile.hidden = true;
    noteOuverte = null;
    agirAvecAnnuler({
      tiroir: carnetNotes,
      message: `« ${note.titre || "Note"} » supprimée`,
      action: () => {
        carnetNotes.notes = carnetNotes.notes.filter((n) => n.id !== id);
      },
      apres: () => {
        sauvegarderNotes();
        afficherNotes();
      },
    });
  });
  zone.appendChild(supprimer);

  if (focusTitre && !note.titre) titre.focus();
}

// Une liste à cocher : cocher, renommer, retirer, ajouter ; ce qui reste peut partir au pense-bête
function creerListeNote(note) {
  const bloc = document.createElement("div");
  bloc.classList.add("liste-note");
  note.items.forEach((item) => {
    const ligne = document.createElement("div");
    ligne.classList.add("ligne-note");
    const caseACocher = document.createElement("input");
    caseACocher.type = "checkbox";
    caseACocher.checked = item.fait;
    caseACocher.setAttribute("aria-label", `${item.texte} : fait`);
    caseACocher.addEventListener("change", () => {
      item.fait = caseACocher.checked;
      noteModifiee(note);
      afficherFeuilleNote(); // pour proposer « au pense-bête » dès qu'une ligne est cochée
    });
    const texte = document.createElement("input");
    texte.type = "text";
    texte.value = item.texte;
    texte.maxLength = 140;
    texte.setAttribute("aria-label", "Modifier cette ligne");
    texte.addEventListener("change", () => {
      item.texte = texte.value.trim() || item.texte;
      noteModifiee(note);
    });
    const retirer = document.createElement("button");
    retirer.type = "button";
    retirer.classList.add("bouton-supprimer");
    retirer.setAttribute("aria-label", `Retirer ${item.texte}`);
    retirer.appendChild(creerIcone("x"));
    retirer.addEventListener("click", () => {
      note.items = note.items.filter((i) => i.id !== item.id);
      noteModifiee(note);
      afficherFeuilleNote();
    });
    ligne.classList.toggle("ligne-note-faite", item.fait);
    ligne.append(caseACocher, texte, retirer);
    bloc.appendChild(ligne);
  });

  const form = document.createElement("form");
  form.classList.add("form-article-ligne", "form-placard");
  const champ = document.createElement("input");
  champ.type = "text";
  champ.classList.add("champ-note");
  champ.placeholder = "Ajouter une ligne (Entrée pour enchaîner)";
  champ.maxLength = 140;
  const ajouter = document.createElement("button");
  ajouter.type = "submit";
  ajouter.classList.add("bouton-rond", "bouton-rond-plein");
  ajouter.setAttribute("aria-label", "Ajouter cette ligne");
  ajouter.appendChild(creerIcone("plus"));
  form.append(champ, ajouter);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const texte = champ.value.trim();
    if (!texte) return;
    note.items.push({ id: String(nouvelId()) + Math.random().toString(36).slice(2, 6), texte, fait: false });
    noteModifiee(note);
    afficherFeuilleNote();
    const nouveauChamp = document.querySelector("#note-contenu .liste-note form input");
    if (nouveauChamp) nouveauChamp.focus();
  });
  bloc.appendChild(form);

  // Après le rendez-vous : ce qui n'est pas coché part au pense-bête, pour ne pas le perdre
  const restants = note.items.filter((i) => !i.fait);
  if (restants.length && note.items.some((i) => i.fait)) {
    const versPenseBete = creerBoutonEnvie(`Mettre les ${restants.length} restante${restants.length > 1 ? "s" : ""} au pense-bête`, () => {
      restants.forEach((i) =>
        agenda.elements.push({
          id: nouvelId() + Math.floor(Math.random() * 1000),
          type: "tache",
          titre: i.texte,
          date: "",
          heure: "",
          categorie: agenda.categories[0].code,
          urgent: false,
          dateLimite: "",
          recurrence: "",
          finRepetition: "",
          anniversaire: false,
          anneeNaissance: "",
          fait: false,
        }),
      );
      sauvegarderAgenda();
      rafraichirAgenda();
      montrerPetitMessage("C'est dans ton pense-bête 🌱");
    });
    bloc.appendChild(versPenseBete);
  }
  return bloc;
}

document.getElementById("nouvelle-note").addEventListener("click", () => ouvrirNote(nouvelleNote().id));
document.getElementById("plus-note").addEventListener("click", () => {
  fermerMenuPlus(); // agenda-feuille.js
  afficherEcran("notes");
  ouvrirNote(nouvelleNote().id);
});

// ---------- 4. Le lien avec l'agenda ----------
// Dans la fiche d'un événement : ses notes, et « Ajouter une note »

function afficherNotesDeLEvenement(element) {
  const zone = document.getElementById("notes-evenement");
  zone.replaceChildren();
  if (!element || element.type !== "evenement") return;
  const liees = carnetNotes.notes.filter((n) => n.evenementId === element.id && !n.archivee);
  liees.forEach((note) => {
    const bouton = creerBoutonEnvie(`Note : ${note.titre || "Sans titre"}`, () => {
      fermerFeuilleElement(); // agenda-feuille.js
      ouvrirNote(note.id);
    });
    zone.appendChild(bouton);
  });
  zone.appendChild(
    creerBoutonEnvie(liees.length ? "Une autre note" : "Ajouter une note (questions, liste…)", () => {
      fermerFeuilleElement();
      ouvrirNote(nouvelleNote({ evenementId: element.id, titre: element.titre, type: "liste" }).id);
    }),
  );
}

// ---------- 5. La carte de l'accueil ----------

function afficherCarteNotes() {
  const carte = document.querySelector('[data-carte="notes"]');
  if (!carte) return;
  const zone = document.getElementById("accueil-notes");
  zone.replaceChildren();
  const aujourdhui = aujourdhuiEnTexte();
  const duJour = carnetNotes.notes
    .filter((n) => !n.archivee && n.evenementId)
    .map((n) => ({ note: n, evenement: evenementDe(n.evenementId) }))
    .filter((x) => x.evenement && x.evenement.date === aujourdhui);
  carte.dataset.vide = duJour.length === 0 ? "true" : "false";
  duJour.forEach(({ note, evenement }) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("carte-note", "carte-note-accueil");
    bouton.style.setProperty("--couleur-note", note.couleur);
    const haut = document.createElement("strong");
    haut.textContent = note.titre || "Note";
    const detail = document.createElement("span");
    detail.classList.add("carte-note-resume");
    detail.textContent = `${evenement.heure ? `${evenement.heure.replace(":", " h ")} · ` : ""}${resumeNote(note)}`;
    bouton.append(haut, detail);
    bouton.addEventListener("click", (e) => {
      e.stopPropagation();
      ouvrirNote(note.id);
    });
    zone.appendChild(bouton);
  });
  if (typeof placerCartesAccueil === "function") placerCartesAccueil();
}

afficherNotes();
