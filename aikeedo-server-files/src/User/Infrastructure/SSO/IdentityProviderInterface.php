<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO;

use Psr\Http\Message\UriInterface;
use User\Domain\Entities\UserEntity;
use User\Infrastructure\SSO\Exceptions\InvalidCodeException;

interface IdentityProviderInterface
{
    /** 
     * Get name of the identity provider. Will be shown in the UI.
     * 
     * @return string
     */
    public function getName(): string;

    /**
     * Get icon source of the identity provider. Will be shown in the UI.
     * @return string
     */
    public function getIconSrc(): string;

    /**
     * Get the URL to redirect to for authentication.
     * @return UriInterface
     */
    public function getAuthUrl(): UriInterface;

    /**
     * @param string $code
     * @return UserEntity
     * @throws InvalidCodeException
     */
    public function getUser(string $code): UserEntity;
}
