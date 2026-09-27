(function () {
  "use strict";

  // Cada recurso tarda `seconds` segundos simulados en descargarse y pesa `mb` megas.
  // `named` es el nombre con artículo, para armar frases.
  // `feature` es la parte del celular que aparece cuando llega.
  const resources = {
    html: { icon: "</>", label: "HTML", named: "el HTML", role: "El plano de la página", seconds: 0.5, mb: 0.05, feature: "html" },
    css: { icon: "#", label: "CSS", named: "el CSS", role: "Colores y diseño", seconds: 0.5, mb: 0.1, feature: "css" },
    image: { icon: "img", label: "Foto de portada", named: "la foto de portada", role: "Lo primero que se ve", seconds: 2, mb: 0.8, feature: "image" },
    bigImage: {
      icon: "img",
      label: "Foto de portada",
      named: "la foto de portada",
      role: "Lo primero que se ve, sin comprimir",
      seconds: 4,
      mb: 3,
      feature: "image",
      optimized: { seconds: 1, mb: 0.4 },
    },
    js: { icon: "{ }", label: "JavaScript", named: "el JavaScript", role: "Hace funcionar el botón", seconds: 1, mb: 0.3, feature: "js" },
    font: { icon: "Aa", label: "Fuente", named: "la fuente", role: "La letra especial del título", seconds: 1, mb: 0.2, feature: "font" },
    video: { icon: "▶", label: "Video", named: "el video", role: "Resumen del evento", seconds: 5, mb: 6, feature: "video", deferrable: true },
    gallery: { icon: "⊞", label: "Galería", named: "la galería", role: "Fotos al final de la página", seconds: 3, mb: 3, feature: "gallery", deferrable: true },
  };

  // Cada nivel suma una idea nueva. `badge: true` marca el nivel que otorga la insignia;
  // los niveles siguientes son para quien quiera seguir. `essentials` son los recursos
  // que hacen falta para que la página ya sirva; `patience` es cuánto espera la persona.
  const levels = [
    {
      title: "El plano primero",
      hint: "Tocá los recursos en el orden en que el navegador debería pedirlos. Pista: el HTML es el plano de la página.",
      resources: ["css", "image", "html"],
      essentials: ["html", "css", "image"],
      patience: 3.5,
    },
    {
      title: "Lo importante primero",
      hint: "Llegó un video pesado. ¿Hace falta para empezar a usar la página?",
      resources: ["video", "image", "css", "html"],
      essentials: ["html", "css", "image"],
      patience: 3.5,
    },
    {
      title: "Que el botón funcione",
      hint: "La persona quiere tocar “Quiero participar”. ¿Qué necesita sí o sí y qué puede esperar?",
      resources: ["font", "js", "video", "html", "image", "css"],
      essentials: ["html", "css", "image", "js"],
      patience: 4.5,
      badge: true,
    },
    {
      title: "Achicá la foto",
      hint: "La foto de portada es enorme: ni el mejor orden alcanza. En la cola, tocá “Optimizar” para comprimirla.",
      resources: ["bigImage", "video", "js", "font", "html", "css"],
      essentials: ["html", "css", "bigImage", "js"],
      patience: 3.5,
      actions: ["optimize"],
    },
    {
      title: "Cuidá los datos",
      hint: "Quien visita usa los datos de su celular. Lo que está al final de la página puede cargarse recién cuando baje.",
      resources: ["gallery", "bigImage", "video", "font", "js", "css", "html"],
      essentials: ["html", "css", "bigImage", "js"],
      patience: 3.5,
      dataLimit: 2,
      actions: ["optimize", "defer"],
    },
  ];

  // Lo que se pide antes del HTML rebota: el navegador todavía no sabe que existe.
  const BLIND_PENALTY = 1;

  function cost(entry) {
    const detail = resources[entry.id];
    return entry.optimized && detail.optimized ? detail.optimized : detail;
  }

  // Calcula qué pasa al cargar la cola, sin tocar la pantalla.
  function simulate(level, queue) {
    const htmlIndex = queue.findIndex((entry) => entry.id === "html");
    const blind = queue.slice(0, htmlIndex);
    const timeline = [];
    let time = 0;
    let dataUsed = 0;

    blind.forEach((entry) => {
      timeline.push({ entry, type: "blind", start: time, end: time + BLIND_PENALTY });
      time += BLIND_PENALTY;
    });

    // Al leer el HTML, el navegador descubre lo que había rebotado y lo vuelve a pedir.
    [queue[htmlIndex], ...blind, ...queue.slice(htmlIndex + 1)].forEach((entry) => {
      if (entry.deferred) {
        timeline.push({ entry, type: "deferred", start: time, end: time });
        return;
      }
      const { seconds, mb } = cost(entry);
      timeline.push({ entry, type: "load", start: time, end: time + seconds });
      time += seconds;
      dataUsed += mb;
    });

    const usefulAt = Math.max(
      ...timeline
        .filter((segment) => segment.type === "load" && level.essentials.includes(segment.entry.id))
        .map((segment) => segment.end),
    );
    const result = { timeline, usefulAt, dataUsed, reason: null, culprit: null };

    if (usefulAt > level.patience) {
      const extras = timeline
        .filter((segment) => segment.type === "load" && segment.end <= usefulAt && !level.essentials.includes(segment.entry.id))
        .sort((first, second) => cost(second.entry).seconds - cost(first.entry).seconds);
      const heavy = queue.find((entry) => resources[entry.id].optimized && !entry.optimized);

      if (blind.length > 0) {
        result.reason = "blind";
        result.culprit = blind[0];
      } else if (extras.length > 0) {
        result.reason = "extra";
        result.culprit = extras[0].entry;
      } else {
        result.reason = "heavy";
        result.culprit = heavy || queue[queue.length - 1];
      }
    } else if (level.dataLimit && dataUsed > level.dataLimit) {
      const downloaded = queue
        .filter((entry) => !entry.deferred && (resources[entry.id].deferrable || (resources[entry.id].optimized && !entry.optimized)))
        .sort((first, second) => cost(second).mb - cost(first).mb);
      result.reason = "data";
      result.culprit = downloaded[0] || null;
    }

    return result;
  }

  const game = document.querySelector(".web-game");
  if (!game) return;

  const phone = game.querySelector("[data-phone]");
  const phoneStatus = game.querySelector("[data-phone-status]");
  const stage = game.querySelector("[data-stage]");
  const palette = game.querySelector("[data-palette]");
  const queueList = game.querySelector("[data-queue]");
  const feedback = game.querySelector("[data-feedback]");
  const clock = game.querySelector("[data-clock]");
  const visitor = game.querySelector("[data-visitor]");
  const patienceMeter = game.querySelector("[data-patience]");
  const dataMeter = game.querySelector("[data-data-meter]");
  const runButton = game.querySelector("[data-run-load]");
  const clearButton = game.querySelector("[data-clear-queue]");
  const nextButton = game.querySelector("[data-next-level]");
  const finishLink = game.querySelector("[data-finish-link]");
  const successPanel = document.querySelector("[data-success-panel]");
  const continueButton = document.querySelector("[data-continue-levels]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const badgeLevel = levels.findIndex((level) => level.badge);
  // Milisegundos reales que dura un segundo simulado.
  const SECOND = reduceMotion ? 60 : 380;

  const secondsFormat = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const megabytesFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
  const formatSeconds = (value) => `${secondsFormat.format(value)} s`;
  const formatMegabytes = (value) => `${megabytesFormat.format(value)} MB`;

  let currentLevel = 0;
  // Cada entrada es { id, optimized, deferred }, en el orden en que se piden.
  let queue = [];
  let running = false;
  let levelComplete = false;

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function hasAction(action) {
    return Boolean(levels[currentLevel].actions?.includes(action));
  }

  function setFeedback(message, type = "neutral") {
    feedback.textContent = message;
    feedback.dataset.type = type;
  }

  function setStatus(message, type = "neutral") {
    phoneStatus.textContent = message;
    phoneStatus.dataset.type = type;
  }

  function setMeter(meter, ratio) {
    meter.style.setProperty("--fill", String(Math.min(ratio, 1)));
  }

  function updateClock(time) {
    const level = levels[currentLevel];
    const ratio = time / level.patience;
    clock.textContent = formatSeconds(time);
    setMeter(patienceMeter, ratio);
    patienceMeter.classList.toggle("is-warning", ratio >= 0.8);
    visitor.textContent = ratio < 0.5 ? "🙂" : ratio < 0.8 ? "😐" : "😬";
  }

  function updateData(used) {
    const level = levels[currentLevel];
    if (!level.dataLimit) return;
    dataMeter.querySelector("[data-data-used]").textContent = formatMegabytes(used);
    setMeter(dataMeter, used / level.dataLimit);
    dataMeter.classList.toggle("is-warning", used > level.dataLimit);
  }

  function resetStage() {
    const level = levels[currentLevel];
    phone.className = "web-phone";
    level.resources.forEach((id) => phone.classList.add(`uses-${resources[id].feature}`));
    setStatus("");
    patienceMeter.classList.remove("is-warning", "is-useful");
    updateClock(0);
    dataMeter.hidden = !level.dataLimit;
    if (level.dataLimit) {
      dataMeter.querySelector("[data-data-limit]").textContent = formatMegabytes(level.dataLimit);
      updateData(0);
    }
  }

  function renderPalette() {
    const level = levels[currentLevel];
    palette.replaceChildren();

    level.resources.forEach((id) => {
      const detail = resources[id];
      const queued = queue.some((entry) => entry.id === id);
      const button = document.createElement("button");
      const costText = level.dataLimit
        ? `${formatSeconds(detail.seconds)} · ${formatMegabytes(detail.mb)}`
        : formatSeconds(detail.seconds);
      button.type = "button";
      button.className = "resource-chip";
      button.dataset.resource = id;
      button.disabled = running || levelComplete || queued;
      button.setAttribute("aria-label", `Agregar ${detail.label}: ${detail.role}. Tarda ${costText}.`);
      button.innerHTML = `<span class="resource-chip__icon" aria-hidden="true"></span><span class="resource-chip__name"></span><small class="resource-chip__cost"></small><span class="resource-chip__role"></span>`;
      button.querySelector(".resource-chip__icon").textContent = detail.icon;
      button.querySelector(".resource-chip__name").textContent = detail.label;
      button.querySelector(".resource-chip__cost").textContent = costText;
      button.querySelector(".resource-chip__role").textContent = detail.role;
      palette.append(button);
    });
  }

  function createTool(label, dataset, index, pressed, ariaLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "load-queue__tool";
    button.dataset[dataset] = String(index);
    button.disabled = running || levelComplete;
    button.setAttribute("aria-pressed", String(pressed));
    button.setAttribute("aria-label", ariaLabel);
    button.textContent = label;
    return button;
  }

  function createIconButton(icon, className, dataset, index, ariaLabel, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset[dataset] = String(index);
    button.disabled = running || levelComplete || disabled;
    button.setAttribute("aria-label", ariaLabel);
    button.innerHTML = `<span aria-hidden="true">${icon}</span>`;
    return button;
  }

  function renderQueue() {
    const level = levels[currentLevel];
    queueList.replaceChildren();

    if (queue.length === 0) {
      const placeholder = document.createElement("li");
      placeholder.className = "load-queue__empty";
      placeholder.textContent = "Lo que toques se descarga en este orden";
      queueList.append(placeholder);
    }

    queue.forEach((entry, index) => {
      const detail = resources[entry.id];
      const item = document.createElement("li");
      item.className = "load-queue__item";
      item.classList.toggle("is-deferred", entry.deferred);

      const costText = entry.deferred
        ? "al bajar"
        : level.dataLimit
          ? `${formatSeconds(cost(entry).seconds)} · ${formatMegabytes(cost(entry).mb)}`
          : formatSeconds(cost(entry).seconds);
      const label = document.createElement("span");
      label.className = "load-queue__label";
      label.innerHTML = `<span class="load-queue__index"></span><span class="load-queue__icon" aria-hidden="true"></span><span class="load-queue__name"></span><small></small>`;
      label.querySelector(".load-queue__index").textContent = String(index + 1);
      label.querySelector(".load-queue__icon").textContent = detail.icon;
      label.querySelector(".load-queue__name").textContent = detail.label;
      label.querySelector("small").textContent = costText;

      const tools = document.createElement("span");
      tools.className = "load-queue__tools";
      if (hasAction("optimize") && detail.optimized) {
        tools.append(
          createTool(
            entry.optimized ? "✓ Optimizada" : "Optimizar",
            "toggleOptimize",
            index,
            entry.optimized,
            `Optimizar ${detail.label}: comprimirla para que pese menos`,
          ),
        );
      }
      if (hasAction("defer") && detail.deferrable) {
        tools.append(
          createTool(
            entry.deferred ? "✓ Al bajar" : "Cargar al bajar",
            "toggleDefer",
            index,
            entry.deferred,
            `Cargar ${detail.label} recién cuando la persona baje por la página`,
          ),
        );
      }
      tools.append(
        createIconButton("↑", "load-queue__move", "moveUp", index, `Subir ${detail.label} un lugar`, index === 0),
        createIconButton("×", "load-queue__remove", "remove", index, `Quitar ${detail.label} de la cola`, false),
      );

      item.append(label, tools);
      queueList.append(item);
    });

    game.querySelector("[data-queue-count]").textContent = `${queue.length} de ${level.resources.length} recursos`;
  }

  function updateControls() {
    const level = levels[currentLevel];
    const missing = level.resources.length - queue.length;
    runButton.disabled = running || levelComplete || missing > 0;
    runButton.innerHTML =
      missing > 0
        ? `${missing === 1 ? "Falta" : "Faltan"} ${missing} por ordenar`
        : 'Cargar página <span aria-hidden="true">▶</span>';
    clearButton.disabled = running || queue.length === 0;
  }

  function refresh(message, type) {
    resetStage();
    renderPalette();
    renderQueue();
    updateControls();
    if (message) setFeedback(message, type);
  }

  function renderLevel() {
    const level = levels[currentLevel];
    queue = [];
    running = false;
    levelComplete = false;

    game.querySelector("[data-level-number]").textContent = `Nivel ${currentLevel + 1} de ${levels.length}`;
    game.querySelector("[data-level-title]").textContent = level.title;
    game.querySelector("[data-level-hint]").textContent = level.hint;
    game.querySelector("[data-patience-limit]").textContent = formatSeconds(level.patience);

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

    nextButton.hidden = true;
    finishLink.hidden = true;
    runButton.hidden = false;
    clearButton.hidden = false;
    refresh(
      currentLevel === 0
        ? "Tocá el recurso que el navegador debería pedir primero."
        : "Armá la cola y cargá la página cuando estés listo.",
    );
  }

  function addResource(id) {
    const level = levels[currentLevel];
    if (running || levelComplete || !level.resources.includes(id)) return;
    if (queue.some((entry) => entry.id === id)) return;

    queue.push({ id, optimized: false, deferred: false });
    const missing = level.resources.length - queue.length;
    refresh(
      missing > 0
        ? `${capitalize(resources[id].named)} va en el lugar ${queue.length}. ${missing === 1 ? "Falta" : "Faltan"} ${missing}.`
        : "La cola está completa. Tocá “Cargar página”.",
    );
  }

  function removeResource(index) {
    if (running || levelComplete) return;
    const [entry] = queue.splice(index, 1);
    refresh(`Quitaste ${resources[entry.id].named}. Tocá su ficha para volver a ponerla en la cola.`);
  }

  function moveUp(index) {
    if (running || levelComplete || index === 0) return;
    [queue[index - 1], queue[index]] = [queue[index], queue[index - 1]];
    refresh(`${capitalize(resources[queue[index - 1].id].named)} subió al lugar ${index}.`);
    queueList.querySelector(`[data-move-up="${index - 1}"]:not(:disabled)`)?.focus();
  }

  function toggleOptimize(index) {
    if (running || levelComplete) return;
    const entry = queue[index];
    entry.optimized = !entry.optimized;
    refresh(
      entry.optimized
        ? `Imagen comprimida: ahora tarda ${formatSeconds(cost(entry).seconds)}.`
        : "La imagen vuelve a su tamaño original.",
    );
    queueList.querySelector(`[data-toggle-optimize="${index}"]`)?.focus();
  }

  function toggleDefer(index) {
    if (running || levelComplete) return;
    const entry = queue[index];
    entry.deferred = !entry.deferred;
    refresh(
      entry.deferred
        ? `${capitalize(resources[entry.id].named)} se va a cargar recién cuando la persona baje.`
        : `${capitalize(resources[entry.id].named)} se descarga apenas abre la página.`,
    );
    queueList.querySelector(`[data-toggle-defer="${index}"]`)?.focus();
  }

  function clearQueue() {
    if (running) return;
    queue = [];
    refresh("Cola vacía. Probemos otro orden.");
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function animate(duration, onFrame) {
    return new Promise((resolve) => {
      if (duration <= 0) {
        onFrame(1);
        resolve();
        return;
      }
      const start = performance.now();
      function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        onFrame(progress);
        if (progress < 1) window.requestAnimationFrame(frame);
        else resolve();
      }
      window.requestAnimationFrame(frame);
    });
  }

  function failureMessage(level, result) {
    const name = result.culprit ? resources[result.culprit.id].named : "";

    switch (result.reason) {
      case "blind":
        return `El navegador pidió ${name} antes del HTML y no sabía para qué página era: perdió ${formatSeconds(BLIND_PENALTY)}. El HTML es el plano, va primero.`;
      case "extra":
        return result.culprit.id === "font"
          ? "La fuente demoró todo, y el texto ya se podía leer con la letra del sistema. Puede esperar."
          : `${capitalize(name)} demoró la página y no hacía falta para empezar a usarla: puede ir al final de la cola.`;
      case "heavy":
        return `${capitalize(name)} pesa demasiado: ni con el mejor orden llega a tiempo. Tocá “Optimizar” en la cola.`;
      case "data": {
        const spent = `La página se vio a tiempo, pero gastó ${formatMegabytes(result.dataUsed)} de datos y el tope es ${formatMegabytes(level.dataLimit)}.`;
        if (!result.culprit) return spent;
        return resources[result.culprit.id].deferrable
          ? `${spent} ${capitalize(name)} puede cargarse recién cuando la persona baje.`
          : `${spent} Probá optimizar ${name}.`;
      }
      default:
        return "La persona se fue antes de ver la página. Probá otro orden.";
    }
  }

  // Tras un intento fallido, la cola queda como terminó pero se puede volver a editar.
  function unlockQueue() {
    queueList.querySelectorAll("button").forEach((button) => {
      button.disabled = button.dataset.moveUp === "0";
    });
  }

  function markCulprit(result) {
    const index = queue.indexOf(result.culprit);
    if (index !== -1) queueList.children[index]?.classList.add("is-failed");
  }

  async function runLoad() {
    const level = levels[currentLevel];
    if (running || levelComplete || queue.length < level.resources.length) return;

    const result = simulate(level, queue);
    running = true;
    refresh("Cargando la página…");
    stage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });

    let useful = false;
    let gone = false;
    let dataUsed = 0;

    for (const segment of result.timeline) {
      const item = queueList.children[queue.indexOf(segment.entry)];
      const { feature } = resources[segment.entry.id];

      if (segment.type === "deferred") {
        item.classList.add("is-deferred");
        phone.classList.add(`defer-${feature}`);
        continue;
      }

      // Si la paciencia se agota durante este tramo, se anima sólo hasta ese momento.
      const stop = !useful && segment.end > level.patience ? Math.max(level.patience, segment.start) : segment.end;
      const share = (stop - segment.start) / (segment.end - segment.start);
      const { mb } = cost(segment.entry);

      item.classList.add(segment.type === "blind" ? "is-blind" : "is-loading");
      if (segment.type === "blind") setStatus(`¿${resources[segment.entry.id].label} para qué página?`, "error");

      await animate((stop - segment.start) * SECOND, (progress) => {
        if (!useful) updateClock(segment.start + (stop - segment.start) * progress);
        if (segment.type === "load") {
          item.style.setProperty("--progress", String(share * progress));
          updateData(dataUsed + mb * share * progress);
        }
      });

      item.classList.remove("is-loading", "is-blind");
      if (stop < segment.end) {
        gone = true;
        break;
      }

      if (segment.type === "blind") {
        setStatus("");
        continue;
      }

      dataUsed += mb;
      item.classList.add("is-done");
      phone.classList.add(`has-${feature}`);

      if (!useful && segment.end >= result.usefulAt) {
        useful = true;
        patienceMeter.classList.add("is-useful");
        visitor.textContent = "😀";
        setStatus(`Útil en ${formatSeconds(result.usefulAt)}`, "success");
        setFeedback(`¡La página ya sirve a los ${formatSeconds(result.usefulAt)}! Mirá cómo siguen llegando los demás recursos…`);
      }
    }

    running = false;

    if (gone) {
      phone.classList.add("is-gone");
      visitor.textContent = "🚶";
      setStatus(`Se fue a los ${formatSeconds(level.patience)}`, "error");
      markCulprit(result);
      unlockQueue();
      updateControls();
      setFeedback(`La persona se fue antes de poder usar la página. ${failureMessage(level, result)}`, "error");
      return;
    }

    if (result.reason === "data") {
      setStatus("Sin datos", "error");
      markCulprit(result);
      unlockQueue();
      updateControls();
      setFeedback(failureMessage(level, result), "error");
      return;
    }

    await finishLevel(result);
  }

  function finishLevel(result) {
    const level = levels[currentLevel];
    const summary = level.dataLimit
      ? `Útil en ${formatSeconds(result.usefulAt)} y sólo ${formatMegabytes(result.dataUsed)} de datos.`
      : `Útil en ${formatSeconds(result.usefulAt)}, antes de que la persona se canse.`;
    levelComplete = true;
    runButton.hidden = true;
    clearButton.hidden = true;
    renderPalette();
    renderQueue();
    game.querySelectorAll(".load-queue__item").forEach((item, index) => {
      item.classList.add(queue[index].deferred ? "is-deferred" : "is-done");
    });
    updateControls();

    if (currentLevel === badgeLevel) {
      setFeedback(`¡Misión cumplida! ${summary}`, "success");
      return wait(reduceMotion ? 100 : 900).then(() => window.MissionProgress?.complete("web"));
    }

    if (currentLevel === levels.length - 1) {
      setFeedback(`¡Superaste todos los niveles! ${summary} Pensaste como alguien que diseña experiencias web.`, "success");
      finishLink.hidden = false;
      finishLink.focus();
      return Promise.resolve();
    }

    setFeedback(`¡Nivel superado! ${summary}`, "success");
    nextButton.hidden = false;
    nextButton.focus();
    return Promise.resolve();
  }

  game.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-resource]");
    if (chip) {
      addResource(chip.dataset.resource);
      return;
    }

    const actions = [
      ["[data-toggle-optimize]", "toggleOptimize", toggleOptimize],
      ["[data-toggle-defer]", "toggleDefer", toggleDefer],
      ["[data-move-up]", "moveUp", moveUp],
      ["[data-remove]", "remove", removeResource],
    ];
    for (const [selector, key, handler] of actions) {
      const button = event.target.closest(selector);
      if (button) {
        handler(Number(button.dataset[key]));
        return;
      }
    }
  });

  runButton.addEventListener("click", runLoad);
  clearButton.addEventListener("click", clearQueue);
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

  document.querySelector('[data-restart-challenge="web"]')?.addEventListener("click", () => {
    currentLevel = 0;
    renderLevel();
  });

  renderLevel();
})();
