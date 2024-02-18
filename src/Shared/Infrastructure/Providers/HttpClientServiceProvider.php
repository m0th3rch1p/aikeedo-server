<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Providers;

use Application;
use Psr\Http\Client\ClientInterface;
use Shared\Infrastructure\ServiceProviderInterface;
use Symfony\Component\HttpClient\Psr18Client;

/** @package Shared\Infrastructure\Providers */
class HttpClientServiceProvider implements ServiceProviderInterface
{
    public function __construct(
        private Psr18Client $client
    ) {
    }

    /**
     * @inheritDoc
     */
    public function register(Application $app): void
    {
        $app->set(ClientInterface::class, $this->client->withOptions([
            'timeout' => 600
        ]));
    }
}
