<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Ai;

use Ai\Domain\Services\AiServiceFactoryInterface;
use Ai\Domain\Services\TitleGeneratorServiceInterface;
use Billing\Application\Commands\UseCreditCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Gioni06\Gpt3Tokenizer\Gpt3Tokenizer;
use Presentation\EventStream\Streamer;
use Presentation\Http\Message\CallbackStream;
use Presentation\Response\Response;
use Preset\Domain\Placeholder\ParserService;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Entities\UserEntity;

#[Route(path: '/title-generator', method: RequestMethod::GET)]
class TitleGeneratorRequestHandler extends AiServicesApi implements
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
            $request
        );

        return $resp->withBody($stream);
    }

    private function callback(ServerRequestInterface $request)
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);
        $params = $request->getQueryParams();
        $prompt = $params['content'] ?? '';

        if (
            $user->getTokenCredit()->value != null
            && $user->getTokenCredit()->value <=  $this->tokenizer->count($prompt)
        ) {
            $this->streamer->sendEvent(
                'error',
                'insufficient_credit'
            );

            $this->streamer->close();
            return;
        }

        $service = $this->factory->create(
            TitleGeneratorServiceInterface::class
        );

        $result = $service->generateTitle($prompt);
        $usages = $this->streamer->stream($result);

        $cmd = new UseCreditCommand($user, ...$usages);
        $this->dispatcher->dispatch($cmd);

        $this->streamer->close();
    }
}
