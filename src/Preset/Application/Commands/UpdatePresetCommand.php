<?php

declare(strict_types=1);

namespace Preset\Application\Commands;

use Preset\Application\CommandHandlers\UpdatePresetCommandHandler;
use Preset\Domain\ValueObjects\Color;
use Preset\Domain\ValueObjects\Description;
use Preset\Domain\ValueObjects\Image;
use Preset\Domain\ValueObjects\Status;
use Preset\Domain\ValueObjects\Template;
use Preset\Domain\ValueObjects\Title;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Preset\Application\Commands */
#[Handler(UpdatePresetCommandHandler::class)]
class UpdatePresetCommand
{
    public Id $id;
    public ?Title $title = null;
    public ?Description $description = null;
    public ?Status $status = null;
    public ?Template $template = null;
    public ?Image $image = null;
    public ?Color $color = null;
    public ?Id $categoryId = null;
    public bool $removeCategory = false;

    /**
     * @param string $id 
     * @return void 
     */
    public function __construct(string $id)
    {
        $this->id = new Id($id);
    }

    /**
     * @param string $title 
     * @return UpdatePresetCommand 
     */
    public function setTitle(string $title): self
    {
        $this->title = new Title($title);
        return $this;
    }

    /**
     * @param null|string $description 
     * @return UpdatePresetCommand 
     */
    public function setDescription(?string $description): self
    {
        $this->description = new Description($description);
        return $this;
    }

    /**
     * @param int $status 
     * @return UpdatePresetCommand 
     */
    public function setStatus(int $status): self
    {
        $this->status = Status::from($status);
        return $this;
    }

    /**
     * @param null|string $template 
     * @return UpdatePresetCommand 
     */
    public function setTemplate(?string $template): self
    {
        $this->template = new Template($template);
        return $this;
    }

    /**
     * @param null|string $image 
     * @return UpdatePresetCommand 
     */
    public function setImage(?string $image): self
    {
        $this->image = new Image($image);
        return $this;
    }

    /**
     * @param null|string $color 
     * @return UpdatePresetCommand 
     */
    public function setColor(?string $color): self
    {
        $this->color = new Color($color);
        return $this;
    }

    /**
     * @param null|string $categoryId 
     * @return UpdatePresetCommand 
     */
    public function setCategoryId(?string $categoryId): self
    {
        if ($categoryId) {
            $this->categoryId = new Id($categoryId);
            return $this;
        }

        $this->removeCategory = true;
        return $this;
    }
}
