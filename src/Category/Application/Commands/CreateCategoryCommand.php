<?php

declare(strict_types=1);

namespace Category\Application\Commands;

use Category\Application\CommandHandlers\CreateCategoryCommandHandler;
use Category\Domain\ValueObjects\Title;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Category\Application\Commands */
#[Handler(CreateCategoryCommandHandler::class)]
class CreateCategoryCommand
{
    public Title $title;

    /**
     * @param string $title 
     * @return void 
     */
    public function __construct(string $title)
    {
        $this->title = new Title($title);
    }
}
