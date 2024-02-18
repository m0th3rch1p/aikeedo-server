<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

/** @package Preset\Domain\Placeholder */
class EnumPlaceholder extends AbstractPlaceholder
implements PlaceholderInterface
{
    public array $options = [];

    /**
     * @param string $name 
     * @return void 
     */
    public function __construct(
        public string $name
    ) {
        parent::__construct($name, Type::ENUM);
    }

    /**
     * @param string $value 
     * @param null|string $label 
     * @return static 
     */
    public function addOption(string $value, ?string $label = null): static
    {
        $this->options[] = new Option($value, $label ?: $value);

        return $this;
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        return array_merge(
            $this->toArray(),
            [
                'options' => $this->options
            ]
        );
    }
}
