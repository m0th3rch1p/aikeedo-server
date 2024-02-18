'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import { markdownToHtml } from './markdown';
import WaveSurfer from 'wavesurfer.js';

export function aiView(presetId = null) {
    Alpine.data('ai', () => ({
        required: [],
        isProcessing: false,
        isContentProcessing: false,
        isSubmitable: false,
        showActions: false,
        autosave: false,
        saving: false,
        readonly: true,
        output: '',
        images: [],
        showGallery: false,

        showWave: false,
        wave: null,
        waveReader: null,
        audioFile: null,
        audioIsPlaying: false,

        doc: {
            id: null,
            title: null,
            content: null,
            preset: {
                id: presetId
            }
        },

        showCost: false,
        cost: {
            token: 0,
            image: 0,
            audio: 0
        },

        init() {
            this.$refs.form.querySelectorAll('[required]').forEach((element) => {
                this.required.push(element);

                element.addEventListener('input', () => this.checkIsSubmitable());
            });

            this.setupSpeech2Text();
            this.checkIsSubmitable();

            if (!this.doc.preset.id && this.isSubmitable) {
                this.submit('/text-generator');
            }
        },

        setupSpeech2Text() {
            this.wave = WaveSurfer.create({
                container: this.$refs.wave,
                height: 56,
                waveColor: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed')})`,
                progressColor: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-content')})`,
                cursorColor: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed')})`,
                barWidth: 4,
                cursorWidth: 0,
                barGap: 2,
                barRadius: 30,
                dragToSeek: true
            })

            this.wave.on('interaction', () => {
                if (!this.wave.isPlaying()) {
                    this.wave.play()
                    this.audioIsPlaying = true;
                }
            });

            this.wave.on('play', () => {
                this.audioIsPlaying = true;
            });

            this.wave.on('pause', () => {
                this.audioIsPlaying = false;
            });

            this.waveReader = new FileReader();
            this.waveReader.onload = (event) => this.wave.load(event.target.result)
        },

        submit(path) {
            if (!this.isSubmitable || this.isProcessing || this.isContentProcessing) {
                return;
            }

            this.resetCost();
            this.isProcessing = true;
            this.isContentProcessing = true;
            this.readonly = true;

            let params = {};
            for (const [key, value] of new FormData(this.$refs.form)) {
                params[key] = value;
            }

            let query = new URLSearchParams(params);
            query.append('jwt', localStorage.getItem('jwt'));
            let es = new EventSource(`api/ai/services${path}?${query.toString()}`);

            let contentstarted = false;
            es.addEventListener('token', (event) => {
                let token = JSON.parse(event.data);

                this.doc.content = (contentstarted && this.doc.content ? this.doc.content : '') + token;
                this.output = markdownToHtml(this.doc.content);
                contentstarted = true;
            });

            es.addEventListener('image', (event) => {
                let image = JSON.parse(event.data);
                this.images.push(image.src);
            });

            es.addEventListener('usage', (event) => this.usageEventHandler(event));

            es.addEventListener('close', (event) => {
                es.close();

                this.isContentProcessing = false;

                if (contentstarted) {
                    this.generateTitle(this.doc.content);
                } else if (params.prompt) {
                    this.generateTitle(params.prompt);
                }
            });

            es.onerror = (event) => {
                es.close();
                this.isContentProcessing = false;
                this.isProcessing = false;

                let msg = event.data || 'An unexpected error occurred! Please try again later!';
                if (msg == 'insufficient_credit') {
                    msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
                }

                window.toast.show(msg, 'ti ti-alert-triangle-filled');
            }
        },

        speech2text() {
            if (!this.isSubmitable || this.isProcessing || this.isContentProcessing) {
                return;
            }

            this.isProcessing = true;
            this.isContentProcessing = true;
            this.readonly = true;

            api
                .post(
                    '/ai/services/speech-to-text',
                    new FormData(this.$refs.form)
                )
                .then((response) => {
                    this.showWave = true;

                    this.doc.content = response.data.text
                    this.output = markdownToHtml(this.doc.content);
                    this.generateTitle(this.doc.content);
                    this.isContentProcessing = false;
                    this.showWave = true;

                    this.waveReader.readAsDataURL(this.$refs.audioFile.files[0])

                    response.data.usages.forEach(usage => {
                        this.showCost = true;
                        switch (usage.type) {
                            case 0:
                                this.cost.token += usage.value;
                                break;
                            case 1:
                                this.cost.image += usage.value;
                                break;
                            case 2:
                                this.cost.audio += usage.value;
                                break;
                        }
                    });
                })
                .catch(error => {
                    this.isProcessing = false;
                    this.isContentProcessing = false;

                    let msg = 'An unexpected error occurred! Please try again later!';

                    if (error.response) {
                        if (error.response.status == 402) {
                            msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
                        } else if (error.response.data.message) {
                            msg = error.response.data.message;
                        }
                    }

                    window.toast
                        .show(msg, 'ti ti-square-rounded-x-filled')
                });
        },

        generateTitle(content) {
            let query = new URLSearchParams({
                content: content
            });

            query.append('jwt', localStorage.getItem('jwt'));
            let es = new EventSource(`api/ai/services/title-generator?${query.toString()}`);

            let titlestarted = false;
            es.addEventListener('token', (event) => {
                let token = JSON.parse(event.data);

                this.doc.title = (titlestarted && this.doc.title ? this.doc.title : '') + token;
                titlestarted = true;
            });

            es.addEventListener('usage', (event) => this.usageEventHandler(event));

            es.addEventListener('close', (event) => {
                es.close();

                this.isProcessing = false;
                this.readonly = false;
                this.showActions = this.doc.title && this.doc.content;

                if (this.autosave) {
                    this.saveDocument();
                }
            });

            es.onerror = (event) => {
                es.close();
                this.isProcessing = false;

                let msg = event.data || 'An unexpected error occurred! Please try again later!';
                if (msg == 'insufficient_credit') {
                    msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
                }

                window.toast.show(msg, 'ti ti-alert-triangle-filled');
            }
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

        resetCost() {
            this.cost.token = 0;
            this.cost.image = 0;
            this.cost.audio = 0;
            this.showCost = false;
        },

        usageEventHandler(event) {
            this.showCost = true;
            let usage = JSON.parse(event.data);
            switch (usage.type) {
                case 0:
                    this.cost.token += usage.value;
                    break;
                case 1:
                    this.cost.image += usage.value;
                    break;
                case 2:
                    this.cost.audio += usage.value;
                    break;
            }
        },

        copyDocumentContents() {
            navigator.clipboard.writeText(this.doc.content)
                .then(() => {
                    window.toast
                        .show('Document copied to clipboard!', 'ti ti-square-rounded-check-filled');
                });
        },

        download(format) {
            if (format == 'markdown') {
                var mimeType = 'text/markdown';
                var ext = 'md';
                var content = this.doc.content;
            } else if (format == 'html') {
                var mimeType = 'text/html';
                var ext = 'html';
                var content = `<html><head><meta charset="utf-8" /><title>${this.doc.title}</title></head><body>${this.output}</body></html>`;
            } else if (format == 'word') {
                var mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                var ext = 'docx';
                var content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><title>${this.doc.title}</title></head><body>${this.output}</body></html>`;
            } else {
                var mimeType = 'text/plain';
                var ext = 'txt';
                var content = this.doc.content;
            }

            this.downloadFromUrl(
                `data: ${mimeType}; charset = utf - 8, ${encodeURIComponent(content)} `,
                this.doc.title,
                ext);
        },

        downloadFromUrl(url, filename, ext) {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${filename}.${ext}`;

            document.body.appendChild(anchor);
            anchor.click();

            // Clean up
            document.body.removeChild(anchor);
        },

        saveDocument() {
            if (this.saving || !this.doc.title) {
                return;
            }

            this.saving = true;

            let params = {
                title: this.doc.title,
                content: this.doc.content,
                preset: this.doc.preset?.id
            };

            api.post(`/documents/${this.doc.id || ''}`, params)
                .then((response) => {
                    this.doc = response.data;
                    this.saving = false;

                    if (!this.autosave) {
                        window.toast
                            .show('Document saved successfully!', 'ti ti-square-rounded-check-filled')
                    }

                    this.autosave = true;
                });
        },

        deleteDocument() {
            api.delete(`/documents/${this.doc.id}`)
                .then((response) => {
                    this.doc.id = null;
                    this.autosave = false;

                    window.toast
                        .show('Document deleted successfully!', 'ti ti-square-rounded-check-filled')
                });
        }
    }));
}