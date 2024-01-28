<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App\Billing;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\App\AppView;

#[Path('/billing')]
abstract class BillingView extends AppView
{
}
