<?php

declare(strict_types=1);

namespace Presentation\Response;

use Easy\Http\Message\StatusCode;

/** @package Presentation\Response */
class ViewResponse extends HtmlResponse
{
    /**
     * @param string $template
     * @param array $data
     * @param StatusCode $status
     * @param array $headers
     * @return void
     */
    public function __construct(
        private string $template,
        private array $data = [],
        StatusCode $status = StatusCode::OK,
        array $headers = []
    ) {
        parent::__construct(
            $template,
            $status,
            $headers
        );
    }

    /** @return string  */
    public function getTemplate(): string
    {
        return $this->template;
    }

    /** @return array  */
    public function getData(): array
    {
        return $this->data;
    }
}
