<?php

declare(strict_types=1);

namespace Presentation\Middlewares;

use DomainException;
use Firebase\JWT\BeforeValidException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use InvalidArgumentException;
use Presentation\Cookies\UserCookie;
use Presentation\Jwt\UserJwt;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use UnexpectedValueException;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\ReadUserCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;

/** @package Presentation\Middlewares */
class UserMiddleware implements MiddlewareInterface
{
    /**
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @param RequestHandlerInterface $handler 
     * @return ResponseInterface 
     * @throws InvalidArgumentException 
     * @throws UnexpectedValueException 
     * @throws NoHandlerFoundException 
     */
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $user = $this->getUser($request);

        if ($user) {
            $request = $request->withAttribute(UserEntity::class, $user);
        }

        return $handler->handle($request);
    }

    /**
     * @param ServerRequestInterface $request 
     * @return null|UserEntity 
     * @throws InvalidArgumentException 
     * @throws UnexpectedValueException 
     * @throws NoHandlerFoundException 
     */
    private function getUser(ServerRequestInterface $request): ?UserEntity
    {
        $token =
            $this->getTokenFromAuthorizationHeader($request)
            ?? $this->getUserFromQueryParam($request)
            ?? $this->getTokenFromCookie($request);

        if (!$token) {
            return null;
        }

        try {
            $jwt = UserJwt::createFromJwtString($token);
        } catch (
            SignatureInvalidException
            | BeforeValidException
            | ExpiredException
            | DomainException $th
        ) {
            return null;
        }

        try {
            $cmd = new ReadUserCommand($jwt->getUuid());

            /** @var UserEntity $user */
            $user = $this->dispatcher->dispatch($cmd);
        } catch (UserNotFoundException $th) {
            return null;
        }

        return $user;
    }

    /**
     * @param ServerRequestInterface $request 
     * @return null|string 
     */
    private function getTokenFromAuthorizationHeader(
        ServerRequestInterface $request
    ): ?string {
        $header = $request->getHeaderLine('Authorization');

        if (!$header) {
            return null;
        }

        $token = null;

        // Check if header has Bearer token
        if (preg_match('/Bearer\s(\S+)/', $header, $matches)) {
            $token = $matches[1];
        }

        return $token;
    }

    /**
     * @param ServerRequestInterface $request 
     * @return null|string 
     */
    private function getUserFromQueryParam(
        ServerRequestInterface $request
    ): ?string {
        $params = $request->getQueryParams();

        return $params['jwt'] ?? null;
    }

    /**
     * @param ServerRequestInterface $request 
     * @return null|string 
     */
    private function getTokenFromCookie(
        ServerRequestInterface $request
    ): ?string {
        $path = $request->getUri()->getPath();

        if (
            strpos($path, '/admin/api') === false
            && strpos($path, '/api') === false
        ) {
            $cookie = UserCookie::createFromRequest($request);
            return $cookie ? $cookie->getValue() : null;
        }

        return null;
    }
}
