'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import { getCategoryList } from './helpers';

export function presetView() {
    Alpine.data('preset', (preset) => ({
        preset: {},
        model: {},
        required: ['title'],
        isProcessing: false,
        categories: [],
        categoriesFethed: false,

        init() {
            this.setPreset(preset);
            this.watch();

            getCategoryList()
                .then(categories => {
                    this.categories = categories;
                    this.categoriesFethed = true;
                });
        },

        setPreset(preset) {
            this.preset = preset;
            this.model = { ...this.preset };
            this.model.category_id = preset.category?.id;
        },

        watch() {
            this.required.forEach(field => {
                this.$watch(
                    `model.${field}`,
                    () => this.$refs.submit.disabled = !this.isSubmitable()
                );
            });
        },

        submit() {
            if (!this.isSubmitable() || this.isProcessing) {
                return;
            }

            this.isProcessing = true;
            let data = this.model;
            data.status = data.status ? 1 : 0;

            this.preset.id ? this.update(data) : this.create(data);
        },

        update(data) {
            api.post(`/presets/${this.preset.id}`, data)
                .then(response => {
                    this.setPreset(response.data);
                    this.isProcessing = false;

                    window.toast
                        .show('Template has been updated successfully!', 'ti ti-square-rounded-check-filled')
                }).catch(error => this.isProcessing = false);
        },

        create(data) {
            api.post('/presets', data)
                .then(response => {
                    this.setPreset(response.data);;
                    this.isProcessing = false;

                    window.toast
                        .show('Template has been created successfully!', 'ti ti-square-rounded-check-filled')

                    history.pushState({}, '', `/admin/templates/${this.preset.id}`);
                }).catch(error => this.isProcessing = false);
        },

        isSubmitable() {
            for (let i = 0; i < this.required.length; i++) {
                const field = this.required[i];

                if (!this.model[field]) {
                    return false;
                }
            }

            return true;
        },

        sanitizeColor(input, el) {

            const sanitizedInput = input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

            if (/^([0-9A-Fa-f]{3}){1,2}$/.test(sanitizedInput)) {
                this.model.color = `#${sanitizedInput.padEnd(6, '0').slice(0, 6)}`;
            } else {
                this.model.color = "#000000";
            }
        }
    }))
}