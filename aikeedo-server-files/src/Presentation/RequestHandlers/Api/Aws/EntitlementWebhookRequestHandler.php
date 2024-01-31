<?php

namespace Presentation\RequestHandlers\Api\Aws;

use Easy\Router\Attributes\Route;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

#[Route("/entitlement/webhook")]
class EntitlementWebhookRequestHandler extends AwsApi implements  RequestHandlerInterface
{

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        dump($request);
        return new EmptyResponse();
    }
}