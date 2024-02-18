'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import { debounce } from '../debounce';
import WaveSurfer from 'wavesurfer.js';

export function voiceover() {
    Alpine.data('voiceover', (sort = [], filters = [],) => ({
        state: 'initial',

        isFiltered: false,
        filters: filters,
        sort: sort,
        orderby: null,
        dir: null,

        params: {
            query: null,
            sort: null
        },

        total: null,
        isLoading: false,

        allVoices: [],
        voices: [],
        selected: null,

        prompt: '',
        isProcessing: false,

        docs: [],
        languages: {
            'eleven_multilingual_v2': [
                "English", "Japanese", "Chinese", "German", "Hindi", "French",
                "Korean", "Portuguese", "Italian", "Spanish", "Indonesian",
                "Dutch", "Turkish", "Flipino", "Polish", "Swedish", "Bulgarian",
                "Romanian", "Arabic", "Czech", "Greek", "Finnish", "Croatian",
                "Malay", "Slowak", "Danish", "Tamil", "Ukranian", "Russian"
            ],

            'eleven_multilingual_v1': [
                "English", "German", "Polish", "Spanish", "Italian",
                "French", "Portuguese", "Hindi", "Arabic"
            ],
            'eleven_monolingual_v1': [
                "English"
            ],
            'eleven_turbo_v2': [
                "English"
            ],
        },

        init() {
            this.filters.forEach(filter => this.params[filter.model] = null);

            this.getVoices();

            for (const key in this.params) {
                this.$watch(
                    'params.' + key,
                    debounce((value) => this.filter(), 200)
                );
            }

            let sortparams = ['orderby', 'dir'];
            sortparams.forEach(param => {
                this.$watch(param, () => {
                    this.params.sort = null;
                    if (this.orderby) {
                        this.params.sort = this.orderby;

                        if (this.dir) {
                            this.params.sort += `:${this.dir}`;
                        }
                    }
                })
            });

            this.$watch('params', (params) => {
                let isFiltered = false;

                for (const key in params) {
                    if (key != 'sort' && params[key]) {
                        isFiltered = true;
                    }
                }

                this.isFiltered = isFiltered;
            });
        },

        getVoices() {
            api.get('/voices', {
                params: this.params
            }).then(response => {
                this.state = 'loaded';
                this.allVoices = response.data.data;
                this.total = this.allVoices.length;
                this.filter();
            }).catch(error => {
                this.state = 'loaded';
            });
        },

        selectVoice(voice) {
            this.selected = voice;
        },

        filter() {
            let voices = this.allVoices;

            this.filters.forEach(filter => {
                if (this.params[filter.model]) {
                    voices = voices.filter(
                        voice =>
                            voice[filter.model] == this.params[filter.model]);
                }
            });

            if (this.params.query) {
                voices = voices.filter(
                    voice =>
                        voice.name.toLowerCase().includes(
                            this.params.query.toLowerCase()
                        ) || (voice.tone && voice.tone.toLowerCase().includes(
                            this.params.query.toLowerCase()
                        ))
                );
            }

            if (this.params.sort) {
                let [orderby, dir] = this.params.sort.split(':');

                voices = voices.sort((a, b) => {
                    if (a[orderby] < b[orderby]) {
                        return dir == 'asc' ? -1 : 1;
                    }

                    if (a[orderby] > b[orderby]) {
                        return dir == 'asc' ? 1 : -1;
                    }

                    return 0;
                });
            }

            this.voices = voices;
        },

        resetFilters() {
            for (const key in this.params) {
                if (key != 'sort') {
                    this.params[key] = null;
                }
            }
        },

        submit() {
            if (this.isProcessing) {
                return;
            }

            this.isProcessing = true;

            if ('demo' in this.$refs.form.dataset) {
                this.showSamples();
            } else {
                this.docs.unshift({
                    id: Date.now(),
                    title: null,
                    audio: null,
                    isProcessing: false,
                    text: null,
                    isSample: false
                });

                this.generateTitle(this.prompt);
                this.generateAudio();
            }
        },

        showSamples() {
            this.docs = [];

            api.get('https://cdn.aikeedo.com/voiceover/samples/data.json')
                .then(resp => {
                    this.isProcessing = false;

                    if (this.selected.external_id in resp.data) {
                        for (let i = 0; i < resp.data[this.selected.external_id].length; i++) {
                            const sample = resp.data[this.selected.external_id][i];

                            this.docs.push({
                                id: 'index-' + this.selected.external_id + '-' + i,
                                title: sample.language,
                                audio: sample.sample_url,
                                isProcessing: false,
                                text: sample.text,
                                isSample: true
                            });
                        }
                    }
                })
        },

        generateAudio() {
            this.docs[0].isProcessing = true;

            let data = {
                model: this.selected.model,
                id: this.selected.external_id,
                prompt: this.prompt,
            };

            api.post('/ai/services/text-to-speech', data, {
                responseType: 'blob'
            })
                .then((response) => {
                    this.docs[0].audio = URL.createObjectURL(response.data);
                    this.docs[0].isProcessing = this.docs[0].title === null;

                    this.$nextTick()
                        .then(() =>
                            window.waves['wave-' + this.docs[0].id]
                                .loadBlob(response.data)
                        );

                    this.isProcessing = this.docs[0].isProcessing;
                })
                .catch(error => {
                    this.docs[0].isProcessing = this.docs[0].title === null;
                    this.docs[0].audio = 'error';

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
            this.docs[0].isProcessing = true;

            let query = new URLSearchParams({
                content: content
            });

            query.append('jwt', localStorage.getItem('jwt'));
            let es = new EventSource(`api/ai/services/title-generator?${query.toString()}`);

            let titlestarted = false;
            es.addEventListener('token', (event) => {
                let token = JSON.parse(event.data);

                this.docs[0].title = ((titlestarted && this.docs[0].title ? this.docs[0].title : '') + token).replace(/^['"]|['"]$/g, '');
                titlestarted = true;
            });

            es.addEventListener('close', (event) => {
                es.close();

                this.docs[0].isProcessing = this.docs[0].audio === null;
                this.isProcessing = this.docs[0].isProcessing;
            });

            es.onerror = (event) => {
                es.close();

                this.docs[0].isProcessing = this.docs[0].audio === null;
                this.isProcessing = this.docs[0].isProcessing;
                this.docs[0].title = '';

                let msg = event.data || 'An unexpected error occurred! Please try again later!';
                if (msg == 'insufficient_credit') {
                    msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
                }

                window.toast.show(msg, 'ti ti-alert-triangle-filled');
            }
        },
    }));

    let currentPlaying = null;
    window.waves = [];
    Alpine.data("wave", (url = null) => ({
        wave: null,
        isPlaying: false,
        progress: '00:00',
        isMuted: false,


        init() {
            this.wave = WaveSurfer.create({
                container: this.$refs.wave,
                height: 32,
                waveColor: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed')})`,
                progressColor: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-content')})`,
                cursorColor: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed')})`,
                barWidth: 2,
                cursorWidth: 0,
                barGap: 2,
                barRadius: 30,
                dragToSeek: true,
                url: url,
            });


            this.$nextTick(() => {
                window.waves[this.$el.id || this.$id()] = this.wave;
            });

            this.wave.on('interaction', () => {
                if (!this.wave.isPlaying()) {
                    this.wave.play()
                    this.isPlaying = true;
                }
            });

            this.wave.on('audioprocess', (time) => {
                let date = new Date(0);
                date.setSeconds(time);

                if (time > 3600) {
                    this.progress = date.toISOString().substring(11, 19);
                } else {
                    this.progress = date.toISOString().substring(14, 19);
                }

            });

            this.wave.on('play', () => {
                if (currentPlaying && currentPlaying != this.wave) {
                    currentPlaying.pause();
                }

                currentPlaying = this.wave;
                this.isPlaying = true;
            });

            this.wave.on('pause', () => {
                this.isPlaying = false;
            });
        }
    }))
}