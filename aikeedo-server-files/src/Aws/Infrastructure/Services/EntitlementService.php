<?php

namespace Aws\Infrastructure\Services;

use Aws\Credentials\Credentials;
use Aws\MarketplaceEntitlementService\MarketplaceEntitlementServiceClient;

class EntitlementService
{
    public  MarketplaceEntitlementServiceClient $client;
    public function __construct()
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $this->client = new MarketplaceEntitlementServiceClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);
    }

    public function getEntitlementByCustomerId (string $customerId, string $productCode): \Aws\Result
    {
        return $this->client->getEntitlements([
            'CustomerIdentifier' => $customerId,
            'ProductCode' => $productCode
        ]);
    }

    public function getAllEntitlements () {
        return $this->client->getEntitlements();
    }
}