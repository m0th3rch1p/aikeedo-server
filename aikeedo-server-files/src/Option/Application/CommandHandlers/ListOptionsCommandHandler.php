<?php

declare(strict_types=1);

namespace Option\Application\CommandHandlers;

use Option\Application\Commands\ListOptionsCommand;
use Option\Domain\Entities\OptionEntity;
use Option\Domain\Repositories\OptionRepositoryInterface;
use Traversable;

/**
 * @package Option\Application\CommandHandlers
 */
class ListOptionsCommandHandler
{
    /**
     * @param OptionRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private OptionRepositoryInterface $repo
    ) {
    }

    /**
     * @param ListOptionsCommand $cmd
     * @return Traversable<OptionEntity>
     */
    public function handle(ListOptionsCommand $cmd): Traversable
    {
        $options = $this->repo;
        return $options;
    }
}
