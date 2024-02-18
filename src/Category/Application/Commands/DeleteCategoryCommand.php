<?php

declare(strict_types=1);

namespace Category\Application\Commands;

use Category\Application\CommandHandlers\DeleteCategoryCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Category\Application\Commands */
#[Handler(DeleteCategoryCommandHandler::class)]
class DeleteCategoryCommand
{
    public Id $id;

    /**
     * @param string $id 
     * @return void 
     */
    public function __construct(
        string $id
    ) {
        $this->id = new Id($id);
    }
}
