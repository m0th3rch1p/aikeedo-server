<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Ai;

use Ai\Domain\Services\AiServiceFactoryInterface;
use Ai\Domain\Services\TextToSpeechServiceInterface;
use Billing\Application\Commands\UseCreditCommand;
use Billing\Domain\ValueObjects\Usage;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Presentation\Http\Message\CallbackStream;
use Presentation\Middlewares\DemoEnvironmentMiddleware;
use Presentation\Response\Response;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Entities\UserEntity;

#[Middleware(DemoEnvironmentMiddleware::class)]
#[Route(path: '/text-to-speech', method: RequestMethod::POST)]
class TextToSpeechRequestHandler extends AiServicesApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher,
        private AiServiceFactoryInterface $factory,
    ) {
    }

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

        $resp = (new Response())
            ->withHeader('Content-Type', 'audio/mpeg')
            ->withHeader('Cache-Control', 'no-cache');

        $stream = new CallbackStream(
            $this->callback(...),
            $request
        );

        return $resp->withBody($stream);
    }

    private function callback(ServerRequestInterface $request)
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $params = $request->getParsedBody();
        $model = $params->model;

        $service = $this->factory->create(
            TextToSpeechServiceInterface::class,
            $model
        );

        $resp = $service->create(
            $params->prompt,
            $params->id,
            $model
        );

        $usage = [];
        foreach ($resp as $item) {
            if ($item instanceof Usage) {
                $usage[] = $item;
                continue;
            }

            echo $item;
        }

        $cmd = new UseCreditCommand($user, ...$usage);
        $this->dispatcher->dispatch($cmd);
    }
}
