<?php

declare(strict_types=1);

namespace Easy\Menv;

use Easy\Menv\Exceptions\InvalidEntryException;
use Easy\Menv\Exceptions\InvalidEntryValueException;

/** @package Easy\Menv */
class Entry
{
    private string $line;
    private ?string $key = null;
    private ?string $value = null;
    private ?string $comment = null;
    private bool $isUpdated = false;

    /**
     * @param string $line
     * @return void
     * @throws InvalidEntryException
     */
    public function __construct(string $line)
    {
        $this->line = trim($line);

        if ($this->line) {
            $this->parse($this->line);
        }
    }

    /**
     * Get entry line.
     * If not modified, then will return the original, unparsed line.
     *
     * @return string
     */
    public function getLine(): string
    {
        if (!$this->isUpdated) {
            return $this->getOriginalLine();
        }

        $out = '';
        if ($this->key) {
            $out .= $this->key . '=' . (is_null($this->value) ? '' : $this->value);
        }

        if ($this->comment) {
            $out .= ($out ? ' ' : '') . '# ' . $this->comment;
        }

        return $out;
    }

    /**
     * Get original unparsed line.
     * @return string
     */
    public function getOriginalLine(): string
    {
        return $this->line;
    }

    /** @return null|string  */
    public function getKey(): ?string
    {
        return $this->key;
    }

    /**
     * @param mixed $value
     * @return void
     * @throws InvalidEntryValueException
     */
    public function setValue($value)
    {
        if (is_string($value)) {
            $value = trim($value);

            if (strtolower($value) === 'true') {
                $value = '1';
            } elseif (strtolower($value) === 'false') {
                $value = '0';
            } elseif (is_numeric($value)) {
                $this->value = (string) $value;
            } else {
                if (preg_match('/[^a-z0-9]/i', $value, $matches)) {
                    $pattern = '/(?<!\\\\)(?:\\\\\\\\)*(")/';
                    $value = preg_replace($pattern, '\"', $value);

                    $value = '"' . $value . '"';
                }

                $this->value = $value;
            }
        } elseif (is_bool($value)) {
            $this->value = $value === true ? '1' : '0';
        } elseif (is_numeric($value)) {
            $this->value = (string) $value;
        } elseif (is_null($value)) {
            $this->value = null;
        } else {
            throw new InvalidEntryValueException($value);
        }

        $this->isUpdated = true;
    }

    /**
     * @param string $comment
     * @return void
     */
    public function setComment(string $comment)
    {
        $this->comment = $comment;
        $this->isUpdated = true;
    }

    /**
     * String representation of the instance
     * @return string
     */
    public function __toString()
    {
        return $this->getLine();
    }

    /**
     * Parse entry line to the key, value and comments
     * @param string $line
     * @return void
     * @throws InvalidEntryException
     */
    private function parse(string $line)
    {
        $pattern = '/^([a-zA-Z_]+[a-zA-Z0-9_]*)(\s*)=(.*)$/';

        if (substr($line, 0, 1) == '#') {
            $this->comment = substr($line, 1);
        } elseif (preg_match($pattern, $line, $matches)) {
            $this->key = $matches[1];
            $right = $matches[3];

            $pattern = '/(\'[^\']*\'|"[^"\\\\"]*")(*SKIP)(*F)|#+/';
            $parts = preg_split($pattern, trim($right), 2);

            $this->value = trim($parts[0]) === '' ? null : trim($parts[0]);

            if (isset($parts[1])) {
                $this->comment = trim($parts[1]);
            }
        } else {
            throw new InvalidEntryException($line);
        }
    }
}
