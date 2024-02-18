<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Payments\Gateways\PayPal;

use Easy\Container\Attributes\Inject;
use InvalidArgumentException;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\StreamFactoryInterface;

class PayPalClient
{
    private array $baseUrls = [
        'sandbox' =>  'https://api-m.sandbox.paypal.com',
        'live' => 'https://api-m.paypal.com'
    ];

    /**
     * @param ClientInterface $client 
     * @param RequestFactoryInterface $requestFactory 
     * @param StreamFactoryInterface $streamFactory 
     * @param null|string $clientId 
     * @param null|string $secret 
     * @param null|string $mode 
     * @return void 
     */
    public function __construct(
        private ClientInterface $client,
        private RequestFactoryInterface $requestFactory,
        private StreamFactoryInterface $streamFactory,

        #[Inject('option.paypal.client_id')]
        private ?string $clientId = null,

        #[Inject('option.paypal.secret_key')]
        private ?string $secret = null,

        #[Inject('option.paypal.mode')]
        private ?string $mode = 'sandbox',
    ) {
    }

    /**
     * @param string $method 
     * @param string $path 
     * @param array $body 
     * @param array $params 
     * @param array $headers 
     * @return ResponseInterface 
     * @throws InvalidArgumentException 
     * @throws ClientExceptionInterface 
     */
    public function sendRequest(
        string $method,
        string $path,
        array $body = [],
        array $params = [],
        array $headers = []
    ): ResponseInterface {
        $mode = strtolower($this->mode ?? 'sandbox');
        $baseUrl = $this->baseUrls[$mode] ?? $this->baseUrls['sandbox'];

        $req = $this->requestFactory
            ->createRequest($method, $baseUrl . $path)
            ->withHeader('Authorization', "Basic " . base64_encode($this->clientId . ":" . $this->secret))
            ->withHeader('Content-Type', 'application/json');

        if ($body) {
            $req = $req
                ->withBody($this->streamFactory->createStream(
                    json_encode($body)
                ));
        }

        if ($params) {
            $req = $req->withUri(
                $req->getUri()->withQuery(http_build_query($params))
            );
        }

        if ($headers) {
            foreach ($headers as $key => $value) {
                $req = $req->withHeader($key, $value);
            }
        }

        return $this->client->sendRequest($req);
    }
}
