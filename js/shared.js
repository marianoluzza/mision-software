(function () {
  "use strict";

  const STORAGE_KEY = "mision-software:badges:v1";
  const CHALLENGES = ["robot", "web", "seguridad"];

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

  document.addEventListener("click", (event) => {
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
