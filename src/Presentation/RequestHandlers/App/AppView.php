<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App;

use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Path;
use Presentation\Middlewares\AuthorizationMiddleware;
use Presentation\Middlewares\EmailVerificationMiddleware;
use Presentation\Middlewares\ViewMiddleware;
use Presentation\RequestHandlers\AbstractRequestHandler;

#[Middleware(AuthorizationMiddleware::class)]
#[Middleware(EmailVerificationMiddleware::class)]
#[Middleware(ViewMiddleware::class)]
#[Path('/app')]
abstract class AppView extends AbstractRequestHandler
{
}
