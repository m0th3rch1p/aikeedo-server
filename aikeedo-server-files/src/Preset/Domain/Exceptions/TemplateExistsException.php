<?php

declare(strict_types=1);

namespace Preset\Domain\Exceptions;

use Exception;
use Preset\Domain\ValueObjects\Template;
use Throwable;

/** @package Preset\Domain\Exceptions */
class TemplateExistsException extends Exception
{
    /**
     * @param Template $template 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return void 
     */
    public function __construct(
        public readonly Template $template,
        int $code = 0,
        Throwable $previous = null
    ) {
        parent::__construct(
            sprintf(
                "Template \"%s\" is already taken!",
                addslashes($template->value)
            ),
            $code,
            $previous
        );
    }
}
