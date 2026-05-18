export type AnchorElement = HTMLElement | SVGElement;

export type SamplePoint =
    | 'center'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right';

export interface AnchorVisibilityState {
    intersectionRatio: number;
    visiblePointRatio: number;
    isIntersecting: boolean;
    isOccluded: boolean;
    isVisible: boolean;
}

export interface ObserveAnchorVisibilityOptions {
    threshold?: number;
    samplePoints?: SamplePoint[];
    /**
     * Selectors that should be ignored during occlusion checks,
     * for example tooltip overlays rendered above the anchor.
     */
    ignoreSelectors?: string[];
    onChange?: (state: AnchorVisibilityState) => void;
    onVisible?: (state: AnchorVisibilityState) => void;
    onHidden?: (state: AnchorVisibilityState) => void;
}

export interface AnchorVisibilityObserverHandle {
    disconnect: () => void;
    revalidate: () => AnchorVisibilityState;
    getState: () => AnchorVisibilityState;
}

export interface DelegatedTooltipBindingOptions<TContent = string> {
    container: HTMLElement;
    getAnchorFromEventTarget: (target: EventTarget | null) => AnchorElement | null;
    getTooltipContent: (anchor: AnchorElement) => TContent | null;
    showTooltip: (anchor: AnchorElement, content: TContent) => void;
    hideTooltip: (anchor?: AnchorElement) => void;
    observer?: Omit<ObserveAnchorVisibilityOptions, 'onChange' | 'onVisible' | 'onHidden'>;
}

export interface DelegatedTooltipBindingHandle {
    destroy: () => void;
}
