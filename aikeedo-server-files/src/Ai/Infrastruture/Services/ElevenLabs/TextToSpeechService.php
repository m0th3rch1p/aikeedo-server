<?php

declare(strict_types=1);

namespace Ai\Infrastruture\Services\ElevenLabs;

use Ai\Domain\Entities\VoiceEntity;
use Ai\Domain\Services\TextToSpeechServiceInterface;
use Ai\Domain\ValueObjects\Accent;
use Ai\Domain\ValueObjects\Age;
use Ai\Domain\ValueObjects\ExternalId;
use Ai\Domain\ValueObjects\Gender;
use Ai\Domain\ValueObjects\Model;
use Ai\Domain\ValueObjects\Url;
use Ai\Domain\ValueObjects\UseCase;
use Ai\Domain\ValueObjects\VoiceName;
use Ai\Domain\ValueObjects\VoiceTone;
use Billing\Domain\ValueObjects\Usage;
use Billing\Domain\ValueObjects\UsageType;
use Easy\Container\Attributes\Inject;
use Generator;
use Gioni06\Gpt3Tokenizer\Gpt3Tokenizer;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\StreamInterface;
use Psr\Http\Message\UriFactoryInterface;
use Traversable;

class TextToSpeechService implements TextToSpeechServiceInterface
{
    private const BASE_URL = "https://api.elevenlabs.io/v1";

    private array $models = [
        'eleven_multilingual_v2',
        'eleven_multilingual_v1',
        'eleven_monolingual_v1'
    ];

    public function __construct(
        private ClientInterface $client,
        private RequestFactoryInterface $requestFactory,
        private UriFactoryInterface $uriFactory,

        #[Inject('option.elevenlabs.api_key')]
        private ?string $apiKey = null
    ) {
    }

    public function supportsModel(string $model): bool
    {
        return in_array($model, $this->models);
    }

    public function getVoiceList(): Traversable
    {
        $resp = $this->sendRequest('GET', '/voices');
        $content = json_decode($resp->getBody()->getContents());

        foreach ($content->voices as $voice) {
            if (!isset($voice->preview_url) || !$voice->preview_url) {
                continue;
            }

            $entity = new VoiceEntity(
                new Model($voice->high_quality_base_model_ids[0] ?? $this->models[0]),
                new ExternalId($voice->voice_id),
                new VoiceName($voice->name),
                new Url($voice->preview_url)
            );

            if (isset($voice->labels->gender)) {
                $entity->setGender(Gender::tryFrom($voice->labels->gender) ?? Gender::UNKNOWN);
            }

            if (isset($voice->labels->accent)) {
                $entity->setAccent(Accent::tryFrom($voice->labels->accent) ?? Accent::UNKNOWN);
            }

            if (isset($voice->labels->age)) {
                match ($voice->labels->age) {
                    'young' => $entity->setAge(Age::YOUNG),
                    'middle aged' => $entity->setAge(Age::MIDDLE_AGED),
                    'old' => $entity->setAge(Age::OLD),
                    default => $entity->setAge(Age::UNKNOWN)
                };
            }

            if (isset($voice->labels->description)) {
                $entity->setTone(new VoiceTone($voice->labels->description));
            }

            if (isset($voice->labels->{"use case"})) {
                $entity->setUseCase(new UseCase($voice->labels->{"use case"}));
            } elseif (isset($voice->labels->use_case)) {
                $entity->setUseCase(new UseCase($voice->labels->use_case));
            }

            yield $entity;
        }
    }

    public function create(
        string $text,
        string $voiceId,
        ?string $model = null
    ): Generator {
        $model = $model ?? $this->models[0];

        $resp = $this->sendRequest(
            'POST',
            '/text-to-speech/' . $voiceId . '/stream',
            [
                'text' => $text,
                'voice_id' => $voiceId,
                'model_id' => $model
            ]
        );

        $seconds = (int) (mb_strlen($text) / 12); // 12 characters per second

        if ($seconds < 1) {
            $seconds = 1;
        }

        yield new Usage(
            UsageType::AUDIO,
            $seconds
        );

        yield from $this->getIterator($resp);
    }

    private function sendRequest(
        string $method,
        string $path,
        array $data = [],
        array $headers = []
    ): ResponseInterface {
        $req = $this->requestFactory->createRequest(
            $method,
            self::BASE_URL . $path
        )->withHeader('xi-api-key', $this->apiKey)
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Accept', 'application/json');

        if ($data) {
            $stream = $req->getBody();
            $stream->write(json_encode($data));
            $req = $req->withBody($stream);
        }

        foreach ($headers as $key => $value) {
            $req = $req->withHeader($key, $value);
        }

        return $this->client->sendRequest($req);
    }

    /**
     * {@inheritDoc}
     */
    private function getIterator(ResponseInterface $response): Generator
    {
        while (!$response->getBody()->eof()) {
            $line = $this->readLine($response->getBody());
            yield $line;
        }
    }

    /**
     * Read a line from the stream.
     */
    private function readLine(StreamInterface $stream): string
    {
        $buffer = '';

        while (!$stream->eof()) {
            if ('' === ($byte = $stream->read(1))) {
                return $buffer;
            }
            $buffer .= $byte;
            if ($byte === "\n") {
                break;
            }
        }

        return $buffer;
    }
}
