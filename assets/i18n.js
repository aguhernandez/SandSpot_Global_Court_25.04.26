/* =============================================================
   SandSpot — i18n
   7 languages: en · es · fr · de · it · pt · nl
   - detection: URL ?lang= > localStorage("sandspot-lang") > navigator
   - applies data-i18n (text), data-i18n-html (trusted markup) and
     data-i18n-attr ("placeholder:search.ph;aria-label:z.in")
   - window.SandSpotI18N.t(key, vars) for JS-built content
   Product note: mail subjects/bodies that land in hello@sandspot.app
   stay English on purpose (inbox triage). Court/city names are
   proper nouns and are never translated.
   ============================================================= */
(() => {
  "use strict";

  const D = {};

  /* ---------------------------------------------------------- */
  /* EN — canonical                                             */
  /* ---------------------------------------------------------- */
  D.en = {
    "meta.title": "SandSpot — Every beach volleyball court in the world. One map.",
    "meta.desc": "The world's beach volleyball courts, written down on one interactive map. Explore it — then help it grow.",
    "hud.on": "courts on file",
    "nav.mission": "The mission",
    "nav.roadmap": "Roadmap",
    "nav.add": "Add a court",
    "nav.join": "Get the map first",
    "nav.a": "Panels",
    "z.group": "Map zoom controls",
    "z.in": "Zoom in",
    "z.out": "Zoom out",
    "z.fit": "Fit the whole world",
    "search.group": "Court search",
    "search.label": "Search courts",
    "search.filters": "Filters",
    "search.ph": "Search a city, a beach, a country",
    "chip.public": "Public sand",
    "chip.partner": "Partner venues",
    "chip.lights": "Night lights",
    "hint.drag": "drag the world",
    "hint.zoom": "scroll or pinch to zoom",
    "hint.tap": "tap a yellow dot",
    "credit": "hand-checked records · corrections welcome",
    "lang.a": "Change language",
    "close.a": "Close panel",
    "mission.lede": "Finding sand in a new city shouldn't depend on knowing a local.",
    "mission.p1": "Today it does. Players ask around. Locals know two or three courts and keep the rest to themselves. Clubs list hours nowhere, cities bury them in PDFs, hotel courts never make it online at all.",
    "mission.p2": "<strong>The courts already exist — they are just not written down anywhere.</strong>",
    "mission.p3": "SandSpot is writing them down: one registry, every court, checked by the people who play on them. {n} are on file today. The map you just moved is the registry, working.",
    "mission.cta": "Add a court we're missing",
    "road.head": "Where this goes",
    "road.s1": "Today",
    "road.s2": "Next",
    "road.s3": "Then",
    "road.l1": "<strong>The registry.</strong> We track and verify courts; the record grows every week. Corrections welcome — the players know best.",
    "road.l2": "<strong>The map, everywhere.</strong> Full court pages: photos, hours, rules. A copy of the truth in every player's pocket.",
    "road.l3": "<strong>The game.</strong> Book court time, find players at your level, run tournaments. The playing layer comes after the map earns trust.",
    "road.cta": "Get the map first",
    "add.head": "Add a court",
    "add.lede": "Takes a minute. It goes on file within days, and the registry stays free.",
    "add.l1": "Court name",
    "add.l2": "City & country",
    "add.l3": "How many sand courts?",
    "add.l4": "Anything else the players should know?",
    "add.ph1": "e.g. Kite Beach Volleyball",
    "add.ph2": "e.g. Dubai, UAE",
    "add.ph3": "4",
    "add.ph4": "lit until 11pm, free…",
    "add.cta": "Open the mail with everything written",
    "join.lede": "One email when the map opens wide. Court additions welcome sooner — they are what makes the map worth opening.",
    "join.ph": "you@wherever.com",
    "join.btn": "Join",
    "join.note": "No spam, no schedule — one mail when there's something to play with.",
    "join.bad": "That email doesn't look right — try again.",
    "join.ok": "You're in. One email when the map opens.",
    "join.err": "Couldn't save that — send us a line:",
    "join.mail": "Opening your mail app — hit send and you're on the list.",
    "splash.1": "Every court<br/>in the world.",
    "splash.2": "One map.",
    "court.head": "On file",
    "c.where": "Where exactly",
    "c.courts": "Sand courts",
    "c.access": "Access",
    "c.lights": "Night lights",
    "c.price": "Price",
    "c.checked": "Checked on file",
    "c.yes": "Yes",
    "c.free": "Free",
    "type.public": "public",
    "type.partner": "partner",
    "rate.no": "Not rated yet — reviews land with the next build",
    "photo.n": "photo {n}",
    "pn.miss": "No photos on file.",
    "pn.link": "Send one",
    "pn.tail": "and it becomes the cover.",
    "d.hours": "Hours",
    "d.surface": "Surface",
    "d.rules": "House rules",
    "c.correct": "Spot a mistake? Correct this court",
    "c.hint": "Hand-checked by the people who play here.",
    "se.miss": "No court matches that yet.",
    "se.link": "Send it to us",
    "se.tail": "— it goes on file within days.",
    "s.lit": "lit",
    /* Court desk — sandbox */
    "suite.title": "Court desk",
    "suite.note": "Sandbox: accounts and bookings live on this device until the API layer opens. Nothing here is public yet.",
    "suite.tabIn": "Sign in",
    "suite.tabNew": "Create account",
    "suite.mail": "Email",
    "suite.pass": "Password",
    "suite.role": "Register as",
    "suite.player": "Player",
    "suite.venue": "Venue owner",
    "suite.admin": "Admin",
    "suite.go": "Enter",
    "suite.out": "Sign out",
    "suite.wrong": "Wrong email or password.",
    "suite.exists": "That account already exists — sign in instead.",
    "suite.done": "Account created — you're in.",
    "suite.demo": "Seed demo accounts",
    "suite.pickCourt": "Court",
    "suite.pickDate": "Date",
    "suite.slots": "Available slots",
    "suite.book": "Book",
    "suite.mine": "My bookings",
    "suite.none": "Nothing booked yet.",
    "suite.cancel": "Cancel",
    "suite.taken": "That slot is no longer free.",
    "suite.export": "Download sandbox data",
    "suite.wipe": "Erase sandbox data",
    "suite.short": "Password: 6+ characters."
  };

  /* ---------------------------------------------------------- */
  /* ES — neutral, community voice                              */
  /* ---------------------------------------------------------- */
  D.es = {
    "meta.title": "SandSpot — Cada cancha de vóley playa del mundo. Un solo mapa.",
    "meta.desc": "Todas las canchas de vóley playa del mundo, anotadas en un mapa interactivo. Explóralo y ayúdanos a que crezca.",
    "hud.on": "canchas registradas",
    "nav.mission": "La misión",
    "nav.roadmap": "Hoja de ruta",
    "nav.add": "Añade una cancha",
    "nav.join": "Recíbelo primero",
    "nav.a": "Paneles",
    "z.group": "Controles de zoom del mapa",
    "z.in": "Acercar",
    "z.out": "Alejar",
    "z.fit": "Ver el mundo entero",
    "search.group": "Búsqueda de canchas",
    "search.label": "Buscar canchas",
    "search.filters": "Filtros",
    "search.ph": "Busca una ciudad, una playa, un país",
    "chip.public": "Arena pública",
    "chip.partner": "Sedes asociadas",
    "chip.lights": "Con luces",
    "hint.drag": "arrastra el mundo",
    "hint.zoom": "scroll o pinza para el zoom",
    "hint.tap": "toca un punto amarillo",
    "credit": "registros verificados a mano · correcciones bienvenidas",
    "lang.a": "Cambiar idioma",
    "close.a": "Cerrar panel",
    "mission.lede": "Encontrar arena en una ciudad nueva no debería depender de conocer a alguien de ahí.",
    "mission.p1": "Hoy eso pasa. Los jugadores preguntan por ahí. Los locales conocen dos o tres canchas y se guardan el resto. Los clubes no publican sus horarios, los ayuntamientos los esconden en PDFs y las canchas de hoteles jamás se suben a internet.",
    "mission.p2": "<strong>Las canchas ya existen — lo que no existe es una lista donde buscarlas.</strong>",
    "mission.p3": "SandSpot las está anotando: un registro, cada cancha, revisado por quienes juegan en ellas. {n} figuran hoy. El mapa que acabas de mover es ese registro, funcionando.",
    "mission.cta": "Añade una cancha que falte",
    "road.head": "Hacia dónde va",
    "road.s1": "Hoy",
    "road.s2": "Próximo",
    "road.s3": "Más adelante",
    "road.l1": "<strong>El registro.</strong> Rastreamos y verificamos canchas; el expediente crece cada semana. Correcciones bienvenidas — los jugadores son quienes mejor lo saben.",
    "road.l2": "<strong>El mapa, en todos lados.</strong> Páginas completas por cancha: fotos, horarios, reglas. La verdad, en el bolsillo de cada jugador.",
    "road.l3": "<strong>El juego.</strong> Reservar horario, encontrar rivales de tu nivel, organizar torneos. La capa de juego llega cuando el mapa se gane la confianza.",
    "road.cta": "Recíbelo primero",
    "add.head": "Añade una cancha",
    "add.lede": "Toma un minuto. Entra al registro en días, y el mapa sigue siendo gratis.",
    "add.l1": "Nombre de la cancha",
    "add.l2": "Ciudad y país",
    "add.l3": "¿Cuántas canchas de arena?",
    "add.l4": "¿Algo que los jugadores deban saber?",
    "add.ph1": "p. ej. Kite Beach Volleyball",
    "add.ph2": "p. ej. Dubái, EAU",
    "add.ph3": "4",
    "add.ph4": "luces hasta las 23, gratis…",
    "add.cta": "Abrir el correo con todo escrito",
    "join.lede": "Un solo correo cuando el mapa se abra de par en par. Las canchas nuevas valen desde ya — son las que hacen que el mapa valga la pena.",
    "join.ph": "tu@correo.com",
    "join.btn": "Unirme",
    "join.note": "Sin spam ni agenda — un mail cuando haya algo con qué jugar.",
    "join.bad": "Ese correo no parece válido — prueba otra vez.",
    "join.ok": "Estás dentro. Un correo cuando el mapa se abra.",
    "join.err": "No se pudo guardar — escríbenos:",
    "join.mail": "Abrimos tu app de correo — dale a enviar y quedas en la lista.",
    "splash.1": "Cada cancha<br/>del mundo.",
    "splash.2": "Un mapa.",
    "court.head": "En el registro",
    "c.where": "Dirección exacta",
    "c.courts": "Canchas de arena",
    "c.access": "Acceso",
    "c.lights": "Luz nocturna",
    "c.price": "Precio",
    "c.checked": "Veces consultado",
    "c.yes": "Sí",
    "c.free": "Gratis",
    "type.public": "pública",
    "type.partner": "asociada",
    "rate.no": "Sin calificar aún — las reseñas llegan con la próxima versión",
    "photo.n": "foto {n}",
    "pn.miss": "No hay fotos registradas.",
    "pn.link": "Envía una",
    "pn.tail": "y se vuelve la portada.",
    "d.hours": "Horarios",
    "d.surface": "Superficie",
    "d.rules": "Reglas del lugar",
    "c.correct": "¿Viste un error? Corrige esta cancha",
    "c.hint": "Verificado por la gente que juega aquí.",
    "se.miss": "Ninguna cancha coincide todavía.",
    "se.link": "Envíala tú",
    "se.tail": "— entra al registro en días.",
    "s.lit": "luces",
    "suite.title": "Panel de canchas",
    "suite.note": "Banco de pruebas: las cuentas y reservas viven en este dispositivo hasta que abra la capa de API. Nada de esto es público aún.",
    "suite.tabIn": "Iniciar sesión",
    "suite.tabNew": "Crear cuenta",
    "suite.mail": "Correo",
    "suite.pass": "Contraseña",
    "suite.role": "Registrarse como",
    "suite.player": "Jugador",
    "suite.venue": "Responsable de sede",
    "suite.admin": "Administrador",
    "suite.go": "Entrar",
    "suite.out": "Salir",
    "suite.wrong": "Correo o contraseña incorrectos.",
    "suite.exists": "Esa cuenta ya existe — inicia sesión.",
    "suite.done": "Cuenta creada — estás dentro.",
    "suite.demo": "Cargar cuentas demo",
    "suite.pickCourt": "Cancha",
    "suite.pickDate": "Fecha",
    "suite.slots": "Horarios disponibles",
    "suite.book": "Reservar",
    "suite.mine": "Mis reservas",
    "suite.none": "Nada reservado todavía.",
    "suite.cancel": "Cancelar",
    "suite.taken": "Ese horario ya no está libre.",
    "suite.export": "Descargar datos del sandbox",
    "suite.wipe": "Borrar datos del sandbox",
    "suite.short": "Contraseña: 6 o más caracteres."
  };

  /* ---------------------------------------------------------- */
  /* FR                                                         */
  /* ---------------------------------------------------------- */
  D.fr = {
    "meta.title": "SandSpot — Chaque terrain de beach-volley du monde. Une carte.",
    "meta.desc": "Les terrains de beach-volley du monde, notés sur une carte interactive. Explorez-la — puis aidez-la à grandir.",
    "hud.on": "terrains répertoriés",
    "nav.mission": "La mission",
    "nav.roadmap": "Feuille de route",
    "nav.add": "Ajouter un terrain",
    "nav.join": "Recevoir la carte en premier",
    "nav.a": "Volets",
    "z.group": "Contrôles de zoom de la carte",
    "z.in": "Zoomer",
    "z.out": "Dézoomer",
    "z.fit": "Voir le monde entier",
    "search.group": "Recherche de terrains",
    "search.label": "Chercher des terrains",
    "search.filters": "Filtres",
    "search.ph": "Cherchez une ville, une plage, un pays",
    "chip.public": "Sable public",
    "chip.partner": "Lieux partenaires",
    "chip.lights": "Éclairage de nuit",
    "hint.drag": "glissez le monde",
    "hint.zoom": "molette ou pincer pour zoomer",
    "hint.tap": "touchez un point jaune",
    "credit": "fiches vérifiées à la main · corrections bienvenues",
    "lang.a": "Changer de langue",
    "close.a": "Fermer le volet",
    "mission.lede": "Trouver du sable dans une nouvelle ville ne devrait pas dépendre des copains sur place.",
    "mission.p1": "C'est pourtant comme ça que ça marche. Les joueurs demandent autour d'eux. Les locaux gardent leurs deux ou trois terrains. Les clubs n'affichent leurs horaires nulle part, les villes les enfouissent dans des PDF, les terrains d'hôtels ne sont jamais en ligne.",
    "mission.p2": "<strong>Les terrains existent déjà — il n'existe juste nulle part où les trouver.</strong>",
    "mission.p3": "SandSpot les note : un registre, chaque terrain, vérifié par ceux qui y jouent. {n} sont enregistrés. La carte que vous venez de déplacer, c'est ce registre, en marche.",
    "mission.cta": "Ajoutez un terrain qui manque",
    "road.head": "Où ça va",
    "road.s1": "Aujourd'hui",
    "road.s2": "Ensuite",
    "road.s3": "Puis",
    "road.l1": "<strong>Le registre.</strong> On recense et vérifie les terrains ; le dossier grossit chaque semaine. Corrections bienvenues — ce sont les joueurs qui savent.",
    "road.l2": "<strong>La carte, partout.</strong> Des pages complètes par terrain : photos, horaires, règles. La vérité dans la poche de chaque joueur.",
    "road.l3": "<strong>Le jeu.</strong> Réserver un créneau, trouver des partenaires à son niveau, monter des tournois. Le jeu viendra quand la carte aura gagné la confiance.",
    "road.cta": "Recevoir la carte en premier",
    "add.head": "Ajouter un terrain",
    "add.lede": "Une minute suffit. La fiche est en ligne sous quelques jours, et le registre reste gratuit.",
    "add.l1": "Nom du terrain",
    "add.l2": "Ville et pays",
    "add.l3": "Combien de terrains de sable ?",
    "add.l4": "Ce que les joueurs doivent savoir ?",
    "add.ph1": "ex. Kite Beach Volleyball",
    "add.ph2": "ex. Dubaï, Émirats",
    "add.ph3": "4",
    "add.ph4": "éclairé jusqu'à 23h, gratuit…",
    "add.cta": "Ouvrir le mail avec tout écrit",
    "join.lede": "Un seul e-mail le jour où la carte s'ouvre en grand. Ajouter des terrains vaut dès aujourd'hui — ce sont eux qui donnent envie de l'ouvrir.",
    "join.ph": "vous@ailleurs.com",
    "join.btn": "Rejoindre",
    "join.note": "Pas de spam, pas de calendrier — un mail quand il y a quelque chose à jouer.",
    "join.bad": "Cet e-mail semble invalide — réessayez.",
    "join.ok": "C'est noté. Un mail quand la carte s'ouvre.",
    "join.err": "Impossible d'enregistrer — écrivez-nous :",
    "join.mail": "Votre app e-mail s'ouvre — validez l'envoi et vous êtes dans la liste.",
    "splash.1": "Chaque terrain<br/>du monde.",
    "splash.2": "Une carte.",
    "court.head": "Au registre",
    "c.where": "Adresse exacte",
    "c.courts": "Terrains de sable",
    "c.access": "Accès",
    "c.lights": "Éclairage",
    "c.price": "Prix",
    "c.checked": "Fois consultée",
    "c.yes": "Oui",
    "c.free": "Gratuit",
    "type.public": "public",
    "type.partner": "partenaire",
    "rate.no": "Pas encore noté — les avis arrivent avec la prochaine version",
    "photo.n": "photo {n}",
    "pn.miss": "Pas de photos enregistrées.",
    "pn.link": "Envoyez-en une",
    "pn.tail": "elle devient la couverture.",
    "d.hours": "Horaires",
    "d.surface": "Surface",
    "d.rules": "Règles du lieu",
    "c.correct": "Une erreur ? Corrigez ce terrain",
    "c.hint": "Vérifié par les gens qui jouent ici.",
    "se.miss": "Aucun terrain pour ça — encore.",
    "se.link": "Envoyez-le nous",
    "se.tail": "la fiche arrive sous quelques jours.",
    "s.lit": "éclairé",
    "suite.title": "Espace terrain",
    "suite.note": "Bac à sable : comptes et réservations restent sur cet appareil tant que la couche API n'est pas ouverte. Rien de tout ça n'est public.",
    "suite.tabIn": "Se connecter",
    "suite.tabNew": "Créer un compte",
    "suite.mail": "E-mail",
    "suite.pass": "Mot de passe",
    "suite.role": "S'inscrire comme",
    "suite.player": "Joueur",
    "suite.venue": "Gestionnaire de lieu",
    "suite.admin": "Administrateur",
    "suite.go": "Entrer",
    "suite.out": "Se déconnecter",
    "suite.wrong": "E-mail ou mot de passe incorrect.",
    "suite.exists": "Ce compte existe déjà — connectez-vous.",
    "suite.done": "Compte créé — vous êtes dedans.",
    "suite.demo": "Charger les comptes démo",
    "suite.pickCourt": "Terrain",
    "suite.pickDate": "Date",
    "suite.slots": "Créneaux disponibles",
    "suite.book": "Réserver",
    "suite.mine": "Mes réservations",
    "suite.none": "Pas encore de réservation.",
    "suite.cancel": "Annuler",
    "suite.taken": "Ce créneau n'est plus libre.",
    "suite.export": "Télécharger les données du bac à sable",
    "suite.wipe": "Effacer les données du bac à sable",
    "suite.short": "Utilisez au moins 6 caractères."
  };

  /* ---------------------------------------------------------- */
  /* DE                                                         */
  /* ---------------------------------------------------------- */
  D.de = {
    "meta.title": "SandSpot — Jeder Beachvolleyball-Platz der Welt. Eine Karte.",
    "meta.desc": "Die Beachvolleyball-Plätze der Welt, notiert auf einer interaktiven Karte. Erkunde sie — und hilf mit, sie wachsen zu lassen.",
    "hud.on": "Plätze erfasst",
    "nav.mission": "Die Mission",
    "nav.roadmap": "Fahrplan",
    "nav.add": "Platz hinzufügen",
    "nav.join": "Karte zuerst bekommen",
    "nav.a": "Panels",
    "z.group": "Karte-Zoom-Steuerung",
    "z.in": "Vergrößern",
    "z.out": "Verkleinern",
    "z.fit": "Ganze Welt sehen",
    "search.group": "Platzsuche",
    "search.label": "Plätze suchen",
    "search.filters": "Filter",
    "search.ph": "Suche eine Stadt, einen Strand, ein Land",
    "chip.public": "Öffentlicher Sand",
    "chip.partner": "Partner-Anlagen",
    "chip.lights": "Flutlicht",
    "hint.drag": "zieh die Welt",
    "hint.zoom": "Scrollen oder Ziehen zum Zoomen",
    "hint.tap": "tippe auf einen gelben Punkt",
    "credit": "handgeprüfte Einträge · Korrekturen willkommen",
    "lang.a": "Sprache wechseln",
    "close.a": "Panel schließen",
    "mission.lede": "Sand in einer neuen Stadt zu finden hängt nicht davon ab, jemanden dort zu kennen.",
    "mission.p1": "Heute tut es das noch. Spieler fragen herum. Einheimische kennen zwei, drei Plätze und hüten den Rest. Klubs veröffentlichen ihre Zeiten nirgends, Städte verstecken sie in PDFs, Hotelplätze gehen nie online.",
    "mission.p2": "<strong>Die Plätze existieren bereits — nur stehen sie nirgends drin.</strong>",
    "mission.p3": "SandSpot schreibt sie auf: ein Register, jeder Platz, geprüft von denen, die dort spielen. {n} sind erfasst. Die Karte, die du gerade bewegt hast, ist dieses Register — in Arbeit.",
    "mission.cta": "Fehlenden Platz hinzufügen",
    "road.head": "Wie es weitergeht",
    "road.s1": "Heute",
    "road.s2": "Als Nächstes",
    "road.s3": "Danach",
    "road.l1": "<strong>Das Register.</strong> Wir erfassen und prüfen Plätze; das Verzeichnis wächst jede Woche. Korrekturen willkommen — die Spieler wissen es am besten.",
    "road.l2": "<strong>Die Karte, überall.</strong> Komplette Platzseiten: Fotos, Zeiten, Regeln. Die Wahrheit in der Tasche jedes Spielers.",
    "road.l3": "<strong>Das Spiel.</strong> Plätze buchen, Partner auf dem eigenen Level finden, Turniere fahren. Die Spielebene kommt, wenn die Karte Vertrauen verdient hat.",
    "road.cta": "Karte zuerst bekommen",
    "add.head": "Platz hinzufügen",
    "add.lede": "Dauert eine Minute. In wenigen Tagen im Register — und es bleibt kostenlos.",
    "add.l1": "Name des Platzes",
    "add.l2": "Stadt & Land",
    "add.l3": "Wie viele Sandplätze?",
    "add.l4": "Was sollten Spieler wissen?",
    "add.ph1": "z. B. Kite Beach Volleyball",
    "add.ph2": "z. B. Dubai, VAE",
    "add.ph3": "4",
    "add.ph4": "Stunden bis 23 Uhr beleuchtet, kostenlos…",
    "add.cta": "Mail mit allem ausgefüllt öffnen",
    "join.lede": "Eine Mail, wenn die Karte groß öffnet. Platzeinsendungen sind vorher willkommen — sie machen die Karte lesenswert.",
    "join.ph": "du@woauchimmer.com",
    "join.btn": "Mitmachen",
    "join.note": "Kein Spam, kein Takt — eine Mail, wenn es was zu spielen gibt.",
    "join.bad": "Diese E-Mail sieht nicht richtig aus — noch mal.",
    "join.ok": "Du bist dabei. Eine Mail, wenn die Karte öffnet.",
    "join.err": "Speichern fehlgeschlagen — schreib uns:",
    "join.mail": "Deine Mail-App öffnet sich — senden, und du bist auf der Liste.",
    "splash.1": "Jeder Platz<br/>der Welt.",
    "splash.2": "Eine Karte.",
    "court.head": "Im Register",
    "c.where": "Genaue Adresse",
    "c.courts": "Sandplätze",
    "c.access": "Zugang",
    "c.lights": "Flutlicht",
    "c.price": "Preis",
    "c.checked": "Mal abgerufen",
    "c.yes": "Ja",
    "c.free": "Kostenlos",
    "type.public": "öffentlich",
    "type.partner": "Partner",
    "rate.no": "Noch nicht bewertet — Bewertungen kommen mit der nächsten Version",
    "photo.n": "Foto {n}",
    "pn.miss": "Keine Fotos erfasst.",
    "pn.link": "Schick eins",
    "pn.tail": "es wird das Cover.",
    "d.hours": "Zeiten",
    "d.surface": "Untergrund",
    "d.rules": "Regeln vor Ort",
    "c.correct": "Fehler entdeckt? Diesen Platz korrigieren",
    "c.hint": "Geprüft von den Leuten, die hier spielen.",
    "se.miss": "Da passt noch kein Platz.",
    "se.link": "Schick ihn uns",
    "se.tail": "in Tagen ist er im Register.",
    "s.lit": "beleuchtet",
    "suite.title": "Platz-Verwaltung",
    "suite.note": "Sandkasten: Konten und Buchungen bleiben auf diesem Gerät, bis die API-Ebene öffnet. Nichts davon ist öffentlich.",
    "suite.tabIn": "Anmelden",
    "suite.tabNew": "Konto erstellen",
    "suite.mail": "E-Mail",
    "suite.pass": "Passwort",
    "suite.role": "Registrieren als",
    "suite.player": "Spieler",
    "suite.venue": "Platzbetreiber",
    "suite.admin": "Administrator",
    "suite.go": "Los",
    "suite.out": "Abmelden",
    "suite.wrong": "E-Mail oder Passwort falsch.",
    "suite.exists": "Dieses Konto existiert schon — bitte anmelden.",
    "suite.done": "Konto erstellt — du bist drin.",
    "suite.demo": "Demo-Konten laden",
    "suite.pickCourt": "Platz",
    "suite.pickDate": "Datum",
    "suite.slots": "Freie Zeiten",
    "suite.book": "Buchen",
    "suite.mine": "Meine Buchungen",
    "suite.none": "Noch nichts gebucht.",
    "suite.cancel": "Stornieren",
    "suite.taken": "Diese Zeit ist nicht mehr frei.",
    "suite.export": "Sandkasten-Daten herunterladen",
    "suite.wipe": "Sandkasten-Daten löschen",
    "suite.short": "Benutze mindestens 6 Zeichen."
  };

  /* ---------------------------------------------------------- */
  /* IT                                                         */
  /* ---------------------------------------------------------- */
  D.it = {
    "meta.title": "SandSpot — Ogni campo da beach volley del mondo. Una mappa.",
    "meta.desc": "I campi da beach volley del mondo, annotati su una mappa interattiva. Esplorala — poi aiutala a crescere.",
    "hud.on": "campi registrati",
    "nav.mission": "La missione",
    "nav.roadmap": "Fasi successive",
    "nav.add": "Aggiungi un campo",
    "nav.join": "Ricevi la mappa prima",
    "nav.a": "Riquadri",
    "z.group": "Comandi zoom della mappa",
    "z.in": "Ingrandisci",
    "z.out": "Riduci",
    "z.fit": "Vedi il mondo intero",
    "search.group": "Ricerca campi",
    "search.label": "Cerca campi",
    "search.filters": "Filtri",
    "search.ph": "Cerca una città, una spiaggia, un paese",
    "chip.public": "Sabbia pubblica",
    "chip.partner": "Strutture partner",
    "chip.lights": "Luci notturne",
    "hint.drag": "trascina il mondo",
    "hint.zoom": "rotella o pizzico per lo zoom",
    "hint.tap": "tocca un punto giallo",
    "credit": "schede verificate a mano · correzioni benvenute",
    "lang.a": "Cambia lingua",
    "close.a": "Chiudi pannello",
    "mission.lede": "Trovare sabbia in una città nuova non dovrebbe dipendere dal conoscere qualcuno del posto.",
    "mission.p1": "Oggi invece è così. I giocatori chiedono in giro. I locali conoscono due o tre campi e si tengono il resto. I club pubblicano gli orari da nessuna parte, le città li seppelliscono nei PDF, i campi degli hotel non finiscono mai online.",
    "mission.p2": "<strong>I campi esistono già — manca solo un posto dove trovarli.</strong>",
    "mission.p3": "SandSpot li sta annotando: un registro, ogni campo, controllato da chi ci gioca. {n} sono in archivio oggi. La mappa che hai appena mosso è quel registro, al lavoro.",
    "mission.cta": "Aggiungi un campo che manca",
    "road.head": "Dove si va",
    "road.s1": "Oggi",
    "road.s2": "Poi",
    "road.s3": "E infine",
    "road.l1": "<strong>Il registro.</strong> Raccoliamo e verifichiamo i campi; l'archivio cresce ogni settimana. Correzioni benvenute — a saperlo bene sono i giocatori.",
    "road.l2": "<strong>La mappa, ovunque.</strong> Pagine complete per ogni campo: foto, orari, regole. La verità in tasca a ogni giocatore.",
    "road.l3": "<strong>Il gioco.</strong> Prenotare lo slot, trovare avversari al tuo livello, organizzare tornei. Il livello di gioco arriva dopo che la mappa si è guadagnata la fiducia.",
    "road.cta": "Ricevi la mappa prima",
    "add.head": "Aggiungi un campo",
    "add.lede": "Un minuto. Va in archivio entro giorni, e il registro resta gratis.",
    "add.l1": "Nome del campo",
    "add.l2": "Città e paese",
    "add.l3": "Quanti campi di sabbia?",
    "add.l4": "Qualcosa che i giocatori debbano sapere?",
    "add.ph1": "es. Kite Beach Volleyball",
    "add.ph2": "es. Dubai, EAU",
    "add.ph3": "4",
    "add.ph4": "illuminato fino alle 23, gratis…",
    "add.cta": "Apri la mail con tutto scritto",
    "join.lede": "Una sola email quando la mappa si aprirà in grande. Aggiungere campi vale da subito — è quello che la farà aprire.",
    "join.ph": "tu@ovunque.com",
    "join.btn": "Unisciti",
    "join.note": "Niente spam, niente calendario — una mail quando c'è qualcosa da giocare.",
    "join.bad": "Quell'email non torna — riprova.",
    "join.ok": "Ci sei. Una email quando la mappa si apre.",
    "join.err": "Non è stato salvato — scrivici:",
    "join.mail": "Si apre la tua app email — manda, e sei in lista.",
    "splash.1": "Ogni campo<br/>del mondo.",
    "splash.2": "Una mappa.",
    "court.head": "In archivio",
    "c.where": "Indirizzo esatto",
    "c.courts": "Campi di sabbia",
    "c.access": "Accesso",
    "c.lights": "Luci notturne",
    "c.price": "Prezzo",
    "c.checked": "Volte consultato",
    "c.yes": "Sì",
    "c.free": "Gratis",
    "type.public": "pubblico",
    "type.partner": "partner",
    "rate.no": "Non ancora valutato — le recensioni arrivano con la prossima versione",
    "photo.n": "foto {n}",
    "pn.miss": "Nessuna foto in archivio.",
    "pn.link": "Mandane una",
    "pn.tail": "e diventa la copertina.",
    "d.hours": "Orari",
    "d.surface": "Superficie",
    "d.rules": "Regole del luogo",
    "c.correct": "Un errore? Correggi questo campo",
    "c.hint": "Verificato da chi gioca qui.",
    "se.miss": "Nessun campo corrisponde — per ora.",
    "se.link": "Mandacelo tu",
    "se.tail": "entra in archivio entro giorni.",
    "s.lit": "illuminato",
    "suite.title": "Sportello campi",
    "suite.note": "Sandbox: account e prenotazioni restano su questo dispositivo finché non si apre il livello API. Niente di tutto ciò è pubblico.",
    "suite.tabIn": "Accedi",
    "suite.tabNew": "Crea account",
    "suite.mail": "Email",
    "suite.pass": "Password",
    "suite.role": "Registrati come",
    "suite.player": "Giocatore",
    "suite.venue": "Responsabile struttura",
    "suite.admin": "Amministratore",
    "suite.go": "Entra",
    "suite.out": "Esci",
    "suite.wrong": "Email o password sbagliati.",
    "suite.exists": "Quel account esiste già — accedi.",
    "suite.done": "Account creato — sei dentro.",
    "suite.demo": "Carica account demo",
    "suite.pickCourt": "Campo",
    "suite.pickDate": "Data",
    "suite.slots": "Slot disponibili",
    "suite.book": "Prenota",
    "suite.mine": "Le mie prenotazioni",
    "suite.none": "Niente prenotato per ora.",
    "suite.cancel": "Annulla",
    "suite.taken": "Quello slot non è più libero.",
    "suite.export": "Scarica i dati sandbox",
    "suite.wipe": "Cancella i dati sandbox",
    "suite.short": "Usa almeno 6 caratteri."
  };

  /* ---------------------------------------------------------- */
  /* PT — Brazil is beach volleyball's backyard                  */
  /* ---------------------------------------------------------- */
  D.pt = {
    "meta.title": "SandSpot — Cada quadra de vôlei de praia do mundo. Um mapa.",
    "meta.desc": "As quadras de vôlei de praia do mundo, anotadas num mapa interativo. Explora — e ajuda a crescer.",
    "hud.on": "quadras registradas",
    "nav.mission": "A missão",
    "nav.roadmap": "Roteiro",
    "nav.add": "Adicionar quadra",
    "nav.join": "Receber o mapa primeiro",
    "nav.a": "Painéis",
    "z.group": "Controles de zoom do mapa",
    "z.in": "Aproximar",
    "z.out": "Afastar",
    "z.fit": "Ver o mundo inteiro",
    "search.group": "Busca de quadras",
    "search.label": "Buscar quadras",
    "search.filters": "Filtros",
    "search.ph": "Busque uma cidade, uma praia, um país",
    "chip.public": "Areia pública",
    "chip.partner": "Locais parceiros",
    "chip.lights": "Luz de noite",
    "hint.drag": "arrasta o mundo",
    "hint.zoom": "scroll ou pinça pra dar zoom",
    "hint.tap": "toca num ponto amarelo",
    "credit": "registros conferidos à mão · correções bem-vindas",
    "lang.a": "Mudar idioma",
    "close.a": "Fechar painel",
    "mission.lede": "Achar areia numa cidade nova não devia depender de conhecer alguém de lá.",
    "mission.p1": "Hoje é assim que funciona. Jogadores perguntam por aí. Os locais conhecem duas ou três quadras e guardam o resto. Os clubes não publicam horários em lugar nenhum, as prefeituras escondem tudo em PDF, e as quadras de hotel nunca chegam à internet.",
    "mission.p2": "<strong>As quadras já existem — só não existem por escrito em canto nenhum.</strong>",
    "mission.p3": "SandSpot está anotando: um registro, cada quadra, conferido por quem joga nelas. {n} estão no arquivo hoje. O mapa que você acabou de mover é esse registro, funcionando.",
    "mission.cta": "Adiciona uma quadra que falta",
    "road.head": "Pra onde vai",
    "road.s1": "Hoje",
    "road.s2": "Depois",
    "road.s3": "No fim",
    "road.l1": "<strong>O registro.</strong> Mapeamos e conferimos quadras; o arquivo cresce toda semana. Correções bem-vindas — quem sabe são os jogadores.",
    "road.l2": "<strong>O mapa, em todo lugar.</strong> Páginas completas por quadra: fotos, horários, regras. A verdade no bolso de cada jogador.",
    "road.l3": "<strong>O jogo.</strong> Reservar horário, achar parceiros do seu nível, organizar torneios. A camada de jogo chega depois que o mapa ganhar confiança.",
    "road.cta": "Receber o mapa primeiro",
    "add.head": "Adicionar quadra",
    "add.lede": "Leva um minuto. Entra no arquivo em dias, e o registro continua grátis.",
    "add.l1": "Nome da quadra",
    "add.l2": "Cidade e país",
    "add.l3": "Quantas quadras de areia?",
    "add.l4": "Algo que os jogadores devessem saber?",
    "add.ph1": "ex. Kite Beach Volleyball",
    "add.ph2": "ex. Dubai, EAU",
    "add.ph3": "4",
    "add.ph4": "iluminado até as 23h, grátis…",
    "add.cta": "Abrir o e-mail com tudo escrito",
    "join.lede": "Um único e-mail quando o mapa abrir de vez. Adicionar quadras já vale agora — é isso que faz o mapa valer a pena abrir.",
    "join.ph": "voce@ondequer.com",
    "join.btn": "Entrar",
    "join.note": "Sem spam, sem agenda — um e-mail quando tiver coisa pra jogar.",
    "join.bad": "Esse e-mail não parece certo — tenta de novo.",
    "join.ok": "Você está dentro. Um e-mail quando o mapa abrir.",
    "join.err": "Não salvou — escreve pra gente:",
    "join.mail": "Abrimos seu app de e-mail — manda e você entra na lista.",
    "splash.1": "Cada quadra<br/>do mundo.",
    "splash.2": "Um mapa.",
    "court.head": "No arquivo",
    "c.where": "Endereço exato",
    "c.courts": "Quadras de areia",
    "c.access": "Acesso",
    "c.lights": "Luz de noite",
    "c.price": "Preço",
    "c.checked": "Vezes consultado",
    "c.yes": "Sim",
    "c.free": "Grátis",
    "type.public": "pública",
    "type.partner": "parceira",
    "rate.no": "Ainda sem avaliação — as notas chegam na próxima versão",
    "photo.n": "foto {n}",
    "pn.miss": "Sem fotos no arquivo.",
    "pn.link": "Manda uma",
    "pn.tail": "e ela vira a capa.",
    "d.hours": "Horários",
    "d.surface": "Superfície",
    "d.rules": "Regras do lugar",
    "c.correct": "Viu um erro? Corrige esta quadra",
    "c.hint": "Conferido pela galera que joga aqui.",
    "se.miss": "Nenhuma quadra bate — ainda.",
    "se.link": "Manda ela você",
    "se.tail": "entra no arquivo em dias.",
    "s.lit": "iluminada",
    "suite.title": "Painel das quadras",
    "suite.note": "Sandbox: contas e reservas ficam neste dispositivo até a camada de API abrir. Nada disso é público ainda.",
    "suite.tabIn": "Fazer login",
    "suite.tabNew": "Criar conta",
    "suite.mail": "E-mail",
    "suite.pass": "Senha",
    "suite.role": "Registrar como",
    "suite.player": "Jogador",
    "suite.venue": "Responsável pelo local",
    "suite.admin": "Administrador",
    "suite.go": "Entrar",
    "suite.out": "Sair",
    "suite.wrong": "E-mail ou senha errados.",
    "suite.exists": "Essa conta já existe — faça login.",
    "suite.done": "Conta criada — você está dentro.",
    "suite.demo": "Carregar contas demo",
    "suite.pickCourt": "Quadra",
    "suite.pickDate": "Data",
    "suite.slots": "Horários livres",
    "suite.book": "Reservar",
    "suite.mine": "Minhas reservas",
    "suite.none": "Nada reservado ainda.",
    "suite.cancel": "Cancelar",
    "suite.taken": "Esse horário já não está livre.",
    "suite.export": "Baixar dados do sandbox",
    "suite.wipe": "Apagar dados do sandbox",
    "suite.short": "Usa pelo menos 6 caracteres."
  };

  /* ---------------------------------------------------------- */
  /* NL                                                         */
  /* ---------------------------------------------------------- */
  D.nl = {
    "meta.title": "SandSpot — Elk beachvolleybalveld ter wereld. Eén kaart.",
    "meta.desc": "De beachvolleybalvelden van de wereld, opgeschreven op één interactieve kaart. Verken het — en help het groeien.",
    "hud.on": "velden geregistreerd",
    "nav.mission": "De missie",
    "nav.roadmap": "Routeplan",
    "nav.add": "Veld toevoegen",
    "nav.join": "De kaart als eerste",
    "nav.a": "Panelen",
    "z.group": "Kaartzoom-besturing",
    "z.in": "Inzoomen",
    "z.out": "Uitzoomen",
    "z.fit": "De hele wereld zien",
    "search.group": "Velden zoeken",
    "search.label": "Velden zoeken",
    "search.filters": "Filters",
    "search.ph": "Zoek een stad, een strand, een land",
    "chip.public": "Openbaar zand",
    "chip.partner": "Partnerlocaties",
    "chip.lights": "Nachtverlichting",
    "hint.drag": "sleep de wereld",
    "hint.zoom": "scroll of pin om te zoomen",
    "hint.tap": "tik op een gele stip",
    "credit": "handgecontroleerde velden · correcties welkom",
    "lang.a": "Taal wisselen",
    "close.a": "Paneel sluiten",
    "mission.lede": "Zand vinden in een nieuwe stad hoort niet af te hangen van wie je er kent.",
    "mission.p1": "Vandaag werkt het nog zo. Spelers vragen rond. Locals kennen twee of drie velden en houden de rest voor zichzelf. Clubs publiceren nergens openingstijden, gemeenten begraven ze in PDF's, hotelvelden komen nooit online.",
    "mission.p2": "<strong>De velden bestaan al — ze staan alleen nergens opgeschreven.</strong>",
    "mission.p3": "SandSpot schrijft ze op: één register, elk veld, gecontroleerd door mensen die er spelen. {n} staan er vandaag in. De kaart die je net verschoof, is dat register aan het werk.",
    "mission.cta": "Voeg een ontbrekend veld toe",
    "road.head": "Waar dit naartoe gaat",
    "road.s1": "Vandaag",
    "road.s2": "Daarna",
    "road.s3": "En dan",
    "road.l1": "<strong>Het register.</strong> We verzamelen en controleren velden; het overzicht groeit elke week. Correcties welkom — spelers weten het het beste.",
    "road.l2": "<strong>De kaart, overal.</strong> Volledige pagina's per veld: foto's, tijden, regels. De waarheid in de zak van elke speler.",
    "road.l3": "<strong>Het spel.</strong> Banen boeken, maatjes op uw niveau vinden, toernooien draaien. De speellaag komt nadat de kaart vertrouwen heeft verdiend.",
    "road.cta": "De kaart als eerste",
    "add.head": "Veld toevoegen",
    "add.lede": "Een minuut. Staat binnen dagen in het register — en het blijft gratis.",
    "add.l1": "Naam van het veld",
    "add.l2": "Stad & land",
    "add.l3": "Hoeveel zandvelden?",
    "add.l4": "Wat moeten spelers nog weten?",
    "add.ph1": "bv. Kite Beach Volleyball",
    "add.ph2": "bv. Dubai, VAE",
    "add.ph3": "4",
    "add.ph4": "verlicht tot 23 uur, gratis…",
    "add.cta": "Open de mail met alles uitgevuld",
    "join.lede": "Eén mail zodra de kaart breed opent. Velden insturen kan al nu — dat is wat de kaart de moeite van het openen maakt.",
    "join.ph": "jij@waardanook.nl",
    "join.btn": "Word lid",
    "join.note": "Geen spam, geen schema — één mail wanneer er iets te spelen valt.",
    "join.bad": "Dat e-mailadres klopt niet helemaal — nog een keer.",
    "join.ok": "Je zit erin. Eén mail zodra de kaart opent.",
    "join.err": "Opslaan lukte niet — mail ons:",
    "join.mail": "Je mailapp opent — verstuur en je staat op de lijst.",
    "splash.1": "Elk veld<br/>ter wereld.",
    "splash.2": "Eén kaart.",
    "court.head": "In het register",
    "c.where": "Exacte locatie",
    "c.courts": "Zandvelden",
    "c.access": "Toegang",
    "c.lights": "Nachtverlichting",
    "c.price": "Prijs",
    "c.checked": "Keer bekeken",
    "c.yes": "Ja",
    "c.free": "Gratis",
    "type.public": "openbaar",
    "type.partner": "partner",
    "rate.no": "Nog niet beoordeeld — beoordelingen komen met de volgende versie",
    "photo.n": "foto {n}",
    "pn.miss": "Nog geen foto's.",
    "pn.link": "Stuur er één",
    "pn.tail": "het wordt de omslag.",
    "d.hours": "Tijden",
    "d.surface": "Ondergrond",
    "d.rules": "Huisregels",
    "c.correct": "Foutje gezien? Corrigeer dit veld",
    "c.hint": "Gecontroleerd door de mensen die hier spelen.",
    "se.miss": "Nog geen veld dat past.",
    "se.link": "Stuur het ons",
    "se.tail": "staat er binnen dagen in.",
    "s.lit": "verlicht",
    "suite.title": "Veldenloket",
    "suite.note": "Sandbox: accounts en boekingen blijven op dit toestel tot de API-laag opent. Nog niets daarvan is publiek.",
    "suite.tabIn": "Inloggen",
    "suite.tabNew": "Account maken",
    "suite.mail": "E-mail",
    "suite.pass": "Wachtwoord",
    "suite.role": "Registreren als",
    "suite.player": "Speler",
    "suite.venue": "Locatiebeheerder",
    "suite.admin": "Beheerder",
    "suite.go": "Aanmelden",
    "suite.out": "Uitloggen",
    "suite.wrong": "E-mail of wachtwoord klopt niet.",
    "suite.exists": "Dit account bestaat al — log in.",
    "suite.done": "Account gemaakt — je zit erin.",
    "suite.demo": "Demo-accounts laden",
    "suite.pickCourt": "Veld",
    "suite.pickDate": "Datum",
    "suite.slots": "Vrije tijden",
    "suite.book": "Boeken",
    "suite.mine": "Mijn boekingen",
    "suite.none": "Nog niets geboekt.",
    "suite.cancel": "Annuleren",
    "suite.taken": "Die tijd is niet meer vrij.",
    "suite.export": "Sandbox-gegevens downloaden",
    "suite.wipe": "Sandbox-gegevens wissen",
    "suite.short": "Gebruik minstens 6 tekens."
  };

  /* ============================================================ */
  /* Runtime                                                       */
  /* ============================================================ */
  const ORDER  = ["en", "es", "fr", "de", "it", "pt", "nl"];
  const NATIVE = { en: "English", es: "Español", fr: "Français", de: "Deutsch",
                   it: "Italiano", pt: "Português", nl: "Nederlands" };
  const LS = "sandspot-lang";

  const norm = (code) => {
    const c = (code || "").toLowerCase();
    if (!c) return "en";
    if (c.startsWith("pt")) return "pt";
    if (c.startsWith("fr")) return "fr";
    if (c.startsWith("de")) return "de";
    if (c.startsWith("it")) return "it";
    if (c.startsWith("nl")) return "nl";
    if (c.startsWith("es")) return "es";
    return "en";
  };

  let lang = "";
  try { const q = new URLSearchParams(location.search).get("lang");
        if (q && D[norm(q)]) lang = norm(q); } catch (_) {}
  if (!lang) {
    try { const ls = (localStorage.getItem(LS) || "").trim();
          if (ls && D[ls]) lang = ls; } catch (_) {}
  }
  if (!lang) {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    lang = D[norm(nav)] ? norm(nav) : "en";
  }

  const T = (key, vars) => {
    let s = (D[lang] && D[lang][key]) ?? D.en[key] ?? key;
    if (s === key && !D.en[key]) return key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k]));
    return s;
  };

  const countNow = () =>
    (document.querySelector("[data-courts-tracked]") || {}).textContent || "—";

  function applyAll() {
    const dict = (k) => {
      let s = T(k);
      return s.split("{n}").join(countNow());
    };
    document.documentElement.setAttribute("lang", lang);
    document.title = T("meta.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", T("meta.desc"));
    const ogT = document.querySelector('meta[property="og:title"]');
    if (ogT) ogT.setAttribute("content", T("meta.title"));
    const ogD = document.querySelector('meta[property="og:description"]');
    if (ogD) ogD.setAttribute("content", T("meta.desc"));

    document.querySelectorAll("[data-i18n]").forEach((n) => {
      const v = dict(n.dataset.i18n); if (v !== n.dataset.i18n) n.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((n) => {
      const v = dict(n.dataset.i18nHtml); if (v !== n.dataset.i18nHtml) n.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((n) => {
      (n.dataset.i18nAttr || "").split(";").forEach((pair) => {
        const i = pair.indexOf(":");
        if (i < 1) return;
        const attr = pair.slice(0, i).trim(), key = pair.slice(i + 1).trim();
        const v = T(key); if (v !== key) n.setAttribute(attr, v);
      });
    });

    // switcher state
    const code = document.getElementById("lang-code");
    if (code) code.textContent = lang.toUpperCase();
    buildMenu();
  }

  /* --- switcher --- */
  function buildMenu() {
    const menu = document.getElementById("lang-menu");
    const box  = document.getElementById("langbox");
    if (!menu || !box) return;
    menu.querySelectorAll(".lang-item").forEach((n) => n.remove());
    for (const code of ORDER) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lang-item" + (code === lang ? " on" : "");
      b.dataset.l = code;
      b.innerHTML = `<span>${NATIVE[code]}</span><span class="code">${code.toUpperCase()}</span>`;
      b.addEventListener("click", () => { setLang(code); closeMenu(); });
      menu.appendChild(b);
    }
  }
  function openMenu() {
    const menu = document.getElementById("lang-menu");
    const btn  = document.getElementById("lang-btn");
    if (!menu || !btn) return;
    if (!menu.childElementCount) buildMenu();
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    const menu = document.getElementById("lang-menu");
    const btn  = document.getElementById("lang-btn");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#langbox")) closeMenu();
  });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  function setLang(next) {
    if (!D[next] || next === lang) return;
    lang = next;
    try { localStorage.setItem(LS, lang); } catch (_) {}
    applyAll();
    document.dispatchEvent(new CustomEvent("sandspot:lang", { detail: lang }));
  }

  /* --- switcher trigger (DOM present since scripts run at body end) --- */
  const langBtn = document.getElementById("lang-btn");
  if (langBtn) langBtn.addEventListener("click", () => {
    const menu = document.getElementById("lang-menu");
    menu && menu.hidden ? openMenu() : closeMenu();
  });

  applyAll();

  window.SandSpotI18N = {
    t: T,
    setLang,
    refresh: applyAll,
    get lang() { return lang; },
    ORDER, NATIVE
  };
})();
