<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Plans;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Admin\Api\AdminApi;

/** @package Presentation\RequestHandlers\Admin\Api\Plans */
#[Path('/plans')]
abstract class PlanApi extends AdminApi
{
}
