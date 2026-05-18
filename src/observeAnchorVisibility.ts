import {
    AnchorElement,
    AnchorVisibilityObserverHandle,
    AnchorVisibilityState,
    ObserveAnchorVisibilityOptions,
    SamplePoint,
} from './types.js';

const DEFAULT_THRESHOLD = 0.25;
const DEFAULT_SAMPLE_POINTS: SamplePoint[] = ['center', 'top', 'bottom', 'left', 'right'];
const DEFAULT_IGNORE_SELECTORS = ['[data-anchor-visibility-ignore="true"]'];

export function observeAnchorVisibility(
    anchor: AnchorElement,
    options: ObserveAnchorVisibilityOptions = {},
): AnchorVisibilityObserverHandle {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const samplePoints = options.samplePoints?.length ? options.samplePoints : DEFAULT_SAMPLE_POINTS;
    const ignoreSelectors = options.ignoreSelectors?.length ? options.ignoreSelectors : DEFAULT_IGNORE_SELECTORS;
    const doc = anchor.ownerDocument;
    const win = doc.defaultView;

    let observer: IntersectionObserver | null = null;
    let state: AnchorVisibilityState = {
        intersectionRatio: 1,
        visiblePointRatio: 1,
        isIntersecting: true,
        isOccluded: false,
        isVisible: true,
    };

    const notify = (nextState: AnchorVisibilityState): void => {
        const wasVisible = state.isVisible;
        const changed =
            state.intersectionRatio !== nextState.intersectionRatio ||
            state.visiblePointRatio !== nextState.visiblePointRatio ||
            state.isIntersecting !== nextState.isIntersecting ||
            state.isOccluded !== nextState.isOccluded ||
            state.isVisible !== nextState.isVisible;

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

    const revalidate = (): AnchorVisibilityState => {
        const nextState = computeAnchorVisibility(anchor, {
            threshold,
            samplePoints,
            ignoreSelectors,
            previousIntersectionRatio: state.intersectionRatio,
        });
        notify(nextState);
        return state;
    };

    if (win && 'IntersectionObserver' in win) {
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
                entryIsIntersecting: entry.isIntersecting,
            });

            notify(nextState);
        }, {
            threshold: [0, threshold, 0.5, 1],
        });

        observer.observe(anchor);
    }

    const handleViewportChange = (): void => {
        revalidate();
    };

    win?.addEventListener('resize', handleViewportChange, {passive: true});
    doc.addEventListener('scroll', handleViewportChange, {capture: true, passive: true});

    revalidate();

    return {
        disconnect(): void {
            observer?.disconnect();
            observer = null;
            win?.removeEventListener('resize', handleViewportChange);
            doc.removeEventListener('scroll', handleViewportChange, true);
        },
        revalidate,
        getState(): AnchorVisibilityState {
            return state;
        },
    };
}

interface ComputeVisibilityOptions {
    threshold: number;
    samplePoints: SamplePoint[];
    ignoreSelectors: string[];
    previousIntersectionRatio: number;
    entryIsIntersecting?: boolean;
}

function computeAnchorVisibility(
    anchor: AnchorElement,
    options: ComputeVisibilityOptions,
): AnchorVisibilityState {
    if (!anchor.isConnected) {
        return {
            intersectionRatio: 0,
            visiblePointRatio: 0,
            isIntersecting: false,
            isOccluded: true,
            isVisible: false,
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
            isVisible: false,
        };
    }

    const isInsideViewport = !(
        rect.bottom <= 0 ||
        rect.right <= 0 ||
        rect.top >= win.innerHeight ||
        rect.left >= win.innerWidth
    );

    if (!isInsideViewport) {
        return {
            intersectionRatio: 0,
            visiblePointRatio: 0,
            isIntersecting: false,
            isOccluded: true,
            isVisible: false,
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
        isVisible: isIntersecting && visiblePointRatio >= options.threshold,
    };
}

function isPointVisibleForAnchor(
    anchor: AnchorElement,
    x: number,
    y: number,
    ignoreSelectors: string[],
): boolean {
    const doc = anchor.ownerDocument;
    const elements = typeof doc.elementsFromPoint === 'function'
        ? doc.elementsFromPoint(x, y)
        : [doc.elementFromPoint(x, y)].filter((element): element is Element => !!element);

    const firstRelevantElement = elements.find((element) => !shouldIgnoreElement(element, ignoreSelectors));
    if (!firstRelevantElement) {
        return false;
    }

    return firstRelevantElement === anchor || anchor.contains(firstRelevantElement);
}

function shouldIgnoreElement(element: Element, ignoreSelectors: string[]): boolean {
    return ignoreSelectors.some((selector) => element.closest(selector));
}

function getSampleCoordinates(
    rect: DOMRect,
    win: Window,
    samplePoints: SamplePoint[],
): Array<{x: number; y: number}> {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clampX = (value: number): number => Math.min(Math.max(value, 0), win.innerWidth - 1);
    const clampY = (value: number): number => Math.min(Math.max(value, 0), win.innerHeight - 1);

    return samplePoints.map((point) => {
        switch (point) {
            case 'top':
                return {x: clampX(centerX), y: clampY(rect.top + 1)};
            case 'bottom':
                return {x: clampX(centerX), y: clampY(rect.bottom - 1)};
            case 'left':
                return {x: clampX(rect.left + 1), y: clampY(centerY)};
            case 'right':
                return {x: clampX(rect.right - 1), y: clampY(centerY)};
            case 'center':
            default:
                return {x: clampX(centerX), y: clampY(centerY)};
        }
    });
}
