<?php

namespace Easy\Container;

use Closure;
use Easy\Container\Attributes\Inject;
use Easy\Container\Exceptions\ContainerException;
use Easy\Container\Exceptions\NotFoundException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ReflectionClass;
use ReflectionException;
use ReflectionMethod;
use ReflectionNamedType;
use ReflectionParameter;
use Throwable;

/**
 * @package Easy\Container
 * @SuppressWarnings(PHPMD.CouplingBetweenObjects)
 */
class Bag implements ResolverInterface
{
    /**
     * Registered definitions
     * @var array<string,mixed>
     */
    private array $definitions = [];

    /**
     * Resolved shared services
     * @var array<string,mixed>
     */
    private array $resolved = [];

    /**
     * @param ContainerInterface $container
     * @return void
     */
    public function __construct(
        private ContainerInterface $container
    ) {
    }

    /**
     * @SuppressWarnings(PHPMD.ShortVariable)
     * @inheritDoc
     */
    public function resolve(string $id): mixed
    {
        try {
            if (isset($this->resolved[$id])) {
                return $this->resolved[$id];
            }

            return $this->doResolve($id);
        } catch (Throwable $th) {
            if (!$this->container->has($id)) {
                throw new NotFoundException($id, 0, $th);
            }

            throw $th;
        }
    }

    /**
     * @SuppressWarnings(PHPMD.ShortVariable)
     * @inheritDoc
     */
    public function canResolve(string $id): bool
    {
        if (
            array_key_exists($id, $this->definitions)
            || array_key_exists($id, $this->resolved)
        ) {
            return true;
        }

        try {
            $reflector = $this->getReflector($id);
        } catch (Throwable $th) {
            return false;
        }

        return $reflector->isInstantiable();
    }

    /**
     * @param string $abstract
     * @param mixed $concrete
     * @return Bag
     */
    public function set(
        string $abstract,
        mixed $concrete = null
    ): self {
        if (is_null($concrete)) {
            $concrete = $abstract;
        }

        $this->definitions[$abstract] = $concrete;
        return $this;
    }

    /**
     * @param string $abstract
     * @return mixed
     * @throws ContainerException
     */
    private function doResolve(string $abstract): mixed
    {
        $isDefined = isset($this->definitions[$abstract]);
        $entry = $abstract;

        if ($isDefined) {
            $entry = $this->definitions[$abstract];

            if (is_object($entry)) {
                return $entry;
            }

            /** @phpstan-ignore-next-line */
            if ($entry instanceof Closure) {
                return $entry($this);
            }

            if (is_callable($entry)) {
                return $entry();
            }

            if (is_string($entry) && isset($this->resolved[$entry])) {
                return $this->resolved[$entry];
            }
        }

        try {
            $reflector = $this->getReflector($entry);
            $instance = $this->getInstance($reflector);
        } catch (Throwable $th) {
            if ($isDefined) {
                return $this->definitions[$abstract];
            }

            throw new ContainerException(
                "{$abstract} is not resolvable",
                0,
                $th
            );
        }

        // Save resolved cache
        $this->resolved[$abstract] = $instance;
        return $instance;
    }

    /**
     * Get a ReflectionClass object representing the entry's class
     *
     * @param string $entry
     * @return ReflectionClass
     */
    private function getReflector(string $entry): ReflectionClass
    {
        return new ReflectionClass($entry);
    }

    /**
     * Get an instance for the entry
     *
     * @param ReflectionClass $item
     * @return object
     * @throws ContainerException
     * @throws ReflectionException
     * @throws NotFoundException
     * @throws Throwable
     */
    private function getInstance(ReflectionClass $item): object
    {
        if (!$item->isInstantiable()) {
            throw new ContainerException("{$item->name} is not instantiable");
        }

        $constructor = $item->getConstructor();

        if (is_null($constructor)) {
            return $item->newInstance();
        }

        $params = $this->getResolvedParameters($constructor);
        return $item->newInstanceArgs($params);
    }

    /**
     * Get array of the resolved params
     *
     * @internal
     * @param ReflectionMethod $method
     * @return array
     * @throws NotFoundException
     * @throws Throwable
     * @throws ReflectionException
     * @throws ContainerException
     */
    public function getResolvedParameters(ReflectionMethod $method): array
    {
        $params = [];
        foreach ($method->getParameters() as $param) {
            $params[] = $this->resolveParameter($param);
        }

        return $params;
    }

    /**
     * Resolve constructor parameter
     *
     * @param ReflectionParameter $parameter
     * @return mixed
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     * @throws ReflectionException
     * @throws ContainerException
     * @SuppressWarnings(PHPMD.CyclomaticComplexity)
     */
    private function resolveParameter(ReflectionParameter $parameter)
    {
        // Try resolving by attribute
        foreach ($parameter->getAttributes(Inject::class) as $attribute) {
            $attribute = $attribute->newInstance();

            if (
                is_string($attribute->abstract)
                && $this->container->has($attribute->abstract)
            ) {
                return $this->container->get($attribute->abstract);
            }
        }

        // Try resolving by type
        $type = $parameter->getType();

        if ($type !== null) {
            assert($type instanceof ReflectionNamedType);

            if (!$type->isBuiltin() && $this->container->has($type->getName())) {
                return $this->container->get($type->getName());
            }
        }

        // Try resolving by name
        if (array_key_exists($parameter->name, $this->definitions)) {
            return $this->container->get($parameter->name);
        }

        // Try resolving by default value
        if ($parameter->isDefaultValueAvailable()) {
            return $parameter->getDefaultValue();
        }

        // Try resolving by nullable type
        if ($parameter->allowsNull()) {
            return null;
        }

        // Give up
        throw new ContainerException(
            "Parameter \"{$type->getName()} \${$parameter->name}\" can't be instatiated and yet has no default value"
        );
    }
}
