import {onBeforeUnmount, ref} from 'vue';
import {observeAnchorVisibility, type AnchorVisibilityObserverHandle} from '../src/index.js';

export function useOcclusionAwareTooltip() {
    const anchorRef = ref<HTMLElement | null>(null);
    const isTooltipVisible = ref(false);
    let handle: AnchorVisibilityObserverHandle | null = null;

    const show = () => {
        if (!anchorRef.value) {
            return;
        }

        handle?.disconnect();
        isTooltipVisible.value = true;

        handle = observeAnchorVisibility(anchorRef.value, {
            ignoreSelectors: ['.tooltip-layer'],
            onHidden: () => {
                isTooltipVisible.value = false;
            },
        });
    };

    const hide = () => {
        handle?.disconnect();
        handle = null;
        isTooltipVisible.value = false;
    };

    onBeforeUnmount(hide);

    return {
        anchorRef,
        isTooltipVisible,
        show,
        hide,
    };
}
