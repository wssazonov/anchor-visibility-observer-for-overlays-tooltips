import {Directive, ElementRef, OnDestroy, inject} from '@angular/core';
import {observeAnchorVisibility, type AnchorVisibilityObserverHandle} from '../src/index.js';

@Directive({
    selector: '[appOcclusionAwareTooltip]',
    standalone: true,
    host: {
        '(mouseenter)': 'show()',
        '(mouseleave)': 'hide()',
    },
})
export class OcclusionAwareTooltipDirective implements OnDestroy {
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private visibilityHandle: AnchorVisibilityObserverHandle | null = null;

    show(): void {
        this.visibilityHandle?.disconnect();

        this.visibilityHandle = observeAnchorVisibility(this.elementRef.nativeElement, {
            ignoreSelectors: ['.tooltip-layer'],
            onHidden: () => this.hide(),
        });

        // render your tooltip here
    }

    hide(): void {
        this.visibilityHandle?.disconnect();
        this.visibilityHandle = null;

        // hide your tooltip here
    }

    ngOnDestroy(): void {
        this.hide();
    }
}
