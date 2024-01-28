<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Easy\Router\Attributes\Middleware;
use Presentation\Middlewares\ViewMiddleware;

/** @package Presentation\RequestHandlers\Admin */
#[Middleware(ViewMiddleware::class)]
class AbstractAdminViewRequestHandler extends AbstractAdminRequestHandler
{
}
