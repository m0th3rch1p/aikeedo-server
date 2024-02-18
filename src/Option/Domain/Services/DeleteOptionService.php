<?php

declare(strict_types=1);

namespace Option\Domain\Services;

use Option\Domain\Entities\OptionEntity;
use Option\Domain\Events\OptionDeletedEvent;
use Option\Domain\Repositories\OptionRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Option\Domain\Services
 */
class DeleteOptionService extends ReadOptionService
{
    /**
     * @param OptionRepositoryInterface $repo
     * @param EventDispatcherInterface $dispatcher
     * @return void
     */
    public function __construct(
        private OptionRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher,
    ) {
        parent::__construct($repo);
    }

    /**
     * @param OptionEntity $option
     * @return void
     */
    public function deleteOption(OptionEntity $option)
    {
        // Delete the option from the repository
        $this->repo
            ->remove($option)
            ->flush();

        // Dispatch the option deleted event
        $event = new OptionDeletedEvent($option);
        $this->dispatcher->dispatch($event);
    }
}
