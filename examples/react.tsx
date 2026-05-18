import {useEffect, useRef, useState} from 'react';
import {observeAnchorVisibility} from '../src/index.js';

export function ExampleTooltipButton(): JSX.Element {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    useEffect(() => {
        const button = buttonRef.current;
        if (!button || !isTooltipVisible) {
            return;
        }

        const handle = observeAnchorVisibility(button, {
            ignoreSelectors: ['.tooltip-layer'],
            onHidden: () => setIsTooltipVisible(false),
        });

        return () => {
            handle.disconnect();
        };
    }, [isTooltipVisible]);

    return (
        <button
            ref={buttonRef}
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
        >
            Hover me
        </button>
    );
}
