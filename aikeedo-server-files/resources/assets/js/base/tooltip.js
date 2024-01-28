`use strict`;

import tippy from 'tippy.js';

export function tooltip() {
    setTimeout(() =>
        tippy('[title]:not(iframe)', {
            content: (reference) => {
                const title = reference.getAttribute('title');
                reference.removeAttribute('title');
                return title;
            },
            arrow: false
        }),

        2000
    )
}