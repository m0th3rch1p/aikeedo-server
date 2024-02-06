<?php

namespace Aws\Infrastructure\Services;

use Aws\Credentials\Credentials;
use Aws\Sns\SnsClient;
enum SnsServiceProtocol {
    case HTTPS;
    case ARN;
    case QUEUE;
}

class SnsService
{
    private SnsClient $client;
    private string $baseUrl;
    private string $protocol;
    /**
     * @param SnsClient $client
     * @param string $baseUrl
     */
    public function __construct()
    {
        $this->baseUrl = env("ENVIRONMENT") === 'dev' ? env('SNS_WEBHOOK_URL_DEV') : env('SNS_WEBHOOK_URL_PROD');
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new SnsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);
    }

    public function subscribe (string $protocol, string $endpoint, string $topicArn): \Aws\Result
    {
        return $this->client->subscribe([
            'Protocol' => $protocol,
            'Endpoint' => $this->baseUrl.$endpoint,
            'TopicArn' => $topicArn,
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