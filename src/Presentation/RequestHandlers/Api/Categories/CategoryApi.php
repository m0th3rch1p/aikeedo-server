<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Categories;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Api\Api;

/** @package Presentation\RequestHandlers\Api\Categories */
#[Path('/categories')]
abstract class CategoryApi extends Api
{
}
