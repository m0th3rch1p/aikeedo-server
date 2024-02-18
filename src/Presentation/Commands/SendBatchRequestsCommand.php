<?php

namespace Presentation\Commands;

use Aws\Application\Commands\ReadAwsUsageCommand;
use Aws\Domain\Services\ReadAwsService;
use Aws\Domain\Services\ReadAwsUsageService;
use Aws\Infrastructure\Services\CloudWatchService;
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

    public function __construct(private ReadAwsService $awsService, private MeteringService $meteringService, private CloudWatchService $cloudWatchService)
    {
        parent::__construct();
    }

    public function execute(InputInterface $input, OutputInterface $output): int
    {
        try {
            $records = $this->awsService->fetchAll();
            $output->writeln(json_encode($records));
            $batchedRecords = [
                "ProductCode" => env("AWS_PRODUCT_CODE"),
                "UsageRecords" => []
            ];
            if (count($records) == 0) {
                //Handle Sending 0 Quantity for all
            } else {
                foreach ($records as $record) {
                    $dimension = '';
                    switch ($record['tag']) {
                        case 'audio':
                            $dimension = 'AudioToken';
                            break;
                        case 'image':
                            $dimension = 'ImageToken';
                            break;
                        case 'token':
                            $dimension = 'TextToken';
                            break;
                    }
                    $batchedRecords['UsageRecords'][] = [
                        'CustomerIdentifier' => $record['customer_id'],
                        'Dimension' => $dimension,
                        'Timestamp' => $record['createdAt'],
                        'Quantity' => $record['quantity'],
                        'UsageAllocations' => [
                            [
                                'AllocatedUsageQuantity' => $record['quantity'],
                                'Tags' => [
                                    [
                                        'Key' => $record['tag'],
                                        'Value' => 'usage tokens for '.$record['tag']
                                    ]
                                ]
                            ]
                        ]
                    ];
                }
                $batchResults = $this->meteringService->batchUsageRecords($batchedRecords);
//                $output->writeln($batchResults);
                dump("batchResults", $batchResults);
                dump((new \DateTime())->getTimestamp());
                $cloudWatchResults = $this->cloudWatchService->sendLogs($batchedRecords, (new \DateTime())->getTimestamp());
                dump("cloudWatchResults", $cloudWatchResults);
//                $output->writeln(json_encode($cloudWatchResults));
            }
            $output->writeln('Batch Records Sent Successfully');
        } catch (Exception $e) {
            $output->writeln(json_encode($e));
        }
        return Command::SUCCESS;
    }
}