<?php

declare(strict_types=1);

namespace Shared\Infrastructure\CommandBus;

use Psr\Container\ContainerInterface;
use ReflectionObject;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/**
 * Dispatcher class for command and query handlers.
 *
 * Dispatches a command or query to its appropriate handler.
 *
 * @package Shared\Infrastructure\CommandBus
 */
class Dispatcher
{
    /**
     * Constructor method for the Dispatcher class.
     *
     * @param ContainerInterface $container
     * The container used to manage dependencies.
     * @return void
     */
    public function __construct(
        private ContainerInterface $container
    ) {
    }

    /**
     * Method that dispatches a command or query to its appropriate handler.
     *
     * @param object $cmd The command or query to be handled.
     * @return mixed The result of the command/query execution.
     * @throws NoHandlerFoundException If no appropriate handler is found.
     */
    public function dispatch(object $cmd): mixed
    {
        $handler = $this->getHandler($cmd);
        return $handler->handle($cmd);
    }

    /**
     * Method that retrieves the handler for a given command/query object.
     *
     * @param object $cmd The command or query to retrieve a handler for.
     * @return object The handler for the given command/query.
     * @throws NoHandlerFoundException If no appropriate handler is found.
     */
    private function getHandler(object $cmd): object
    {
        $reflection = new ReflectionObject($cmd);

        while ($reflection) {
            $attributes = $reflection->getAttributes(Handler::class);

            foreach ($attributes as $attribute) {
                $ins = $attribute->newInstance();
                $className = $ins->className;

                // Retrieves the handler for the given command/query
                // from the container.
                return $this->container->get($className);
            }

            $reflection = $reflection->getParentClass();
        }

        throw new NoHandlerFoundException($cmd);
    }
}
