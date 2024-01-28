<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO;

use User\Infrastructure\SSO\Exceptions\IdentityProviderNotFoundException;

/**  @package User\Infrastructure\SSO  */
interface IdentityProviderFactoryInterface
{
    /**
     * Method to get an identity provider based on the platform provided
     *
     * @param string $platform The name of the platform for which we need the 
     * identity provider
     * @return IdentityProviderInterface Returns an instance that implements the 
     * IdentityProviderInterface interface
     * @throws IdentityProviderNotFoundException Throws an exception if the 
     * IdentityProvider is not found for the given platform
     */
    public function getIdentityProvider(
        string $platform
    ): IdentityProviderInterface;

    /** 
     * Method to list all the available identity providers.
     *
     * @return array<int,IdentityProviderInterface> Returns an array of objects 
     * which implement the IdentityProviderInterface interface
     */
    public function listAll(): array;
}
