`use strict`;

import Alpine from 'alpinejs';

import { initState } from './state.js';

import { aiView } from './ai.js';
import { listView } from './list.js';
import { documentView } from './document.js';
import { billingView } from './billing.js';

import { Checkout } from './checkout.js';
import { accountView } from './account.js';
import { dashboardView } from './dashboard.js';
import { voiceover } from './voiceover.js';
import { imagineView } from './imagine.js';

initState();
window.checkout = new Checkout();

dashboardView();
listView();
aiView();
imagineView();
documentView();
billingView();
accountView();
voiceover();

Alpine.start();