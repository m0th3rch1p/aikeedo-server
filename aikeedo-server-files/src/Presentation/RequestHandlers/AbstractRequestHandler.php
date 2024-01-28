<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Easy\Router\Attributes\Middleware;
use Presentation\Middlewares\ExceptionMiddleware;
use Presentation\Middlewares\InstallMiddleware;
use Presentation\Middlewares\LocaleMiddleware;
use Presentation\Middlewares\RequestBodyParserMiddleware;
use Presentation\Middlewares\UserMiddleware;

#[Middleware(ExceptionMiddleware::class)]
#[Middleware(InstallMiddleware::class)]
#[Middleware(RequestBodyParserMiddleware::class)]
#[Middleware(UserMiddleware::class)]
#[Middleware(LocaleMiddleware::class)]
abstract class AbstractRequestHandler
{
}
