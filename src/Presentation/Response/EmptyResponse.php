<?php

declare(strict_types=1);

namespace Presentation\Response;

use Easy\Http\Message\StatusCode;
use Laminas\Diactoros\Exception\InvalidArgumentException;
use Laminas\Diactoros\Response\EmptyResponse as BaseResponse;
use Psr\Http\Message\ResponseInterface;

/** @package Shared\UI\Response */
class EmptyResponse extends BaseResponse implements ResponseInterface
{
    /**
     * @inheritDoc
     * @param StatusCode $status
     * @param array $headers
     * @return void
     * @throws InvalidArgumentException
     */
    public function __construct(
        StatusCode $status = StatusCode::NO_CONTENT,
        array $headers = []
    ) {
        parent::__construct($status->value, $headers);
    }
}
