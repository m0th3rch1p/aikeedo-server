'use strict';

import axios from "axios";
import { getJwtToken } from "../helpers";

const ins = axios.create({
    baseURL: '/admin/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

ins.interceptors.request.use(
    (config) => {
        const token = getJwtToken();

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
    }, (error) => {
        Promise.reject(error);
    }
);

ins.interceptors.response.use(
    response => response,
    error => {
        let msg = 'Unexpected error occurred! Please try again later!';

        if (error.response && error.response.data.message) {
            msg = error.response.data.message;
        }

        window.toast
            .show(msg, 'ti ti-square-rounded-x-filled')

        return Promise.reject(error);
    });

export const api = ins;
