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
    private static SnsClient $client;
    private static string $httpUrl = "https://1538-196-202-172-34.ngrok-free.app/api/aws/entitlement/webhook";
    private static string $topicArn = "arn:aws:sns:us-east-1:287250355862:aws-mp-entitlement-notification-1cothn9ewdy8kts24xi9fre3y";
    private static string $endpoint = "arn:aws:sqs:us-east-1:436917423698:chatrov2";
//    public function __construct(        #[Inject('config.dirs.log')]
//                                        private string $logDir,)
//    {
//        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
//        $this->client = new SnsClient([
//            'region' => 'us-east-1',
//            'version' => 'latest',
//            'credentials' => $credentials
//        ]);
////
////        $subscribeResults =  $this->client->subscribe([
////            'Protocol' => 'sqs',
////            'Endpoint' => $this->endpoint,
////            'TopicArn' => $this->topicArn,
////        ]);
////        $logger = new Logger('app');
////        $logger->pushHandler(new StreamHandler($this->logDir . '/app.log'));
////        $logger->pushProcessor(new PsrLogMessageProcessor());
////
////        $logger->debug(implode($subscribeResults->toArray()));
//        $this->client->subscribe([
//            'Protocol' => 'https',
//            'Endpoint' => $this->httpUrl,
//            'TopicArn' => $this->topicArn,
//        ]);
//    }

    public static function setup (): void
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        self::$client = new SnsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);
    }

    public static function subscribe (): void
    {
        self::$client->subscribe([
            'Protocol' => 'https',
            'Endpoint' => self::$httpUrl,
            'TopicArn' => self::$topicArn,
        ]);
    }

    public static function listSubscriptions (): \Aws\Result
    {
        return self::$client->listSubscriptions();
    }

    public static function confirmSubscription ($token, $topicArn): \Aws\Result
    {
        return self::$client->confirmSubscription([
            'Token' => $token,
            'TopicArn' => $topicArn
        ]);
    }

    public static function getHttpUrl(): string
    {
        return self::$httpUrl;
    }
}