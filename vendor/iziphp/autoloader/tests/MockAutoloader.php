<?php

declare(strict_types=1);

namespace Easy\Autoloader\Tests;

use Easy\Autoloader\Autoloader;

/** @package Easy\Autoloader */
class MockAutoloader extends Autoloader
{
    /** @var array<string> */
    private array $files = [];

    /**
     * @param string $file
     * @return MockAutoloader
     */
    public function addFile(string $file): self
    {
        $this->files[] = $file;
        return $this;
    }

    /**
     * @param string $file The file to require.
     * @return bool True if the file exists, false if not.
     */
    protected function requireFile(string $file): bool
    {
        return in_array($file, $this->files);
    }
}
