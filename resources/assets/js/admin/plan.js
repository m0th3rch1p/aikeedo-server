'use strict';

import Alpine from 'alpinejs';
import { api } from './api';

export function planView() {
    Alpine.data('plan', (plan) => ({
        plan: {},
        model: {},
        required: ['title', 'price'],
        isProcessing: false,

        init() {
            this.plan = plan;

            this.setModel({ ...this.plan })
            this.watch()
        },

        setModel(model) {
            console.log(model);
            this.model = model;
            this.model.price = window.money(this.model.price).format({ pattern: '#' })
        },

        watch() {
            this.required.forEach(field => {
                this.$watch(
                    `model.${field}`,
                    () => this.$refs.submit.disabled = !this.isSubmitable()
                );
            });

            ['token_credit', 'image_credit', 'audio_credit'].forEach(field => {
                this.$watch(
                    `model.${field}`,
                    (value) => {
                        this.model[field] = value < 0 || value == "" ? null : value;
                    }
                );
            });
        },

        submit() {
            if (!this.isSubmitable() || this.isProcessing) {
                return;
            }

            let data = { ...this.model }

            data.status = data.status ? 1 : 0;
            data.is_featured = data.is_featured ? 1 : 0;
            data.price = window.money(data.price, false).intValue;

            if (this.plan.is_locked) {
                // delete each data params except title and description;                
                data = {
                    title: data.title,
                    description: data.description,
                    status: data.status,
                    is_featured: data.is_featured,
                    icon: data.icon,
                    features: data.features,
                }
            }

            this.plan.id ? this.update(data) : this.create(data);
        },

        update(data) {
            this.isProcessing = true;

            api.post(`/plans/${this.plan.id}`, data)
                .then(response => {
                    this.plan = response.data;
                    this.setModel({ ...this.plan });

                    this.isProcessing = false;

                    window.toast
                        .show('Plan has been updated successfully!', 'ti ti-square-rounded-check-filled')
                });
        },

        create(data) {
            api.post('/plans', data)
                .then(response => {
                    this.plan = response.data;
                    this.setModel({ ...this.plan });

                    this.isProcessing = false;

                    window.toast
                        .show('Plan has been created successfully!', 'ti ti-square-rounded-check-filled')

                    history.pushState({}, '', `/admin/plans/${this.plan.id}`);
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