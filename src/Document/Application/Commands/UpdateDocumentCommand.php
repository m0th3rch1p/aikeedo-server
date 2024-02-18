<?php

declare(strict_types=1);

namespace Document\Application\Commands;

use Document\Application\CommandHandlers\UpdateDocumentCommandHandler;
use Document\Domain\ValueObjects\Content;
use Document\Domain\ValueObjects\Title;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Application\Commands
 */
#[Handler(UpdateDocumentCommandHandler::class)]
class UpdateDocumentCommand
{
    public Id $id;
    public Id|UserEntity $user;

    public ?Title $title = null;
    public ?Content $content = null;

    /**
     * @param string|Id|UserEntity $user 
     * @param string|Id $id 
     * @return void 
     */
    public function __construct(
        string|Id|UserEntity $user,
        string|Id $id,
    ) {
        $this->id = is_string($id) ? new Id($id) : $id;
        $this->user = is_string($user) ? new Id($user) : $user;
    }

    /**
     * @param null|string $title 
     * @return void 
     */
    public function setTitle(?string $title): void
    {
        $this->title = new Title($title);
    }

    /**
     * @param null|string $content 
     * @return void 
     */
    public function setContent(?string $content): void
    {
        $this->content = new Content($content);
    }
}
