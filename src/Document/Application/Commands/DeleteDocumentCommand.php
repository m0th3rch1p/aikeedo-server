<?php

declare(strict_types=1);

namespace Document\Application\Commands;

use Document\Application\CommandHandlers\DeleteDocumentCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Application\Commands
 */
#[Handler(DeleteDocumentCommandHandler::class)]
class DeleteDocumentCommand
{
    public Id $id;
    public Id|UserEntity $user;

    /**
     * @param string|Id|UserEntity $user 
     * @param string|Id $id 
     * @return void 
     */
    public function __construct(
        string|Id|UserEntity $user,
        string|Id $id,
    ) {
        $this->id = is_string($id) ? new Id($id) : $id;
        $this->user = is_string($user) ? new Id($user) : $user;
    }
}
