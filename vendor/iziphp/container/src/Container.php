<?php

declare(strict_types=1);

namespace Easy\Container;

use Easy\Container\Exceptions\ContainerException;
use Easy\Container\Exceptions\NotFoundException;
use Psr\Container\ContainerInterface;
use ReflectionClass;
use Throwable;
use ReflectionException;

/** @package Easy\Container */
class Container implements ContainerInterface
{
    /** @var array<ResolverInterface> $resolvers */
    private array $resolvers = [];

    private Bag $bag;

    /** @return void  */
    public function __construct()
    {
        $this->bag = new Bag($this);

        $this
            ->set(ContainerInterface::class, $this)
            ->set(Container::class, $this);

        $this->pushResolver($this->bag);
    }

    /**
     * @param ResolverInterface $resolver
     * @return Container
     */
    public function pushResolver(ResolverInterface $resolver): self
    {
        $this->resolvers[] = $resolver;
        return $this;
    }

    /**
     * @SuppressWarnings(PHPMD.ShortVariable)
     * @inheritDoc
     */
    public function get(string $id)
    {
        foreach ($this->resolvers as $resolver) {
            if ($resolver->canResolve($id)) {
                return $resolver->resolve($id);
            }
        }

        throw new NotFoundException($id);
    }

    /**
     * @SuppressWarnings(PHPMD.ShortVariable)
     * @inheritDoc
     */
    public function has(string $id): bool
    {
        foreach ($this->resolvers as $resolver) {
            if ($resolver->canResolve($id)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param string $abstract
     * @param mixed $concrete
     * @return Container
     */
    public function set(
        string $abstract,
        mixed $concrete = null
    ): self {
        $this->bag->set($abstract, $concrete);
        return $this;
    }

    /**
     * @param string|object $instance
     * @param string $methodName
     * @return mixed
     * @throws NotFoundException
     * @throws ContainerException
     * @throws Throwable
     * @throws ReflectionException
     */
    public function callMethod(
        string|object $instance,
        string $methodName
    ): mixed {
        if (is_string($instance)) {
            $instance = $this->get($instance);
        }

        $reflector = new ReflectionClass($instance);

        try {
            $method = $reflector->getMethod($methodName);
        } catch (Throwable $th) {
            throw new ContainerException(sprintf(
                "%s does not exists on",
                get_class($instance) . '::' . $methodName . '()'
            ), 0, $th);
        }

        $params = $this->bag->getResolvedParameters($method);
        return $method->invokeArgs($instance, $params);
    }
}
