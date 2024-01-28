<?php

declare(strict_types=1);

namespace Presentation\Resources\Api;

use JsonSerializable;
use Presentation\Resources\DateTimeResource;
use User\Domain\Entities\UserEntity;

/** @package Presentation\Resources\Api */
class UserResource implements JsonSerializable
{
    /**
     * @param UserEntity $user 
     * @return void 
     */
    public function __construct(
        private UserEntity $user
    ) {
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        $u = $this->user;

        return [
            'id' => $u->getId(),
            'first_name' => $u->getFirstName(),
            'last_name' => $u->getLastName(),
            'email' => $u->getEmail(),
            'created_at' => new DateTimeResource($u->getCreatedAt()),
            'updated_at' => new DateTimeResource($u->getUpdatedAt()),
        ];
    }
}
