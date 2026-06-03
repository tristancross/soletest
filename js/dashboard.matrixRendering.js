function clampMatrixScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function formatMatrixScore(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return "50";

  const rounded = Math.round(numeric * 10) / 10;

  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
}

function getMatrixDemoScores(matrixId) {
  const matrix = window.soleMatrixDefinitions?.get?.(matrixId);
  if (!matrix) return {};

  return Object.fromEntries(
    matrix.axes.map((axis, index) => {
      const seed = 42 + index * 17;
      const value = 34 + ((seed * 13) % 54);

      return [axis.key, value];
    })
  );
}

function getMatrixAxisScoreDescription(axis, value) {
  const numeric = clampMatrixScore(value);

  if (numeric < 45) {
    return axis.lowDescription || axis.description || "";
  }

  if (numeric > 55) {
    return axis.highDescription || axis.description || "";
  }

  return (
    axis.neutralDescription ||
    axis.description ||
    "This sits close to the centre of the profile, suggesting a more flexible or context-dependent pattern."
  );
}

function renderSoleMatrixSvg({
  matrix,
  scores = {},
  ghostScores = null,
  escapeHtml,
  escapeAttr
}) {
  const width = 760;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  const maxR = 198;
  const axes = matrix.axes || [];
  const rings = [0.2, 0.4, 0.6, 0.8, 1];

  if (!axes.length) return "";

  const angleFor = index =>
    (-Math.PI / 2) + (index * 2 * Math.PI / axes.length);

  const pointFor = (index, value, radiusOffset = 0) => {
    const angle = angleFor(index);
    const r = (maxR + radiusOffset) * (clampMatrixScore(value) / 100);

    return [
      cx + Math.cos(angle) * r,
      cy + Math.sin(angle) * r
    ];
  };

  const outerPointFor = (index, extra = 0) => {
    const angle = angleFor(index);

    return [
      cx + Math.cos(angle) * (maxR + extra),
      cy + Math.sin(angle) * (maxR + extra)
    ];
  };

  const ghostPolygonPoints = ghostScores
  ? axes.map((axis, index) => {
      const value = clampMatrixScore(ghostScores[axis.key] ?? 50);
      const [x, y] = pointFor(index, value);
      return `${x},${y}`;
    }).join(" ")
  : "";

  const fieldPoints = axes
    .map((axis, index) => pointFor(index, scores[axis.key] ?? 50).join(","))
    .join(" ");

  const innerPoints = axes
    .map((axis, index) => {
      const value = clampMatrixScore(scores[axis.key] ?? 50);
      return pointFor(index, Math.max(8, value - 15)).join(",");
    })
    .join(" ");

  const ringMarkup = rings.map(ring => `
    <circle
      cx="${cx}"
      cy="${cy}"
      r="${maxR * ring}"
      fill="none"
   stroke="rgba(80,80,80,${ring === 1 ? 0.18 : 0.09})"
      stroke-width="1"
    />
  `).join("");

  const spokeMarkup = axes.map((_, index) => {
    const [x, y] = outerPointFor(index, 4);

    return `
      <line
        x1="${cx}"
        y1="${cy}"
        x2="${x}"
        y2="${y}"
      stroke="rgba(80,80,80,.08)"
        stroke-width="1"
      />
    `;
  }).join("");

const pointMarkup = axes.map((axis, index) => {
  const value = clampMatrixScore(scores[axis.key] ?? 50);
  const displayValue = formatMatrixScore(value);
  const [x, y] = pointFor(index, value);
const tooltip = getMatrixAxisScoreDescription(axis, value);

    return `
<circle
  class="soleMatrixPoint"
  cx="${x}"
  cy="${y}"
  r="5"
  fill="var(--accent)"
  stroke="var(--bg)"
  stroke-width="3"
  data-matrix-point
  data-tooltip-kind="score"
  data-label="${escapeAttr(axis.label)}"
  data-value="${escapeAttr(displayValue)}"
  data-tip="${escapeAttr(tooltip)}"
/>
    `;
  }).join("");

const labelMarkup = axes.map((axis, index) => {
  const value = clampMatrixScore(scores[axis.key] ?? 50);
  const displayValue = formatMatrixScore(value);
  const [x, y] = outerPointFor(index, 24);
  const anchor = x < cx - 20 ? "end" : x > cx + 20 ? "start" : "middle";

  return `
    <g
      class="soleMatrixAxisLabel"
      data-matrix-point
      data-tooltip-kind="label"
      data-label="${escapeAttr(axis.label)}"
      data-value="${escapeAttr(displayValue)}"
      data-tip="${escapeAttr(axis.description || "")}"
    >
      <text
        x="${x}"
        y="${y}"
        text-anchor="${anchor}"
      fill="rgba(35,35,35,.85)"
        font-size="17"
        font-weight="700"
      >${escapeHtml(axis.label)}</text>

      <text
        x="${x}"
        y="${y + 20}"
        text-anchor="${anchor}"
  fill="rgba(225,139,103,.82)"
        font-size="13"
        letter-spacing="1"
        font-weight="700"
      >${displayValue}</text>
    </g>
  `;
}).join("");

  return `
    <svg
      class="soleMatrixSvg"
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="${escapeAttr(matrix.title)} matrix"
    >
      <defs>
        <filter id="soleMatrixGlow">
          <feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur>
          <feMerge>
            <feMergeNode in="blur"></feMergeNode>
            <feMergeNode in="SourceGraphic"></feMergeNode>
          </feMerge>
        </filter>

<radialGradient id="soleMatrixGradient" cx="45%" cy="38%" r="72%">
  <stop offset="0%" stop-color="rgba(255,255,255,.72)"></stop>
  <stop offset="34%" stop-color="rgba(255,232,221,.44)"></stop>
  <stop offset="72%" stop-color="rgba(255,142,108,.20)"></stop>
  <stop offset="100%" stop-color="rgba(255,255,255,.16)"></stop>
</radialGradient>
      </defs>

      ${ringMarkup}
      ${spokeMarkup}

<polygon
  points="${fieldPoints}"
  fill="url(#soleMatrixGradient)"
  stroke="rgba(255,118,95,.78)"
  stroke-width="2.25"
  opacity=".92"
></polygon>

<polygon
  points="${fieldPoints}"
  fill="none"
  stroke="rgba(255,255,255,.62)"
  stroke-width="1"
  opacity=".75"
></polygon>

      <polygon
        points="${innerPoints}"
fill="rgba(255,255,255,.16)"
stroke="rgba(255,255,255,.45)"
        stroke-width="1"
      ></polygon>

      ${ghostPolygonPoints ? `
  <polygon
    points="${ghostPolygonPoints}"
    fill="none"
    stroke="rgba(255,242,231,.24)"
    stroke-width="1.5"
    stroke-dasharray="4 5"
  />
` : ""}

  <circle
  cx="${cx}"
  cy="${cy}"
  r="22"
  fill="rgba(255,255,255,.72)"
  stroke="rgba(255,118,95,.18)"
  stroke-width="1"
></circle>

<circle
  cx="${cx}"
  cy="${cy}"
  r="4"
  fill="rgba(255,118,95,.95)"
></circle>

      <circle
        cx="${cx}"
        cy="${cy}"
        r="4"
        fill="rgba(255,159,125,.95)"
      ></circle>

      ${pointMarkup}
      ${labelMarkup}
    </svg>
  `;
}

