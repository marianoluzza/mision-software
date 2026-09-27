(function () {
  "use strict";

  // Pixa es una red social inventada: el desafío no imita marcas ni sitios reales.
  // Nunca se escribe una contraseña de verdad: todo se arma tocando fichas.

  // Cada nivel es una línea de defensa distinta; `type` elige cómo se juega.
  // `badge: true` marca el nivel que otorga la insignia; los siguientes son para quien quiera seguir.
  const levels = [
    {
      type: "clues",
      title: "Pescá las pistas",
      hint: "Llegó un mensaje raro. Tocá las 3 partes que te hacen sospechar.",
      parts: [
        { text: "+54 9 11 5832-0417", sender: true, clue: "Un número cualquiera: Pixa no te escribe desde un celular desconocido." },
        { text: "PIXA:", note: "Poner el nombre de Pixa no prueba nada: cualquiera puede escribirlo. Seguí buscando." },
        { text: "Detectamos actividad inusual en tu cuenta.", note: "Suena formal, pero eso solo no alcanza para sospechar. Buscá algo más concreto." },
        { text: "Si no la verificás, se BLOQUEARÁ en 24 hs.", clue: "Apuro y amenaza: buscan que actúes sin pensar." },
        { text: "Verificá acá:", note: "Pedirte que verifiques algo es común. Mirá bien adónde te lleva." },
        { text: "pixa-seguridad.co/login", clue: "El link no es de pixa.com: cualquiera puede comprar un nombre parecido." },
      ],
    },
    {
      type: "password",
      title: "Armá una contraseña",
      hint: "Tocá fichas para armar tu nueva contraseña. Ojo: el atacante ya sabe algunas cosas de vos.",
      known: ["🐶 Tu perro se llama Firulais", "🎂 Naciste en 2009"],
      // Estimación de juego: bits de sorpresa que aporta cada ficha. Una palabra al azar
      // sale de una lista de unas 8000; lo que el atacante ya sabe no suma casi nada.
      pieces: [
        { text: "cometa", bits: 13 },
        { text: "Firulais", bits: 1, note: "El atacante prueba primero el nombre de tu perro: esa ficha casi no suma." },
        { text: "tostada", bits: 13 },
        { text: "123", bits: 3, note: "“123” es lo primero que prueba cualquiera: suma muy poco." },
        { text: "nube", bits: 13 },
        { text: "2009", bits: 1, note: "Tu año de nacimiento está en tus fotos: esa ficha casi no suma." },
        { text: "violeta", bits: 13 },
        { text: "!", bits: 5, note: "El símbolo ayuda un poco, pero menos de lo que parece. ¿Y si sumás otra palabra?" },
        { text: "pingüino", bits: 13 },
      ],
      targetBits: 52,
    },
    {
      type: "twofactor",
      title: "Activá el segundo factor",
      hint: "Tu contraseña se filtró en otro sitio. ¿Cómo frenás a alguien que ya la tiene?",
      methods: [
        { id: "app", label: "App de autenticación", detail: "Un código nuevo cada 30 segundos en tu celular", safe: true },
        { id: "sms", label: "Código por SMS", detail: "Te llega un mensaje con un código", safe: true },
        { id: "question", label: "Pregunta secreta", detail: "¿Cómo se llama tu mascota?", safe: false },
      ],
      badge: true,
    },
    {
      type: "inbox",
      title: "¿Real o trampa?",
      hint: "No todos los mensajes son trampas. Clasificá cada uno. Pista: lo que manda Pixa de verdad viene de pixa.com.",
      messages: [
        {
          from: "Rayo Envíos",
          address: "avisos@rayo-envios.com.co",
          text: "Tu paquete quedó retenido. Pagá $499 de aduana hoy en rayo-envios.com.co/pago o lo devolvemos.",
          trap: true,
          wrong: "Pagaste $499 y le diste tu tarjeta a otra persona. ¿Esperabas un paquete? Un cobro inesperado por link y con apuro es una trampa clásica.",
        },
        {
          from: "Pixa",
          address: "no-responder@pixa.com",
          text: "Nuevo inicio de sesión en tu cuenta desde una Chromebook. Si fuiste vos, no hace falta que hagas nada.",
          trap: false,
          wrong: "Era real: viene de pixa.com, no te pide nada y no tiene links. Estos avisos te ayudan a detectar intrusos.",
        },
        {
          from: "Premios Pixa",
          address: "premios@pixa-regalos.win",
          text: "¡Ganaste un celular nuevo! Para reclamarlo, ingresá tu usuario y contraseña en pixa-regalos.win",
          trap: true,
          wrong: "Le diste tu contraseña a otra persona. No viene de pixa.com, y ningún servicio real te pide la contraseña por mensaje.",
        },
        {
          from: "Escuela N.º 12",
          address: "secretaria@escuela12.edu.ar",
          text: "Recordatorio: el jueves la clase de Programación es en el aula 12. ¡Los esperamos!",
          trap: false,
          wrong: "Era real y te perdiste el cambio de aula: no pide datos, ni plata, ni tiene links. Cuidarse no es desconfiar de todo.",
        },
      ],
    },
    {
      type: "chat",
      title: "El código es sólo tuyo",
      hint: "Te escribe Sofi, una amiga. ¿Es realmente ella?",
      contact: "Sofi",
      code: "482 913",
    },
  ];

  // Intentos por segundo de quien quiere adivinar una contraseña filtrada.
  const GUESSES_PER_SECOND = 1e6;
  const YEAR = 365 * 24 * 3600;

  const game = document.querySelector(".security-game");
  if (!game) return;

  const phone = game.querySelector("[data-phone]");
  const screen = game.querySelector("[data-screen]");
  const phoneStatus = game.querySelector("[data-phone-status]");
  const controls = game.querySelector("[data-controls]");
  const feedback = game.querySelector("[data-feedback]");
  const retryButton = game.querySelector("[data-retry]");
  const nextButton = game.querySelector("[data-next-level]");
  const finishLink = game.querySelector("[data-finish-link]");
  const successPanel = document.querySelector("[data-success-panel]");
  const continueButton = document.querySelector("[data-continue-levels]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const badgeLevel = levels.findIndex((level) => level.badge);
  // Con movimiento reducido, las escenas pasan casi sin pausas.
  const SPEED = reduceMotion ? 0.15 : 1;

  let currentLevel = 0;
  let levelComplete = false;
  // Cada vez que se dibuja un nivel cambia `run`: así las animaciones del nivel anterior se cortan.
  let run = 0;
  let onRetry = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function actionButton(text, className, onClick) {
    const button = el("button", className, text);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  // Espera y devuelve si el nivel sigue en pantalla (nadie reinició ni cambió de nivel).
  async function pause(milliseconds, id) {
    await wait(milliseconds * SPEED);
    return id === run;
  }

  function setFeedback(message, type = "neutral") {
    feedback.textContent = message;
    feedback.dataset.type = type;
  }

  function setStatus(message, type = "neutral") {
    phoneStatus.textContent = message;
    phoneStatus.dataset.type = type;
  }

  function appBar(title, detail) {
    const bar = el("div", "app-bar");
    bar.append(el("strong", "", title));
    if (detail) bar.append(el("span", "", detail));
    return bar;
  }

  function showScreen(...nodes) {
    screen.replaceChildren(...nodes);
    screen.scrollTop = 0;
  }

  function showControls(...nodes) {
    controls.replaceChildren(...nodes);
  }

  function setButtonsDisabled(container, disabled) {
    container.querySelectorAll("button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  // Un error nunca bloquea: se explica qué pasó y se ofrece volver a intentar.
  function fail(message, retry) {
    setFeedback(message, "error");
    onRetry = retry;
    retryButton.hidden = false;
    retryButton.focus();
  }

  function winLevel(summary) {
    levelComplete = true;
    retryButton.hidden = true;
    setButtonsDisabled(controls, true);
    setButtonsDisabled(screen, true);

    if (currentLevel === badgeLevel) {
      setFeedback(`¡Misión cumplida! ${summary}`, "success");
      const id = run;
      return wait(reduceMotion ? 100 : 1400).then(() => {
        if (id === run) window.MissionProgress?.complete("seguridad");
      });
    }

    if (currentLevel === levels.length - 1) {
      setFeedback(`¡Superaste todos los niveles! ${summary} Pensaste como alguien que cuida a las personas y sus datos.`, "success");
      finishLink.hidden = false;
      finishLink.focus();
      return Promise.resolve();
    }

    setFeedback(`¡Nivel superado! ${summary}`, "success");
    nextButton.hidden = false;
    nextButton.focus();
    return Promise.resolve();
  }

  // Nivel 1: encontrar las pistas de un mensaje de phishing.
  function renderClues(level, id) {
    const clues = level.parts.filter((part) => part.clue);
    const found = new Set();

    function partButton(part) {
      const button = actionButton(part.text, "clue", () => {
        if (!part.clue) {
          setFeedback(part.note);
          return;
        }
        found.add(part);
        button.classList.add("is-found");
        button.setAttribute("aria-pressed", "true");
        renderCounter();
        setFeedback(
          found.size === clues.length
            ? `${part.clue} ¡Encontraste las ${clues.length} pistas! ¿Qué hacés con el mensaje?`
            : part.clue,
        );
      });
      button.setAttribute("aria-pressed", "false");
      return button;
    }

    const thread = el("div", "sms");
    const from = el("div", "sms__from");
    const bubble = el("p", "sms__bubble");
    level.parts.forEach((part) => {
      if (part.sender) {
        from.append(el("span", "", "De:"), partButton(part));
        return;
      }
      if (bubble.childNodes.length > 0) bubble.append(" ");
      bubble.append(partButton(part));
    });
    thread.append(from, bubble, el("span", "sms__time", "Hoy 10:42"));
    const smsScreen = [appBar("Mensajes"), thread];

    const counter = el("p", "clue-counter");
    const decision = el("div", "security-options");
    decision.append(
      actionButton("🗑️ Borrar y reportar", "security-option", reportMessage),
      actionButton("🔗 Entrar al link", "security-option", openLink),
    );

    function renderCounter() {
      const pips = el("span", "clue-counter__pips", clues.map((clue) => (found.has(clue) ? "●" : "○")).join(""));
      pips.setAttribute("aria-hidden", "true");
      counter.replaceChildren(pips, ` Pistas encontradas: ${found.size} de ${clues.length}`);
      decision.hidden = found.size < clues.length;
    }

    function openLink() {
      setButtonsDisabled(decision, true);
      const page = el("div", "fake-page");
      page.append(
        el("p", "fake-page__url", "🔒 pixa-seguridad.co/login"),
        el("p", "fake-page__logo", "pixa"),
        el("p", "fake-page__title", "Verificá tu cuenta para no perderla"),
        el("span", "fake-page__input", "Usuario"),
        el("span", "fake-page__input", "Contraseña"),
        el("span", "fake-page__submit", "Verificar"),
      );
      showScreen(page);
      setStatus("⚠ Página falsa", "error");
      fail(
        "La página copia a Pixa, pero su dirección no es pixa.com. Si escribías tu contraseña, le llegaba a otra persona.",
        () => {
          showScreen(...smsScreen);
          setButtonsDisabled(decision, false);
          setFeedback("Volviste al mensaje. ¿Qué otra cosa podés hacer?");
        },
      );
    }

    async function reportMessage() {
      setButtonsDisabled(decision, true);
      setButtonsDisabled(thread, true);
      thread.classList.add("is-reported");
      if (!(await pause(650, id))) return;
      showScreen(appBar("Mensajes"), el("p", "screen-note", "🗑️ Mensaje borrado y reportado como fraude."));
      setStatus("✓ A salvo", "success");
      winLevel("Detectaste el engaño sin tocar el link.");
    }

    showScreen(...smsScreen);
    showControls(counter, decision);
    renderCounter();
    setFeedback("Tocá las partes del mensaje que te hagan desconfiar.");
  }

  function guessSeconds(bits) {
    return 2 ** bits / GUESSES_PER_SECOND;
  }

  function formatDuration(seconds) {
    if (seconds < 1) return "al instante";
    if (seconds >= 1e6 * YEAR) return "millones de años";
    if (seconds >= 1000 * YEAR) return "miles de años";
    const units = [
      [YEAR, "año", "años"],
      [86400, "día", "días"],
      [3600, "hora", "horas"],
      [60, "minuto", "minutos"],
      [1, "segundo", "segundos"],
    ];
    const [size, one, many] = units.find(([unit]) => seconds >= unit);
    const amount = Math.floor(seconds / size);
    return `${amount} ${amount === 1 ? one : many}`;
  }

  // Nivel 2: armar una contraseña larga sin datos que el atacante conoce.
  function renderPassword(level) {
    const chosen = [];
    const field = el("div", "password-field");
    const time = el("strong", "", "—");
    const strength = el("span", "password-meter__strength");
    const meter = el("div", "password-meter");
    const meterLabel = el("div", "password-meter__label");
    const track = el("div", "password-meter__track");
    meterLabel.append(el("span", "", "Tiempo para adivinarla"), time);
    track.append(el("span", "password-meter__fill"));
    track.setAttribute("aria-hidden", "true");
    meter.append(meterLabel, track, strength);
    showScreen(appBar("Pixa", "Cambiar contraseña"), el("p", "screen-label", "Nueva contraseña"), field, meter);

    const known = el("div", "attacker-knows");
    const knownList = el("ul");
    level.known.forEach((fact) => knownList.append(el("li", "", fact)));
    known.append(el("strong", "", "Lo que el atacante sabe de vos"), el("small", "", "Lo vio en tus fotos de Pixa"), knownList);

    const pieces = el("div", "password-pieces");
    pieces.setAttribute("role", "group");
    pieces.setAttribute("aria-label", "Fichas para la contraseña");
    const pieceButtons = level.pieces.map((piece) => actionButton(piece.text, "password-piece", () => addPiece(piece)));
    pieces.append(...pieceButtons);

    const clearButton = actionButton("Borrar", "button button--secondary", () => {
      chosen.length = 0;
      setStatus("");
      update();
      setFeedback("Contraseña borrada. Probá otra combinación.");
    });
    const saveButton = actionButton("Guardar contraseña", "button button--primary", save);
    const row = el("div", "security-row");
    row.append(clearButton, saveButton);
    showControls(known, pieces, row);

    const bits = () => chosen.reduce((sum, piece) => sum + piece.bits, 0);

    function update() {
      const total = bits();
      const rating = total >= level.targetBits ? "strong" : total >= 30 ? "medium" : "weak";
      field.replaceChildren(
        ...(chosen.length > 0
          ? chosen.map((piece) => el("span", "password-field__piece", piece.text))
          : [el("span", "password-field__empty", "Tocá las fichas")]),
      );
      time.textContent = chosen.length > 0 ? formatDuration(guessSeconds(total)) : "—";
      meter.dataset.strength = chosen.length > 0 ? rating : "";
      meter.style.setProperty("--fill", String(chosen.length > 0 ? Math.max(total / level.targetBits, 0.04) : 0));
      strength.textContent = chosen.length > 0 ? { weak: "Débil", medium: "Regular", strong: "Fuerte ✓" }[rating] : "";
      pieceButtons.forEach((button, index) => {
        button.disabled = levelComplete || chosen.includes(level.pieces[index]);
      });
      clearButton.disabled = levelComplete || chosen.length === 0;
      saveButton.disabled = levelComplete || chosen.length === 0;
    }

    function addPiece(piece) {
      if (levelComplete || chosen.includes(piece)) return;
      chosen.push(piece);
      setStatus("");
      update();
      setFeedback(piece.note ?? `“${piece.text}” suma: ahora tardaría ${formatDuration(guessSeconds(bits()))} en adivinarla.`);
    }

    function save() {
      const total = bits();
      const duration = formatDuration(guessSeconds(total));
      if (total >= level.targetBits) {
        setStatus("✓ Contraseña fuerte", "success");
        winLevel(`Adivinarla llevaría ${duration}. Varias palabras al azar le ganan a cualquier símbolo raro.`);
        return;
      }
      setStatus(`⚠ Adivinada: ${duration}`, "error");
      const usesPersonal = chosen.some((piece) => piece.bits <= 1);
      setFeedback(
        usesPersonal && total < 30
          ? "Firulais y 2009 están en tus fotos: son lo primero que prueba un atacante. Sumá palabras al azar."
          : "Todavía es fácil de adivinar. Cada palabra al azar la vuelve miles de veces más difícil: ¿cuántas hacen falta?",
        "error",
      );
    }

    update();
    setFeedback("Tocá una ficha para empezar. El medidor muestra cuánto tardaría una computadora en adivinarla.");
  }

  // Nivel 3: con la contraseña filtrada, sólo un segundo factor frena al atacante.
  function renderTwoFactor(level, id) {
    let enabled = false;
    let method = null;
    let busy = true;

    const settings = el("div", "security-settings");
    const toggle = actionButton("", "security-switch", () => {
      enabled = !enabled;
      if (!enabled) method = null;
      renderSettings();
    });
    toggle.setAttribute("role", "switch");
    const methods = el("div", "security-methods");
    methods.setAttribute("role", "group");
    methods.setAttribute("aria-label", "¿Cómo querés confirmar que sos vos?");
    const methodButtons = level.methods.map((option) => {
      const button = actionButton("", "security-method", () => {
        method = option.id;
        renderSettings();
      });
      button.append(el("strong", "", option.label), el("small", "", option.detail));
      methods.append(button);
      return button;
    });
    const attackButton = actionButton("Repetir el ataque ▶", "button button--primary", replay);
    settings.append(el("strong", "security-settings__title", "⚙️ Ajustes de tu cuenta"), toggle, methods, attackButton);

    function renderSettings() {
      toggle.setAttribute("aria-checked", String(enabled));
      toggle.replaceChildren(
        el("span", "security-switch__label", "Verificación en dos pasos"),
        el("span", "security-switch__state", enabled ? "Activada" : "Desactivada"),
      );
      methods.hidden = !enabled;
      methodButtons.forEach((button, index) => {
        button.setAttribute("aria-pressed", String(level.methods[index].id === method));
      });
      setButtonsDisabled(settings, busy || levelComplete);
    }

    function row(label, value) {
      const line = el("p", "attack__row");
      line.append(el("span", "", label), value);
      return line;
    }

    async function type(target, text, id) {
      for (const character of text) {
        target.textContent += character;
        if (!(await pause(85, id))) return false;
      }
      return true;
    }

    // Muestra el intento de entrada del otro lado. Devuelve false si el nivel se cortó.
    async function attack(mode) {
      const password = el("span", "attack__value");
      const log = el("div", "attack");
      log.append(row("Usuario", el("span", "attack__value", "vos@pixa")), row("Contraseña", password));
      showScreen(appBar("💻 Otra persona", "en otra ciudad"), el("p", "screen-label", "Iniciar sesión en Pixa"), log);
      setStatus("");

      if (!(await type(password, "••••••••", id))) return false;
      password.textContent += " ✓";
      if (!(await pause(450, id))) return false;

      if (mode === "question") {
        const answer = el("span", "attack__value");
        log.append(row("¿Cómo se llama tu mascota?", answer));
        if (!(await pause(500, id))) return false;
        if (!(await type(answer, "Firulais", id))) return false;
        answer.textContent += " ✓";
        if (!(await pause(450, id))) return false;
      }

      if (mode === "safe") {
        log.append(row("Código que llegó a tu celular", el("span", "attack__value attack__value--missing", "_ _ _ _ _ _")));
        if (!(await pause(1100, id))) return false;
        log.append(el("p", "attack__result attack__result--blocked", "✗ Sin tu celular, no puede entrar"));
        setStatus("✓ Frenado", "success");
        return true;
      }

      log.append(el("p", "attack__result attack__result--in", "⚠ Entró a tu cuenta"));
      setStatus("⚠ Entró", "error");
      return true;
    }

    async function replay() {
      const option = level.methods.find((item) => item.id === method);
      const mode = !enabled || !option ? "none" : option.safe ? "safe" : "question";
      busy = true;
      renderSettings();
      setFeedback("Repitiendo el ataque…");
      if (!(await attack(mode))) return;

      if (mode === "safe") {
        showAlert(option);
        return;
      }

      busy = false;
      renderSettings();
      if (mode === "question") {
        setFeedback(
          "El atacante vio las fotos de Firulais: una pregunta secreta es otra contraseña fácil de adivinar. Elegí algo que sólo vos tengas.",
          "error",
        );
      } else {
        setFeedback(
          enabled
            ? "Activaste el segundo paso, pero falta elegir cómo confirmar que sos vos."
            : "Sin un segundo paso, la contraseña sola alcanza para entrar. Activá la verificación en dos pasos.",
          "error",
        );
      }
    }

    function showAlert(option) {
      const alert = el("div", "phone-alert");
      const actions = el("div", "phone-alert__actions");
      actions.append(
        actionButton("Sí, fui yo", "phone-alert__button", () => {
          setFeedback("Si confirmás un intento que no hiciste, le abrís la puerta. Vos no estás en otra ciudad…", "error");
        }),
        actionButton("No fui yo", "phone-alert__button phone-alert__button--primary", () => blockAttack(option)),
      );
      alert.append(el("strong", "", "📱 Tu celular · Pixa"), el("p", "", "Alguien intenta entrar a tu cuenta desde otra ciudad. ¿Sos vos?"), actions);
      screen.append(alert);
      screen.scrollTop = screen.scrollHeight;
      setFeedback("¡El segundo paso lo frenó! Y llegó un aviso a tu celular. ¿Qué respondés?");
    }

    function blockAttack(option) {
      showScreen(appBar("Pixa", "Seguridad"), el("p", "screen-note", "🛡️ Bloqueamos el intento. Te recomendamos cambiar tu contraseña."));
      setStatus("✓ Cuenta a salvo", "success");
      winLevel(
        option.id === "sms"
          ? "Aunque tenía tu contraseña, el segundo paso lo frenó. El SMS sirve; una app de autenticación es todavía más segura."
          : "Aunque tenía tu contraseña, el segundo paso lo frenó: sin tu celular, no pasa.",
      );
    }

    showControls(settings);
    renderSettings();
    setFeedback("Mirá lo que pasa: alguien consiguió tu contraseña…");

    (async () => {
      if (!(await pause(600, id))) return;
      if (!(await attack("none"))) return;
      busy = false;
      renderSettings();
      setFeedback("Tu contraseña se filtró de otro sitio y alguien la usó para entrar. Activá un segundo paso en Ajustes y repetí el ataque.");
    })();
  }

  // Nivel 4: separar trampas de avisos reales, sin desconfiar de todo.
  function renderInbox(level) {
    const choices = new Map();
    const list = el("ul", "inbox");

    const entries = level.messages.map((message) => {
      const item = el("li", "inbox-item");
      const from = el("p", "inbox-item__from");
      from.append(el("strong", "", message.from), el("span", "inbox-item__address", message.address));
      const buttons = el("div", "inbox-item__choices");
      buttons.setAttribute("role", "group");
      buttons.setAttribute("aria-label", `Mensaje de ${message.from}: ¿real o trampa?`);
      const real = actionButton("✓ Real", "inbox-choice", () => choose(entry, "real"));
      const trap = actionButton("⚠ Trampa", "inbox-choice inbox-choice--trap", () => choose(entry, "trap"));
      [real, trap].forEach((button) => button.setAttribute("aria-pressed", "false"));
      buttons.append(real, trap);
      const explain = el("p", "inbox-item__explain");
      explain.hidden = true;
      item.append(from, el("p", "inbox-item__text", message.text), buttons, explain);
      list.append(item);
      const entry = { message, item, real, trap, explain };
      return entry;
    });

    const counter = el("p", "clue-counter");
    const review = actionButton("Revisar bandeja", "button button--primary", check);
    showScreen(appBar("Correo", "Bandeja de entrada"), list);
    showControls(counter, review);

    function update() {
      counter.textContent = `Clasificados: ${choices.size} de ${entries.length}`;
      review.disabled = levelComplete || choices.size < entries.length;
    }

    function choose(entry, choice) {
      choices.set(entry, choice);
      entry.real.setAttribute("aria-pressed", String(choice === "real"));
      entry.trap.setAttribute("aria-pressed", String(choice === "trap"));
      entry.item.classList.remove("is-wrong");
      entry.explain.hidden = true;
      setStatus("");
      update();
    }

    function check() {
      const wrong = entries.filter((entry) => (choices.get(entry) === "trap") !== entry.message.trap);
      if (wrong.length === 0) {
        entries.forEach((entry) => entry.item.classList.add("is-right"));
        setStatus("✓ Bandeja en orden", "success");
        winLevel("Separaste las trampas sin descartar los avisos reales.");
        return;
      }
      wrong.forEach((entry) => {
        entry.item.classList.add("is-wrong");
        entry.explain.textContent = entry.message.wrong;
        entry.explain.hidden = false;
      });
      wrong[0].item.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      setStatus(`⚠ ${wrong.length} ${wrong.length === 1 ? "error" : "errores"}`, "error");
      setFeedback(
        `${wrong.length === 1 ? "Un mensaje quedó mal clasificado" : `${wrong.length} mensajes quedaron mal clasificados`}. Leé qué pasó y cambiá tu elección.`,
        "error",
      );
    }

    update();
    setFeedback("Marcá cada mensaje como real o trampa y después revisá la bandeja.");
  }

  // Nivel 5: ingeniería social. El código de verificación no se comparte con nadie.
  function renderChat(level, id) {
    let asked = false;
    let busy = true;
    const chat = el("ol", "chat");
    const sms = el("div", "phone-alert phone-alert--top");
    sms.append(el("strong", "", "✉️ SMS · Pixa"), el("p", "", `Tu código es ${level.code}. No lo compartas con nadie.`));
    sms.hidden = true;
    showScreen(appBar(`💬 ${level.contact}`, "en línea"), sms, chat);

    const options = el("div", "security-options");
    const sendButton = actionButton("Mandarle el código", "security-option", sendCode);
    const askButton = actionButton("Preguntarle para qué es", "security-option", ask);
    const callButton = actionButton(`Llamar a ${level.contact} por teléfono`, "security-option", call);
    options.append(sendButton, askButton, callButton);
    showControls(el("strong", "security-controls__title", "¿Qué hacés?"), options);

    function setBusy(value) {
      busy = value;
      [sendButton, askButton, callButton].forEach((button) => {
        button.disabled = busy || levelComplete || (button === askButton && asked);
      });
    }

    function say(who, text) {
      chat.append(el("li", `chat__${who}`, text));
      screen.scrollTop = screen.scrollHeight;
    }

    async function script(steps) {
      for (const [delay, action] of steps) {
        if (!(await pause(delay, id))) return false;
        action();
      }
      return true;
    }

    async function sendCode() {
      setBusy(true);
      say("me", level.code);
      const alive = await script([
        [800, () => say("them", "graciaas!! 😘")],
        [900, () => say("notice", "Se cerró tu sesión de Pixa en este celular")],
      ]);
      if (!alive) return;
      sms.hidden = true;
      setStatus("⚠ Cuenta robada", "error");
      fail(
        `Ese código era la llave de TU cuenta. Con él, otra persona entró y ahora les pide lo mismo a tus contactos. La cuenta de ${level.contact} también había sido robada.`,
        renderLevel,
      );
    }

    async function ask() {
      asked = true;
      setBusy(true);
      say("me", "¿para qué sorteo?");
      if (!(await script([[900, () => say("them", "después te explico!! pasámelo ya que se vence 😩")]]))) return;
      setBusy(false);
      setFeedback(`Esquiva la pregunta y te apura otra vez. ¿Cómo podés saber si de verdad es ${level.contact}?`);
    }

    async function call() {
      setBusy(true);
      say("notice", `📞 Llamando a ${level.contact}…`);
      const alive = await script([
        [1100, () => say("notice", `${level.contact}: “¡No fui yo! Me robaron la cuenta ayer. No le pases el código a nadie.”`)],
      ]);
      if (!alive) return;
      setStatus("✓ Cuenta a salvo", "success");
      winLevel("Confirmaste por otro medio y no compartiste el código: ese número es sólo tuyo.");
    }

    setBusy(true);
    setFeedback(`Te llegan mensajes de ${level.contact}…`);
    script([
      [500, () => say("them", "holaa! 😊")],
      [800, () => say("them", "te llegó un código por SMS? te lo mandé por error")],
      [700, () => {
        sms.hidden = false;
      }],
      [900, () => say("them", "me lo pasás? es para un sorteo, porfa rápido que se vence 🙏")],
    ]).then((alive) => {
      if (!alive) return;
      setBusy(false);
      setFeedback(`${level.contact} te pide el código que acaba de llegarte. ¿Qué hacés?`);
    });
  }

  const renderers = {
    clues: renderClues,
    password: renderPassword,
    twofactor: renderTwoFactor,
    inbox: renderInbox,
    chat: renderChat,
  };

  function renderLevel() {
    const level = levels[currentLevel];
    run += 1;
    levelComplete = false;
    onRetry = null;

    game.querySelector("[data-level-number]").textContent = `Nivel ${currentLevel + 1} de ${levels.length}`;
    game.querySelector("[data-level-title]").textContent = level.title;
    game.querySelector("[data-level-hint]").textContent = level.hint;

    const dots = game.querySelector("[data-level-dots]");
    dots.replaceChildren();
    levels.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "level-dot";
      dot.classList.toggle("is-complete", index < currentLevel);
      dot.classList.toggle("is-current", index === currentLevel);
      dot.classList.toggle("is-badge", index === badgeLevel);
      dot.textContent = String(index + 1);
      dots.append(dot);
    });

    retryButton.hidden = true;
    nextButton.hidden = true;
    finishLink.hidden = true;
    phone.className = `security-phone security-phone--${level.type}`;
    setStatus("");
    renderers[level.type](level, run);
  }

  retryButton.addEventListener("click", () => {
    const retry = onRetry;
    onRetry = null;
    retryButton.hidden = true;
    setStatus("");
    retry?.();
  });

  nextButton.addEventListener("click", () => {
    currentLevel += 1;
    renderLevel();
    game.focus();
  });

  if (continueButton) {
    continueButton.innerHTML = `Seguir con el nivel ${badgeLevel + 2} <span aria-hidden="true">→</span>`;
    continueButton.hidden = badgeLevel === levels.length - 1;
    continueButton.addEventListener("click", () => {
      successPanel.hidden = true;
      game.hidden = false;
      currentLevel = badgeLevel + 1;
      renderLevel();
      game.focus();
    });
  }

  document.querySelector('[data-restart-challenge="seguridad"]')?.addEventListener("click", () => {
    currentLevel = 0;
    renderLevel();
  });

  renderLevel();
})();
