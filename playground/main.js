// src/observeAnchorVisibility.ts
var DEFAULT_THRESHOLD = 0.25;
var DEFAULT_SAMPLE_POINTS = ["center", "top", "bottom", "left", "right"];
var DEFAULT_IGNORE_SELECTORS = ['[data-anchor-visibility-ignore="true"]'];
function observeAnchorVisibility(anchor, options = {}) {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const samplePoints = options.samplePoints?.length ? options.samplePoints : DEFAULT_SAMPLE_POINTS;
  const ignoreSelectors = options.ignoreSelectors?.length ? options.ignoreSelectors : DEFAULT_IGNORE_SELECTORS;
  const doc = anchor.ownerDocument;
  const win = doc.defaultView;
  let observer = null;
  let state = {
    intersectionRatio: 1,
    visiblePointRatio: 1,
    isIntersecting: true,
    isOccluded: false,
    isVisible: true
  };
  const notify = (nextState) => {
    const wasVisible = state.isVisible;
    const changed = state.intersectionRatio !== nextState.intersectionRatio || state.visiblePointRatio !== nextState.visiblePointRatio || state.isIntersecting !== nextState.isIntersecting || state.isOccluded !== nextState.isOccluded || state.isVisible !== nextState.isVisible;
    state = nextState;
    if (!changed) {
      return;
    }
    options.onChange?.(state);
    if (state.isVisible && !wasVisible) {
      options.onVisible?.(state);
    }
    if (!state.isVisible && wasVisible) {
      options.onHidden?.(state);
    }
  };
  const revalidate = () => {
    const nextState = computeAnchorVisibility(anchor, {
      threshold,
      samplePoints,
      ignoreSelectors,
      previousIntersectionRatio: state.intersectionRatio
    });
    notify(nextState);
    return state;
  };
  if (win && "IntersectionObserver" in win) {
    observer = new win.IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || entry.target !== anchor) {
        return;
      }
      const nextState = computeAnchorVisibility(anchor, {
        threshold,
        samplePoints,
        ignoreSelectors,
        previousIntersectionRatio: entry.intersectionRatio,
        entryIsIntersecting: entry.isIntersecting
      });
      notify(nextState);
    }, {
      threshold: [0, threshold, 0.5, 1]
    });
    observer.observe(anchor);
  }
  const handleViewportChange = () => {
    revalidate();
  };
  win?.addEventListener("resize", handleViewportChange, { passive: true });
  doc.addEventListener("scroll", handleViewportChange, { capture: true, passive: true });
  revalidate();
  return {
    disconnect() {
      observer?.disconnect();
      observer = null;
      win?.removeEventListener("resize", handleViewportChange);
      doc.removeEventListener("scroll", handleViewportChange, true);
    },
    revalidate,
    getState() {
      return state;
    }
  };
}
function computeAnchorVisibility(anchor, options) {
  if (!anchor.isConnected) {
    return {
      intersectionRatio: 0,
      visiblePointRatio: 0,
      isIntersecting: false,
      isOccluded: true,
      isVisible: false
    };
  }
  const rect = anchor.getBoundingClientRect();
  const doc = anchor.ownerDocument;
  const win = doc.defaultView;
  if (!win || rect.width <= 0 || rect.height <= 0) {
    return {
      intersectionRatio: 0,
      visiblePointRatio: 0,
      isIntersecting: false,
      isOccluded: true,
      isVisible: false
    };
  }
  const isInsideViewport = !(rect.bottom <= 0 || rect.right <= 0 || rect.top >= win.innerHeight || rect.left >= win.innerWidth);
  if (!isInsideViewport) {
    return {
      intersectionRatio: 0,
      visiblePointRatio: 0,
      isIntersecting: false,
      isOccluded: true,
      isVisible: false
    };
  }
  const points = getSampleCoordinates(rect, win, options.samplePoints);
  const visiblePoints = points.filter((point) => isPointVisibleForAnchor(anchor, point.x, point.y, options.ignoreSelectors));
  const visiblePointRatio = points.length ? visiblePoints.length / points.length : 0;
  const isIntersecting = options.entryIsIntersecting ?? visiblePointRatio > 0;
  const intersectionRatio = options.previousIntersectionRatio;
  const isOccluded = visiblePointRatio < options.threshold;
  return {
    intersectionRatio,
    visiblePointRatio,
    isIntersecting,
    isOccluded,
    isVisible: isIntersecting && visiblePointRatio >= options.threshold
  };
}
function isPointVisibleForAnchor(anchor, x, y, ignoreSelectors) {
  const doc = anchor.ownerDocument;
  const elements = typeof doc.elementsFromPoint === "function" ? doc.elementsFromPoint(x, y) : [doc.elementFromPoint(x, y)].filter((element) => !!element);
  const firstRelevantElement = elements.find((element) => !shouldIgnoreElement(element, ignoreSelectors));
  if (!firstRelevantElement) {
    return false;
  }
  return firstRelevantElement === anchor || anchor.contains(firstRelevantElement);
}
function shouldIgnoreElement(element, ignoreSelectors) {
  return ignoreSelectors.some((selector) => element.closest(selector));
}
function getSampleCoordinates(rect, win, samplePoints) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const clampX = (value) => Math.min(Math.max(value, 0), win.innerWidth - 1);
  const clampY = (value) => Math.min(Math.max(value, 0), win.innerHeight - 1);
  return samplePoints.map((point) => {
    switch (point) {
      case "top":
        return { x: clampX(centerX), y: clampY(rect.top + 1) };
      case "bottom":
        return { x: clampX(centerX), y: clampY(rect.bottom - 1) };
      case "left":
        return { x: clampX(rect.left + 1), y: clampY(centerY) };
      case "right":
        return { x: clampX(rect.right - 1), y: clampY(centerY) };
      case "center":
      default:
        return { x: clampX(centerX), y: clampY(centerY) };
    }
  });
}

