<?php

declare(strict_types=1);

namespace Document\Domain\Events;

use Document\Domain\Entities\DocumentEntity;

/**
 * @package Document\Domain\Events
 */
abstract class AbstractDocumentEvent
{
    /**
     * @param DocumentEntity $document
     * @return void
     */
    public function __construct(
        public readonly DocumentEntity $document,
    ) {
    }
}
