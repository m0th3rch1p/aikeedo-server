<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO\IdentityProviders;

use Easy\Container\Attributes\Inject;
use InvalidArgumentException;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\UriInterface;
use RuntimeException;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Entities\UserEntity;
use User\Infrastructure\SSO\IdentityProviderInterface;
use User\Infrastructure\SSO\IdentityProviderHelper;

/** @package User\Infrastructure\SSO\IdentityProviders */
class LinkedInIdentityProvider implements IdentityProviderInterface
{
    private array $scopes = [
        'openid',
        'profile',
        'email',
    ];

    /**
     * @param IdentityProviderHelper $helper
     * @param ClientInterface $client
     * @param RequestFactoryInterface $factory
     * @param null|string $clientId
     * @param null|string $clientSecret
     * @return void
     */
    public function __construct(
        private IdentityProviderHelper $helper,
        private ClientInterface $client,
        private RequestFactoryInterface $factory,

        #[Inject('option.linkedin.client_id')]
        private ?string $clientId = null,

        #[Inject('option.linkedin.client_secret')]
        private ?string $clientSecret = null,
    ) {
    }

    /**
     * @inheritDoc
     */
    public function getName(): string
    {
        return 'LinkedIn';
    }

    /**
     * @inheritDoc
     */
    public function getIconSrc(): string
    {
        return 'assets/icons/linkedin.svg';
    }

    /**
     * @inheritDoc
     * @throws InvalidArgumentException
     */
    public function getAuthUrl(): UriInterface
    {
        return $this->helper->generateAuthUrl(
            'linkedin',
            "https://www.linkedin.com/oauth/v2/authorization",
            $this->clientId,
            implode(' ', $this->scopes),
        );
    }

    /**
     * @inheritDoc
     * @throws InvalidArgumentException
     * @throws ClientExceptionInterface
     * @throws RuntimeException
     * @throws NoHandlerFoundException
     */
    public function getUser(string $code): UserEntity
    {
        $token = $this->helper->exchangeCode(
            'linkedin',
            'https://www.linkedin.com/oauth/v2/accessToken',
            $this->clientId,
            $this->clientSecret,
            $code
        );
        $info = $this->getUserByToken($token);

        return $this->helper->findOrCrateUser(
            $info->email,
            $info->given_name,
            $info->family_name
        );
    }

    /**
     * @param string $token
     * @return object
     * @throws InvalidArgumentException
     * @throws ClientExceptionInterface
     * @throws RuntimeException
     */
    private function getUserByToken(string $token): object
    {
        $req = $this->factory->createRequest(
            'GET',
            'https://api.linkedin.com/v2/userinfo'
        );

        $res = $this->client->sendRequest(
            $req->withHeader('Authorization', 'Bearer ' . $token)
        );

        return json_decode($res->getBody()->getContents());
    }
}
