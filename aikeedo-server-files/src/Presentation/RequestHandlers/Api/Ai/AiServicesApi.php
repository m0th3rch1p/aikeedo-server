<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Ai;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Api\Api;

#[Path('/ai/Services')]
abstract class AiServicesApi extends Api
{
}
