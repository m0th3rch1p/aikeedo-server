<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Ai;

use Ai\Domain\Services\AiServiceFactoryInterface;
use Ai\Domain\Services\TextGeneratorServiceInterface;
use Billing\Application\Commands\UseCreditCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Gioni06\Gpt3Tokenizer\Gpt3Tokenizer;
use Presentation\EventStream\Streamer;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\NotFoundException;
use Presentation\Http\Message\CallbackStream;
use Presentation\Response\Response;
use Preset\Application\Commands\ReadPresetCommand;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Preset\Domain\Placeholder\ParserService;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Entities\UserEntity;

#[Route(path: '/text-generator/[uuid:id]?', method: RequestMethod::GET)]
class TextGeneratorRequestHandler extends AiServicesApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher,
        private ParserService $parser,
        private AiServiceFactoryInterface $factory,
        private Streamer $streamer,
        private Gpt3Tokenizer $tokenizer
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $prompt = $this->getPrompt($request);
        } catch (PresetNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        $resp = (new Response())
            ->withHeader('Content-Type', 'text/event-stream')
            ->withHeader('Cache-Control', 'no-cache');

        $software = $request->getServerParams()['SERVER_SOFTWARE'] ?? '';
        if (strpos(strtolower($software), 'nginx') !== false) {
            // Disable buffering for nginx servers to allow for streaming
            // This is required for the event stream to work
            $resp = $resp->withHeader('X-Accel-Buffering', 'no');
        }

        $stream = new CallbackStream(
            $this->callback(...),
            $request,
            $prompt
        );

        return $resp->withBody($stream);
    }

    private function callback(ServerRequestInterface $request, string $prompt)
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        if (
            $user->getTokenCredit()->value != null
            && $user->getTokenCredit()->value <= $this->tokenizer->count($prompt)
        ) {
            $this->streamer->sendEvent(
                'error',
                'insufficient_credit'
            );

            $this->streamer->close();
            return;
        }

        $params = $request->getQueryParams();
        $model = $params['model'] ?? null;

        $service = $this->factory->create(
            TextGeneratorServiceInterface::class,
            $model
        );

        $result = $service->generateText($prompt, $params, $model);
        $usages = $this->streamer->stream($result);

        $cmd = new UseCreditCommand($user, ...$usages);
        $this->dispatcher->dispatch($cmd);

        $this->streamer->close();
    }

    private function getPrompt(ServerRequestInterface $request): string
    {
        $id = $request->getAttribute('id');
        $params = $request->getQueryParams();

        $prompt = $params['query'] ?? '';

        if ($id) {
            $cmd = new ReadPresetCommand($id);

            /** @var PresetEntity $preset */
            $preset = $this->dispatcher->dispatch($cmd);

            $prompt = $this->parser->fillTemplate(
                $preset->getTemplate()->value,
                $params
            );
        }

        return $prompt;
    }
}
