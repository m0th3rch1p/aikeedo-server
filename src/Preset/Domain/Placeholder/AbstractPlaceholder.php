<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

/** @package Preset\Domain\Placeholder */
abstract class AbstractPlaceholder
{
    public string $label;
    public ?string $info = null;
    public ?string $value = null;
    public bool $required = true;

    /**
     * @param string $name 
     * @param Type $type 
     * @return void 
     */
    public function __construct(
        public string $name,
        public readonly Type $type
    ) {
        $this->label = $this->generateLabel($name);
    }

    /**
     * @param string $name 
     * @return string 
     */
    private function generateLabel(string $name): string
    {
        preg_match_all(
            '!([A-Z][A-Z0-9]*(?=$|[A-Z][a-z0-9])|[A-Za-z][a-z0-9]+)!',
            $name,
            $matches
        );

        $ret = $matches[0];

        foreach ($ret as &$match) {
            $match = $match == strtoupper($match) ? strtolower($match) : lcfirst($match);
        }

        return ucfirst(implode(" ", $ret));
    }

    /** @return array  */
    protected function toArray(): array
    {
        return [
            'type' => $this->type->value,
            'label' => $this->label,
            'name' => $this->name,
            'info' => $this->info,
            'value' => $this->value,
            'required' => $this->required,
        ];
    }
}
