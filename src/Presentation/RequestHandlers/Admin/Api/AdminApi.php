<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Admin\AbstractAdminRequestHandler;

/** @package Presentation\RequestHandlers\Admin\Api */
#[Path('/api')]
abstract class AdminApi extends AbstractAdminRequestHandler
{
}
