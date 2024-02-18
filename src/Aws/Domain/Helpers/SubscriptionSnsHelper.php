<?php

namespace Aws\Domain\Helpers;

use Aws\Infrastructure\Services\SubscriptionSnsService;

class SubscriptionSnsHelper
{
    public static function checkIfSubscribed (): bool
    {
        $listResult = SubscriptionSnsService::listSubscriptions();
        $names = array_column($listResult->get('Subscriptions'), 'Endpoint');

        return in_array(SubscriptionSnsService::getHttpUrl(), $names);
    }

    public static function confirmHttpUrl ($token, $topicArn): \Aws\Result|array
    {
        if (!(self::checkIfSubscribed())) {
            return SubscriptionSnsService::confirmSubscription($token, $topicArn);
        }
        return [];
    }
}