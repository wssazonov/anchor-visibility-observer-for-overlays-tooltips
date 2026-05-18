import {bindDelegatedTooltip} from '../src/index.js';

const tooltipLayer = document.querySelector<HTMLElement>('#tooltip-layer');
const tooltipNode = document.querySelector<HTMLElement>('#tooltip');
const diagramRoot = document.querySelector<HTMLElement>('#diagram-root');

if (!tooltipLayer || !tooltipNode || !diagramRoot) {
    throw new Error('Example markup is incomplete.');
}

tooltipLayer.dataset['anchorVisibilityIgnore'] = 'true';

let currentAnchor: Element | null = null;

bindDelegatedTooltip({
    container: diagramRoot,
    getAnchorFromEventTarget: (target) => target instanceof Element
        ? target.closest<HTMLElement>('[data-tooltip]')
        : null,
    getTooltipContent: (anchor) => anchor.getAttribute('data-tooltip'),
    showTooltip: (anchor, content) => {
        currentAnchor = anchor;
        tooltipNode.textContent = content;
        tooltipNode.hidden = false;

        const rect = anchor.getBoundingClientRect();
        tooltipNode.style.left = `${rect.left + rect.width / 2}px`;
        tooltipNode.style.top = `${rect.top - 8}px`;
    },
    hideTooltip: () => {
        currentAnchor = null;
        tooltipNode.hidden = true;
    },
    observer: {
        ignoreSelectors: ['#tooltip-layer'],
    },
});

window.addEventListener('scroll', () => {
    if (!(currentAnchor instanceof HTMLElement || currentAnchor instanceof SVGElement) || tooltipNode.hidden) {
        return;
    }

    const rect = currentAnchor.getBoundingClientRect();
    tooltipNode.style.left = `${rect.left + rect.width / 2}px`;
    tooltipNode.style.top = `${rect.top - 8}px`;
});