function renderSoleMatrixPanel({
  matrixId,
  scores = null,
  startScores = null,
  confidence = 0,
  escapeHtml,
  escapeAttr,
  switcherItems = null,
  activeMatrixId = matrixId,
  siblingStates = null
}) {
  const matrix = window.soleMatrixDefinitions?.get?.(matrixId);
  if (!matrix) return "";

  const matrixScores = scores || getMatrixDemoScores(matrixId);
  const matrixStartScores = startScores || matrixScores;
  const initialRenderScores = matrixStartScores;

  return `
<section
  class="soleMatrixPanel"
  data-sole-matrix-panel="${escapeAttr(matrixId)}"
  data-matrix-final-scores="${escapeAttr(JSON.stringify(matrixScores))}"
  data-matrix-start-scores="${escapeAttr(JSON.stringify(matrixStartScores))}"
  data-matrix-sibling-states="${escapeAttr(JSON.stringify(siblingStates || {}))}"
>
      <div class="soleMatrixHeader">
        <div>
<div class="dashboardEyebrow">${escapeHtml(matrix.side)} Profile</div>

${
  switcherItems?.length
    ? `
      <div class="soleMatrixTitleSwitcher">
        <h3>
          <button
            type="button"
            class="soleMatrixTitleSwitcherBtn"
            data-matrix-switcher-button
          >
            <span>${escapeHtml(matrix.title)}</span>
            <span class="soleMatrixTitleChevron">â—</span>
          </button>
        </h3>

        <div class="soleMatrixSwitcherMenu" data-matrix-switcher-menu hidden>
          ${switcherItems.map(item => `
            <button
              type="button"
              class="soleMatrixSwitcherOption ${item.id === activeMatrixId ? "isActive" : ""}"
              data-switch-matrix-id="${escapeAttr(item.id)}"
            >
              ${escapeHtml(item.title)}
            </button>
          `).join("")}
        </div>
      </div>
    `
    : `<h3>${escapeHtml(matrix.title)}</h3>`
}
          <p>${escapeHtml(matrix.description || "")}</p>
        </div>

        <div class="soleMatrixConfidence">
          ${Math.round(Number(confidence) || 0)}% calibrated
        </div>
      </div>

      <div class="soleMatrixChartWrap">
        ${renderSoleMatrixSvg({
          matrix,
          scores: initialRenderScores,
          escapeHtml,
          escapeAttr
        })}
      </div>

      <div class="soleMatrixTooltip" data-sole-matrix-tooltip></div>
    </section>
  `;
}

