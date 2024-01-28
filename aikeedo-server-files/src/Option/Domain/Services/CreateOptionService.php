<?php

declare(strict_types=1);

namespace Option\Domain\Services;

use Option\Domain\Entities\OptionEntity;
use Option\Domain\Events\OptionCreatedEvent;
use Option\Domain\Exceptions\KeyTakenException;
use Option\Domain\Repositories\OptionRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Option\Domain\Services
 */
class CreateOptionService
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
     * @throws KeyTakenException
     */
    public function createOption(OptionEntity $option)
    {
        // Check if the key is already taken
        if ($this->repo->ofKey($option->getKey())) {
            // Throw an exception if the key is already taken
            throw new KeyTakenException($option->getKey());
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
