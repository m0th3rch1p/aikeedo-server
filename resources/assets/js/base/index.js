`use strict`;

import { width } from './scrollbar.js';
import { tooltip } from './tooltip.js';
import { money } from './money.js';

// Import custom HTML elements
import { Overlay } from './overlay.js';
import { Toast } from './toast.js';
import { ModeSwitcher } from './mode-switcher.js';
import { ResourceId } from './resource-id.js';
import { CopyableElement } from './copyable-element.js';

// Define custom elements
customElements.define('mode-switcher', ModeSwitcher);
customElements.define('toast-message', Toast);
customElements.define('overlay-element', Overlay);
customElements.define('resource-id', ResourceId, { extends: 'code' })
customElements.define('copyable-element', CopyableElement, { extends: 'span' })

// Define singletons for custom elements
window.overlay = document.querySelector('overlay-element');
window.toast = document.querySelector('toast-message');

window.money = money;

// Set scrollbar width
document.documentElement.style.setProperty(`--scrollbar-width`, `${width}px`);

// Initialize tooltips
tooltip();