<?php

declare(strict_types=1);

namespace Ai\Domain\Services;

use Ai\Domain\ValueObjects\Token;
use Billing\Domain\ValueObjects\Usage;
use Generator;

/** @package Ai\Domain\Services */
interface CodeGeneratorServiceInterface extends AiServiceInterface
{
    /**
     * @param string $query 
     * @param string $language 
     * @param array $params 
     * @param null|string $model 
     * @return Generator<int,Token|Usage> 
     */
    public function generateCode(
        string $query,
        string $language,
        array $params = [],
        ?string $model = null,
    ): Generator;
}
