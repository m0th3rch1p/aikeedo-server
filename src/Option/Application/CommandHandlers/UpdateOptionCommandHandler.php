<?php

declare(strict_types=1);

namespace Option\Application\CommandHandlers;

use Option\Application\Commands\UpdateOptionCommand;
use Option\Domain\Entities\OptionEntity;
use Option\Domain\Exceptions\OptionNotFoundException;
use Option\Domain\Services\UpdateOptionService;

/**
 * @package Option\Application\CommandHandlers
 */
class UpdateOptionCommandHandler
{
    /**
     * @param UpdateOptionService $service
     * @return void
     */
    public function __construct(
        private UpdateOptionService $service,
    ) {
    }

    /**
     * @param UpdateOptionCommand $cmd 
     * @return OptionEntity 
     * @throws OptionNotFoundException 
     */
    public function handle(UpdateOptionCommand $cmd): OptionEntity
    {
        $option = $this->service->findOptionOrFail($cmd->id);

        if ($cmd->value) {
            $option->setValue($cmd->value);
        }

        $this->service->updateOption($option);
        return $option;
    }
}
