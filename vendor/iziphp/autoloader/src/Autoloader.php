<?php

declare(strict_types=1);

namespace Easy\Autoloader;

/**
 * PSR-4 Autoloader Class
 * @package Easy\Autoloader
 */
class Autoloader
{
    /**
     * An associative array where the key is a namespace prefix and the value
     * is an array of base directories for classes in that namespace.
     *
     * @var array<string,array<string>>
     */
    protected array $prefixes = [];

    /**
     * Register loader with SPL autoloader stack.
     *
     * @return void
     */
    public function register(): void
    {
        spl_autoload_register([$this, 'loadClass']);
    }

    /**
     * Adds (appends) a base directory for a namespace prefix.
     *
     * @param string|null $prefix The namespace prefix.
     * @param string $baseDir A base directory for class files in the
     * namespace.
     * @return Autoloader
     */
    public function appendNamespace(
        ?string $prefix,
        string $baseDir
    ): self {
        $baseDir = $this->getNormalizedBaseDir($baseDir);
        $prefix = $this->getNormalizedPrefix($prefix);

        // retain the base directory for the namespace prefix
        array_push($this->prefixes[$prefix], $baseDir);

        return $this;
    }

    /**
     * Prepends a base directory for a namespace prefix.
     *
     * @param string|null $prefix The namespace prefix.
     * @param string $baseDir A base directory for class files in the
     * namespace.
     * @return Autoloader
     */
    public function prependNamespace(
        ?string $prefix,
        string $baseDir
    ): self {
        $baseDir = $this->getNormalizedBaseDir($baseDir);
        $prefix = $this->getNormalizedPrefix($prefix);

        // retain the base directory for the namespace prefix
        array_unshift($this->prefixes[$prefix], $baseDir);

        return $this;
    }

    /**
     * Loads the class file for a given class name.
     *
     * @param string $class The fully-qualified class name.
     * @return mixed The mapped file name on success, or boolean false on
     * failure.
     */
    public function loadClass(string $class): mixed
    {
        // the current namespace prefix
        $prefix = $class;

        // work backwards through the namespace names of the fully-qualified
        // class name to find a mapped file name
        while (false !== $pos = strrpos($prefix, '\\')) {
            // retain the trailing namespace separator in the prefix
            $prefix = substr($class, 0, $pos + 1);

            // the rest is the relative class name
            $relativeClass = substr($class, $pos + 1);

            // try to load a mapped file for the prefix and relative class
            $mappedFile = $this->loadMappedFile($prefix, $relativeClass);
            if ($mappedFile) {
                return $mappedFile;
            }

            // remove the trailing namespace separator for the next iteration
            // of strrpos()
            $prefix = rtrim($prefix, '\\');
        }

        $mappedFile = $this->loadMappedFile("\\", $class);

        if ($mappedFile) {
            return $mappedFile;
        }

        // never found a mapped file
        return false;
    }

    /**
     * Load the mapped file for a namespace prefix and relative class.
     *
     * @param string $prefix The namespace prefix.
     * @param string $relativeClass The relative class name.
     * @return ?string Null if no mapped file can be loaded, or the
     * name of the mapped file that was loaded.
     */
    protected function loadMappedFile(
        string $prefix,
        string $relativeClass
    ): ?string {
        // are there any base directories for this namespace prefix?
        if (isset($this->prefixes[$prefix]) === false) {
            return null;
        }

        // look through base directories for this namespace prefix
        foreach ($this->prefixes[$prefix] as $baseDir) {
            // replace the namespace prefix with the base directory,
            // replace namespace separators with directory separators
            // in the relative class name, append with .php
            $file = $baseDir
                . str_replace('\\', '/', $relativeClass)
                . '.php';

            // if the mapped file exists, require it
            if ($this->requireFile($file)) {
                // yes, we're done
                return $file;
            }
        }

        // never found it
        return null;
    }

    /**
     * If a file exists, require it from the file system.
     *
     * @param string $file The file to require.
     * @return bool True if the file exists, false if not.
     */
    protected function requireFile(string $file): bool
    {
        if (file_exists($file)) {
            require $file;
            return true;
        }

        return false;
    }

    /**
     * @param null|string $prefix
     * @return string
     */
    private function getNormalizedPrefix(?string $prefix): string
    {
        $prefix =  trim($prefix ?: '', '\\') . '\\';

        // initialize the namespace prefix array
        if (isset($this->prefixes[$prefix]) === false) {
            $this->prefixes[$prefix] = [];
        }

        return $prefix;
    }

    /**
     * Normalize the base directory with a trailing separator
     * @param string $baseDir
     * @return string Normalized base directory
     */
    private function getNormalizedBaseDir(string $baseDir): string
    {
        return rtrim($baseDir, DIRECTORY_SEPARATOR) . '/';
    }
}
