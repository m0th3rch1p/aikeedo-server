<?php

declare(strict_types=1);

namespace User\Application\Commands;

use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Application\CommandHandlers\CreateUserCommandHandler;
use User\Domain\ValueObjects\Email;
use User\Domain\ValueObjects\FirstName;
use User\Domain\ValueObjects\Language;
use User\Domain\ValueObjects\LastName;
use User\Domain\ValueObjects\Password;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\Status;

/** @package User\Application\Commands */
#[Handler(CreateUserCommandHandler::class)]
class CreateUserCommand
{
    public Email $email;
    public FirstName $firstName;
    public LastName $lastName;
    public ?Password $password = null;
    public ?Language $language = null;

    public ?Role $role = null;
    public ?Status $status = null;

    public function __construct(
        string $email,
        string $firstName,
        string $lastName
    ) {
        $this->email = new Email($email);
        $this->firstName = new FirstName($firstName);
        $this->lastName = new LastName($lastName);
    }

    /**
     * @param null|string $password
     * @return CreateUserCommand
     */
    public function setPassword(?string $password): self
    {
        $this->password = new Password($password);
        return $this;
    }

    /**
     * @param string $language
     * @return CreateUserCommand
     */
    public function setLanguage(string $language): self
    {
        $this->language = new Language($language);
        return $this;
    }

    /**
     * @param int $role
     * @return CreateUserCommand
     */
    public function setRole(int $role): self
    {
        $this->role = Role::from($role);
        return $this;
    }

    /**
     * @param int $status
     * @return CreateUserCommand
     */
    public function setStatus(int $status): self
    {
        $this->status = Status::from($status);
        return $this;
    }
}
