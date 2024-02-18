<?php

namespace Presentation\Commands;

use Aws\Infrastructure\Services\EntitlementSqsService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:aws:entitlement_listen')]
class EntitlementNotificationListenerCommand extends Command
{

    public function __construct(private EntitlementSqsService $service)
    {
        parent::__construct();
    }

    public function execute(InputInterface $input, OutputInterface $output): int {
        $messages = $this->service->receiveMessages();
        $output->writeln(json_encode($messages, true));

        return \Symfony\Component\Console\Command\Command::SUCCESS;
    }
}