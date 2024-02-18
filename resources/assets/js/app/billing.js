'use strict';

import Alpine from 'alpinejs';
import { api } from './api';

export function billingView() {
    Alpine.data('subscription', (subscription, packs = []) => ({
        subscription: subscription,
        packs: packs,
        showCancelModal: false,

        init() {
            if (subscription) {
                subscription.token_credit_percentage =
                    subscription.token_credit == null || subscription.plan.token_credit == null
                        ? '100'
                        : Math.round(
                            subscription.token_credit / subscription.plan.token_credit * 100 + Number.EPSILON,
                        );

                subscription.image_credit_percentage =
                    subscription.image_credit == null || subscription.plan.image_credit == null
                        ? '100'
                        : Math.round(
                            subscription.image_credit / subscription.plan.image_credit * 100 + Number.EPSILON,
                        );

                subscription.audio_credit_percentage =
                    subscription.audio_credit == null || subscription.plan.audio_credit == null
                        ? '100'
                        : Math.round(
                            subscription.audio_credit / subscription.plan.audio_credit * 100 + Number.EPSILON,
                        );
            }
        },

        cancelSubscription() {
            api.delete(`/billing/subscription`)
                .then(() => {
                    window.toast.show('Subscription cancelled!', 'ti ti-square-rounded-check-filled');
                    window.overlay.close();
                });
        }
    }))
}