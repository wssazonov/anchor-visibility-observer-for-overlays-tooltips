import {observeAnchorVisibility} from './observeAnchorVisibility.js';
import {
    AnchorElement,
    AnchorVisibilityObserverHandle,
    DelegatedTooltipBindingHandle,
    DelegatedTooltipBindingOptions,
} from './types.js';

export function bindDelegatedTooltip<TContent = string>(
    options: DelegatedTooltipBindingOptions<TContent>,
): DelegatedTooltipBindingHandle {
    const {
        container,
        getAnchorFromEventTarget,
        getTooltipContent,
        showTooltip,
        hideTooltip,
        observer,
    } = options;

    let currentAnchor: AnchorElement | null = null;
    let visibilityHandle: AnchorVisibilityObserverHandle | null = null;

    const stopTrackingCurrentAnchor = (): void => {
        visibilityHandle?.disconnect();
        visibilityHandle = null;
        currentAnchor = null;
    };

    const handleMouseOver = (event: MouseEvent): void => {
        const anchor = getAnchorFromEventTarget(event.target);
        const content = anchor ? getTooltipContent(anchor) : null;

        if (!anchor || content == null) {
            return;
        }

        if (currentAnchor === anchor) {
            return;
        }

        stopTrackingCurrentAnchor();
        currentAnchor = anchor;

        visibilityHandle = observeAnchorVisibility(anchor, {
            ...observer,
            onHidden: () => {
                hideTooltip(anchor);
                stopTrackingCurrentAnchor();
            },
        });

        const initialState = visibilityHandle.getState();
        if (!initialState.isVisible) {
            stopTrackingCurrentAnchor();
            return;
        }

        showTooltip(anchor, content);
    };

    const handleMouseOut = (event: MouseEvent): void => {
        const anchor = getAnchorFromEventTarget(event.target);
        const relatedAnchor = getAnchorFromEventTarget(event.relatedTarget);

        if (!anchor || anchor === relatedAnchor) {
            return;
        }

        if (currentAnchor === anchor) {
            hideTooltip(anchor);
            stopTrackingCurrentAnchor();
        }
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);

    return {
        destroy(): void {
            container.removeEventListener('mouseover', handleMouseOver);
            container.removeEventListener('mouseout', handleMouseOut);
            stopTrackingCurrentAnchor();
        },
    };
}
