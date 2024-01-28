`use strict`;

export class Overlay extends HTMLElement {
    constructor() {
        super();
        this.addEventListener('click', () => this.close());
    }

    open(name) {
        document.body.setAttribute('data-overlay', name);
    }

    close() {
        document.body.removeAttribute('data-overlay');
    }
}