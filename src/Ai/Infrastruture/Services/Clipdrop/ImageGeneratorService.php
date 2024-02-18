<?php

declare(strict_types=1);

namespace Ai\Infrastruture\Services\Clipdrop;

use Ai\Domain\Exceptions\ApiException;
use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\Images\ImageGeneratorServiceInterface;
use Ai\Domain\Images\TextToImageRequest;
use Ai\Domain\ValueObjects\Image;
use Easy\Container\Attributes\Inject;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Ramsey\Uuid\Nonstandard\Uuid;

class ImageGeneratorService implements ImageGeneratorServiceInterface
{
    private const BASE_URL = "https://clipdrop-api.co";

    private array $models = [
        'clipdrop-v1', // This is an internal identifier for Clipdrop model. Currently there is not any official model name.
    ];

    public function __construct(
        private ClientInterface $client,
        private RequestFactoryInterface $factory,
        private StreamFactoryInterface $streamFactory,

        #[Inject('option.clipdrop.api_key')]
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
        $boundary = Uuid::uuid4()->toString();

        $stream = $this->streamFactory->createStream(
            "--" . $boundary . "\r\n" .
                "Content-Disposition: form-data; name=\"prompt\"" . "\r\n" .
                "\r\n" .
                $req->prompt . "\r\n" .
                "--" . $boundary . "--"
        );

        $request = $this->factory
            ->createRequest('POST', self::BASE_URL . '/text-to-image/v1')
            ->withHeader('X-Api-Key', $this->apiKey)
            ->withHeader('Content-Type', "multipart/form-data; boundary=\"{$boundary}\"")
            ->withBody($stream);

        $resp = $this->client->sendRequest($request);

        $body = $resp->getBody()->getContents();
        if ($resp->getStatusCode() !== 200) {
            $body = json_decode($body);

            throw new ApiException(
                'Failed to generate image: ' . ($body->error ?? '')
            );
        }

        return new Image(base64_encode($body));
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

        if ($req->style) {
            $prompt[] = $req->style;
        }

        if ($req->lightning) {
            $prompt[] = $req->lightning;
        }

        if ($req->mood) {
            $prompt[] = $req->mood;
        }

        $req->prompt = implode(", ", $prompt);
        $req->prompt = mb_substr($req->prompt, 0, 1000);
    }
}
