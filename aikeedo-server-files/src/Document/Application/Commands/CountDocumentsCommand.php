<?php

declare(strict_types=1);

namespace Document\Application\Commands;

use Document\Application\CommandHandlers\CountDocumentsCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Application\Commands
 */
#[Handler(CountDocumentsCommandHandler::class)]
class CountDocumentsCommand
{
    public Id|UserEntity $user;

    /** Search terms/query */
    public ?string $query = null;

    /**
     * @param string|Id|UserEntity $user 
     * @return void 
     */
    public function __construct(
        string|Id|UserEntity $user
    ) {
        $this->user = is_string($user) ? new Id($user) : $user;
    }
}
