import { __ } from "./translate";

`use strict`;

export class Toast extends HTMLElement {
    constructor() {
        super();
        this.timer = 0;


        this.addEventListener('click', () => this.hide());
    }

    show(message, icon) {
        clearTimeout(this.timer);
        this.hide();

        this.innerHTML = '';

        if (icon) {
            this.innerHTML = `<i class="text-2xl transition-all delay-100 translate-y-2 rotate-45 opacity-0 group-data-[open]/toast:rotate-0 group-data-[open]/toast:translate-y-0 group-data-[open]/toast:opacity-100 ${icon}"></i>`
        }

        this.appendChild(document.createTextNode(__(message)));

        setTimeout(() =>
            this.dataset.open = true, 100)

        this.timer = setTimeout(() => this.hide(), 5000);
    }

    hide() {
        delete this.dataset.open
    }
}