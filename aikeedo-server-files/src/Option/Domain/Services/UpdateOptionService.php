<?php

declare(strict_types=1);

namespace Option\Domain\Services;

use Option\Domain\Entities\OptionEntity;
use Option\Domain\Events\OptionUpdatedEvent;
use Option\Domain\Repositories\OptionRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Option\Domain\Services
 */
class UpdateOptionService extends ReadOptionService
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
    public function updateOption(OptionEntity $option)
    {
        // Call the pre update hooks
        $option->preUpdate();

        // Update the option in the repository
        $this->repo->flush();

        // Dispatch the option updated event
        $event = new OptionUpdatedEvent($option);
        $this->dispatcher->dispatch($event);
    }
}
