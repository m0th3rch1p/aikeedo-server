<?php

declare(strict_types=1);

namespace Presentation\Middlewares;

use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\UnauthorizedException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Domain\Entities\UserEntity;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\Status;

/** @package Presentation\Middlewares */
class AuthorizationMiddleware implements MiddlewareInterface
{
    /**
     * @param ServerRequestInterface $request 
     * @param RequestHandlerInterface $handler 
     * @return ResponseInterface 
     * @throws HttpException 
     */
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $user = $request->getAttribute(UserEntity::class);
        $path = $request->getUri()->getPath();

        if (strpos($path, '/auth/') !== false) {
            return $handler->handle($request);
        }

        if (!$user) {
            throw new UnauthorizedException();
        }

        if ($user->getStatus() !== Status::ACTIVE) {
            throw new UnauthorizedException();
        }

        if (strpos($path, '/admin') !== false && $user->getRole() !== Role::ADMIN) {
            throw new UnauthorizedException();
        }

        return $handler->handle($request);
    }
}
