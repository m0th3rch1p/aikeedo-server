<?php

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\CreateAwsUsageCommand;
use Aws\Domain\Entities\AwsUsageEntity;
use Aws\Domain\Services\CreateAwsUsageService;
use Shared\Infrastructure\CommandBus\Dispatcher;

class CreateAwsUsageCommandHandler
{
    private string $tag;
    public function __construct(private Dispatcher $dispatcher, private CreateAwsUsageService $service)
    {

    }

    public function handle (CreateAwsUsageCommand $cmd): void
    {
        switch ($cmd->usage->type) {
            case 0:
                $this->tag = "token";
                break;
            case 1:
                $this->tag = "image";
                break;
            case 2:
                $this->tag = "audio";
                break;
        }

        $customer_id = $cmd->user->getAws()->getCustomerId();
        $plan = $cmd->user->getActiveSubscription()->getPlan();
        $allocatedAudio = $plan->getAudioCredit()->value;
        $allocatedImages = $plan->getImageCredit()->value;
        $allocatedToken = $plan->getTokenCredit()->value;
        $dimension = $cmd->user->getActiveSubscription()->getPlan()->getTitle()->value;
        $quantity = $cmd->usage->value;
        $this->service->add(new AwsUsageEntity($customer_id, $dimension, $allocatedAudio, $allocatedToken, $allocatedImages, $this->tag, $quantity));
    }
}