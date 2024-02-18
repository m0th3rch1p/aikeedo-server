<?php

declare(strict_types=1);

namespace Easy\Router;

use IteratorAggregate;
use Easy\Router\Mapper\SimpleMapper;

/**
 * @package Easy\Router
 * @implements IteratorAggregate<Map>
 */
class Group extends SimpleMapper implements IteratorAggregate
{
    public ?string $name = null;
    public null|Group|SimpleMapper $parent = null;
    public ?string $prefix = null;

    /** @return string  */
    public function getPrefix(): string
    {
        if ($this->parent instanceof Group) {
            return $this->parent->getPrefix() . $this->getSanitizePrefix();
        }

        return $this->getSanitizePrefix();
    }

    /** @return string  */
    private function getSanitizePrefix(): string
    {
        /** @var string $prefix */
        $prefix = preg_replace('/\/+/', '/', $this->prefix ?: '');
        $prefix = trim($prefix, '/');

        return $prefix ? '/' . $prefix : '';
    }
}
