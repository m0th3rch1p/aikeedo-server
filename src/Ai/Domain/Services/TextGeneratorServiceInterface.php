<?php

declare(strict_types=1);

namespace Ai\Domain\Services;

use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\ValueObjects\Token;
use Billing\Domain\ValueObjects\Usage;
use Generator;

/** @package Ai\Domain\Services */
interface TextGeneratorServiceInterface extends AiServiceInterface
{
    /**
     * @param string $prompt 
     * @param array $params 
     * @param nullstring $model 
     * @return Generator<int,Token|Usage> 
     * @throws ModelNotSupportedException
     */
    public function generateText(
        string $prompt,
        array $params = [],
        ?string $model = null,
    ): Generator;
}
