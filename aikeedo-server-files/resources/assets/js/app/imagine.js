'use strict';

import Alpine from 'alpinejs';
import { api } from './api';

export function imagineView(presetId = null) {
    Alpine.data('imagine', () => ({
        required: [],
        isProcessing: false,
        isSubmitable: false,
        currentResource: null,
        images: [],
        model: null,
        width: null,
        height: null,
        config: {
            'dall-e-2': {
                sizes: [
                    { width: 256, height: 256 },
                    { width: 512, height: 512 },
                    { width: 1024, height: 1024 },
                ],
                style: 'default'
            },

            'dall-e-3': {
                sizes: [
                    { width: 1024, height: 1024 },
                    { width: 1792, height: 1024 },
                    { width: 1024, height: 1792 },
                ],
                style: 'default'
            },

            'stable-diffusion-v1-6': {
                sizes: [
                    { width: 320, height: 320 },
                    { width: 640, height: 640 },
                    { width: 1280, height: 1280 },
                    { width: 1536, height: 1536 },

                    { width: 1024, height: 1024 },
                    { width: 1152, height: 896 },
                    { width: 1216, height: 832 },
                    { width: 1344, height: 768 },
                    { width: 640, height: 1536 },
                    { width: 768, height: 1344 },
                    { width: 832, height: 1216 },
                    { width: 896, height: 1152 },
                ],
                style: 'stable-diffusion'
            },
            'stable-diffusion-xl-1024-v1-0': {
                sizes: [
                    { width: 1024, height: 1024 },
                    { width: 1152, height: 896 },
                    { width: 1216, height: 832 },
                    { width: 1344, height: 768 },
                    { width: 1536, height: 640 },
                    { width: 640, height: 1536 },
                    { width: 768, height: 1344 },
                    { width: 832, height: 1216 },
                    { width: 896, height: 1152 },
                ],
                style: 'stable-diffusion'
            },
            'stable-diffusion-512-v2-1': {
                sizes: [
                    { width: 320, height: 320 },
                    { width: 640, height: 640 },
                    { width: 1024, height: 1024 },

                    { width: 1152, height: 896 },
                    { width: 1216, height: 832 },
                    { width: 1344, height: 768 },
                    { width: 640, height: 1536 },
                    { width: 768, height: 1344 },
                    { width: 832, height: 1216 },
                    { width: 896, height: 1152 },
                ],
                style: 'stable-diffusion'
            },

            'stable-diffusion-xl-beta-v2-2-2': {
                sizes: [
                    { width: 320, height: 320 },
                    { width: 512, height: 512 },
                    { width: 512, height: 896 },
                    { width: 896, height: 512 },
                ],
                style: 'stable-diffusion'
            }
        },
        sizes: [
            {
                'model': 'dall-e-2',
                'options': [
                    { width: 256, height: 256 },
                    { width: 512, height: 512 },
                    { width: 1024, height: 1024 },
                ]
            },

            {
                'model': 'dall-e-3',
                'options': [
                    { width: 1024, height: 1024 },
                    { width: 1792, height: 1024 },
                    { width: 1024, height: 1792 },
                ]
            },

            {
                'model': 'stable-diffusion-v1-6',
                'options': [
                    { width: 320, height: 320 },
                    { width: 640, height: 640 },
                    { width: 1280, height: 1280 },
                    { width: 1536, height: 1536 },

                    { width: 1024, height: 1024 },
                    { width: 1152, height: 896 },
                    { width: 1216, height: 832 },
                    { width: 1344, height: 768 },
                    { width: 640, height: 1536 },
                    { width: 768, height: 1344 },
                    { width: 832, height: 1216 },
                    { width: 896, height: 1152 },
                ]
            },

            {
                'model': 'stable-diffusion-xl-1024-v1-0',
                'options': [
                    { width: 1024, height: 1024 },
                    { width: 1152, height: 896 },
                    { width: 1216, height: 832 },
                    { width: 1344, height: 768 },
                    { width: 1536, height: 640 },
                    { width: 640, height: 1536 },
                    { width: 768, height: 1344 },
                    { width: 832, height: 1216 },
                    { width: 896, height: 1152 },
                ]
            },

            {
                'model': 'stable-diffusion-512-v2-1',
                'options': [
                    { width: 320, height: 320 },
                    { width: 640, height: 640 },
                    { width: 1024, height: 1024 },

                    { width: 1152, height: 896 },
                    { width: 1216, height: 832 },
                    { width: 1344, height: 768 },
                    { width: 640, height: 1536 },
                    { width: 768, height: 1344 },
                    { width: 832, height: 1216 },
                    { width: 896, height: 1152 },
                ]
            },

            {
                'model': 'stable-diffusion-xl-beta-v2-2-2',
                'options': [
                    { width: 320, height: 320 },
                    { width: 512, height: 512 },
                    { width: 512, height: 896 },
                    { width: 896, height: 512 },
                ]
            },
        ],

        init() {
            this.$refs.form.querySelectorAll('[required]').forEach((element) => {
                this.required.push(element);

                element.addEventListener('input', () => this.checkIsSubmitable());
            });

            this.checkIsSubmitable();
        },

        submit(path) {
            if (!this.isSubmitable || this.isProcessing) {
                return;
            }

            this.isProcessing = true;


            api.post(`/ai/services/image-generator`, new FormData(this.$refs.form))
                .then(response => {
                    this.isProcessing = false;
                    if (response.data && response.data.id) {
                        this.images.unshift(response.data);
                    } else {
                        let msg = 'An unexpected error occurred! Please try again later!';
                        window.toast
                            .show(msg, 'ti ti-square-rounded-x-filled')
                    }
                })
                .catch(error => {
                    let msg = 'An unexpected error occurred! Please try again later!';

                    if (error.response) {
                        if (error.response.status == 402) {
                            msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
                        } else if (error.response.data.message) {
                            msg = error.response.data.message;
                        }
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

        copyImgToClipboard(imgUrl) {
            fetch(imgUrl)
                .then(res => res.blob())
                .then(blob => {
                    let item = new ClipboardItem({
                        [blob.type]: blob,
                    });

                    return navigator.clipboard.write([item])
                })
                .then(() => {
                    window.toast
                        .show('Image copied to clipboard!', 'ti ti-square-rounded-check-filled');
                });
        }
    }));
}