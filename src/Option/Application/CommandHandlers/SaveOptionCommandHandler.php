<?php

declare(strict_types=1);

namespace Option\Application\CommandHandlers;

use Option\Application\Commands\SaveOptionCommand;
use Option\Domain\Entities\OptionEntity;
use Option\Domain\Services\SaveOptionService;

/** @package Option\Application\CommandHandlers */
class SaveOptionCommandHandler
{
    /**
     * @param SaveOptionService $service 
     * @return void 
     */
    public function __construct(
        private SaveOptionService $service,
    ) {
    }

    /**
     * @param SaveOptionCommand $cmd 
     * @return OptionEntity 
     */
    public function handle(SaveOptionCommand $cmd): OptionEntity
    {
        $option = new OptionEntity(
            $cmd->key,
            $cmd->value,
        );

        $this->service->saveOption($option);
        return $option;
    }
}
