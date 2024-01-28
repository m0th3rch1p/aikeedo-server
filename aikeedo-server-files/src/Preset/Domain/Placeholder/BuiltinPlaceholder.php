<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

/** @package Preset\Domain\Placeholder */
class BuiltinPlaceholder implements PlaceholderInterface
{
    public string $type;

    /**
     * @param string $name 
     * @return void 
     */
    public function __construct(
        public string $name
    ) {
        $this->type = $this->name;
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        return [
            'name' => $this->name,
            'type' => $this->name,
            'is_builtin' => true
        ];
    }
}
