'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import dateFormat from 'dateformat';
import { searchForm } from './search-form';

export function dashboardView() {
    Alpine.data('dashboard', () => ({
        documents: [],
        documentsFetched: false,

        init() {
            searchForm();
            this.getRecentDocuments();
        },

        getRecentDocuments() {
            let params = {
                limit: 5,
                sort: 'created_at:desc'
            }

            api.get('/documents', { params: params })
                .then(response => {
                    this.documentsFetched = true;

                    // Format document.created_at and push to documents array
                    response.data.data.forEach(resource => {
                        // Format resource.created_at
                        resource.created_at = dateFormat(
                            new Date(resource.created_at * 1000),
                            'dd mmm, yyyy'
                        );
                    });

                    this.documents = response.data.data;
                });
        },
    }));
}