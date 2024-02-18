'use strict';

import Alpine from 'alpinejs';
import { api } from './api';

export function categoryView() {
    Alpine.data('category', (category) => ({
        category: {},
        model: {},
        required: ['title'],
        isProcessing: false,

        init() {
            this.category = category;
            this.model = { ...this.category };

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

            this.category.id ? this.update() : this.create();
        },

        update() {
            this.isProcessing = true;
            api.post(`/categories/${this.category.id}`, this.model)
                .then(response => {
                    this.category = response.data;
                    this.model = { ...this.category };

                    this.isProcessing = false;

                    window.toast
                        .show('Category has been updated successfully!', 'ti ti-square-rounded-check-filled')
                });
        },

        create() {
            api.post('/categories', this.model)
                .then(response => {
                    this.category = response.data;
                    this.model = { ...this.category };

                    this.isProcessing = false;

                    window.toast
                        .show('Category has been created successfully!', 'ti ti-square-rounded-check-filled')

                    history.pushState({}, '', `/admin/categories/${this.category.id}`);
                });
        },

        isSubmitable() {
            for (let i = 0; i < this.required.length; i++) {
                const field = this.required[i];

                if (!this.model[field]) {
                    return false;
                }
            }

            return true;
        }
    }))
}