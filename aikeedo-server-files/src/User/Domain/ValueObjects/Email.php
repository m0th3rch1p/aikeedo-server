<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Shared\Domain\ValueObjects\Email as BaseEmail;
use Doctrine\ORM\Mapping as ORM;

/** @package User\Domain\ValueObjects */
#[ORM\Embeddable]
class Email extends BaseEmail
{
    #[ORM\Column(type: Types::STRING, name: "email", unique: true)]
    public readonly string $value;
}
