<?php

declare(strict_types=1);

namespace Ai\Infrastruture\Services\OpenAi;

use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\Services\SpeechToTextServiceInterface;
use Ai\Domain\ValueObjects\Token;
use Billing\Domain\ValueObjects\Usage;
use Billing\Domain\ValueObjects\UsageType;
use Generator;
use OpenAI\Client;
use OpenAI\Exceptions\ErrorException;
use OpenAI\Exceptions\UnserializableResponse;
use OpenAI\Exceptions\TransporterException;
use Psr\Http\Message\UploadedFileInterface;

/** @package Ai\Infrastruture\Services\OpenAi */
class SpeechToTextService implements SpeechToTextServiceInterface
{
    private array $models = [
        'whisper-1'
    ];

    public function __construct(
        private Client $client,
    ) {
    }

    /** @inheritDoc */
    public function supportsModel(string $model): bool
    {
        return in_array($model, $this->models);
    }

    /**
     * @inheritDoc
     * @throws ErrorException 
     * @throws UnserializableResponse 
     * @throws TransporterException 
     */
    public function convertSpeechToText(
        UploadedFileInterface $file,
        array $params = [],
        ?string $model = null
    ): Generator {
        $model = $model ?: $this->models[0];

        if (!$this->supportsModel($model)) {
            throw new ModelNotSupportedException(
                self::class,
                $model
            );
        }

        $targetPath = sys_get_temp_dir() . '/' . $file->getClientFilename();
        $file->moveTo($targetPath);

        try {
            $resp = $this->client->audio()->transcribe([
                'file' => fopen(sys_get_temp_dir() . '/' . $file->getClientFilename(), 'r'),
                'model' => $model,
                'response_format' => 'verbose_json'
            ]);
        } catch (ErrorException $th) {
            unlink($targetPath);

            yield $th;
            return;
        }

        yield new Token($resp->text);
        yield new Usage(UsageType::AUDIO, (int) $resp->duration);
        unlink($targetPath);
    }
}
