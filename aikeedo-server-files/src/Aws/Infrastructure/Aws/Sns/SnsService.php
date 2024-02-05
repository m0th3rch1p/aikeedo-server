<?php

namespace Aws\Infrastructure\Aws\Sns;

use Aws\Sns\SnsClient;

class SnsService
{
    public function __construct (private SnsClient $client) {

    }
    public function subscribe (string $url, string $protocol, string $topic): \Aws\Result
    {
        return $this->client->subscribe([
            'Protocol' => $protocol,
            'Endpoint' => $url,
            'TopicArn' => $topic
        ]);
    }

    public function listSubscriptions (): \Aws\Result
    {
        return $this->client->listSubscriptions();
    }

    public function confirmSubscription ($token, $topicArn): \Aws\Result
    {
        return $this->client->confirmSubscription([
            'Token' => $token,
            'TopicArn' => $topicArn
        ]);
    }
}