'use strict';

import Alpine from 'alpinejs';
import { api } from './api';

export function accountView() {
    Alpine.data('account', () => ({
        required: [],
        isProcessing: false,
        isSubmitable: false,

        init() {
            this.$refs.form.querySelectorAll('[required]').forEach((element) => {
                this.required.push(element);

                element.addEventListener('input', () => this.checkIsSubmitable());
            });

            this.checkIsSubmitable();
        },

        submit() {
            if (!this.isSubmitable || this.isProcessing) {
                return;
            }

            this.isProcessing = true;

            let data = {};
            for (const [key, value] of new FormData(this.$refs.form)) {
                data[key] = value;
            }

            api.post(`/account${this.$refs.form.dataset.path || ''}`, data)
                .then(response => {
                    if (response.data.jwt) {
                        // Save the JWT to local storage 
                        // to be used for future api requests
                        localStorage.setItem('jwt', response.data.jwt);
                    }

                    this.isProcessing = false;

                    window.toast
                        .show(this.$refs.form.dataset.successMsg || 'Changes saved successfully!', 'ti ti-square-rounded-check-filled')
                })
                .catch(error => {
                    let msg = 'An unexpedted error occured. Please try again later.';

                    if (error.response && error.response.data.message) {
                        msg = error.response.data.message;
                    }

                    this.isProcessing = false;
                    window.toast
                        .show(msg, 'ti ti-square-rounded-x-filled')
                });
        },

        checkIsSubmitable() {
            for (let i = 0; i < this.required.length; i++) {
                const el = this.required[i];

                if (!el.value) {
                    this.isSubmitable = false;
                    return;
                }
            }

            this.isSubmitable = true;
        },

        resendIn: 0,
        resendVerificationEmail() {
            if (this.resent) {
                return;
            }

            this.resendIn = 60;

            let interval = setInterval(() => {
                this.resendIn--;

                if (this.resendIn <= 0) {
                    clearInterval(interval);
                }
            }, 1000);

            api.post('/account/verification')
                .then(response => {
                    window.toast
                        .show('Email sent successfully!', 'ti ti-square-rounded-check-filled')
                })
                .catch(error => {
                    let msg = 'An unexpedted error occured. Please try again later.';

                    if (error.response && error.response.data.message) {
                        msg = error.response.data.message;
                    }

                    window.toast
                        .show(msg, 'ti ti-square-rounded-x-filled')
                });
        }
    }))
}