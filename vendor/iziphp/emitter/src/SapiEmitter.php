<?php

declare(strict_types=1);

namespace Easy\Emitter;

use Easy\Emitter\Traits\SapiEmitterTrait;
use Easy\Http\ResponseEmitter\EmitterInterface;
use Psr\Http\Message\ResponseInterface;

/** @package Easy\Emitter */
class SapiEmitter implements EmitterInterface
{
    use SapiEmitterTrait;

    /**
     * @inheritDoc
     */
    public function emit(ResponseInterface $response): void
    {
        $this->assertNoPreviousOutput();
        $this->emitStatusLine($response);
        $this->emitHeaders($response);
        $this->emitBody($response);
    }

    /**
     * Emit the response body
     *
     * @param ResponseInterface $response
     */
    private function emitBody(ResponseInterface $response): void
    {
        echo $response->getBody();
    }
}
