<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\CountPlansCommandHandler;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\Status;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Plan\Application\Commands
 */
#[Handler(CountPlansCommandHandler::class)]
class CountPlansCommand
{
    public ?Status $status = null;
    public ?BillingCycle $billingCycle = null;

    /** Search terms/query */
    public ?string $query = null;

    /**
     * @param int $status 
     * @return CountPlansCommand 
     */
    public function setStatus(int $status): self
    {
        $this->status = Status::from($status);
        return $this;
    }

    /**
     * @param string $billingCycle 
     * @return CountPlansCommand 
     */
    public function setBillingCycle(string $billingCycle): self
    {
        $this->billingCycle = BillingCycle::from($billingCycle);
        return $this;
    }
}
