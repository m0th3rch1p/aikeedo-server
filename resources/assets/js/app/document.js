'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import { markdownToHtml } from './markdown';

export function documentView() {
    Alpine.data('document', (doc) => ({
        doc: {},
        model: {},
        required: ['title'],
        isProcessing: false,
        output: '',

        init() {
            this.doc = doc;
            this.model = { ...this.doc };
            this.output = markdownToHtml(this.doc.content);

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

            this.update();
        },

        update() {
            this.isProcessing = true;
            let data = this.model;
            data.status = data.status ? 1 : 0;

            api.post(`/documents/${this.doc.id}`, this.model)
                .then(response => {
                    this.doc = response.data;
                    this.model = { ...this.doc };
                    this.output = markdownToHtml(this.doc.content);

                    this.isProcessing = false;

                    window.toast
                        .show('Document has been updated successfully!', 'ti ti-square-rounded-check-filled')
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
                var content = `<html><head><meta charset="utf-8" /><title>${this.model.title || this.doc.title}</title></head><body>${this.output}</body></html>`;
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
                this.model.title || this.doc.title,
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
    }))
}