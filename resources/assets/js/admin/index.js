`use strict`;

import { listView } from './list.js';
import { presetView } from './preset.js';
import { userView } from './user.js';
import { categoryView } from './category.js';
import { planView } from './plan.js';
import { settingsView } from './settings.js';

import Alpine from 'alpinejs';
import mask from '@alpinejs/mask'

// Load views
listView();

presetView();
userView();
categoryView();
planView();

settingsView();

// Call after views are loaded
Alpine.plugin(mask);
Alpine.start();