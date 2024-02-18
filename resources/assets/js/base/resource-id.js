'use strict';

import { inIframe } from "./helpers";

export class ResourceId extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.classList.add(
            'text-xs',
            'font-normal',
            'text-content-dimmed',
        );

        if (inIframe()) {
            return;
        }

        this.classList.add(
            'cursor-pointer',
            'select-none'
        );

        this.setAttribute('title', "Click to copy")
        this.dataset.tippyPlacement = 'right';

        this.addEventListener('click', () => {
            navigator.clipboard.writeText(this.innerText)
                .then(() => {
                    window.toast
                        .show('Resource UUID is copied to the clipboard.', 'ti ti-copy');
                });

        });
    }
}