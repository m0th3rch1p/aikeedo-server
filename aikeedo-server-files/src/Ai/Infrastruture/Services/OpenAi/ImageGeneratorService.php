<?php

declare(strict_types=1);

namespace Ai\Infrastruture\Services\OpenAi;

use Ai\Domain\Exceptions\ApiException;
use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\Images\ImageGeneratorServiceInterface;
use Ai\Domain\Images\TextToImageRequest;
use Ai\Domain\ValueObjects\Image;
use OpenAI\Client;
use Throwable;

class ImageGeneratorService implements ImageGeneratorServiceInterface
{
    private array $models = [
        'dall-e-3',
        'dall-e-2'
    ];

    /**
     * @param Client $client 
     * @return void 
     */
    public function __construct(
        private Client $client
    ) {
    }

    /** @inheritDoc */
    public function supportsModel(string $model): bool
    {
        return in_array($model, $this->models);
    }

    public function generateImage(TextToImageRequest $req): Image
    {
        $this->sanitizeRequest($req);

        $data = [
            'model' => $req->model,
            'prompt' => $req->prompt,
            'response_format' => 'b64_json'
        ];

        if ($req->width && $req->height) {
            $data['size'] = $req->width . 'x' . $req->height;
        }

        try {
            $resp = $this->client->images()->create($data);
        } catch (Throwable $th) {
            throw new ApiException(
                $th->getMessage(),
                $th->getCode(),
                $th
            );
        }

        foreach ($resp->data as $item) {
            return new Image(
                $item->b64_json
            );
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
    }
}
