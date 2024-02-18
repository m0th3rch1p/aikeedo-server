<?php

declare(strict_types=1);

namespace Category\Application\Commands;

use Category\Application\CommandHandlers\UpdateCategoryCommandHandler;
use Category\Domain\ValueObjects\Title;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Category\Application\Commands */
#[Handler(UpdateCategoryCommandHandler::class)]
class UpdateCategoryCommand
{
    public Id $id;
    public ?Title $title;

    /**
     * @param string $id 
     * @return void 
     */
    public function __construct(
        string $id,
    ) {
        $this->id = new Id($id);
    }

    /**
     * @param string $title 
     * @return void 
     */
    public function setTitle(string $title): void
    {
        $this->title = new Title($title);
    }
}
