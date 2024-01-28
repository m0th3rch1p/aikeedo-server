<?php

declare(strict_types=1);

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\ReadAwsCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Aws\Application\Commands
 */
#[Handler(ReadAwsCommandHandler::class)]
class ReadAwsCommand
{
    public Id $id;

    /**
     * @param string $id
     * @return void
     */
    public function __construct(string $id)
    {
        $this->id = new Id($id);
    }
}
