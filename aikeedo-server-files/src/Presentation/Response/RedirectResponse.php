<?php

declare(strict_types=1);

namespace Presentation\Response;

use Easy\Http\Message\StatusCode;
use Laminas\Diactoros\Exception\InvalidArgumentException;
use Laminas\Diactoros\Response\RedirectResponse as BaseResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\UriInterface;

/** @package Shared\UI\Response */
class RedirectResponse extends BaseResponse implements ResponseInterface
{
    /**
     * @inheritDoc
     * @param string|UriInterface $uri
     * @param StatusCode $status
     * @param array $headers
     * @return void
     * @throws InvalidArgumentException
     */
    public function __construct(
        string|UriInterface $uri,
        StatusCode $status = StatusCode::FOUND,
        array $headers = []
    ) {
        parent::__construct($uri, $status->value, $headers);
    }
}
