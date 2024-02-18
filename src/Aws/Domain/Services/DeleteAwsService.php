<?php

declare(strict_types=1);

namespace Aws\Domain\Services;

use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Events\AwsDeletedEvent;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Aws\Domain\Services
 */
class DeleteAwsService extends ReadAwsService
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
    public function deleteAws(AwsEntity $aws)
    {
        // Delete the aws from the repository
        $this->repo
            ->remove($aws)
            ->flush();

        // Dispatch the aws deleted event
        $event = new AwsDeletedEvent($aws);
        $this->dispatcher->dispatch($event);
    }
}
