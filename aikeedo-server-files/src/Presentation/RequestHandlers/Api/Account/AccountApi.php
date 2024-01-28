<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Account;

use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Path;
use Presentation\Middlewares\DemoEnvironmentMiddleware;
use Presentation\RequestHandlers\Api\Api;

/** @package Presentation\RequestHandlers\Api\Account */
#[Middleware(DemoEnvironmentMiddleware::class)]
#[Path('/account')]
abstract class AccountApi extends Api
{
}
