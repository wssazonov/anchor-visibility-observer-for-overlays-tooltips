import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {observeAnchorVisibility} from '../src/observeAnchorVisibility.js';

describe('observeAnchorVisibility', () => {
    beforeEach(() => {
        Object.defineProperty(document, 'elementsFromPoint', {
            configurable: true,
            writable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('treats anchor as visible when top-most element is the anchor', () => {
        const anchor = document.createElement('div');
        document.body.appendChild(anchor);

        vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
            top: 10,
            left: 10,
            right: 110,
            bottom: 60,
            width: 100,
            height: 50,
            x: 10,
            y: 10,
            toJSON: () => ({}),
        } as DOMRect);

        vi.spyOn(document, 'elementsFromPoint').mockReturnValue([anchor]);

        const handle = observeAnchorVisibility(anchor);

        expect(handle.getState().isVisible).toBe(true);
        expect(handle.getState().isOccluded).toBe(false);

        handle.disconnect();
        anchor.remove();
    });

    it('treats anchor as hidden when all sample points are occluded', () => {
        const anchor = document.createElement('div');
        const overlay = document.createElement('div');

        document.body.append(anchor, overlay);

        vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
            top: 10,
            left: 10,
            right: 110,
            bottom: 60,
            width: 100,
            height: 50,
            x: 10,
            y: 10,
            toJSON: () => ({}),
        } as DOMRect);

        vi.spyOn(document, 'elementsFromPoint').mockReturnValue([overlay, anchor]);

        const handle = observeAnchorVisibility(anchor);

        expect(handle.getState().isVisible).toBe(false);
        expect(handle.getState().isOccluded).toBe(true);

        handle.disconnect();
        anchor.remove();
        overlay.remove();
    });

    it('ignores tooltip overlays marked with data-anchor-visibility-ignore', () => {
        const anchor = document.createElement('div');
        const tooltipOverlay = document.createElement('div');
        tooltipOverlay.dataset['anchorVisibilityIgnore'] = 'true';

        document.body.append(anchor, tooltipOverlay);

        vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
            top: 10,
            left: 10,
            right: 110,
            bottom: 60,
            width: 100,
            height: 50,
            x: 10,
            y: 10,
            toJSON: () => ({}),
        } as DOMRect);

        vi.spyOn(document, 'elementsFromPoint').mockReturnValue([tooltipOverlay, anchor]);

        const handle = observeAnchorVisibility(anchor);

        expect(handle.getState().isVisible).toBe(true);

        handle.disconnect();
        anchor.remove();
        tooltipOverlay.remove();
    });
});
