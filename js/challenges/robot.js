(function () {
  "use strict";

  // Celdas del tablero que no forman parte del camino: sirve para dibujar pasillos.
  function outsidePath(rows, columns, path) {
    const cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (!path.some(([pathRow, pathColumn]) => pathRow === row && pathColumn === column)) {
          cells.push({ row, column });
        }
      }
    }
    return cells;
  }

  // Cada nivel suma una idea nueva. `badge: true` marca el nivel que otorga la insignia;
  // los niveles siguientes son para quien quiera seguir.
  const levels = [
    {
      title: "Primeros pasos",
      hint: "Llevá el robot hasta la bandera. Empezá con dos avances (↑).",
      rows: 4,
      columns: 4,
      start: { row: 3, column: 0, direction: 1 },
      goal: { row: 3, column: 2 },
      obstacles: [
        { row: 2, column: 1 },
        { row: 2, column: 2 },
      ],
      commands: ["forward"],
      maxSlots: 3,
    },
    {
      title: "Doblar la esquina",
      hint: "Ahora el camino gira. Combiná avances con un giro.",
      rows: 4,
      columns: 4,
      start: { row: 3, column: 0, direction: 1 },
      goal: { row: 1, column: 2 },
      obstacles: [
        { row: 2, column: 0 },
        { row: 2, column: 1 },
        { row: 3, column: 3 },
        { row: 0, column: 2 },
      ],
      commands: ["forward", "left", "right"],
      maxSlots: 6,
    },
    {
      title: "Repetir sin reescribir",
      hint: "El camino es largo y hay pocos espacios. Tocá ↻ Repetir, elegí qué repetir y tocá el número para cambiar cuántas veces.",
      rows: 5,
      columns: 5,
      start: { row: 4, column: 0, direction: 1 },
      goal: { row: 1, column: 4 },
      obstacles: [
        { row: 3, column: 0 },
        { row: 3, column: 1 },
        { row: 3, column: 2 },
        { row: 3, column: 3 },
        { row: 2, column: 3 },
        { row: 1, column: 3 },
        { row: 0, column: 4 },
      ],
      commands: ["forward", "left", "right", "repeat"],
      maxSlots: 5,
      badge: true,
    },
    {
      title: "Encontrá el patrón",
      hint: "Mirá la escalera: ¿qué pasos se repiten? Un bucle puede repetir varias instrucciones juntas.",
      rows: 5,
      columns: 5,
      start: { row: 4, column: 0, direction: 1 },
      goal: { row: 0, column: 4 },
      obstacles: outsidePath(5, 5, [
        [4, 0], [4, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 4], [0, 4],
      ]),
      commands: ["forward", "left", "right", "repeat"],
      maxSlots: 5,
    },
    {
      title: "Antes, durante y después",
      hint: "No todo va dentro del bucle: pensá qué pasa antes y después de la parte que se repite.",
      rows: 6,
      columns: 6,
      start: { row: 5, column: 0, direction: 0 },
      goal: { row: 1, column: 5 },
      obstacles: outsidePath(6, 6, [
        [5, 0], [4, 0], [4, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 4], [1, 5],
      ]),
      commands: ["forward", "left", "right", "repeat"],
      maxSlots: 9,
    },
  ];

  const commandDetails = {
    forward: { icon: "↑", label: "Avanzar" },
    left: { icon: "↶", label: "Girar a la izquierda" },
    right: { icon: "↷", label: "Girar a la derecha" },
    repeat: { icon: "↻", label: "Repetir" },
  };

  const MIN_TIMES = 2;
  const MAX_TIMES = 5;

  const directions = [
    { row: -1, column: 0, rotation: 0 },
    { row: 0, column: 1, rotation: 90 },
    { row: 1, column: 0, rotation: 180 },
    { row: 0, column: -1, rotation: 270 },
  ];

  const game = document.querySelector(".robot-game");
  if (!game) return;

  const board = game.querySelector("[data-board]");
  const programList = game.querySelector("[data-program]");
  const palette = game.querySelector("[data-palette]");
  const paletteHint = game.querySelector("[data-palette-hint]");
  const feedback = game.querySelector("[data-feedback]");
  const runButton = game.querySelector("[data-run-program]");
  const clearButton = game.querySelector("[data-clear-program]");
  const nextButton = game.querySelector("[data-next-level]");
  const finishLink = game.querySelector("[data-finish-link]");
  const successPanel = document.querySelector("[data-success-panel]");
  const continueButton = document.querySelector("[data-continue-levels]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const badgeLevel = levels.findIndex((level) => level.badge);

  let currentLevel = 0;
  // Cada nodo es { type } o, para los bucles, { type: "repeat", times, body: [{ type }] }.
  let program = [];
  // Índice del bucle que está recibiendo instrucciones, o null si se agregan afuera.
  let openLoop = null;
  let robot = { ...levels[0].start };
  let running = false;
  let levelComplete = false;

  function samePosition(first, second) {
    return first.row === second.row && first.column === second.column;
  }

  function isObstacle(position, level = levels[currentLevel]) {
    return level.obstacles.some((obstacle) => samePosition(obstacle, position));
  }

  function setFeedback(message, type = "neutral") {
    feedback.textContent = message;
    feedback.dataset.type = type;
  }

  function instructionCount() {
    return program.reduce((total, node) => total + 1 + (node.body ? node.body.length : 0), 0);
  }

  function isActive(step, index, bodyIndex) {
    return Boolean(step) && step.index === index && step.bodyIndex === bodyIndex;
  }

  function renderBoard() {
    const level = levels[currentLevel];
    board.replaceChildren();
    board.style.setProperty("--columns", String(level.columns));

    for (let row = 0; row < level.rows; row += 1) {
      for (let column = 0; column < level.columns; column += 1) {
        const position = { row, column };
        const cell = document.createElement("div");
        const labels = [`fila ${row + 1}, columna ${column + 1}`];
        cell.className = "robot-cell";
        cell.setAttribute("role", "gridcell");

        if (isObstacle(position, level)) {
          cell.classList.add("robot-cell--obstacle");
          labels.push("obstáculo");
          const obstacle = document.createElement("span");
          obstacle.className = "robot-obstacle";
          obstacle.setAttribute("aria-hidden", "true");
          cell.append(obstacle);
        }

        if (samePosition(level.goal, position)) {
          cell.classList.add("robot-cell--goal");
          labels.push("meta");
          const goal = document.createElement("span");
          goal.className = "robot-goal";
          goal.setAttribute("aria-hidden", "true");
          goal.textContent = "⚑";
          cell.append(goal);
        }

        if (samePosition(robot, position)) {
          cell.classList.add("robot-cell--current");
          labels.push("robot");
          const token = document.createElement("span");
          token.className = "robot-token";
          token.style.setProperty("--robot-rotation", `${directions[robot.direction].rotation}deg`);
          token.setAttribute("aria-hidden", "true");
          token.innerHTML = '<span class="robot-token__face">••</span>';
          cell.append(token);
        }

        cell.setAttribute("aria-label", labels.join(", "));
        board.append(cell);
      }
    }
  }

  function createInstructionItem(node, number, index, bodyIndex, step, failed) {
    const detail = commandDetails[node.type];
    const item = document.createElement("li");
    const removeButton = document.createElement("button");
    const active = isActive(step, index, bodyIndex);
    item.className = "robot-program__item";
    item.classList.toggle("is-running", active && !failed);
    item.classList.toggle("is-failed", active && failed);
    removeButton.type = "button";
    removeButton.dataset.removeInstruction = String(index);
    if (bodyIndex !== undefined) removeButton.dataset.bodyIndex = String(bodyIndex);
    removeButton.disabled = running;
    removeButton.setAttribute("aria-label", `Quitar instrucción ${number}: ${detail.label}`);
    removeButton.innerHTML = `<span class="robot-program__index">${number}</span><span aria-hidden="true">${detail.icon}</span><span>${detail.label}</span><span class="robot-program__remove" aria-hidden="true">×</span>`;
    item.append(removeButton);
    return item;
  }

  function createLoopItem(node, index, step, failed) {
    const item = document.createElement("li");
    const isOpen = openLoop === index;
    const isRunning = Boolean(step) && step.index === index;
    item.className = "robot-program__loop";
    item.classList.toggle("is-open", isOpen);
    item.classList.toggle("is-running", isRunning && !failed);

    const head = document.createElement("div");
    head.className = "robot-program__loop-head";
    head.innerHTML = `<span class="robot-program__index">${index + 1}</span><span class="robot-program__loop-label"><span aria-hidden="true">↻</span> Repetir</span>`;

    const timesButton = document.createElement("button");
    timesButton.type = "button";
    timesButton.className = "robot-program__times";
    timesButton.dataset.loopTimes = String(index);
    timesButton.disabled = running;
    timesButton.textContent = `×${node.times}`;
    timesButton.setAttribute("aria-label", `Se repite ${node.times} veces. Tocá para cambiar.`);

    const iteration = document.createElement("span");
    iteration.className = "robot-program__iteration";
    iteration.textContent = isRunning ? `vuelta ${step.iteration} de ${node.times}` : "";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "robot-program__loop-remove";
    removeButton.dataset.removeInstruction = String(index);
    removeButton.disabled = running;
    removeButton.setAttribute("aria-label", `Quitar bucle ${index + 1} y sus instrucciones`);
    removeButton.innerHTML = '<span aria-hidden="true">×</span>';

    head.append(timesButton, iteration, removeButton);

    const body = document.createElement("ol");
    body.className = "robot-program__body";
    body.setAttribute("aria-label", `Instrucciones dentro del bucle ${index + 1}`);

    if (node.body.length === 0) {
      const placeholder = document.createElement("li");
      placeholder.className = "robot-program__body-empty";
      placeholder.textContent = isOpen ? "Tocá instrucciones para meterlas acá" : "Bucle vacío";
      body.append(placeholder);
    } else {
      node.body.forEach((child, bodyIndex) => {
        body.append(createInstructionItem(child, `${index + 1}.${bodyIndex + 1}`, index, bodyIndex, step, failed));
      });
    }

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "robot-program__loop-toggle";
    toggleButton.dataset.loopToggle = String(index);
    toggleButton.disabled = running;
    toggleButton.innerHTML = isOpen
      ? '<span aria-hidden="true">✓</span> Listo, salir del bucle'
      : '<span aria-hidden="true">+</span> Agregar dentro del bucle';

    item.append(head, body, toggleButton);
    return item;
  }

  function renderProgram(step = null, failed = false) {
    const level = levels[currentLevel];
    programList.replaceChildren();

    if (program.length === 0) {
      const placeholder = document.createElement("li");
      placeholder.className = "robot-program__empty";
      placeholder.textContent = "Tus instrucciones van a aparecer acá";
      programList.append(placeholder);
    } else {
      program.forEach((node, index) => {
        programList.append(
          node.type === "repeat"
            ? createLoopItem(node, index, step, failed)
            : createInstructionItem(node, String(index + 1), index, undefined, step, failed),
        );
      });
    }

    game.querySelector("[data-slot-count]").textContent = `${instructionCount()} de ${level.maxSlots} instrucciones`;
  }

  function updateControls() {
    const level = levels[currentLevel];
    const full = instructionCount() >= level.maxSlots;
    game.querySelectorAll("[data-command]").forEach((button) => {
      const command = button.dataset.command;
      button.hidden = !level.commands.includes(command);
      button.disabled = running || levelComplete || full || (command === "repeat" && openLoop !== null);
    });

    const inLoop = openLoop !== null;
    palette.classList.toggle("is-in-loop", inLoop);
    paletteHint.textContent = inLoop ? "Agregando dentro del bucle" : "Tocá para agregar";

    runButton.disabled = running || levelComplete || program.length === 0;
    clearButton.disabled = running || program.length === 0;
  }

  function refresh(message, type) {
    renderProgram();
    updateControls();
    if (message) setFeedback(message, type);
  }

  function renderLevel() {
    const level = levels[currentLevel];
    robot = { ...level.start };
    program = [];
    openLoop = null;
    running = false;
    levelComplete = false;

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

    nextButton.hidden = true;
    finishLink.hidden = true;
    runButton.hidden = false;
    clearButton.hidden = false;
    renderBoard();
    refresh(currentLevel === 0 ? "Tocá ↑ para crear tu programa." : "Armá el programa y probalo cuando estés listo.");
  }

  function addCommand(command) {
    const level = levels[currentLevel];
    if (running || levelComplete || !level.commands.includes(command)) return;

    if (instructionCount() >= level.maxSlots) {
      setFeedback("No quedan espacios. Quitá una instrucción o limpiá el programa.", "error");
      return;
    }

    if (command === "repeat") {
      if (openLoop !== null) return;
      program.push({ type: "repeat", times: MIN_TIMES, body: [] });
      openLoop = program.length - 1;
      refresh("Bucle agregado. Ahora tocá las instrucciones que querés repetir.");
      return;
    }

    if (openLoop !== null) {
      program[openLoop].body.push({ type: command });
      refresh("Agregada dentro del bucle. Sumá otra o tocá “Listo” para seguir afuera.");
      return;
    }

    program.push({ type: command });
    refresh("Instrucción agregada. Podés sumar otra o ejecutar.");
  }

  function removeInstruction(index, bodyIndex) {
    if (running || levelComplete) return;

    if (bodyIndex !== undefined) {
      program[index].body.splice(bodyIndex, 1);
    } else {
      program.splice(index, 1);
      if (openLoop === index) openLoop = null;
      else if (openLoop !== null && openLoop > index) openLoop -= 1;
    }

    refresh("Instrucción quitada. El programa está listo para seguir editando.");
  }

  function cycleTimes(index) {
    if (running || levelComplete) return;
    const loop = program[index];
    loop.times = loop.times >= MAX_TIMES ? MIN_TIMES : loop.times + 1;
    refresh(`El bucle ahora se repite ${loop.times} veces.`);
    programList.querySelector(`[data-loop-times="${index}"]`)?.focus();
  }

  function toggleLoop(index) {
    if (running || levelComplete) return;
    openLoop = openLoop === index ? null : index;
    refresh(
      openLoop === null
        ? "Saliste del bucle. Lo que agregues ahora va después."
        : "Lo que toques ahora se agrega dentro del bucle.",
    );
  }

  function clearProgram() {
    if (running) return;
    program = [];
    openLoop = null;
    robot = { ...levels[currentLevel].start };
    renderBoard();
    refresh("Programa limpio. Probemos otra secuencia.");
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function buildSteps() {
    return program.flatMap((node, index) => {
      if (node.type !== "repeat") return [{ action: node.type, index }];

      const steps = [];
      for (let iteration = 1; iteration <= node.times; iteration += 1) {
        node.body.forEach((child, bodyIndex) => {
          steps.push({ action: child.type, index, bodyIndex, iteration });
        });
      }
      return steps;
    });
  }

  function finishLevel() {
    levelComplete = true;
    runButton.hidden = true;
    clearButton.hidden = true;
    updateControls();

    if (currentLevel === badgeLevel) {
      setFeedback("¡Misión cumplida! Usaste un bucle para resolver el recorrido.", "success");
      return wait(reduceMotion ? 100 : 800).then(() => window.MissionProgress?.complete("robot"));
    }

    if (currentLevel === levels.length - 1) {
      setFeedback("¡Superaste todos los niveles! Pensaste como alguien que programa.", "success");
      finishLink.hidden = false;
      finishLink.focus();
      return Promise.resolve();
    }

    setFeedback("¡Nivel superado! Tu programa llevó al robot hasta la meta.", "success");
    nextButton.hidden = false;
    nextButton.focus();
    return Promise.resolve();
  }

  async function runProgram() {
    if (running || levelComplete || program.length === 0) return;

    const level = levels[currentLevel];
    const emptyLoop = program.findIndex((node) => node.type === "repeat" && node.body.length === 0);
    if (emptyLoop !== -1) {
      openLoop = emptyLoop;
      refresh("Hay un bucle vacío: agregale al menos una instrucción adentro.", "error");
      return;
    }

    const steps = buildSteps();
    const stepDelay = reduceMotion ? 80 : 430;
    openLoop = null;
    running = true;
    robot = { ...level.start };
    updateControls();
    renderBoard();
    setFeedback("Ejecutando tu programa…");

    for (const step of steps) {
      renderProgram(step);
      await wait(stepDelay);

      if (step.action === "left") {
        robot.direction = (robot.direction + 3) % 4;
      } else if (step.action === "right") {
        robot.direction = (robot.direction + 1) % 4;
      } else {
        const movement = directions[robot.direction];
        const destination = {
          row: robot.row + movement.row,
          column: robot.column + movement.column,
        };
        const outsideBoard =
          destination.row < 0 ||
          destination.row >= level.rows ||
          destination.column < 0 ||
          destination.column >= level.columns;

        if (outsideBoard || isObstacle(destination, level)) {
          board.classList.add("is-bumping");
          await wait(reduceMotion ? 30 : 180);
          board.classList.remove("is-bumping");
          running = false;
          renderProgram(step, true);
          updateControls();
          setFeedback("El robot chocó en la instrucción marcada en rojo. Cambiá el programa y volvé a probar.", "error");
          return;
        }

        robot = { ...robot, ...destination };
      }

      renderBoard();
    }

    running = false;
    renderProgram();

    if (samePosition(robot, level.goal)) {
      await finishLevel();
    } else {
      updateControls();
      setFeedback("Casi. El robot terminó lejos de la bandera: ajustá el programa y reintentá.", "error");
    }
  }

  game.addEventListener("click", (event) => {
    const commandButton = event.target.closest("[data-command]");
    if (commandButton) {
      addCommand(commandButton.dataset.command);
      return;
    }

    const timesButton = event.target.closest("[data-loop-times]");
    if (timesButton) {
      cycleTimes(Number(timesButton.dataset.loopTimes));
      return;
    }

    const toggleButton = event.target.closest("[data-loop-toggle]");
    if (toggleButton) {
      toggleLoop(Number(toggleButton.dataset.loopToggle));
      return;
    }

    const removeButton = event.target.closest("[data-remove-instruction]");
    if (removeButton) {
      const { bodyIndex } = removeButton.dataset;
      removeInstruction(
        Number(removeButton.dataset.removeInstruction),
        bodyIndex === undefined ? undefined : Number(bodyIndex),
      );
    }
  });

  runButton.addEventListener("click", runProgram);
  clearButton.addEventListener("click", clearProgram);
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

  document.querySelector('[data-restart-challenge="robot"]')?.addEventListener("click", () => {
    currentLevel = 0;
    renderLevel();
  });

  renderLevel();
})();