// src/bindDelegatedTooltip.ts
function bindDelegatedTooltip(options) {
  const {
    container,
    getAnchorFromEventTarget,
    getTooltipContent,
    showTooltip,
    hideTooltip,
    observer
  } = options;
  let currentAnchor2 = null;
  let visibilityHandle = null;
  const stopTrackingCurrentAnchor = () => {
    visibilityHandle?.disconnect();
    visibilityHandle = null;
    currentAnchor2 = null;
  };
  const handleMouseOver = (event) => {
    const anchor = getAnchorFromEventTarget(event.target);
    const content = anchor ? getTooltipContent(anchor) : null;
    if (!anchor || content == null) {
      return;
    }
    if (currentAnchor2 === anchor) {
      return;
    }
    stopTrackingCurrentAnchor();
    currentAnchor2 = anchor;
    visibilityHandle = observeAnchorVisibility(anchor, {
      ...observer,
      onHidden: () => {
        hideTooltip(anchor);
        stopTrackingCurrentAnchor();
      }
    });
    const initialState = visibilityHandle.getState();
    if (!initialState.isVisible) {
      stopTrackingCurrentAnchor();
      return;
    }
    showTooltip(anchor, content);
  };
  const handleMouseOut = (event) => {
    const anchor = getAnchorFromEventTarget(event.target);
    const relatedAnchor = getAnchorFromEventTarget(event.relatedTarget);
    if (!anchor || anchor === relatedAnchor) {
      return;
    }
    if (currentAnchor2 === anchor) {
      hideTooltip(anchor);
      stopTrackingCurrentAnchor();
    }
  };
  container.addEventListener("mouseover", handleMouseOver);
  container.addEventListener("mouseout", handleMouseOut);
  return {
    destroy() {
      container.removeEventListener("mouseover", handleMouseOver);
      container.removeEventListener("mouseout", handleMouseOut);
      stopTrackingCurrentAnchor();
    }
  };
}

