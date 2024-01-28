'use strict';

import axios from "axios";

export const api = axios.create({
    baseURL: '/api/auth',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});
