<?php

declare(strict_types=1);

namespace Presentation\Middlewares;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\StatusCode;
use Presentation\Response\JsonResponse;
use Presentation\Response\RedirectResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Domain\Entities\UserEntity;

class EmailVerificationMiddleware implements MiddlewareInterface
{
    public function __construct(
        #[Inject('option.site.email_verification_policy')]
        private ?string $policy = null
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        /** @var UserEntity $user */
        $user = $request->getAttribute(UserEntity::class);
        $path = $request->getUri()->getPath();

        if (
            $this->policy !== 'strict'
            || strpos($path, '/app/account') === 0
            || strpos($path, '/api/account') === 0
            || strpos($path, '/api/auth') === 0
            || $user->isEmailVerified()->value
        ) {
            return $handler->handle($request);
        }

        if (strpos($path, '/api') === 0) {
            return new JsonResponse(
                [
                    'message' => 'Email verification required.'
                ],
                StatusCode::FORBIDDEN
            );
        }

        return new RedirectResponse('/app/account/verification');
    }
}
