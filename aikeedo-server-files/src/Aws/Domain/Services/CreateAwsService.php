<?php

declare(strict_types=1);

namespace Aws\Domain\Services;

use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Events\AwsCreatedEvent;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Aws\Domain\Services
 */
class CreateAwsService
{
    /**
     * @param AwsRepositoryInterface $repo
     * @param EventDispatcherInterface $dispatcher
     * @return void
     */
    public function __construct(
        private AwsRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher,
    ) {
    }

    /**
     * @param AwsEntity $aws
     * @return void
     */
    public function createAws(AwsEntity $aws)
    {
        // Add the aws to the repository
        $this->repo
            ->add($aws)
            ->flush();

        // Dispatch the aws created event
        $event = new AwsCreatedEvent($aws);
        $this->dispatcher->dispatch($event);
    }
}
