<?php

declare(strict_types=1);

namespace Presentation\Http\Message;

use Closure;
use Psr\Http\Message\StreamInterface;
use RuntimeException;

/** @package Presentation\Http\Message */
class CallbackStream implements StreamInterface
{
    private bool $called = false;
    private array $args = [];
    private ?Closure $callback = null;

    /**
     * @param Closure $callback 
     * @param array $args 
     * @return void 
     */
    public function __construct(
        Closure $callback,
        mixed ...$args
    ) {
        $this->callback = $callback;
        $this->args = $args;
    }

    /** @inheritDoc */
    public function __toString()
    {
        return $this->getContents();
    }

    /** @inheritDoc */
    public function close()
    {
        // There is nothing to do here.
    }

    /** @inheritDoc */
    public function detach()
    {
        $callback = $this->callback;
        $this->callback = null;
        return $callback;
    }

    /** @inheritDoc */
    public function getSize()
    {
        return null;
    }

    /** @inheritDoc */
    public function tell()
    {
        return 0;
    }

    /** @inheritDoc */
    public function eof()
    {
        return $this->called;
    }

    /** @inheritDoc */
    public function isSeekable()
    {
        return false;
    }

    /** @inheritDoc */
    public function seek(int $offset, int $whence = SEEK_SET)
    {
        throw new RuntimeException('Cannot seek a callback stream');
    }

    /** @inheritDoc */
    public function rewind()
    {
        throw new RuntimeException('Cannot seek a callback stream');
    }

    /** @inheritDoc */
    public function isWritable()
    {
        return false;
    }

    /** @inheritDoc */
    public function write(string $string)
    {
        throw new RuntimeException('Cannot write to a callback stream');
    }

    /** @inheritDoc */
    public function isReadable()
    {
        return true;
    }

    /** @inheritDoc */
    public function read(int $length)
    {
        return $this->getContents();
    }

    /** @inheritDoc */
    public function getContents()
    {
        if ($this->called || !$this->callback) {
            return '';
        }

        $this->called = true;
        $content = call_user_func($this->callback, ...$this->args);
        return is_string($content) ? $content : '';
    }

    /** @inheritDoc */
    public function getMetadata(?string $key = null)
    {
        return null;
    }
}
