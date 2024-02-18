<?php

declare(strict_types=1);

namespace Option\Domain\Services;

use Option\Domain\Entities\OptionEntity;
use Option\Domain\Exceptions\OptionNotFoundException;
use Option\Domain\Repositories\OptionRepositoryInterface;
use Shared\Domain\ValueObjects\Id;

/**
 * @package Option\Domain\Services
 */
class ReadOptionService
{
    /**
     * @param OptionRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private OptionRepositoryInterface $repo,
    ) {
    }

    /**
     * @param Id $id
     * @return OptionEntity
     * @throws OptionNotFoundException
     */
    public function findOptionOrFail(Id $id)
    {
        $option = $this->repo->ofId($id);
        if (null === $option) {
            throw new OptionNotFoundException($id);
        }

        return $option;
    }
}
