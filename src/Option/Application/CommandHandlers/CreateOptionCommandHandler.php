<?php

declare(strict_types=1);

namespace Option\Application\CommandHandlers;

use Option\Application\Commands\CreateOptionCommand;
use Option\Domain\Entities\OptionEntity;
use Option\Domain\Exceptions\KeyTakenException;
use Option\Domain\Services\CreateOptionService;

/**
 * @package Option\Application\CommandHandlers
 */
class CreateOptionCommandHandler
{
    /**
     * @param CreateOptionService $service
     * @return void
     */
    public function __construct(
        private CreateOptionService $service,
    ) {
    }

    /**
     * @param CreateOptionCommand $cmd 
     * @return OptionEntity 
     * @throws KeyTakenException 
     */
    public function handle(CreateOptionCommand $cmd): OptionEntity
    {
        $option = new OptionEntity(
            $cmd->key,
            $cmd->value,
        );

        $this->service->createOption($option);
        return $option;
    }
}
