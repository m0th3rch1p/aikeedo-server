'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import jwt_decode from 'jwt-decode';

export function authView() {
    Alpine.data('auth', (view) => ({
        required: [],
        isProcessing: false,
        isSubmitable: false,
        success: false,

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

            let data = new FormData(this.$refs.form);

            this.$refs.form.querySelectorAll('input[type="checkbox"]').forEach((element) => {
                data.append(element.name, element.checked ? '1' : '0');
            });

            api.post(this.$refs.form.dataset.apiPath, data)
                .then(response => {
                    if (response.data.jwt) {
                        const jwt = response.data.jwt;
                        const payload = jwt_decode(jwt);

                        // Save the JWT to local storage 
                        // to be used for future api requests
                        localStorage.setItem('jwt', jwt);

                        // Redirect user to the app or admin dashboard
                        window.location.href = payload.is_admin ? '/admin' : '/app';

                        // Response should include the user cookie (autosaved) 
                        // for authenticatoin of the UI GET requests
                    } else {
                        this.isProcessing = true;
                        this.success = true;
                    }
                })
                .catch(error => {
                    let msg = 'An unexpected error occurred! Please try again later!';

                    if (error.response && error.response.status == 401) {
                        msg = "Authentication failed! Please check your credentials and try again!";
                    }

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
        }
    }));
}