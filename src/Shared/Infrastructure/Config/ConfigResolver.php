<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Config;

use Easy\Container\Exceptions\NotFoundException;
use Easy\Container\ResolverInterface;
use Throwable;

/** @package Shared\Infrastructure\Config */
class ConfigResolver implements ResolverInterface
{
    /**
     * @param Config $config
     * @return void
     */
    public function __construct(private Config $config)
    {
    }

    /** @inheritDoc */
    public function resolve(string $id): mixed
    {
        if (str_starts_with($id, 'config.')) {
            try {
                return $this->config->get(
                    str_replace('config.', '', $id)
                );
            } catch (Throwable $th) {
                if (!$this->canResolve($id)) {
                    throw new NotFoundException($id, 0, $th);
                }

                throw $th;
            }
        }

        throw new NotFoundException($id);
    }

    /** @inheritDoc */
    public function canResolve(string $id): bool
    {
        if (str_starts_with($id, 'config.')) {
            try {
                $id = str_replace('config.', '', $id);
                return $this->config->has($id);
            } catch (Throwable $th) {
                return false;
            }
        }

        return false;
    }
}
