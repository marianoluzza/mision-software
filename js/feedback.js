(function () {
  "use strict";

  // Google Form "Encuesta Desafíos": las respuestas quedan en su planilla, sin login ni backend propio.
  const FORM_ID = "1FAIpQLSdv5tJEm5kWS_02t1NdXUPEYzNFPlnhDwSv-muedKbG-LfAdQ";
  const FORM_ACTION = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;
  const FORM_VIEW = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;
  const FIELDS = {
    challenge: "entry.813562710",
    reaction: "entry.1989693293",
    comment: "entry.1490432713",
  };
  const STORAGE_KEY = "mision-software:feedback:v1";
  const REACTIONS = [
    ["😐", "Meh"],
    ["🙂", "Bien"],
    ["🤩", "¡Genial!"],
  ];

  function readSent() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  function markSent(challenge) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...readSent(), challenge])]));
    } catch {
      // Si el navegador bloquea localStorage, sólo se pierde el "ya enviaste".
    }
  }

  function renderThanks(slot) {
    slot.innerHTML = '<p class="feedback__thanks" tabindex="-1">¡Gracias! Tu opinión nos ayuda a mejorar.</p>';
  }

  function renderForm(slot) {
    const challenge = slot.dataset.feedbackSlot;
    const question = slot.dataset.feedbackQuestion || "¿Qué te pareció este desafío?";
    const commentId = `feedback-comment-${challenge}`;

    slot.innerHTML = `
      <form class="feedback" novalidate>
        <fieldset class="feedback__reactions">
          <legend class="feedback__question">${question}</legend>
          ${REACTIONS.map(([emoji, label]) => `
            <label class="feedback__reaction">
              <input type="radio" name="reaction" value="${emoji} ${label}">
              <span><span aria-hidden="true">${emoji}</span> ${label}</span>
            </label>`).join("")}
        </fieldset>
        <label class="feedback__label" for="${commentId}">¿Qué agregarías o cambiarías? <span>(opcional)</span></label>
        <textarea id="${commentId}" name="comment" rows="3" maxlength="500" placeholder="No pongas tu nombre ni datos personales."></textarea>
        <div class="feedback__footer">
          <button class="button button--secondary" type="submit">Enviar</button>
          <p class="feedback__status" role="status" aria-live="polite"></p>
        </div>
      </form>`;

    slot.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      submitFeedback(slot, event.currentTarget, challenge);
    });
  }

  async function submitFeedback(slot, form, challenge) {
    const reaction = form.elements.reaction.value;
    const comment = form.elements.comment.value.trim();
    const status = form.querySelector(".feedback__status");
    const button = form.querySelector('[type="submit"]');

    if (!reaction && !comment) {
      status.textContent = "Elegí una reacción o escribí algo antes de enviar.";
      return;
    }

    button.disabled = true;
    status.textContent = "Enviando…";

    try {
      // Google no habilita CORS: con no-cors la respuesta es opaca y sólo detectamos errores de red.
      await fetch(FORM_ACTION, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams({
          [FIELDS.challenge]: challenge,
          [FIELDS.reaction]: reaction,
          [FIELDS.comment]: comment,
        }),
      });
      markSent(challenge);
      renderThanks(slot);
      slot.querySelector(".feedback__thanks").focus();
    } catch {
      const fallback = new URL(FORM_VIEW);
      fallback.searchParams.set("usp", "pp_url");
      fallback.searchParams.set(FIELDS.challenge, challenge);
      status.innerHTML = `No se pudo enviar. <a href="${fallback.href}" target="_blank" rel="noopener">Probá desde Google Forms</a>.`;
      button.disabled = false;
    }
  }

  const sent = readSent();
  document.querySelectorAll("[data-feedback-slot]").forEach((slot) => {
    if (sent.includes(slot.dataset.feedbackSlot)) {
      renderThanks(slot);
    } else {
      renderForm(slot);
    }
  });
})();
