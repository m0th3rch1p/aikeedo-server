<?php

namespace Presentation\Commands;

use Aws\Application\Commands\ReadAwsUsageCommand;
use Aws\Domain\Services\ReadAwsUsageService;
use Aws\Infrastructure\Services\MeteringService;
use Couchbase\Meter;
use PHPUnit\Exception;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:aws:batch')]
class SendBatchRequestsCommand extends Command {

    public function __construct(private ReadAwsUsageService $awsUsageService, private MeteringService $meteringService)
    {
        parent::__construct();
    }

    public function execute(InputInterface $input, OutputInterface $output): int
    {
        try {
            $records = $this->awsUsageService->fetchBatchRecords();
            $output->writeln(json_encode($records));

//            if (count($records)) {
//                //Handle Sending 0 Quantity for all
//            } else {
//                $this->meteringService->batchUsageRecords($records);
//            }
//            $output->writeln('Batch Records Sent Successfully');
        } catch (Exception $e) {
            $output->writeln($e->getTraceAsString());
        }
        return Command::SUCCESS;
    }
}