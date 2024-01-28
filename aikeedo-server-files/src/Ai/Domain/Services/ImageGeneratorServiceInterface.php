<?php

declare(strict_types=1);

namespace Ai\Domain\Services;

use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\ValueObjects\Image;

/**
 * @deprecated version 1.4 Use Ai\Domain\Images\ImageGeneratorServiceInterface instead
 */
interface ImageGeneratorServiceInterface extends AiServiceInterface
{
    /**
     * @param string $prompt 
     * @param int $size 
     * @param array $params 
     * @param null|string $model 
     * @return Image 
     * @throws ModelNotSupportedException
     */
    public function generate(
        string $prompt,
        int $size = 1024,
        array $params = [],
        ?string $model = null,
    ): Image;
}
