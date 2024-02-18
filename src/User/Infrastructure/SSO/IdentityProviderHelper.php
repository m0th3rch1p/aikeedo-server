<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use InvalidArgumentException;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\UriFactoryInterface;
use Psr\Http\Message\UriInterface;
use RuntimeException;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\CreateUserCommand;
use User\Application\Commands\ReadUserCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\ValueObjects\Email;
use User\Infrastructure\SSO\Exceptions\InvalidCodeException;

/** @package User\Infrastructure\SSO */
class IdentityProviderHelper
{
    /**
     * @param Dispatcher $dispatcher
     * @param ClientInterface $client
     * @param UriFactoryInterface $uriFactory
     * @param RequestFactoryInterface $factory
     * @param string $domain
     * @param bool $isSecure
     * @return void
     */
    public function __construct(
        private Dispatcher $dispatcher,
        private ClientInterface $client,
        private UriFactoryInterface $uriFactory,
        private RequestFactoryInterface $factory,

        #[Inject('option.site.domain')]
        private string $domain = 'localhost',

        #[Inject('option.site.is_secure')]
        private bool $isSecure = true,
    ) {
    }

    /**
     * @param string $provider
     * @param string $authUrl
     * @param string $clientId
     * @param string $scope
     * @return UriInterface
     * @throws InvalidArgumentException
     */
    public function generateAuthUrl(
        string $provider,
        string $authUrl,
        string $clientId,
        string $scope,
    ): UriInterface {
        $uri = $this->uriFactory->createUri($authUrl);

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $this->generateRedirectUri($provider),
            'response_type' => 'code',
            'scope' => $scope,
        ]);

        return $uri->withQuery($query);
    }

    /**
     * @param string $provider
     * @param string $tokenUrl
     * @param string $clientId
     * @param string $clientSecret
     * @param string $code
     * @param RequestMethod $method
     * @return string
     * @throws InvalidArgumentException
     * @throws ClientExceptionInterface
     * @throws InvalidCodeException
     * @throws RuntimeException
     */
    public function exchangeCode(
        string $provider,
        string $tokenUrl,
        string $clientId,
        string $clientSecret,
        string $code,
        RequestMethod $method = RequestMethod::POST,
    ): string {
        $req = $this->factory->createRequest(
            $method->value,
            $tokenUrl
        );

        $uri = $req->getUri()->withQuery(http_build_query([
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $this->generateRedirectUri($provider),
        ]));

        $req = $req->withUri($uri);
        $res = $this->client->sendRequest(
            $req->withHeader('Accept', 'application/json')
        );

        if ($res->getStatusCode() !== StatusCode::OK->value) {
            throw new InvalidCodeException($code);
        }

        $data = json_decode($res->getBody()->getContents());

        if (!isset($data->access_token)) {
            throw new InvalidCodeException($code);
        }

        return $data->access_token;
    }

    /**
     * @param string $email
     * @param string $firstName
     * @param string $lastName
     * @return UserEntity
     * @throws NoHandlerFoundException
     */
    public function findOrCrateUser(
        string $email,
        string $firstName,
        string $lastName
    ): UserEntity {
        try {
            $cmd = new ReadUserCommand(new Email($email));
            $user = $this->dispatcher->dispatch($cmd);
            return $user;
        } catch (UserNotFoundException) {
            // Do nothing here, we'll create a new user
        }

        $cmd = new CreateUserCommand(
            $email,
            $firstName,
            $lastName
        );

        return $this->dispatcher->dispatch($cmd);
    }

    /**
     * @param string $provider
     * @return string
     */
    private function generateRedirectUri(string $provider): string
    {
        return ($this->isSecure ? 'https' : 'http')
            . '://' . $this->domain
            . '/auth/' . $provider;
    }
}
