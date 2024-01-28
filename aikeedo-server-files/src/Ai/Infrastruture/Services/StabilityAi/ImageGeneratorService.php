<?php

declare(strict_types=1);

namespace Ai\Infrastruture\Services\StabilityAi;

use Ai\Domain\Exceptions\ApiException;
use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\Images\ImageGeneratorServiceInterface;
use Ai\Domain\Images\TextToImageRequest;
use Ai\Domain\ValueObjects\Image;
use Easy\Container\Attributes\Inject;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\StreamFactoryInterface;

class ImageGeneratorService implements ImageGeneratorServiceInterface
{
    private const BASE_URL = "https://api.stability.ai";

    private array $models = [
        'stable-diffusion-xl-1024-v1-0',
        'stable-diffusion-v1-6',

        'stable-diffusion-xl-beta-v2-2-2',
        'stable-diffusion-512-v2-1',
    ];

    public function __construct(
        private ClientInterface $client,
        private RequestFactoryInterface $factory,
        private StreamFactoryInterface $streamFactory,

        #[Inject('version')]
        private string $version,

        #[Inject('option.stabilityai.api_key')]
        private ?string $apiKey = null
    ) {
    }

    public function supportsModel(string $model): bool
    {
        return in_array($model, $this->models);
    }

    public function generateImage(TextToImageRequest $req): Image
    {
        $this->sanitizeRequest($req);

        $data = [
            'text_prompts' => [
                [
                    'text' => $req->prompt,
                    'weight' => 1
                ]
            ]
        ];

        if ($req->width) {
            $data['width'] = $req->width;
        }

        if ($req->height) {
            $data['height'] = $req->height;
        }

        if ($req->style) {
            $data['style_preset'] = $req->style;
        }

        $stream = $this->streamFactory->createStream(json_encode($data));

        $request = $this->factory
            ->createRequest('POST', self::BASE_URL . '/v1/generation/' . $req->model . '/text-to-image')
            ->withHeader('Authorization', 'Bearer ' . $this->apiKey)
            ->withHeader('Accept', 'application/json')
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Stability-Client-ID', 'aikeedo')
            ->withHeader('Stability-Client-Versoin', $this->version)
            ->withBody($stream);

        $resp = $this->client->sendRequest($request);
        $body = json_decode($resp->getBody()->getContents());

        if ($resp->getStatusCode() !== 200) {
            throw new ApiException(
                'Failed to generate image: ' . ($body->message ?? '')
            );
        }

        foreach ($body->artifacts as $artifact) {
            return new Image($artifact->base64);
        }
    }

    private function sanitizeRequest(TextToImageRequest $req): void
    {
        if (!$req->model) {
            $req->model = $this->models[0];
        }

        if (!$this->supportsModel($req->model)) {
            throw new ModelNotSupportedException(
                self::class,
                $req->model
            );
        }

        $prompt = [$req->prompt];

        if ($req->lightning) {
            $prompt[] = $req->lightning;
        }

        if ($req->mood) {
            $prompt[] = $req->mood;
        }

        $req->prompt = implode(", ", $prompt);
    }
}
