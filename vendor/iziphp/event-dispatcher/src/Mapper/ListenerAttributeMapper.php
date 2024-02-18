<?php

declare(strict_types=1);

namespace Easy\EventDispatcher\Mapper;

use Easy\EventDispatcher\Attributes\Subscribe;
use Easy\EventDispatcher\EventMapperInterface;
use Easy\EventDispatcher\ListenerWrapper;
use Easy\EventDispatcher\Priority; // Used in dosctype
use Psr\Cache\CacheItemPoolInterface;
use Psr\Cache\InvalidArgumentException;
use Psr\Container\ContainerInterface;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use ReflectionClass;
use SplFileInfo;

/**
 * Maps events to listeners based on attributes defined on the listener class.
 *
 * @package Easy\EventDispatcher\Mapper
 */
class ListenerAttributeMapper implements EventMapperInterface
{
    /**
     * An array of paths to lookup for listener classes.
     *
     * @var array<string> $paths
     */
    private array $paths = [];

    /**
     * Indicates whether or not caching is enabled.
     *
     * @var bool $isCachingEnabled
     */
    private bool $isCachingEnabled = false;

    /**
     * The resolved subscribers found during lookup.
     *
     * @var array<array{
     *  eventType: class-string,
     *  listener: string|callable,
     *  priority: Priority
     * }> $subscribers
     */
    private array $subscribers = [];

    /**
     * Indicates whether or not subscribers have been resolved.
     *
     * @var bool $isSubsResolved
     */
    private bool $isSubsResolved = false;

    /**
     * Constructs a new ListenerAttributeMapper instance.
     *
     * @param ContainerInterface $container
     * The container object used for resolving dependencies.
     * @param null|CacheItemPoolInterface $cache
     * The cache object used for caching subscribers.
     */
    public function __construct(
        private ContainerInterface $container,
        private ?CacheItemPoolInterface $cache = null
    ) {
    }

    /**
     * Returns an iterable collection of ListenerWrappers for a given event
     * object.
     *
     * @inheritDoc
     */
    public function getListenersForEvent(object $event): iterable
    {
        if (!$this->isSubsResolved) {
            $this->lookupForSubscribers();
        }

        foreach ($this->subscribers as $subscriber) {
            yield new ListenerWrapper(
                $this->container,
                $subscriber['listener'],
                $subscriber['priority']
            );
        }
    }

    /**
     * Enables caching.
     *
     * @return void
     */
    public function enableCaching(): void
    {
        $this->isCachingEnabled = true;
    }

    /**
     * Disables caching.
     *
     * @return void
     */
    public function disableCaching(): void
    {
        $this->isCachingEnabled = false;
    }

    /**
     * Adds a path to lookup for listener classes.
     *
     * @param string $path The path to add.
     *
     * @return ListenerAttributeMapper This instance, for chaining.
     */
    public function addPath(string $path): self
    {
        $this->paths[] = $path;
        return $this;
    }

    /**
     * Looks up subscribers and caches them if caching is enabled.
     *
     * @return void
     *
     * @throws InvalidArgumentException
     * If there's an invalid argument provided in the cache item.
     */
    private function lookupForSubscribers(): void
    {
        if ($this->cache && $this->isCachingEnabled) {
            $item = $this->cache->getItem('subscribers');

            if ($item->isHit()) {
                /**
                 * @var array<array{
                 *  eventType: class-string,
                 *  listener: string|callable,
                 *  priority: Priority
                 * }> $subscribers
                 */
                $subscribers = $item->get();
                $this->subscribers = $subscribers;
                return;
            }
        }

        foreach ($this->paths as $path) {
            $this->lookupForSubscribersInPath($path);
        }
    }

    /**
     * Looks up subscribers in a path.
     *
     * @param string $path The path to lookup for subscribers.
     *
     * @return void
     */
    private function lookupForSubscribersInPath(string $path): void
    {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path)
        );

        $includedFiles = [];
        $declared = get_declared_classes();

        /** @var SplFileInfo $file */
        foreach ($iterator as $file) {
            if ($file->isDir()) {
                continue;
            }

            require_once $file->getRealPath();
            $includedFiles[] = $file->getRealPath();
        }

        foreach ($declared as $className) {
            $reflection = new ReflectionClass($className);
            $sourceFile = $reflection->getFileName();

            if (!in_array($sourceFile, $includedFiles, true)) {
                continue;
            }

            $this->lookupForSubscribersInFile($reflection);
        }
    }

    /**
     * Looks up subscribers in a file.
     *
     * @param ReflectionClass<object> $reflection
     * A ReflectionClass object representing the listener class to process.
     *
     * @return void
     */
    private function lookupForSubscribersInFile(ReflectionClass $reflection): void
    {
        while ($reflection) {
            if (!$reflection->isInstantiable()) {
                break;
            }

            $attributes = $reflection->getAttributes(Subscribe::class);

            foreach ($attributes as $attribute) {
                $subscriber = $attribute->newInstance();
                $this->subscribers[] = [
                    'eventType' => $subscriber->eventType,
                    'listener' => $reflection->getName(),
                    'priority' => $subscriber->priority,
                ];
            }

            $reflection = $reflection->getParentClass();
        }
    }
}
