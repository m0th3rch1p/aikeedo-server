<?php

namespace Aws\Infrastructure\Services;

use Aws\Credentials\Credentials;
use AWS\CRT\Log;
use Aws\Sns\SnsClient;
use Aws\Sqs\SqsClient;
use Easy\Container\Attributes\Inject;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Monolog\Processor\PsrLogMessageProcessor;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;

class EntitlementSnsService
{
    private SnsClient $client;
//    private static string $httpUrl = "https://878e-196-202-162-222.ngrok-free.app/api/aws/entitlement/webhook";

    private static string $httpUrl = "https://chatrova.com/api/aws/entitlement/webhook";
    private static string $topicArn = "arn:aws:sns:us-east-1:287250355862:aws-mp-entitlement-notification-1cothn9ewdy8kts24xi9fre3y";
    private static string $endpoint = "arn:aws:sqs:us-east-1:436917423698:chatrov2";

    /**
     * @param SnsClient $client
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

    public function subscribe (): void
    {
        $this->client->subscribe([
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

    public static function getHttpUrl(): string
    {
        return self::$httpUrl;
    }
}