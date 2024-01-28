<?php

declare(strict_types=1);

namespace Presentation\Response;

use Easy\Http\Message\StatusCode;
use Laminas\Diactoros\Exception\InvalidArgumentException;
use Laminas\Diactoros\Response\HtmlResponse as BaseResponse;
use Psr\Http\Message\ResponseInterface;

/** @package Shared\UI\Response */
class HtmlResponse extends BaseResponse implements ResponseInterface
{
    /**
     * @inheritDoc
     * @param mixed $html
     * @param StatusCode $status
     * @param array $headers
     * @return void
     * @throws InvalidArgumentException
     */
    public function __construct(
        $html,
        StatusCode $status = StatusCode::OK,
        array $headers = []
    ) {
        parent::__construct(
            $html,
            $status->value,
            $headers
        );
    }
}
