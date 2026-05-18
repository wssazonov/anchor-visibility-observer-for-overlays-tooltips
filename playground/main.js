import {bindDelegatedTooltip} from './dist/index.js';

const diagramRoot = document.querySelector('#diagram-root');
const tooltip = document.querySelector('#tooltip');
const sidePanel = document.querySelector('#side-panel');
const coverPrimaryButton = document.querySelector('#cover-primary');
const coverSecondaryButton = document.querySelector('#cover-secondary');
const coverSvgButton = document.querySelector('#cover-svg');
const primaryAnchor = document.querySelector('.anchor-primary');
const secondaryAnchor = document.querySelector('.anchor-secondary');
const svgAnchor = document.querySelector('.svg-anchor');

if (!(diagramRoot instanceof HTMLElement)) {
    throw new Error('Missing #diagram-root');
}

if (!(tooltip instanceof HTMLElement)) {
    throw new Error('Missing #tooltip');
}

if (!(sidePanel instanceof HTMLElement)) {
    throw new Error('Missing #side-panel');
}

if (!(coverPrimaryButton instanceof HTMLButtonElement)) {
    throw new Error('Missing #cover-primary');
}

if (!(coverSecondaryButton instanceof HTMLButtonElement)) {
    throw new Error('Missing #cover-secondary');
}

if (!(coverSvgButton instanceof HTMLButtonElement)) {
    throw new Error('Missing #cover-svg');
}

if (!(primaryAnchor instanceof HTMLElement)) {
    throw new Error('Missing .anchor-primary');
}

if (!(secondaryAnchor instanceof HTMLElement)) {
    throw new Error('Missing .anchor-secondary');
}

if (!(svgAnchor instanceof SVGElement)) {
    throw new Error('Missing .svg-anchor');
}

let currentAnchor = null;
let activePanelAnchor = secondaryAnchor;

const panelButtons = [
    {button: coverSecondaryButton, anchor: secondaryAnchor},
    {button: coverPrimaryButton, anchor: primaryAnchor},
    {button: coverSvgButton, anchor: svgAnchor},
];

const updateTooltipPosition = () => {
    if (!(currentAnchor instanceof HTMLElement || currentAnchor instanceof SVGElement)) {
        return;
    }

    const rect = currentAnchor.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top}px`;
};

const setActiveButton = (activeButton) => {
    panelButtons.forEach(({button}) => {
        button.classList.toggle('is-active', button === activeButton);
    });
};

const positionPanelForAnchor = (anchor) => {
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

        return target.closest('[data-tooltip]');
    },
    getTooltipContent: (anchor) => anchor.getAttribute('data-tooltip'),
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
        ignoreSelectors: ['[data-anchor-visibility-ignore="true"]'],
    },
});

coverPrimaryButton.addEventListener('click', () => {
    activePanelAnchor = primaryAnchor;
    positionPanelForAnchor(primaryAnchor);
    setActiveButton(coverPrimaryButton);
});

coverSecondaryButton.addEventListener('click', () => {
    activePanelAnchor = secondaryAnchor;
    positionPanelForAnchor(secondaryAnchor);
    setActiveButton(coverSecondaryButton);
});

coverSvgButton.addEventListener('click', () => {
    activePanelAnchor = svgAnchor;
    positionPanelForAnchor(svgAnchor);
    setActiveButton(coverSvgButton);
});

const updateLayout = () => {
    updateTooltipPosition();
    positionPanelForAnchor(activePanelAnchor);
};

window.addEventListener('resize', updateLayout, {passive: true});
document.addEventListener('scroll', updateLayout, {capture: true, passive: true});

positionPanelForAnchor(activePanelAnchor);
setActiveButton(coverSecondaryButton);
