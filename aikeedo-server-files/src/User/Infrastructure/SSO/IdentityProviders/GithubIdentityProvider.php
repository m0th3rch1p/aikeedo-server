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
class GithubIdentityProvider implements IdentityProviderInterface
{
    private array $scopes = [
        'user:email',
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

        #[Inject('option.github.client_id')]
        private ?string $clientId = null,

        #[Inject('option.github.client_secret')]
        private ?string $clientSecret = null,
    ) {
    }

    /**
     * @inheritDoc
     */
    public function getName(): string
    {
        return 'Github';
    }

    /**
     * @inheritDoc
     */
    public function getIconSrc(): string
    {
        return 'assets/icons/github.svg';
    }

    /**
     * @inheritDoc
     * @throws InvalidArgumentException
     */
    public function getAuthUrl(): UriInterface
    {
        return $this->helper->generateAuthUrl(
            'github',
            "https://github.com/login/oauth/authorize",
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
            'github',
            'https://github.com/login/oauth/access_token',
            $this->clientId,
            $this->clientSecret,
            $code
        );
        $info = $this->getUserByToken($token);

        return $this->helper->findOrCrateUser(
            $info->email,
            $info->name,
            $info->login // Github uses login instead of family_name
        );
    }

    /**
     * @param string $token
     * @return object{
     *  email: string,
     *  name: string,
     *  login: string
     * }
     * @throws InvalidArgumentException
     * @throws ClientExceptionInterface
     * @throws RuntimeException
     */
    private function getUserByToken(string $token): object
    {
        $req = $this->factory->createRequest(
            'GET',
            'https://api.github.com/user'
        );

        $res = $this->client->sendRequest(
            $req
                ->withHeader('Authorization', 'token ' . $token)
                ->withHeader('Accept', 'application/vnd.github.v3+json')
        );

        return json_decode($res->getBody()->getContents());
    }
}
