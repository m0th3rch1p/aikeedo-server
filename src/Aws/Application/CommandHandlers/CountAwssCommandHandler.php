<?php

declare(strict_types=1);

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\CountAwssCommand;
use Aws\Domain\Repositories\AwsRepositoryInterface;

/**
 * @package Aws\Application\CommandHandlers
 */
class CountAwssCommandHandler
{
    /**
     * @param AwsRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private AwsRepositoryInterface $repo,
    ) {
    }

    /**
     * @param CountAwssCommand $cmd
     * @return int
     */
    public function handle(CountAwssCommand $cmd): int
    {
        $awss = $this->repo;

        return $awss->count();
    }
}
