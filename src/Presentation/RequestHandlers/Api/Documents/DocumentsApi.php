<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Documents;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Api\Api;

/** @package Presentation\RequestHandlers\Api\Categories */
#[Path('/documents')]
abstract class DocumentsApi extends Api
{
}
