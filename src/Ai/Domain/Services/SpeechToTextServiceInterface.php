<?php

declare(strict_types=1);

namespace Ai\Domain\Services;

use Ai\Domain\ValueObjects\Token;
use Billing\Domain\ValueObjects\Usage;
use Generator;
use Psr\Http\Message\UploadedFileInterface;

/** @package Ai\Domain\Services */
interface SpeechToTextServiceInterface extends AiServiceInterface
{
    /**
     * @param UploadedFileInterface $file 
     * @param array $params 
     * @param null|string $model 
     * @return Generator<int,Token|Usage>
     * @throws ModelNotSupportedException
     */
    public function convertSpeechToText(
        UploadedFileInterface $file,
        array $params = [],
        ?string $model = null,
    ): Generator;
}
