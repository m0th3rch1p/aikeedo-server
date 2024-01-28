<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Options;

use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Path;
use Presentation\Middlewares\DemoEnvironmentMiddleware;
use Presentation\RequestHandlers\Admin\Api\AdminApi;

/** @package Presentation\RequestHandlers\Admin\Api\Options */
#[Middleware(DemoEnvironmentMiddleware::class)]
#[Path('/options')]
abstract class OptionsApi extends AdminApi
{
}
