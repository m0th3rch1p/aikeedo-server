<?php

declare(strict_types=1);

namespace Billing\Domain\Exceptions;

use Billing\Domain\Entities\PlanEntity;
use Exception;
use Throwable;

/** @package Billing\Domain\Exceptions */
class PlanIsLockedException extends Exception
{
    /**
     * @param PlanEntity $plan 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return void 
     */
    public function __construct(
        public readonly PlanEntity $plan,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        parent::__construct(
            sprintf(
                'The plan %s is locked for deletion and modification.',
                $plan->getTitle()->value
            ),
            $code,
            $previous
        );
    }
}
