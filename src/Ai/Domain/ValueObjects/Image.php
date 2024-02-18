<?php

declare(strict_types=1);

namespace Ai\Domain\ValueObjects;

use JsonSerializable;
use Psr\Http\Message\UriInterface;

class Image implements JsonSerializable
{
    public function __construct(
        public readonly UriInterface|string $src,
    ) {
    }

    public function jsonSerialize(): array
    {
        return [
            'src' => (string) $this->src,
        ];
    }
}
