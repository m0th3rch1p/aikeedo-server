<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Billing;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Api\Api;

/** @package Presentation\RequestHandlers\Api\Billing */
#[Path('/billing')]
abstract class BillingApi extends Api
{
}
