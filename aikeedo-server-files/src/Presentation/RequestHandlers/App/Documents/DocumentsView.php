<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App\Documents;

use Easy\Router\Attributes\Path;
use Presentation\RequestHandlers\App\AppView;

#[Path('/documents')]
abstract class DocumentsView extends AppView
{
}
