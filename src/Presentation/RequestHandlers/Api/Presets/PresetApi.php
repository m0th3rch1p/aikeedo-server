<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Presets;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Api\Api;

/** @package Presentation\App\Api\RequestHandlers\Presets */
#[Path('/presets')]
abstract class PresetApi extends Api
{
}
