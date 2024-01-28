'use strict';

import { inIframe } from "./helpers";


export class CopyableElement extends HTMLSpanElement {
    constructor() {
        super();
    }

    connectedCallback() {
        if (inIframe()) {
            return;
        }

        this.setAttribute('title', "Click to copy")
        this.classList.add(
            'cursor-pointer',
        );

        let copymsg = this.dataset.msg || 'Copied to clipboard';

        this.addEventListener('click', () => {
            navigator.clipboard.writeText(this.innerText)
                .then(() => {
                    window.toast
                        .show(copymsg, 'ti ti-copy');
                });

        });
    }
}