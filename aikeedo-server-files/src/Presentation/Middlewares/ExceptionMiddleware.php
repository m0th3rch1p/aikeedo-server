<?php

declare(strict_types=1);

namespace Presentation\Middlewares;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\StatusCode;
use Presentation\Cookies\UserCookie;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\UnauthorizedException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Presentation\Response\EmptyResponse;
use Presentation\Response\JsonResponse;
use Presentation\Response\RedirectResponse;
use Presentation\Validation\ValidationException;
use Shared\Domain\Exceptions\InvalidValueException;

/** @package Shared\Presentation\Middlewares */
class ExceptionMiddleware implements MiddlewareInterface
{
    public function __construct(
        #[Inject('config.enable_debugging')]
        private bool $enableDebugging = true,
    ) {
    }

    /** @inheritDoc */
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        try {
            return $handler->handle($request);
        } catch (ValidationException $th) {
            return new JsonResponse(
                [
                    'code' => $th->getCode(),
                    'message' => $th->getMessage(),
                    'param' => $th->getParam()
                ],
                StatusCode::BAD_REQUEST
            );
        } catch (UnauthorizedException $th) {
            $path = $request->getUri()->getPath();

            if (strpos($path, '/admin/api') !== false || strpos($path, '/api') !== false) {
                return new JsonResponse(
                    [
                        'message' => $th->getMessage(),
                        'param' => $th->param
                    ],
                    $th->statusCode
                );
            }

            $resp = new RedirectResponse('/login');
            $cookie = UserCookie::createFromRequest($request);
            if ($cookie) {
                $resp = $resp->withAddedHeader(
                    'Set-Cookie',
                    $cookie->toHeaderValue(true)
                );
            }

            return $resp;
        } catch (HttpException $th) {
            return new JsonResponse(
                [
                    'message' => $th->getMessage(),
                    'param' => $th->param
                ],
                $th->statusCode
            );
        } catch (InvalidValueException $th) {
            return new JsonResponse(
                [
                    'message' => $th->getMessage()
                ],
                StatusCode::BAD_REQUEST
            );
        } catch (\Throwable $th) {
            if (!$this->enableDebugging) {
                return new EmptyResponse(StatusCode::INTERNAL_SERVER_ERROR);
            }

            throw $th;
        }
    }
}
