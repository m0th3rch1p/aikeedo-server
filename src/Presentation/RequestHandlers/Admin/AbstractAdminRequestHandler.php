<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Path;
use Presentation\Middlewares\AuthorizationMiddleware;
use Presentation\RequestHandlers\AbstractRequestHandler;

#[Middleware(AuthorizationMiddleware::class)]
#[Path('/admin')]
abstract class AbstractAdminRequestHandler extends AbstractRequestHandler
{
}
