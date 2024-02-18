<?php

namespace Aws\Domain\Providers;

use Aws\Application\Messages\EntitlementMessage;
use AWS\CRT\Log;
use Aws\Domain\Services\ReadAwsUsageService;
use Aws\Infrastructure\Services\MeteringService;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

#[AsSchedule('batch_records')]
class BatchMeterRecordsScheduleProvider implements ScheduleProviderInterface
{


    public function __construct(private ReadAwsUsageService $awsUsageService, private MeteringService $meteringService)
    {
    }

    public function getSchedule(): Schedule
    {
        // TODO: Implement getSchedule() method.
        return (new Schedule())->add(RecurringMessage::every('10 seconds', new EntitlementMessage()));
    }

    private function sendUsage () {
        $usages = $this->awsUsageService->fetchBatchRecords();
        $this->meteringService->batchUsageRecords($usages);
    }
}