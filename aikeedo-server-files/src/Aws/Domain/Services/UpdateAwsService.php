<?php

declare(strict_types=1);

namespace Aws\Domain\Services;

use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Events\AwsUpdatedEvent;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Aws\Domain\Services
 */
class UpdateAwsService extends ReadAwsService
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
        parent::__construct($repo);
    }

    /**
     * @param AwsEntity $aws
     * @return void
     */
    public function updateAws(AwsEntity $aws)
    {
        // Call the pre update hooks
        $aws->preUpdate();

        // Update the aws in the repository
        $this->repo->flush();

        // Dispatch the aws updated event
        $event = new AwsUpdatedEvent($aws);
        $this->dispatcher->dispatch($event);
    }
}
