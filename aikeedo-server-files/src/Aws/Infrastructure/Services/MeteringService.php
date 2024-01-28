<?php

namespace Aws\Infrastructure\Services;

use Aws\Result;
use Aws\Credentials\Credentials;
use Aws\MarketplaceMetering\MarketplaceMeteringClient;

class MeteringService
{
    private MarketplaceMeteringClient  $client;
    public function __construct()
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new MarketplaceMeteringClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);
    }

    public function resolve (string $token): Result
    {
        return $this->client->resolveCustomer([
            'RegistrationToken' => $token
        ]);
    }

    public function batchUsageRecords ($usageRecords): Result
    {
        return $this->client->batchMeterUsage($usageRecords);
    }
}