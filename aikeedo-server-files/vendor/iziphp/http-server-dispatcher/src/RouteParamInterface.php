<?php

declare(strict_types=1);

namespace Easy\Http\Server;

/** @package Easy\Http\Server */
interface RouteParamInterface
{
    /** @return string  */
    public function getKey(): string;

    /** @return mixed  */
    public function getValue(): mixed;
}
