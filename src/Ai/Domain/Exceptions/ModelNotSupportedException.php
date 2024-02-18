<?php

declare(strict_types=1);

namespace Ai\Domain\Exceptions;

use Ai\Domain\Services\AiServiceInterface;
use Exception;
use Throwable;

/** @package Ai\Domain\Exceptions */
class ModelNotSupportedException extends Exception
{
    /**
     * @param class-string<AiServiceInterface> $service 
     * @param string $model 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return void 
     */
    public function __construct(
        private string $service,
        private string $model,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        $message = sprintf(
            'Model "%s" is not supported by service "%s".',
            $model,
            $service
        );

        parent::__construct($message, $code, $previous);
    }

    /** @return class-string<AiServiceInterface>  */
    public function getService(): string
    {
        return $this->service;
    }

    /** @return string  */
    public function getModel(): string
    {
        return $this->model;
    }
}
