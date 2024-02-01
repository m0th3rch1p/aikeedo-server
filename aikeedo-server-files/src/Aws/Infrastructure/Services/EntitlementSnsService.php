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
    private string $httpUrl = "https://4ef7-196-202-172-34.ngrok-free.app/api/aws/entitlement/webhook";
    private string $topicArn = "arn:aws:sns:us-east-1:287250355862:aws-mp-entitlement-notification-1cothn9ewdy8kts24xi9fre3y";
    private string $endpoint = "arn:aws:sqs:us-east-1:436917423698:chatrov2";
    public function __construct(        #[Inject('config.dirs.log')]
                                        private string $logDir,)
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new SnsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);
//
//        $subscribeResults =  $this->client->subscribe([
//            'Protocol' => 'sqs',
//            'Endpoint' => $this->endpoint,
//            'TopicArn' => $this->topicArn,
//        ]);
//        $logger = new Logger('app');
//        $logger->pushHandler(new StreamHandler($this->logDir . '/app.log'));
//        $logger->pushProcessor(new PsrLogMessageProcessor());
//
//        $logger->debug(implode($subscribeResults->toArray()));
        $this->client->subscribe([
            'Protocol' => 'https',
            'Endpoint' => $this->httpUrl,
            'TopicArn' => $this->topicArn,
        ]);
    }

    public function handleNotifications (ServerRequestInterface $request) {
        $payload = $request->getParsedBody();

        Log::log(Log::DEBUG, $payload);
    }
}