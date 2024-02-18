<?php

namespace Easy\Container;

/** @package Easy\Container */
interface ResolverInterface
{
    /**
     * @SuppressWarnings(PHPMD.ShortVariable)
     * @param string $id
     * @return bool
     */
    public function canResolve(string $id): bool;

    /**
     * @SuppressWarnings(PHPMD.ShortVariable)
     * @param string $id
     * @return mixed
     */
    public function resolve(string $id): mixed;
}
