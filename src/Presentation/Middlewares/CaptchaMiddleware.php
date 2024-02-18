<?php

namespace Presentation\Middlewares;

use Easy\Container\Attributes\Inject;
use Presentation\Validation\ValidationException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Infrastructure\Services\Captcha\GoogleRecaptcha;
use User\Infrastructure\Services\Captcha\VerificationFailedException;

class CaptchaMiddleware implements MiddlewareInterface
{
    public function __construct(
        private GoogleRecaptcha $captcha,

        #[Inject('option.recaptcha.is_enabled')]
        private bool $captchaEnabled = false,
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        if (!$this->captchaEnabled) {
            return $handler->handle($request);
        }

        $params = $request->getParsedBody();
        $param = 'captcha-token';
        $token = $params->$param ?? null;

        if (!$token) {
            throw new ValidationException(
                'Missing captcha token in request body',
                $param
            );
        }

        if (!is_string($token)) {
            throw new ValidationException(
                'Captcha token must be a string',
                $param
            );
        }

        try {
            $this->captcha->verifyToken($token);
        } catch (VerificationFailedException $th) {
            throw new ValidationException(
                'Captcha verification failed',
                $param
            );
        }

        return $handler->handle($request);
    }
}