// playground/app.js
var diagramRoot = document.querySelector("#diagram-root");
var tooltip = document.querySelector("#tooltip");
var sidePanel = document.querySelector("#side-panel");
var coverPrimaryButton = document.querySelector("#cover-primary");
var coverSecondaryButton = document.querySelector("#cover-secondary");
var coverSvgButton = document.querySelector("#cover-svg");
var primaryAnchor = document.querySelector(".anchor-primary");
var secondaryAnchor = document.querySelector(".anchor-secondary");
var svgAnchor = document.querySelector(".svg-anchor");
if (!(diagramRoot instanceof HTMLElement)) {
  throw new Error("Missing #diagram-root");
}
if (!(tooltip instanceof HTMLElement)) {
  throw new Error("Missing #tooltip");
}
if (!(sidePanel instanceof HTMLElement)) {
  throw new Error("Missing #side-panel");
}
if (!(coverPrimaryButton instanceof HTMLButtonElement)) {
  throw new Error("Missing #cover-primary");
}
if (!(coverSecondaryButton instanceof HTMLButtonElement)) {
  throw new Error("Missing #cover-secondary");
}
if (!(coverSvgButton instanceof HTMLButtonElement)) {
  throw new Error("Missing #cover-svg");
}
if (!(primaryAnchor instanceof HTMLElement)) {
  throw new Error("Missing .anchor-primary");
}
if (!(secondaryAnchor instanceof HTMLElement)) {
  throw new Error("Missing .anchor-secondary");
}
if (!(svgAnchor instanceof SVGElement)) {
  throw new Error("Missing .svg-anchor");
}
var currentAnchor = null;
var activePanelAnchor = secondaryAnchor;
var panelButtons = [
  { button: coverSecondaryButton, anchor: secondaryAnchor },
  { button: coverPrimaryButton, anchor: primaryAnchor },
  { button: coverSvgButton, anchor: svgAnchor }
];
var updateTooltipPosition = () => {
  if (!(currentAnchor instanceof HTMLElement || currentAnchor instanceof SVGElement)) {
    return;
  }
  const rect = currentAnchor.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top}px`;
};
var setActiveButton = (activeButton) => {
  panelButtons.forEach(({ button }) => {
    button.classList.toggle("is-active", button === activeButton);
  });
};
var positionPanelForAnchor = (anchor) => {
  const rect = anchor.getBoundingClientRect();
  const workspaceRect = diagramRoot.parentElement.getBoundingClientRect();
  const paddingY = 48;
  const coverStartX = rect.left - workspaceRect.left + rect.width * 0.42;
  const top = Math.max(24, rect.top - workspaceRect.top - paddingY);
  const maxHeight = workspaceRect.height - top - 24;
  const height = Math.min(maxHeight, rect.height + paddingY * 2);
  const left = Math.max(24, Math.min(workspaceRect.width - 320, coverStartX));
  sidePanel.style.top = `${top}px`;
  sidePanel.style.left = `${left}px`;
  sidePanel.style.width = `${workspaceRect.width - left}px`;
  sidePanel.style.height = `${height}px`;
};
bindDelegatedTooltip({
  container: diagramRoot,
  getAnchorFromEventTarget: (target) => {
    if (!(target instanceof Element)) {
      return null;
    }
    return target.closest("[data-tooltip]");
  },
  getTooltipContent: (anchor) => anchor.getAttribute("data-tooltip"),
  showTooltip: (anchor, content) => {
    currentAnchor = anchor;
    tooltip.textContent = content;
    tooltip.hidden = false;
    updateTooltipPosition();
  },
  hideTooltip: () => {
    currentAnchor = null;
    tooltip.hidden = true;
  },
  observer: {
    ignoreSelectors: ['[data-anchor-visibility-ignore="true"]']
  }
});
coverPrimaryButton.addEventListener("click", () => {
  activePanelAnchor = primaryAnchor;
  positionPanelForAnchor(primaryAnchor);
  setActiveButton(coverPrimaryButton);
});
coverSecondaryButton.addEventListener("click", () => {
  activePanelAnchor = secondaryAnchor;
  positionPanelForAnchor(secondaryAnchor);
  setActiveButton(coverSecondaryButton);
});
coverSvgButton.addEventListener("click", () => {
  activePanelAnchor = svgAnchor;
  positionPanelForAnchor(svgAnchor);
  setActiveButton(coverSvgButton);
});
var updateLayout = () => {
  updateTooltipPosition();
  positionPanelForAnchor(activePanelAnchor);
};
window.addEventListener("resize", updateLayout, { passive: true });
document.addEventListener("scroll", updateLayout, { capture: true, passive: true });
positionPanelForAnchor(activePanelAnchor);
setActiveButton(coverSecondaryButton);
