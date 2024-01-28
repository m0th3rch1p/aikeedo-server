<?php

declare(strict_types=1);

namespace Preset\Application\Commands;

use Preset\Application\CommandHandlers\CreatePresetCommandHandler;
use Preset\Domain\ValueObjects\Color;
use Preset\Domain\ValueObjects\Description;
use Preset\Domain\ValueObjects\Image;
use Preset\Domain\ValueObjects\Status;
use Preset\Domain\ValueObjects\Template;
use Preset\Domain\ValueObjects\Title;
use Preset\Domain\ValueObjects\Type;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Preset\Application\Commands */
#[Handler(CreatePresetCommandHandler::class)]
class CreatePresetCommand
{
    public Type $type;
    public Title $title;
    public ?Status $status = null;
    public ?Description $description = null;
    public ?Template $template = null;
    public ?Image $image = null;
    public ?Color $color = null;
    public ?Id $categoryId = null;
    public ?bool $lock = null;

    /**
     * @param string $type 
     * @param string $title 
     * @return void 
     */
    public function __construct(
        string $type,
        string $title,
    ) {
        $this->type = Type::from($type);
        $this->title = new Title($title);
    }

    /**
     * @param null|string $description 
     * @return CreatePresetCommand 
     */
    public function setDescription(?string $description): self
    {
        $this->description = new Description($description);
        return $this;
    }

    /**
     * @param int $status 
     * @return CreatePresetCommand 
     */
    public function setStatus(int $status): self
    {
        $this->status = Status::from($status);
        return $this;
    }

    /**
     * @param null|string $template 
     * @return CreatePresetCommand 
     */
    public function setTemplate(?string $template): self
    {
        $this->template = new Template($template);
        return $this;
    }

    /**
     * @param null|string $image 
     * @return CreatePresetCommand 
     */
    public function setImage(?string $image): self
    {
        $this->image = new Image($image);
        return $this;
    }

    /**
     * @param null|string $color 
     * @return CreatePresetCommand 
     */
    public function setColor(?string $color): self
    {
        $this->color = new Color($color);
        return $this;
    }

    /**
     * @param null|string $categoryId 
     * @return CreatePresetCommand 
     */
    public function setCategoryId(?string $categoryId): self
    {
        $this->categoryId = new Id($categoryId);
        return $this;
    }
}
