<?php

declare(strict_types=1);

namespace Option\Application\CommandHandlers;

use Option\Application\Commands\ReadOptionCommand;
use Option\Domain\Entities\OptionEntity;
use Option\Domain\Exceptions\OptionNotFoundException;
use Option\Domain\Services\ReadOptionService;

/**
 * @package Option\Application\CommandHandlers
 */
class ReadOptionCommandHandler
{
    /**
     * @param ReadOptionService $service
     * @return void
     */
    public function __construct(
        private ReadOptionService $service,
    ) {
    }

    /**
     * @param ReadOptionCommand $cmd
     * @return OptionEntity
     * @throws OptionNotFoundException
     */
    public function handle(ReadOptionCommand $cmd): OptionEntity
    {
        return $this->service->findOptionOrFail($cmd->id);
    }
}
