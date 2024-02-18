<?php

declare(strict_types=1);

namespace Presentation\Resources\Api;

use Category\Domain\Entities\CategoryEntity;
use JsonSerializable;
use Presentation\Resources\DateTimeResource;

/** @package Presentation\App\Api\Resources */
class CategoryResource implements JsonSerializable
{
    /**
     * @param CategoryEntity $category 
     * @return void 
     */
    public function __construct(
        private CategoryEntity $category
    ) {
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        $category = $this->category;

        return [
            'id' => $category->getId(),
            'title' => $category->getTitle(),
            'created_at' => new DateTimeResource($category->getCreatedAt()),
            'updated_at' => new DateTimeResource($category->getUpdatedAt()),
        ];
    }
}
