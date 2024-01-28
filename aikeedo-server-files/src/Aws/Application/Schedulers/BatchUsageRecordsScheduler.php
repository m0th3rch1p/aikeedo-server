<?php

namespace Aws\Application\Schedulers;

use Aws\Application\Messages\EntitlementMessage;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

#[AsSchedule]
class BatchUsageRecordsScheduler implements ScheduleProviderInterface
{

    public function getSchedule(): Schedule
    {
        // TODO: Implement getSchedule() method.
        return (new Schedule())->add(
            RecurringMessage::every('10 seconds', new EntitlementMessage())
        );
    }
}