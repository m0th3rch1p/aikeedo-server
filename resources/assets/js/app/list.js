'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import { debounce } from '../debounce';
import dateFormat from 'dateformat';
import { getCategoryList } from './helpers';

export function listView() {
    Alpine.data('list', (basePath, sort = [], filters = [], strings = []) => ({
        state: 'initial',
        filters: [],

        sort: [],
        orderby: null,
        dir: null,

        params: {
            query: null,
            sort: null
        },

        total: null,
        cursor: null,
        resources: [],
        isLoading: false,
        hasMore: true,
        isFiltered: false,
        currentResource: null,

        init() {
            this.filters = filters;
            this.sort = sort;

            this.filters.forEach(filter => this.params[filter.model] = null);

            this.loadMore();
            this.getTotalCount();
            this.getCategories();
            this.retrieveResources();

            for (const key in this.params) {
                this.$watch(
                    'params.' + key,
                    debounce((value) => this.retrieveResources(true), 200)
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

        getCategories() {
            let filter = this.filters.find(filter => filter.model == 'category');

            if (!filter) {
                return;
            }

            getCategoryList()
                .then(categories => {
                    categories.forEach(category => {
                        filter.options.push({
                            value: category.id,
                            label: category.title
                        });
                    });
                });
        },

        resetFilters() {
            for (const key in this.params) {
                if (key != 'sort') {
                    this.params[key] = null;
                }
            }
        },

        getTotalCount() {
            api.get(`${basePath}/count`)
                .then(response => {
                    this.total = response.data.count;
                });
        },

        retrieveResources(reset = false) {
            this.isLoading = true;
            let params = {};

            for (const key in this.params) {
                if (this.params[key]) {
                    params[key] = this.params[key];
                }
            }

            if (!reset && this.cursor) {
                params.starting_after = this.cursor;
            }

            api.get(basePath, {
                params: params
            })
                .then(response => {
                    this.state = 'loaded';

                    // Format resource.created_at and push to resources array
                    response.data.data.forEach(resource => {
                        // Format resource.created_at
                        resource.created_at = dateFormat(
                            new Date(resource.created_at * 1000),
                            'dd mmm, yyyy'
                        );
                    });

                    this.resources = reset
                        ? response.data.data
                        : this.resources.concat(response.data.data);

                    if (this.resources.length > 0) {
                        this.cursor = this.resources[this.resources.length - 1].id;
                    } else {
                        this.state = 'empty';
                    }

                    this.isLoading = false;
                    this.hasMore = response.data.data.length >= 25;
                });
        },

        loadMore() {
            window.addEventListener('scroll', () => {
                if (
                    this.hasMore
                    && !this.isLoading
                    && (window.innerHeight + window.scrollY + 500) >= document.documentElement.scrollHeight
                ) {
                    this.retrieveResources();
                }
            });
        },

        toggleStatus(resource) {
            resource.status = resource.status == 1 ? 0 : 1;

            api.post(`${basePath}/${resource.id}`, {
                status: resource.status
            });
        },

        deleteResource(resource) {
            this.currentResource = null;
            window.overlay.close();

            this.resources.splice(this.resources.indexOf(resource), 1);

            api.delete(`${basePath}/${resource.id}`)
                .then(() =>
                    window.toast
                        .show(strings.delete_success, 'ti ti-trash')
                );
        }
    }))
}