<?php

declare(strict_types=1);

namespace Option\Application\CommandHandlers;

use Option\Application\Commands\DeleteOptionCommand;
use Option\Domain\Exceptions\OptionNotFoundException;
use Option\Domain\Services\DeleteOptionService;

/**
 * @package Option\Application\CommandHandlers
 */
class DeleteOptionCommandHandler
{
    /**
     * @param DeleteOptionService $service
     * @return void
     */
    public function __construct(
        private DeleteOptionService $service,
    ) {
    }

    /**
     * @param DeleteOptionCommand $cmd
     * @return void
     * @throws OptionNotFoundException
     */
    public function handle(DeleteOptionCommand $cmd): void
    {
        $option = $this->service->findOptionOrFail($cmd->id);
        $this->service->deleteOption($option);
    }
}
