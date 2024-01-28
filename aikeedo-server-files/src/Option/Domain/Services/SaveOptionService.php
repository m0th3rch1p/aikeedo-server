<?php

declare(strict_types=1);

namespace Option\Domain\Services;

use Option\Domain\Entities\OptionEntity;
use Option\Domain\Events\OptionCreatedEvent;
use Option\Domain\Events\OptionUpdatedEvent;
use Option\Domain\Repositories\OptionRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Option\Domain\Services
 */
class SaveOptionService
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
    }

    /**
     * @param OptionEntity $option 
     * @return void 
     */
    public function saveOption(OptionEntity $option): void
    {
        // Check if the key is already taken
        $otherOption = $this->repo->ofKey($option->getKey());

        if ($otherOption) {
            $otherOption->setValue($option->getValue());

            // Call the pre update hooks
            $otherOption->preUpdate();

            // Update the option in the repository
            $this->repo->flush();

            // Dispatch the option updated event
            $event = new OptionUpdatedEvent($otherOption);
            $this->dispatcher->dispatch($event);
            return;
        }

        // Add the option to the repository
        $this->repo
            ->add($option)
            ->flush();

        // Dispatch the option created event
        $event = new OptionCreatedEvent($option);
        $this->dispatcher->dispatch($event);
    }
}
