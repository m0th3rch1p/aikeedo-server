<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO\IdentityProviders;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use InvalidArgumentException;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\UriInterface;
use RuntimeException;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Entities\UserEntity;
use User\Infrastructure\SSO\IdentityProviderHelper;
use User\Infrastructure\SSO\IdentityProviderInterface;

/** @package User\Infrastructure\SSO\IdentityProviders */
class FacebookIdentityProvider implements IdentityProviderInterface
{
    private const VERSION = 'v18.0';

    private array $scopes = [
        'email',
        'public_profile',
    ];

    public function __construct(
        private IdentityProviderHelper $helper,
        private ClientInterface $client,
        private RequestFactoryInterface $factory,

        #[Inject('option.facebook.app_id')]
        private ?string $clientId = null,

        #[Inject('option.facebook.app_secret')]
        private ?string $clientSecret = null,
    ) {
    }

    /**
     * @inheritDoc
     */
    public function getName(): string
    {
        return 'Facebook';
    }

    /**
     * @inheritDoc
     */
    public function getIconSrc(): string
    {
        return 'assets/icons/facebook.svg';
    }

    /**
     * @inheritdoc
     * @throws InvalidArgumentException
     */
    public function getAuthUrl(): UriInterface
    {
        return $this->helper->generateAuthUrl(
            'facebook',
            "https://www.facebook.com/" . self::VERSION . "/dialog/oauth",
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
            'facebook',
            'https://graph.facebook.com/' . self::VERSION . '/oauth/access_token',
            $this->clientId,
            $this->clientSecret,
            $code,
            RequestMethod::GET
        );

        $info = $this->getUserByToken($token);

        return $this->helper->findOrCrateUser(
            $info->email,
            $info->first_name,
            $info->last_name
        );
    }

    /**
     * @param string $token
     * @return object{
     *  id: string,
     *  name: string,
     *  email: string,
     *  first_name: string,
     *  last_name: string,
     *  picture: object{
     *      data: object{
     *          height: int,
     *          is_silhouette: bool,
     *          url: string,
     *          width: int
     *      }
     *  }
     * }
     * @throws InvalidArgumentException
     * @throws ClientExceptionInterface
     * @throws RuntimeException
     */
    private function getUserByToken(string $token): object
    {
        $req = $this->factory->createRequest(
            'GET',
            "https://graph.facebook.com/" . self::VERSION . "/me?fields=id,name,email,first_name,last_name,picture"
        );

        $res = $this->client->sendRequest(
            $req->withHeader('Authorization', 'Bearer ' . $token)
        );

        return json_decode($res->getBody()->getContents());
    }
}
