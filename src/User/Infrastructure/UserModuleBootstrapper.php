<?php

declare(strict_types=1);

namespace User\Infrastructure;

use Application;
use Easy\Container\Attributes\Inject;
use Shared\Infrastructure\BootstrapperInterface;
use User\Domain\Repositories\UserRepositoryInterface;
use User\Infrastructure\Repositories\DoctrineOrm\UserRepository;
use User\Infrastructure\SSO\IdentityProviderFactory;
use User\Infrastructure\SSO\IdentityProviderFactoryInterface;
use User\Infrastructure\SSO\IdentityProviders\FacebookIdentityProvider;
use User\Infrastructure\SSO\IdentityProviders\GithubIdentityProvider;
use User\Infrastructure\SSO\IdentityProviders\GoogleIdentityProvider;
use User\Infrastructure\SSO\IdentityProviders\LinkedInIdentityProvider;

/** @package User\Infrastructure */
class UserModuleBootstrapper implements BootstrapperInterface
{
    /**
     * @param Application $app
     * @return void
     */
    public function __construct(
        private Application $app,
        private IdentityProviderFactory $factory,

        #[Inject('option.google.is_sso_enabled')]
        private bool $isGoogleSSOEnabled = false,

        #[Inject('option.facebook.is_sso_enabled')]
        private bool $isFacebookSSOEnabled = false,

        #[Inject('option.linkedin.is_sso_enabled')]
        private bool $isLinkedInSSOEnabled = false,

        #[Inject('option.github.is_sso_enabled')]
        private bool $isGithubSSOEnabled = false,
    ) {
    }

    /** @return void  */
    public function bootstrap(): void
    {
        // Register repository implementations
        $this->app->set(
            UserRepositoryInterface::class,
            UserRepository::class
        );

        $this->registerIdentityProviderFactory();
    }

    private function registerIdentityProviderFactory(): void
    {
        if ($this->isGoogleSSOEnabled) {
            $this->factory
                ->register(
                    'google',
                    GoogleIdentityProvider::class
                );
        }

        if ($this->isFacebookSSOEnabled) {
            $this->factory
                ->register(
                    'facebook',
                    FacebookIdentityProvider::class
                );
        }

        if ($this->isLinkedInSSOEnabled) {
            $this->factory->register(
                'linkedin',
                LinkedInIdentityProvider::class
            );
        }

        if ($this->isGithubSSOEnabled) {
            $this->factory->register(
                'github',
                GithubIdentityProvider::class
            );
        }

        $this->app->set(
            IdentityProviderFactoryInterface::class,
            $this->factory
        );
    }
}
