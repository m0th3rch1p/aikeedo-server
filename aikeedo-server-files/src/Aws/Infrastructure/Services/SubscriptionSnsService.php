<?php

namespace Aws\Infrastructure\Services;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;

class SubscriptionSnsService
{
    private SnsClient $client;
    private string $topicArn = "arn:aws:sns:us-east-1:287250355862:aws-mp-subscription-notification-2lqek63x8ixl9bu07a3dkw96v";
    private string $endpoint = "arn:aws:sqs:us-east-1:436917423698:chatrov2";

    public function __construct()
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new SnsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);

        $this->client->subscribe([
            'Protocol' => 'sqs',
            'Endpoint' => $this->endpoint,
            'TopicArn' => $this->topicArn,
        ]);
    }
}