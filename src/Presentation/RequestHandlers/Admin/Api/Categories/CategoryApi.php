<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Categories;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\Admin\Api\AdminApi;

/** @package Category\Presentation\Admin\Api\RequestHandlers */
#[Path('/categories')]
abstract class CategoryApi extends AdminApi
{
}
