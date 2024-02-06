<?php

namespace Aws\Infrastructure\Aws\Sns\Services;

use Aws\Domain\Repositories\SnsFactoryInterface;
use Aws\Domain\Repositories\SnsServiceInterface;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class SnsFactory implements SnsFactoryInterface
{
    private array $services = [];
    private string $baseUrl;
    public function __construct (private ContainerInterface $container) {
        $this->baseUrl = env("ENVIRONMENT") === 'dev' ? env('SNS_WEBHOOK_URL_DEV') : env('SNS_WEBHOOK_URL_PROD');
    }

    public function register (string|SnsServiceInterface $snsService): self {
        $this->services[] = $snsService;
        return $this;
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function makeSubscriptions (): void
    {
        if (count($this->services)) {
            $snsService = $this->container->get($this->services[0]);

            $subscriptionList = $snsService->listSubscriptions();
            $subscriptions = $subscriptionList->get('Subscriptions');

            $subscriptionEndpoints = array_column($subscriptions, 'Endpoint');
            foreach ($this->services as $index => $service) {
                if($index !== 0) $snsService = $this->container->get($service);
                if (!(in_array($this->baseUrl.$snsService->getUrl(), $subscriptionEndpoints))) {
                    $snsService->subscribe($this->baseUrl);
                }
            }
        }
    }
}