<?php

declare(strict_types=1);

namespace Easy\EventDispatcher;

use InvalidArgumentException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

/**
 * Wraps a listener to provide additional functionality such as priority and
 * lazy resolution.
 *
 * @package Easy\EventDispatcher
 */
class ListenerWrapper
{
    /**
     * Property type declarations support all type declarations supported by
     * PHP, with the exception of void and callable.
     *
     * @see https://wiki.php.net/rfc/typed_properties_v2
     * @see https://wiki.php.net/rfc/consistent_callables
     */

    /**
     * @var string|callable $listener
     * The listener callback or the FQCN of a class implementing __invoke.
     */
    private $listener;

    /**
     * ListenerWrapper constructor.
     *
     * @param ContainerInterface $container
     * The container used for resolving the listener (if it's a service).
     * @param string|callable $listener
     * The listener callback or the FQCN of a class implementing __invoke.
     * @param Priority $priority The priority of the listener.
     * @throws InvalidArgumentException
     * If the listener is neither callable nor a class with __invoke method.
     */
    public function __construct(
        private ContainerInterface $container,
        string|callable $listener,
        private Priority $priority,
    ) {
        if (!is_callable($listener) && !method_exists($listener, "__invoke")) {
            throw new InvalidArgumentException(
                "Listener must be a callable or a class with __invoke method"
            );
        }

        $this->listener = $listener;
    }

    /**
     * Get the priority of the listener.
     *
     * @return Priority The priority of the listener.
     */
    public function getPriority(): Priority
    {
        return $this->priority;
    }

    /**
     * Get the resolved listener callback.
     *
     * @return callable The resolved listener callback.
     */
    public function getListener(): callable
    {
        return $this->resolve();
    }

    /**
     * Resolve the listener callback if it's a service.
     *
     * @return callable The resolved listener callback.
     * @throws NotFoundExceptionInterface
     * If the listener service is not found in the container.
     * @throws ContainerExceptionInterface
     * If there is an error while retrieving the listener service from the
     * container.
     */
    private function resolve(): callable
    {
        if (!is_callable($this->listener)) {
            /** @var callable $listener */
            $listener = $this->container->get($this->listener);
            $this->listener = $listener;
        }

        return $this->listener;
    }
}
