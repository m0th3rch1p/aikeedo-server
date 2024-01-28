<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Options;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use InvalidArgumentException;
use Option\Application\Commands\SaveOptionCommand;
use Presentation\Exceptions\UnprocessableEntityException;
use Presentation\Response\EmptyResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Presentation\RequestHandlers\Admin\Api\Options */
#[Route(path: '/elevenlabs', method: RequestMethod::POST)]
class SaveElevenLabsOptionsRequestHandler extends OptionsApi implements
    RequestHandlerInterface
{
    /**
     * @param ClientInterface $client 
     * @param RequestFactoryInterface $requestFactory 
     * @param Validator $validator 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private ClientInterface $client,
        private RequestFactoryInterface $requestFactory,
        private Validator $validator,
        private Dispatcher $dispatcher,
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws ValidationException 
     * @throws InvalidArgumentException 
     * @throws ClientExceptionInterface 
     * @throws UnprocessableEntityException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $payload = $this->validateRequest($request);

        foreach ($payload as $key => $value) {
            $cmd = new SaveOptionCommand(
                $key,
                is_string($value) ? trim($value) : json_encode($value)
            );

            $this->dispatcher->dispatch($cmd);
        }


        return new EmptyResponse();
    }

    /**
     * @param ServerRequestInterface $req 
     * @return array{api_secret_key:string} 
     * @throws ValidationException 
     * @throws InvalidArgumentException 
     * @throws ClientExceptionInterface 
     * @throws UnprocessableEntityException 
     */
    private function validateRequest(ServerRequestInterface $req): array
    {
        $payload = json_decode(json_encode($req->getParsedBody()), true);

        $this->validator->validate(
            $payload,
            [
                'elevenlabs.api_key' => 'required|string'
            ]
        );

        $this->validateOpenApiKey($payload['elevenlabs']['api_key']);

        return $payload;
    }

    /**
     * @param string $key 
     * @return bool 
     * @throws InvalidArgumentException 
     * @throws ClientExceptionInterface 
     * @throws UnprocessableEntityException 
     */
    private function validateOpenApiKey(string $key): bool
    {
        $req = $this->requestFactory
            ->createRequest('GET', 'https://api.elevenlabs.io/v1/models')
            ->withHeader('Xi-Api-Key', $key);

        $resp = $this->client->sendRequest($req);
        if ($resp->getStatusCode() === 401) {
            throw new UnprocessableEntityException(
                'ElevenLabs API key is invalid',
                'option.elevenlabs.api_secret_key'
            );
        }

        return true;
    }
}
