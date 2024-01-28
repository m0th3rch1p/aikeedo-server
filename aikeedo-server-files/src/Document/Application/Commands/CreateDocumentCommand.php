<?php

declare(strict_types=1);

namespace Document\Application\Commands;

use Document\Application\CommandHandlers\CreateDocumentCommandHandler;
use Document\Domain\ValueObjects\Content;
use Document\Domain\ValueObjects\Title;
use Preset\Domain\Entities\PresetEntity;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Application\Commands
 */
#[Handler(CreateDocumentCommandHandler::class)]
class CreateDocumentCommand
{
    public Id|UserEntity $user;
    public Title $title;
    public null|Id|PresetEntity $preset = null;
    public ?Content $content = null;

    public function __construct(
        string|Id|UserEntity $user,
        string|Title $title
    ) {
        $this->user = is_string($user) ? new Id($user) : $user;
        $this->title = is_string($title) ? new Title($title) : $title;
    }

    /**
     * @param null|string $content 
     * @return void 
     */
    public function setContent(?string $content): void
    {
        $this->content = new Content($content);
    }

    /**
     * @param Id|PresetEntity $preset 
     * @return void 
     */
    public function setPreset(string|Id|PresetEntity $preset): void
    {
        $this->preset = is_string($preset) ? new Id($preset) : $preset;
    }
}
