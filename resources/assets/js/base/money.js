'use strict';

import currency from './currency.js';

export function money(amount, fromCents = true, cur = window.currency) {
    return currency(amount, {
        precision: cur.fraction_digits,
        fromCents: fromCents,
        symbol: cur.symbol || '',
        pattern: `!# ${cur.code}`,
        separator: ' '
    });
}