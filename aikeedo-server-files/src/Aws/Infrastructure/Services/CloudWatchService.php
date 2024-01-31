<?php

namespace Aws\Infrastructure\Services;

use Aws\CloudWatchLogs\CloudWatchLogsClient;
use Aws\Credentials\Credentials;

class CloudWatchService
{
    private CloudWatchLogsClient $client;
    public function __construct()
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new CloudWatchLogsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials,
        ]);
    }


    public function sendLogs (array $records, int $timestamp) {
        return $this->client->putLogEvents([
            'logEvents' => [
                [
                    'message' => json_encode($records),
                    'timestamp' => $timestamp
                ]
            ],
            'logGroupName' => 'marketplace-metering',
            'logStreamName' => 'batch-records'
        ]);
    }
}