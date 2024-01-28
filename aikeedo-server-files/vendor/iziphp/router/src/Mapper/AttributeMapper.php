<?php

namespace Easy\Router\Mapper;

use Easy\Http\Message\RequestMethod; # Used in doctype.
use Generator;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Path;
use Easy\Router\Attributes\Route;
use Easy\Router\Map;
use Easy\Router\MapperInterface;
use PhpParser\Error;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\Namespace_;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\ParserFactory;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Cache\InvalidArgumentException;
use Psr\Http\Server\MiddlewareInterface; # Used in doctype.
use Psr\Http\Server\RequestHandlerInterface; # Used in doctype.
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use ReflectionClass;
use SplFileInfo;
use Traversable;

/** @package Easy\Router\Mapper */
class AttributeMapper implements MapperInterface
{
    /** @var array<string> $paths */
    private array $paths = [];
    private bool $isCachingEnabled = false;

    /**
     * @param null|CacheItemPoolInterface $cache If NULL, then caching is disabled.
     * @return void
     */
    public function __construct(
        private ?CacheItemPoolInterface $cache = null
    ) {
    }

    /**
     * @param string $path
     * @return AttributeMapper
     */
    public function addPath(string $path): self
    {
        $this->paths[] = $path;
        return $this;
    }

    /** @inheritDoc */
    public function getIterator(): Traversable
    {
        yield from $this->getMaps();
    }

    /** @return void */
    public function enableCaching(): void
    {
        $this->isCachingEnabled = true;
    }

    /** @return void */
    public function disableCaching(): void
    {
        $this->isCachingEnabled = false;
    }

    /**
     * @return Generator<int,Map,mixed,void>
     * @throws InvalidArgumentException
     */
    private function getMaps(): Generator
    {
        foreach ($this->getMapScheme() as $scheme) {
            $map = new Map();
            $map->method = $scheme['method'];
            $map->handler = $scheme['handler'];
            $map->priority = $scheme['priority'];

            $prefixes = $scheme['prefixes'];
            $prefixes[] = $scheme['path'];

            $path = preg_replace('/\/+/', '/', implode('/', $prefixes));
            $path = trim($path ?: '', '/');
            $path = '/' . $path;

            $map->path = $path;

            foreach ($scheme['middlewares'] as $middleware) {
                $map->middlewares->append($middleware);
            }

            yield $map;
        }
    }

    /**
     * @return array<array{
     *  'path':string,
     *  'method':RequestMethod,
     *  'middlewares':array<class-string<MiddlewareInterface>>,
     *  'prefixes':array<string>,
     *  'handler':class-string<RequestHandlerInterface>,
     *  'priority':int
     * }>
     * @throws InvalidArgumentException
     */
    private function getMapScheme(): array
    {
        $item = null;

        if ($this->cache && $this->isCachingEnabled) {
            $item = $this->cache->getItem('routes');

            if ($item->isHit()) {
                /**
                 * @var array<array{
                 *  'path':string,
                 *  'method':RequestMethod,
                 *  'middlewares':array<class-string<MiddlewareInterface>>,
                 *  'prefixes':array<string>,
                 *  'handler':class-string<RequestHandlerInterface>,
                 *  'priority':int
                 * }> $map
                 */
                $map = $item->get();
                return $map;
            }
        }

        $files = $this->getFileList();
        $map = [];

        $parser = (new ParserFactory)->createForNewestSupportedVersion();
        $traverser = new NodeTraverser();
        $traverser->addVisitor(new NameResolver());

        foreach ($files as $filename) {
            $code = file_get_contents($filename);

            try {
                $stmts = $parser->parse($code);
            } catch (Error $e) {
                continue;
            }

            // Traverse the nodes to resolve names
            $stmts = $traverser->traverse($stmts);

            // Iterate over statements to find class nodes
            foreach ($stmts as $stmt) {
                if ($stmt instanceof Class_) {
                    $className = $stmt->namespacedName->toString();

                    $reflection = new ReflectionClass($className);
                    $this->parse($reflection, $map);
                } elseif ($stmt instanceof Namespace_) {
                    foreach ($stmt->stmts as $namespaceStatement) {
                        if ($namespaceStatement instanceof Class_) {
                            $className = $namespaceStatement->namespacedName->toString();

                            $reflection = new ReflectionClass($className);
                            $this->parse($reflection, $map);
                        }
                    }
                }
            }
        }

        if ($item) {
            $item->set($map);
            $this->cache->save($item);
        }

        return $map;
    }

    /**
     * Iterate over the paths and require once all PHP files. Including all
     * files will ensure that all classes are loaded and the attributes are
     * available.
     *
     * @return array<string>
     */
    private function getFileList(): array
    {
        $files = [];

        foreach ($this->paths as $path) {
            $directory = new RecursiveDirectoryIterator($path);
            $iterator = new RecursiveIteratorIterator($directory);

            /** @var SplFileInfo $info */
            foreach ($iterator as $info) {
                if (!$info->isFile()) {
                    continue;
                }

                $files[] = $info->getRealPath();
            }
        }

        return $files;
    }

    /**
     * @param ReflectionClass<object> $reflection
     * @param array<array{
     *  'path':string,
     *  'method':RequestMethod,
     *  'middlewares':array<class-string<MiddlewareInterface>>,
     *  'prefixes':array<string>,
     *  'handler':class-string<RequestHandlerInterface>,
     *  'priority':int
     * }> $map
     * @return void
     */
    private function parse(ReflectionClass $reflection, array &$map = []): void
    {
        $attributes = $reflection
            ->getAttributes(Route::class);

        foreach ($attributes as $attribute) {
            /** @var Route $ins */
            $ins = $attribute->newInstance();

            $middlewares = [];
            $prefixes = [];

            foreach ($reflection->getAttributes(Middleware::class) as $attr) {
                $middlewares[] = $attr->newInstance()->middleware;
            }

            foreach ($reflection->getAttributes(Path::class) as $attr) {
                $prefixes[] = $attr->newInstance()->prefix;
            }

            $parent = $reflection->getParentClass();
            while ($parent) {
                $parentMiddlewares = [];
                foreach ($parent->getAttributes(Middleware::class) as $attr) {
                    $parentMiddlewares[] = $attr->newInstance()->middleware;
                }

                $middlewares = array_merge($parentMiddlewares, $middlewares);

                $parentPrefixes = [];
                foreach ($parent->getAttributes(Path::class) as $attr) {
                    $parentPrefixes[] = $attr->newInstance()->prefix;
                }

                $prefixes = array_merge($parentPrefixes, $prefixes);

                $parent = $parent->getParentClass();
            }

            $map[] = [
                'path' => $ins->path,
                'method' => $ins->method,
                'middlewares' => $middlewares,
                'prefixes' => $prefixes,
                'handler' => $reflection->getName(),
                'priority' => $ins->priority,
            ];
        }
    }
}
