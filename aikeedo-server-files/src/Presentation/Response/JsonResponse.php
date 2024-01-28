<?php

declare(strict_types=1);

namespace Presentation\Response;

use Easy\Http\Message\StatusCode;
use Laminas\Diactoros\Exception\InvalidArgumentException;
use Laminas\Diactoros\Exception\UnwritableStreamException;
use Laminas\Diactoros\Exception\UnseekableStreamException;
use Laminas\Diactoros\Response\JsonResponse as BaseJsonResponse;
use Psr\Http\Message\ResponseInterface;

/** @package Shared\UI\Response */
class JsonResponse extends BaseJsonResponse implements ResponseInterface
{
    /**
     * @inheritDoc
     * @param mixed $data
     * @param StatusCode $status
     * @param array $headers
     * @param int $encodingOptions
     * @return void
     * @throws InvalidArgumentException
     * @throws UnwritableStreamException
     * @throws UnseekableStreamException
     */
    public function __construct(
        $data,
        StatusCode $status = StatusCode::OK,
        array $headers = [],
        int $encodingOptions = self::DEFAULT_JSON_FLAGS
    ) {
        parent::__construct(
            $data,
            $status->value,
            $headers,
            $encodingOptions
        );
    }
}
