<?php

declare(strict_types=1);

namespace Presentation\EventStream;

use Ai\Domain\ValueObjects\Image;
use Ai\Domain\ValueObjects\Token;
use Billing\Domain\ValueObjects\Usage;
use Generator;
use JsonSerializable;
use Throwable;
use User\Domain\Entities\UserEntity;

/** @package Presentation\EventStream */
class Streamer
{
    private bool $isOpened = false;

    /** @return void  */
    public function open(): void
    {
        if (connection_aborted()) {
            exit;
        }

        if ($this->isOpened) {
            return;
        }

        $this->isOpened = true;
        ob_end_flush();
    }

    /**
     * @param string $event 
     * @param null|string|array|JsonSerializable $data 
     * @param null|string $id 
     * @return void 
     */
    public function sendEvent(
        string $event,
        null|string|array|JsonSerializable $data = null,
        ?string $id = null,
    ): void {
        echo "event: " . $event . PHP_EOL;

        if (!is_null($data)) {
            echo "data: " . (is_string($data) ? $data : json_encode($data)) . PHP_EOL;
        }

        echo "id: " . ($id ?: time()) . PHP_EOL . PHP_EOL;
        flush();
    }

    /** @return void  */
    public function close(): void
    {
        if (!$this->isOpened) {
            return;
        }

        $this->isOpened = false;
        $this->sendEvent('close', '');
    }

    /**
     * @param Generator $generator 
     * @param UserEntity $user 
     * @return Usage[] 
     */
    public function stream(
        Generator $generator
    ): array {
        $this->open();
        $usage = [];

        foreach ($generator as $item) {
            if ($item instanceof Image) {
                $this->sendEvent('image', $item);
                continue;
            }

            if ($item instanceof Token) {
                $tokens[] = $item->value;
                $this->sendEvent('token', $item);
                continue;
            }

            if ($item instanceof Usage) {
                $usage[] = $item;
                $this->sendEvent('usage', $item);
                continue;
            }

            if ($item instanceof Throwable) {
                $this->sendEvent('error', $item->getMessage());
                continue;
            }
        }

        return $usage;
    }
}
