'use strict';

import Alpine from 'alpinejs';
import { api } from './api';
import { getPlanList } from './helpers';

function checkoutView() {
    Alpine.data('checkout', (plan = {}) => ({
        state: 'initial',
        plan: {},
        isProcessing: false,
        plans: {
            monthly: [],
            yearly: [],
            onetime: [],
        },
        isVisible: false,
        cycle: null,
        showCycleSelector: false,
        total: 0,

        init() {
            this.setPlan(plan);

            getPlanList().then(plans => {
                this.total = plans.length;
                this.$refs.loading.remove();
                this.state = this.total > 0 ? 'normal' : 'empty';

                for (let i = 0; i < plans.length; i++) {
                    const plan = plans[i];
                    if (plan.billing_cycle == 'monthly') {
                        this.plans.monthly.push(plan);
                        continue;
                    }

                    if (plan.billing_cycle == 'yearly') {
                        this.plans.yearly.push(plan);
                        continue;
                    }

                    if (plan.billing_cycle == 'one-time') {
                        this.plans.onetime.push(plan);
                        continue;
                    }
                }

                // Set cycle to the first available cycle
                if (this.plans.monthly.length > 0) {
                    this.cycle = 'monthly';
                } else if (this.plans.yearly.length > 0) {
                    this.cycle = 'yearly';
                } else if (this.plans.onetime.length > 0) {
                    this.cycle = 'onetime';
                }

                let count = 0;
                if (this.plans.monthly.length > 0) {
                    count++;
                }
                if (this.plans.yearly.length > 0) {
                    count++;
                }
                if (this.plans.onetime.length > 0) {
                    count++;
                }

                if (count > 1) {
                    this.showCycleSelector = true;
                }

                if (!this.plan.id && this.plans[this.cycle].length > 0) {
                    this.setPlan(this.plans[this.cycle][0]);
                }
            });
        },

        setPlan(plan) {
            this.plan = plan;
            window.checkout.plan = plan;

            if (plan.id) {
                window.history.pushState(
                    {},
                    plan.name,
                    `/app/billing/checkout/${plan.id}`
                );
            } else {
                window.history.pushState({}, '', `/app/billing/checkout`);
            }

        },

        async submitFreeForm(form) {
            let button = form.querySelector('button');
            if (button.disabled || button.hasAttribute('processing')) {
                return;
            }

            window.checkout.error(null);
            button.setAttribute('processing', '');

            await window.checkout.createSubscription();
            await window.checkout.activateSubscription();
        }
    }));
}

Alpine.store('checkout', {
    error: null,
    subscription: null
});

export class Checkout {
    plan = null;

    constructor() {
        checkoutView();
    }

    error(message) {
        Alpine.store('checkout', {
            ...Alpine.store('checkout'),
            ...{ error: message }
        });
    }

    async createSubscription(gateway = '') {
        try {
            let response = await api.post('/billing/checkout', {
                id: this.plan.id, // Set by window.checkout.plan
                gateway: gateway
            });

            let data = response.data;

            Alpine.store('checkout', {
                ...Alpine.store('checkout'),
                ...{ subscription: data.subscription }
            });

            return data;
        } catch (error) {
            return {
                error: error.response.data.message || error.message
            }
        }
    }

    async activateSubscription(externalId = null) {
        let data = {};
        let subscriptionId = Alpine.store('checkout').subscription.id;

        if (externalId) {
            data.external_id = externalId;
        }

        await api.post(
            `/billing/subscriptions/${subscriptionId}/activate`,
            data
        );

        window.location.href = `app/billing/subscriptions/${subscriptionId}?success`;
    }
}