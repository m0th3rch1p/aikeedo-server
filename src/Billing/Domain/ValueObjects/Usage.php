<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use JsonSerializable;
use Shared\Domain\Exceptions\InvalidValueException;

/** @package Ai\Domain\ValueObjects */
class Usage implements JsonSerializable
{
    public readonly int $value;

    /**
     * @param UsageType $type 
     * @param int $value 
     * @return void 
     * @throws InvalidValueException 
     */
    public function __construct(
        public readonly UsageType $type,
        int $value
    ) {
        $this->ensureValueIsValid($value);
        $this->value = $value;
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        return [
            'type' => $this->type,
            'value' => $this->value,
        ];
    }

    /**
     * @param int $value 
     * @return void 
     * @throws InvalidValueException 
     */
    private function ensureValueIsValid(int $value): void
    {
        if ($value < 0) {
            throw new InvalidValueException(sprintf(
                '<%s> does not allow the value <%s>. Value must greater than 0.',
                static::class,
                $value
            ));
        }
    }
}
