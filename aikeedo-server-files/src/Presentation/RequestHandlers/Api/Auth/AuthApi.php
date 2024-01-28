<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Auth;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Api\Api;

#[Path('/auth')]
abstract class AuthApi extends Api
{
}
