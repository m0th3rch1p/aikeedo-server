<?php

declare(strict_types=1);

namespace Ai\Domain\Services;

/** @package Ai\Domain\Services */
interface AiServiceInterface
{
    /**
     * @param string $model 
     * @return bool 
     */
    public function supportsModel(string $model): bool;
}
