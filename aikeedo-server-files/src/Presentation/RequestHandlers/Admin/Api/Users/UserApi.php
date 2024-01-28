<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Users;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Admin\Api\AdminApi;

/** @package Presentation\RequestHandlers\Admin\Api\Users */
#[Path('/users')]
abstract class UserApi extends AdminApi
{
}
