<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Voices;

use Ai\Domain\Services\AiServiceFactoryInterface;
use Ai\Domain\Services\TextToSpeechServiceInterface;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\RequestHandlers\Api\Api;
use Presentation\Resources\Api\VoiceResource;
use Presentation\Resources\ListResource;
use Presentation\Response\JsonResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;

#[Route(path: '/voices', method: RequestMethod::GET)]
class ListVoicesRequestHandler extends Api implements RequestHandlerInterface
{
    public function __construct(
        private AiServiceFactoryInterface $factory
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $res = new ListResource();

        foreach ($this->factory->list(TextToSpeechServiceInterface::class) as $service) {
            foreach ($service->getVoiceList() as $voice) {
                $res->pushData(new VoiceResource($voice));
            }
        }

        return new JsonResponse($res);
    }
}
