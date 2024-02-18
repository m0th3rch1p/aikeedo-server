<?php

declare(strict_types=1);

namespace Option\Application\CommandHandlers;

use Option\Application\Commands\CountOptionsCommand;
use Option\Domain\Repositories\OptionRepositoryInterface;

/**
 * @package Option\Application\CommandHandlers
 */
class CountOptionsCommandHandler
{
    /**
     * @param OptionRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private OptionRepositoryInterface $repo,
    ) {
    }

    /**
     * @param CountOptionsCommand $cmd
     * @return int
     */
    public function handle(CountOptionsCommand $cmd): int
    {
        $options = $this->repo;

        return $options->count();
    }
}
