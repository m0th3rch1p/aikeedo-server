<?php

declare(strict_types=1);

namespace Option\Application\Commands;

use Option\Application\CommandHandlers\CreateOptionCommandHandler;
use Option\Domain\ValueObjects\Key;
use Option\Domain\ValueObjects\Value;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Option\Application\Commands
 */
#[Handler(CreateOptionCommandHandler::class)]
class CreateOptionCommand
{
    public Key $key;
    public Value $value;

    /**
     * @param string $key 
     * @param null|string $value 
     * @return void 
     */
    public function __construct(string $key, ?string $value = null)
    {
        $this->key = new Key($key);
        $this->value = new Value($value);
    }
}
