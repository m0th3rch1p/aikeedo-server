<?php

declare(strict_types=1);

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\ListAwssCommand;
use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Exceptions\AwsNotFoundException;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Aws\Domain\Services\ReadAwsService;
use Shared\Domain\ValueObjects\CursorDirection;
use Traversable;

/**
 * @package Aws\Application\CommandHandlers
 */
class ListAwssCommandHandler
{
    /**
     * @param AwsRepositoryInterface $repo
     * @param ReadAwsService $service
     * @return void
     */
    public function __construct(
        private AwsRepositoryInterface $repo,
        private ReadAwsService $service,
    ) {
    }

    /**
     * @param ListAwssCommand $cmd
     * @return Traversable<AwsEntity>
     * @throws AwsNotFoundException
     */
    public function handle(ListAwssCommand $cmd): Traversable
    {
        $cursor = $cmd->cursor
            ? $this->service->findAwsOrFail($cmd->cursor)
            : null;

        $awss = $this->repo
            ->sort($cmd->sortDirection, $cmd->sortParameter);

        if ($cmd->maxResults) {
            $awss = $awss->setMaxResults($cmd->maxResults);
        }

        if ($cursor) {
            if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {
                return $awss = $awss->endingBefore($cursor);
            }

            return $awss->startingAfter($cursor);
        }

        return $awss;
    }
}
