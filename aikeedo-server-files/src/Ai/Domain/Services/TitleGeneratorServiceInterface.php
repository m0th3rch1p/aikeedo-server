<?php

declare(strict_types=1);

namespace Ai\Domain\Services;

use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\ValueObjects\Token;
use Billing\Domain\ValueObjects\Usage;
use Generator;

/** @package Ai\Domain\Services */
interface TitleGeneratorServiceInterface extends AiServiceInterface
{
    /**
     * @param string $content 
     * @param array $params 
     * @param null|string $model 
     * @return Generator<int,Token|Usage> 
     * @throws ModelNotSupportedException
     */
    public function generateTitle(
        string $content,
        array $params = [],
        ?string $model = null
    ): Generator;
}
