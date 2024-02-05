<?php

// phpcs:disable PSR1.Classes
declare(strict_types=1);

use Aws\Infrastructure\Services\SubscriptionSnsService;
use Easy\Container\Container;
use Easy\Container\Exceptions\NotFoundException;
use Shared\Infrastructure\BootstrapperInterface;
use Shared\Infrastructure\ServiceProviderInterface;

/** @package  */
class Application
{
    /** @var array<ServiceProviderInterface|string> */
    private array $providers = [];

    /** @var array<BootstrapperInterface|string> */
    private array $bootstrappers = [];

    /**
     * @param Container $container
     * @return void
     */
    public function __construct(
        private Container $container,
        private bool $isDebugModeEnabled = false
    ) {
        $this->configErrorReporting();
        $this->setDefaultTimezone();
        $this->container->set(Application::class, $this);

    }

    /**
     * @param (ServiceProviderInterface|string)[] ...$providers
     * @return Application
     */
    public function addServiceProvider(
        ServiceProviderInterface|string ...$providers
    ): self {
        $this->providers = array_merge($this->providers, $providers);
        return $this;
    }

    /**
     * @param (BootstrapperInterface|string)[] ...$bootstrappers
     * @return Application
     */
    public function addBootstrapper(
        BootstrapperInterface|string ...$bootstrappers
    ): self {
        $this->bootstrappers = array_merge($this->bootstrappers, $bootstrappers);
        return $this;
    }

    public function registerAwsSubscribeSnsWebhooks (): void
    {
        $subSnsService =  $this->container->get(SubscriptionSnsService::class);
        $listResult = $subSnsService->listSubscriptions();
        $names = array_column($listResult->get('Subscriptions'), 'Endpoint');
        $found = in_array($subSnsService->getHttpUrl(), $names);
        if (!($found)) {
            $subSnsService->subscribe();
        }
    }

    public function registerAwsEntitlementSnsWebhooks (): void
    {
        $entSnsService = $this->container->get(\Aws\Infrastructure\Services\EntitlementSnsService::class);
        $listResult = $entSnsService->listSubscriptions();
        $names = array_column($listResult->get('Subscriptions'), 'Endpoint');
        $found = in_array($entSnsService->getHttpUrl(), $names);
        if (!($found)) {
            $entSnsService->subscribe();
        }
    }

    /**
     * @return void
     * @throws NotFoundException
     * @throws Throwable
     * @throws Exception
     */
    public function boot(): void
    {
//        $this->registerAwsSubscribeSnsWebhooks();
//        $this->registerAwsEntitlementSnsWebhooks();
        $this->invokeServiceProviders();
        $this->invokeBootstrappers();
    }

    /**
     * This is a mirror of Container::set(). The purpose of this method is to
     * decouple the ServiceProviderInterface implementation from the
     * ContainerInterface implementation.
     *
     * @param string $abstract
     * @param mixed $concrete
     * @return Application
     */
    public function set(
        string $abstract,
        mixed $concrete = null
    ): self {
        $this->container->set($abstract, $concrete);
        return $this;
    }

    /**
     * @return void
     * @throws NotFoundException
     * @throws Throwable
     * @throws Exception
     */
    private function invokeServiceProviders(): void
    {
        foreach ($this->providers as $provider) {
            if (is_string($provider)) {
                $provider = $this->container->get($provider);
            }

            if (!($provider instanceof ServiceProviderInterface)) {
                throw new \Exception(sprintf(
                    "%s must implement %s",
                    get_class($provider),
                    ServiceProviderInterface::class
                ));
            }

            $provider->register($this);
        }
    }

    /**
     * @return void
     * @throws NotFoundException
     * @throws Throwable
     * @throws Exception
     */
    private function invokeBootstrappers(): void
    {
        foreach ($this->bootstrappers as $bootstrapper) {
            if (is_string($bootstrapper)) {
                $bootstrapper = $this->container->get($bootstrapper);
            }

            if (!($bootstrapper instanceof BootstrapperInterface)) {
                throw new \Exception(sprintf(
                    "%s must implement %s",
                    get_class($bootstrapper),
                    BootstrapperInterface::class
                ));
            }

            $bootstrapper->bootstrap();
        }
    }

    /**
     * Configure error reporting
     * @return void
     */
    private function configErrorReporting(): void
    {
        // Report all errors
        error_reporting(E_ALL);

        // Display error only if debug mode is enabled
        ini_set('display_errors', $this->isDebugModeEnabled);

        set_error_handler($this->warningHandler(...), E_WARNING);
    }

    /**
     * @param int $errno
     * @param string $errstr
     * @param null|string $errfile
     * @param null|int $errline
     * @return false
     * @throws ErrorException
     */
    private function warningHandler(
        int $errno,
        string $errstr,
        ?string $errfile = null,
        ?int $errline = null
    ) {
        if (!(error_reporting() & $errno)) {
            // This error code is not included in error_reporting, so let it fall
            // through to the standard PHP error handler
            return false;
        }

        throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
    }

    /** @return void  */
    private function setDefaultTimezone(): void
    {
        date_default_timezone_set('UTC');
    }
}
