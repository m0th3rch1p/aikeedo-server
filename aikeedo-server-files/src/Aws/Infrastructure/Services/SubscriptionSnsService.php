<?php

namespace Aws\Infrastructure\Services;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;

class SubscriptionSnsService
{
    private SnsClient $client;

    private string $httpUrl = "https://13c8-196-202-172-34.ngrok-free.app/webhook/subscription";

    private string $topicArn = "arn:aws:sns:us-east-1:287250355862:aws-mp-subscription-notification-1cothn9ewdy8kts24xi9fre3y";
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
//
//        $this->client->subscribe([
//            'Protocol' => 'https',
//            'Endpoint' => $this->httpUrl,
//            'TopicArn' => $this->topicArn,
//        ]);
    }
}