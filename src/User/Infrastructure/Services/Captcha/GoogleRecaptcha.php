<?php

declare(strict_types=1);

namespace User\Infrastructure\Services\Captcha;

use Easy\Container\Attributes\Inject;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;

class GoogleRecaptcha
{
    private const BASE_URL = 'https://www.google.com/recaptcha/api/siteverify';

    public function __construct(
        private ClientInterface $client,
        private RequestFactoryInterface $factory,

        #[Inject('option.recaptcha.secret_key')]
        private ?string $secretKey = null,
    ) {
    }

    public function verifyToken(string $token): void
    {
        $request = $this->factory->createRequest(
            'POST',
            self::BASE_URL,
        );

        $body = $request->getBody();
        $body->write(
            http_build_query([
                'secret' => $this->secretKey,
                'response' => $token,
            ])
        );

        $request = $request
            ->withHeader(
                'Content-Type',
                'application/x-www-form-urlencoded'
            )->withBody($body);

        $response = $this->client->sendRequest($request);

        if ($response->getStatusCode() !== 200) {
            throw new VerificationFailedException();
        }

        $body = json_decode($response->getBody()->getContents());

        if (!$body->success) {
            throw new VerificationFailedException();
        }
    }
}
