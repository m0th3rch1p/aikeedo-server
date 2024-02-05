<?php

namespace Aws\Infrastructure\Services;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;

class SubscriptionSnsService
{
    private SnsClient $client;

//    private static string $httpUrl = "https://878e-196-202-162-222.ngrok-free.app/api/aws/subscription/webhook";
    private static string $httpUrl = "https://chatrova.com/api/aws/subscription/webhook";

    private static string $topicArn = "arn:aws:sns:us-east-1:287250355862:aws-mp-subscription-notification-1cothn9ewdy8kts24xi9fre3y";
    private static string $endpoint = "arn:aws:sqs:us-east-1:436917423698:chatrov2";

    /**
     * @param string $endpoint
     */
    public function __construct()
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new SnsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);

    }


    public function subscribe (): \Aws\Result
    {
        return $this->client->subscribe([
            'Protocol' => 'https',
            'Endpoint' => self::$httpUrl,
            'TopicArn' => self::$topicArn,
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

    public function getHttpUrl(): string
    {
        return self::$httpUrl;
    }
}