<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Aws\Application\Commands\CreateAwsUsageCommand;
use Billing\Application\Commands\UseCreditCommand;
use Exception;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Repositories\UserRepositoryInterface;

/** @package Billing\Application\CommandHandlers */
class UseCreditCommandHandler
{
    /**
     * @param UserRepositoryInterface $repo 
     * @return void 
     */
    public function __construct(
        private Dispatcher $dispatcher,
        private UserRepositoryInterface $repo
    ) {
    }

    /**
     * @param UseCreditCommand $cmd 
     * @return void 
     * @throws Exception 
     */
    public function handle(UseCreditCommand $cmd)
    {
        $user = $cmd->user;

        foreach ($cmd->usages as $usage) {
            $user->useCredit($usage);

            $awsUsageCmd = new CreateAwsUsageCommand($user, $usage);
            $this->dispatcher->dispatch($awsUsageCmd);
        }


        $this->repo->flush();
    }
}
