<?php

declare(strict_types=1);

namespace User\Application\Commands;

use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Application\CommandHandlers\CountUsersCommandHandler;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\Status;

/** @package User\Application\Commands */
#[Handler(CountUsersCommandHandler::class)]
class CountUsersCommand
{
    public ?Status $status = null;
    public ?Role $role = null;

    /** Search terms/query */
    public ?string $query = null;

    /**
     * @param int $status
     * @return static
     */
    public function setStatus(int $status): self
    {
        $this->status = Status::from($status);

        return $this;
    }

    /**
     * @param int $role
     * @return static
     */
    public function setRole(int $role): self
    {
        $this->role = Role::from($role);

        return $this;
    }
}
