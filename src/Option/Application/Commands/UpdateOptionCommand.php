<?php

declare(strict_types=1);

namespace Option\Application\Commands;

use Option\Application\CommandHandlers\UpdateOptionCommandHandler;
use Option\Domain\ValueObjects\Value;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Option\Application\Commands
 */
#[Handler(UpdateOptionCommandHandler::class)]
class UpdateOptionCommand
{
    public Id $id;
    public ?Value $value = null;

    /**
     * @param string $id
     * @return void
     */
    public function __construct(string $id)
    {
        $this->id = new Id($id);
    }

    /**
     * @param null|string $value 
     * @return void 
     */
    public function setValue(?string $value): void
    {
        $this->value = new Value($value);
    }
}
