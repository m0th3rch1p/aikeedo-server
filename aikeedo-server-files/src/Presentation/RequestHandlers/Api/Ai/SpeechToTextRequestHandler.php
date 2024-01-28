<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Ai;

use Ai\Domain\Services\AiServiceFactoryInterface;
use Ai\Domain\Services\SpeechToTextServiceInterface;
use Ai\Domain\ValueObjects\Token;
use Billing\Application\Commands\UseCreditCommand;
use Billing\Domain\ValueObjects\Usage;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Laminas\Diactoros\Exception\InvalidArgumentException;
use Presentation\Exceptions\HttpException;
use Presentation\Response\JsonResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Entities\UserEntity;

/** @package Presentation\RequestHandlers\Api\Ai */
#[Route(path: '/speech-to-text', method: RequestMethod::POST)]
class SpeechToTextRequestHandler extends AiServicesApi implements
    RequestHandlerInterface
{
    /**
     * @param AiServiceFactoryInterface $factory 
     * @return void 
     */
    public function __construct(
        private AiServiceFactoryInterface $factory,
        private Dispatcher $dispatcher,
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws InvalidArgumentException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        if (
            $user->getAudioCredit()->value != null
            && $user->getAudioCredit()->value < 1
        ) {
            throw new HttpException(
                message: 'You have run out of credits. Please purchase more credits to continue using the app.',
                statusCode: StatusCode::PAYMENT_REQUIRED,
            );
        }

        $params = (array) $request->getParsedBody();
        $files = $request->getUploadedFiles();
        $model = $params['model'] ?? null;

        $service = $this->factory->create(
            SpeechToTextServiceInterface::class,
            $model
        );

        $result = $service->convertSpeechToText(
            $files['file'],
            $params,
            $model
        );

        $content = '';
        $usages = [];
        foreach ($result as $item) {
            if ($item instanceof Token) {
                $content = $item->value;
            }

            if ($item instanceof Usage) {
                $usages[] = $item;
            }
        }

        $cmd = new UseCreditCommand($user, ...$usages);
        $this->dispatcher->dispatch($cmd);

        return new JsonResponse([
            'text' => $content,
            'usages' => $usages,
        ]);
    }
}