function interpolateMatrixScores(fromScores = {}, toScores = {}, progress = 1) {
  const keys = new Set([
    ...Object.keys(fromScores || {}),
    ...Object.keys(toScores || {})
  ]);

  const current = {};

  keys.forEach(key => {
    const from = Number(fromScores[key] ?? 50);
    const to = Number(toScores[key] ?? 50);

    current[key] = from + ((to - from) * progress);
  });

  return current;
}

function animateSoleMatrices(rootEl = document) {
  rootEl.querySelectorAll("[data-sole-matrix-panel]").forEach(panel => {
    if (panel.dataset.matrixAnimated === "true") return;

    let fromScores = {};
    let toScores = {};

    try {
      fromScores = JSON.parse(panel.dataset.matrixStartScores || "{}");
      toScores = JSON.parse(panel.dataset.matrixFinalScores || "{}");
    } catch (error) {
      return;
    }

    const matrixId = panel.dataset.soleMatrixPanel;
    const matrix = window.soleMatrixDefinitions?.get?.(matrixId);
    const chartWrap = panel.querySelector(".soleMatrixChartWrap");

    if (!matrix || !chartWrap) return;

    panel.classList.add("isUpdating");
    panel.dataset.matrixAnimated = "true";

    const duration = 1000;
    const startTime = performance.now();

    function tick(now) {
      const rawProgress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - rawProgress, 3);

      const currentScores = interpolateMatrixScores(fromScores, toScores, eased);

chartWrap.innerHTML = renderSoleMatrixSvg({
  matrix,
  scores: currentScores,
  ghostScores: fromScores,
  escapeHtml,
  escapeAttr
});

if (rawProgress < 1) {
  requestAnimationFrame(tick);
} else {
  chartWrap.innerHTML = renderSoleMatrixSvg({
    matrix,
    scores: toScores,
    ghostScores: fromScores,
    escapeHtml,
    escapeAttr
  });

  bindSoleMatrixTooltips(panel);
  panel.classList.remove("isUpdating");
}
    }

    requestAnimationFrame(tick);
  });
}

function bindSoleMatrixTooltips(rootEl = document) {
  const panels = [];

  if (rootEl.matches?.("[data-sole-matrix-panel]")) {
    panels.push(rootEl);
  }

  rootEl.querySelectorAll?.("[data-sole-matrix-panel]").forEach(panel => {
    panels.push(panel);
  });

  panels.forEach(panel => {
    const tooltip = panel.querySelector("[data-sole-matrix-tooltip]");
    if (!tooltip) return;

    panel.querySelectorAll("[data-matrix-point]").forEach(point => {
point.addEventListener("mouseenter", () => {
  if (point.tagName.toLowerCase() === "circle") {
    point.setAttribute("r", "8");
  }
});

      point.addEventListener("mousemove", event => {
        tooltip.style.display = "block";
const tooltipKind = point.dataset.tooltipKind || "score";

if (tooltipKind === "label") {
  tooltip.innerHTML = `
    <div class="soleMatrixTooltipTitle">
      <strong>${point.dataset.label}</strong>
    </div>
    <div class="soleMatrixTooltipBody">
      ${point.dataset.tip || ""}
    </div>
  `;
} else {
  tooltip.innerHTML = `
    <div class="soleMatrixTooltipTitle">
      <strong>
        ${point.dataset.label}:
        <span class="soleMatrixTooltipScore">${point.dataset.value}</span>
      </strong>
    </div>
    <div class="soleMatrixTooltipBody">
      ${point.dataset.tip || ""}
    </div>
  `;
}

const panelRect = panel.getBoundingClientRect();

const tooltipWidth = 280;
const tooltipHeight = tooltip.offsetHeight || 220;

let left = event.clientX - panelRect.left + 16;
let top = event.clientY - panelRect.top - 18;

left = Math.min(left, panelRect.width - tooltipWidth - 18);

left = Math.max(left, 14);

if (top + tooltipHeight > panelRect.height - 18) {
  top = event.clientY - panelRect.top - tooltipHeight - 18;
}

top = Math.max(top, 14);

tooltip.style.left = `${left}px`;
tooltip.style.top = `${top}px`;
      });

point.addEventListener("mouseleave", () => {
  if (point.tagName.toLowerCase() === "circle") {
    point.setAttribute("r", "5");
  }

  tooltip.style.display = "none";
});
    });
  });
}

