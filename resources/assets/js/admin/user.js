'use strict';

import Alpine from 'alpinejs';
import { api } from './api';

export function userView() {
    Alpine.data('user', (user) => ({
        user: {},
        model: {
            role: 0,
        },
        required: ['first_name', 'last_name', 'email'],
        isProcessing: false,

        init() {
            this.user = user;
            this.model = { ...this.model, ...this.user };

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

            this.user.id ? this.update(data) : this.create(data);
        },

        update(data) {
            api.post(`/users/${this.user.id}`, data)
                .then(response => {
                    this.user = response.data;
                    this.model = { ...this.user };

                    this.isProcessing = false;

                    window.toast
                        .show('User has been updated successfully!', 'ti ti-square-rounded-check-filled')
                })
                .catch(error => this.isProcessing = false);
        },

        create(data) {
            api.post('/users', data)
                .then(response => {
                    this.user = response.data;
                    this.model = { ...this.user };

                    this.isProcessing = false;

                    window.toast
                        .show('User has been created successfully!', 'ti ti-square-rounded-check-filled')

                    history.pushState({}, '', `/admin/users/${this.user.id}`);
                })
                .catch(error => this.isProcessing = false);
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