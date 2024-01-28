<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

/** @package Preset\Domain\ValueObjects\Placeholder */
class TextPlaceholder extends AbstractPlaceholder
implements PlaceholderInterface
{
    public bool $multiline = false;
    public ?string $placeholder = null;

    /**
     * @param string $name 
     * @return void 
     */
    public function __construct(string $name)
    {
        parent::__construct($name, Type::TEXT);
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        return array_merge(
            $this->toArray(),
            [
                'multiline' => $this->multiline,
                'placeholder' => $this->placeholder,
            ]
        );
    }
}
