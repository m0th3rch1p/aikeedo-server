<?php

declare(strict_types=1);

namespace Presentation\Response;

use Easy\Http\Message\StatusCode;
use Laminas\Diactoros\Exception\InvalidArgumentException;
use Laminas\Diactoros\Response as BaseResponse;
use Psr\Http\Message\ResponseInterface;

/** @package Shared\UI\Response */
class Response extends BaseResponse implements ResponseInterface
{
    /**
     * @inheritDoc
     * @param string $body
     * @param StatusCode $status
     * @param array $headers
     * @return void
     * @throws InvalidArgumentException
     */
    public function __construct(
        $body = 'php://memory',
        StatusCode $status = StatusCode::OK,
        array $headers = []
    ) {
        parent::__construct($body, $status->value, $headers);
    }
}
