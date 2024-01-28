<?php

declare(strict_types=1);

namespace User\Domain\Exceptions;

use Exception;
use Shared\Domain\ValueObjects\Id;
use Throwable;
use User\Domain\Entities\UserEntity;

/** @package User\Domain\Exceptions */
class SubscriptionNotFoundException extends Exception
{
    /**
     * @param UserEntity $user 
     * @param Id $id 
     * @param int $code 
     * @param Throwable|null $previous 
     * @return void 
     */
    public function __construct(
        private readonly UserEntity $user,
        private readonly Id $id,
        int $code = 0,
        Throwable $previous = null
    ) {
        $message = sprintf(
            "User<%s> doesn't have a subscription with id of <%s>",
            $user->getId()->getValue(),
            $id->getValue()
        );

        parent::__construct($message, $code, $previous);
    }

    /** @return UserEntity  */
    public function getUser(): UserEntity
    {
        return $this->user;
    }

    /** @return Id  */
    public function getId(): Id
    {
        return $this->id;
    }
}