function bindSoleMatrixSwitchers({
  rootEl = document,
  sb,
  me,
  escapeHtml,
  escapeAttr
} = {}) {
  rootEl.querySelectorAll("[data-sole-matrix-panel]").forEach(panel => {
    const switcherBtn = panel.querySelector("[data-matrix-switcher-button]");
    const switcherMenu = panel.querySelector("[data-matrix-switcher-menu]");

    if (switcherBtn && switcherMenu) {
      switcherBtn.addEventListener("click", event => {
        event.stopPropagation();

        rootEl.querySelectorAll("[data-matrix-switcher-menu]").forEach(menu => {
          if (menu !== switcherMenu) menu.hidden = true;
        });

        switcherMenu.hidden = !switcherMenu.hidden;
      });
    }

    panel.querySelectorAll("[data-switch-matrix-id]").forEach(option => {
      option.addEventListener("click", async event => {
        event.stopPropagation();

        const nextMatrixId = option.dataset.switchMatrixId;
        if (!nextMatrixId || !sb || !me?.id) return;

        let siblingStates = {};

        try {
          siblingStates = JSON.parse(panel.dataset.matrixSiblingStates || "{}");
        } catch (_) {
          siblingStates = {};
        }

        const siblingState = siblingStates[nextMatrixId] || null;

        let matrixState = null;

        if (siblingState?.scores || siblingState?.startScores) {
          matrixState = {
            scores: siblingState.scores || null,
            startScores: siblingState.startScores || siblingState.scores || null,
            confidence: siblingState.confidence ?? 0
          };
        } else {
          const loadedState = await window.soleScoring?.loadUserMatrixScoresForMatrix?.(
            sb,
            me.id,
            nextMatrixId
          );

          matrixState = {
            scores: loadedState?.scores || null,
            startScores: null,
            confidence: loadedState?.confidence ?? 0
          };
        }

        const currentItems = Array.from(
          panel.querySelectorAll("[data-switch-matrix-id]")
        ).map(item => {
          const id = item.dataset.switchMatrixId;
          const matrix = window.soleMatrixDefinitions?.get?.(id);

          return {
            id,
            title: matrix?.title || item.textContent.trim() || id
          };
        });

        panel.outerHTML = renderSoleMatrixPanel({
          matrixId: nextMatrixId,
          scores: matrixState?.scores || null,
          startScores: matrixState?.startScores || null,
          confidence: matrixState?.confidence ?? 0,
          escapeHtml,
          escapeAttr,
          switcherItems: currentItems,
          activeMatrixId: nextMatrixId,
          siblingStates
        });

        bindSoleMatrixSwitchers({
          rootEl,
          sb,
          me,
          escapeHtml,
          escapeAttr
        });

        bindSoleMatrixTooltips(rootEl);

        setTimeout(() => {
          animateSoleMatrices(rootEl);
        }, 120);
      });
    });
  });

  document.addEventListener(
    "click",
    () => {
      rootEl.querySelectorAll("[data-matrix-switcher-menu]").forEach(menu => {
        menu.hidden = true;
      });
    },
    { once: true }
  );
}

window.soleMatrixRendering = {
  renderPanel: renderSoleMatrixPanel,
  bindTooltips: bindSoleMatrixTooltips,
  bindSwitchers: bindSoleMatrixSwitchers,
  animateMatrices: animateSoleMatrices,
  demoScores: getMatrixDemoScores
};
