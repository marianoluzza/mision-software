(function () {
  "use strict";

  const STORAGE_KEY = "mision-software:badges:v1";
  const CHALLENGES = ["robot", "web", "seguridad"];

  // shared.js vive en js/, así que la raíz del sitio está un nivel arriba.
  const HOME_URL = new URL("../", document.currentScript.src).href;
  const PAGE_URL = cleanPageUrl(location.href);
  const QR_LIBRARY = {
    src: "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js",
    integrity: "sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k",
  };
  let qrLibraryPromise = null;
  let shareTarget = "page";
  let shareRenderId = 0;

  function readProgress() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return CHALLENGES.filter((challenge) => stored?.includes(challenge));
    } catch {
      return [];
    }
  }

  function writeProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // El recorrido sigue funcionando si el navegador bloquea localStorage.
    }
  }

  function renderProgress() {
    const progress = readProgress();

    document.querySelectorAll("[data-progress-count]").forEach((counter) => {
      counter.textContent = String(progress.length);
    });

    CHALLENGES.forEach((challenge) => {
      const earned = progress.includes(challenge);
      const badge = document.querySelector(`[data-badge="${challenge}"]`);
      const miniBadge = document.querySelector(`[data-mini-badge="${challenge}"]`);
      const card = document.querySelector(`[data-challenge-card="${challenge}"]`);

      if (badge) {
        badge.classList.toggle("is-earned", earned);
        badge.innerHTML = earned
          ? '<span aria-hidden="true">✓</span> Completada'
          : '<span aria-hidden="true">○</span> Pendiente';
      }

      miniBadge?.classList.toggle("is-earned", earned);
      card?.classList.toggle("is-complete", earned);
    });

    document.querySelectorAll("[data-mission-complete]").forEach((panel) => {
      panel.hidden = progress.length !== CHALLENGES.length;
    });

    document.querySelectorAll("[data-reset-progress]").forEach((button) => {
      button.hidden = progress.length === 0;
    });

    document.querySelectorAll("[data-current-challenge]").forEach((page) => {
      const challenge = page.dataset.currentChallenge;
      const successPanel = page.querySelector("[data-success-panel]");
      const prototypePanel = page.querySelector("[data-prototype-panel]");
      const completed = progress.includes(challenge);

      if (successPanel) successPanel.hidden = !completed;
      if (prototypePanel) prototypePanel.hidden = completed;
    });
  }

  function completeChallenge(challenge) {
    if (!CHALLENGES.includes(challenge)) return;

    const progress = readProgress();
    if (!progress.includes(challenge)) {
      progress.push(challenge);
      writeProgress(progress);
    }

    renderProgress();
    document.querySelector("[data-success-panel]")?.focus();
  }

  function restartChallenge(challenge) {
    const progress = readProgress().filter((item) => item !== challenge);
    writeProgress(progress);
    renderProgress();
    document.querySelector("[data-prototype-panel]")?.focus();
  }

  // URL más corta posible: sin hash, sin query y sin index.html, para que el QR tenga menos módulos.
  function cleanPageUrl(href) {
    const url = new URL(href);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/index\.html$/, "");
    return url.href;
  }

  function loadQrLibrary() {
    if (window.qrcode) return Promise.resolve(window.qrcode);

    qrLibraryPromise ??= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = QR_LIBRARY.src;
      script.integrity = QR_LIBRARY.integrity;
      script.crossOrigin = "anonymous";
      script.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error("qrcode no disponible")));
      script.onerror = () => {
        // Permite reintentar la próxima vez que se abra el diálogo.
        qrLibraryPromise = null;
        script.remove();
        reject(new Error("No se pudo cargar la librería de QR"));
      };
      document.head.append(script);
    });

    return qrLibraryPromise;
  }

  function renderQr(qrcode, text) {
    const QUIET_ZONE = 4;
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();

    const count = qr.getModuleCount();
    const size = count + QUIET_ZONE * 2;
    let path = "";
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }

    // Módulos oscuros sobre blanco: los QR invertidos escanean peor.
    return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  }

  function ensureShareDialog() {
    let dialog = document.querySelector("[data-share-dialog]");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "share-dialog";
    dialog.dataset.shareDialog = "";
    dialog.setAttribute("aria-labelledby", "share-title");
    dialog.innerHTML = `
      <div class="share-dialog__body">
        <div class="share-dialog__header">
          <h2 id="share-title">Compartí la misión</h2>
          <button class="share-dialog__close" type="button" data-share-close aria-label="Cerrar">✕</button>
        </div>
        <div class="share-toggle" role="group" aria-label="Qué compartir" data-share-toggle>
          <button type="button" data-share-target="page" aria-pressed="true">Esta página</button>
          <button type="button" data-share-target="home" aria-pressed="false">Inicio</button>
        </div>
        <div class="share-dialog__qr" role="img" data-share-qr></div>
        <p class="share-dialog__url" data-share-url></p>
        <div class="share-dialog__actions">
          <button class="button button--primary" type="button" data-share-copy>Copiar enlace</button>
          <button class="button button--secondary" type="button" data-share-native hidden>Compartir…</button>
        </div>
        <p class="share-dialog__status" data-share-status role="status" aria-live="polite"></p>
      </div>`;

    // En la portada "Esta página" e "Inicio" son la misma URL.
    dialog.querySelector("[data-share-toggle]").hidden = PAGE_URL === HOME_URL;
    dialog.querySelector("[data-share-native]").hidden = typeof navigator.share !== "function";

    dialog.addEventListener("click", (event) => {
      // Un click fuera de .share-dialog__body cae sobre el propio dialog, es decir, el backdrop.
      if (event.target === dialog || event.target.closest("[data-share-close]")) {
        dialog.close();
        return;
      }

      const targetButton = event.target.closest("[data-share-target]");
      if (targetButton) {
        shareTarget = targetButton.dataset.shareTarget;
        updateShareDialog(dialog);
        return;
      }

      if (event.target.closest("[data-share-copy]")) {
        copyShareUrl(dialog);
        return;
      }

      if (event.target.closest("[data-share-native]")) {
        navigator.share({ title: document.title, url: currentShareUrl() }).catch(() => {
          // Cancelar el menú nativo también rechaza la promesa; no hay nada que avisar.
        });
      }
    });

    document.body.append(dialog);
    return dialog;
  }

  function currentShareUrl() {
    return shareTarget === "home" ? HOME_URL : PAGE_URL;
  }

  async function updateShareDialog(dialog) {
    const url = currentShareUrl();
    const displayUrl = url.replace(/^https?:\/\//, "");
    const qrBox = dialog.querySelector("[data-share-qr]");
    const renderId = ++shareRenderId;

    dialog.querySelectorAll("[data-share-target]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.shareTarget === shareTarget));
    });
    dialog.querySelector("[data-share-url]").textContent = displayUrl;
    dialog.querySelector("[data-share-status]").textContent = "";
    qrBox.setAttribute("aria-label", `Código QR para abrir ${displayUrl}`);
    qrBox.classList.remove("is-error");
    if (!window.qrcode) qrBox.textContent = "Generando QR…";

    try {
      const qrcode = await loadQrLibrary();
      // Si cambiaron de opción mientras cargaba la librería, gana la última.
      if (renderId !== shareRenderId) return;
      qrBox.innerHTML = renderQr(qrcode, url);
    } catch {
      if (renderId !== shareRenderId) return;
      qrBox.classList.add("is-error");
      qrBox.textContent = "No se pudo generar el QR. Podés copiar el enlace de abajo.";
    }
  }

  async function copyShareUrl(dialog) {
    const status = dialog.querySelector("[data-share-status]");
    try {
      await navigator.clipboard.writeText(currentShareUrl());
      status.textContent = "¡Enlace copiado!";
    } catch {
      status.textContent = "No se pudo copiar. Mantené presionado el enlace para copiarlo.";
    }
  }

  function openShareDialog() {
    const dialog = ensureShareDialog();
    shareTarget = "page";
    updateShareDialog(dialog);
    dialog.showModal();
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-share-open]")) {
      openShareDialog();
      return;
    }

    const completeButton = event.target.closest("[data-complete-challenge]");
    if (completeButton) {
      completeChallenge(completeButton.dataset.completeChallenge);
      return;
    }

    const restartButton = event.target.closest("[data-restart-challenge]");
    if (restartButton) {
      restartChallenge(restartButton.dataset.restartChallenge);
      return;
    }

    if (event.target.closest("[data-reset-progress]")) {
      const shouldReset = window.confirm("¿Querés borrar las insignias de este dispositivo y empezar de nuevo?");
      if (shouldReset) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // No hay nada más que hacer si el almacenamiento no está disponible.
        }
        renderProgress();
      }
    }
  });

  window.addEventListener("storage", renderProgress);
  window.MissionProgress = Object.freeze({
    complete: completeChallenge,
    restart: restartChallenge,
    read: () => [...readProgress()],
  });
  renderProgress();
})();
