<?php

namespace Aws\Infrastructure\Services;

use Aws\Credentials\Credentials;
use Aws\Sqs\SqsClient;

class EntitlementSqsService
{
    private SqsClient $client;
    private string $queueUrl = "https://sqs.us-east-1.amazonaws.com/436917423698/chatrov2";
    public function __construct()
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new SqsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);
    }

    public function getClient(): SqsClient
    {
        return $this->client;
    }


    public function receiveMessages (): \Aws\Result
    {
        return $this->client->receiveMessage([
            'QueueUrl' => $this->queueUrl
        ]);
    }

    public function deleteMessage (string $receiptHandle): \Aws\Result
    {
        return $this->client->deleteMessage([
            'QueueUrl' => $this->queueUrl,
            'ReceiptHandle' => $receiptHandle
        ]);
    }
}