<?php

declare(strict_types=1);

namespace Presentation\Middlewares;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RequestBodyParserMiddleware implements MiddlewareInterface
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $contentType = strtolower($request->getHeaderLine('Content-Type'));

        if ($contentType == 'application/json') {
            $json = $request->getBody()->getContents();

            if ($json !== '') {
                $parsedBody = json_decode($json);
                return $handler->handle($request->withParsedBody($parsedBody));
            }
        }

        $parsedBody = $request->getParsedBody();
        if (is_array($parsedBody)) {
            $request = $request->withParsedBody(
                json_decode(json_encode($parsedBody))
            );
        }

        return $handler->handle($request);
    }
}
