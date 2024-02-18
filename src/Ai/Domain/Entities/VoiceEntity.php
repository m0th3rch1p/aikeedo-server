<?php

namespace Ai\Domain\Entities;

use Ai\Domain\ValueObjects\Accent;
use Ai\Domain\ValueObjects\Age;
use Ai\Domain\ValueObjects\ExternalId;
use Ai\Domain\ValueObjects\Gender;
use Ai\Domain\ValueObjects\Model;
use Ai\Domain\ValueObjects\Url;
use Ai\Domain\ValueObjects\UseCase;
use Ai\Domain\ValueObjects\VoiceName;
use Ai\Domain\ValueObjects\VoiceTone;

class VoiceEntity
{
    private Model $model;
    private ExternalId $externalId;
    private VoiceName $name;
    private Url $sampleUrl;

    private Gender $gender;
    private Accent $accent;
    private VoiceTone $tone;
    private Age $age;
    private UseCase $useCase;

    public function __construct(
        Model $model,
        ExternalId $voiceId,
        VoiceName $name,
        Url $sampleUrl,
    ) {
        $this->model = $model;
        $this->externalId = $voiceId;
        $this->name = $name;
        $this->sampleUrl = $sampleUrl;

        $this->gender = Gender::UNKNOWN;
        $this->accent = Accent::UNKNOWN;
        $this->tone = new VoiceTone();
        $this->age = Age::UNKNOWN;
        $this->useCase = new UseCase();
    }

    public function getModel(): Model
    {
        return $this->model;
    }

    public function setModel(Model $model): void
    {
        $this->model = $model;
    }

    public function getExternalId(): ExternalId
    {
        return $this->externalId;
    }

    public function setExternalId(ExternalId $voiceId): void
    {
        $this->externalId = $voiceId;
    }

    public function getName(): VoiceName
    {
        return $this->name;
    }

    public function setName(VoiceName $name): void
    {
        $this->name = $name;
    }

    public function getSampleUrl(): Url
    {
        return $this->sampleUrl;
    }

    public function setSampleUrl(Url $sampleUrl): void
    {
        $this->sampleUrl = $sampleUrl;
    }

    public function getGender(): Gender
    {
        return $this->gender;
    }

    public function setGender(Gender $gender): void
    {
        $this->gender = $gender;
    }

    public function getAccent(): Accent
    {
        return $this->accent;
    }

    public function setAccent(Accent $accent): void
    {
        $this->accent = $accent;
    }

    public function getTone(): VoiceTone
    {
        return $this->tone;
    }

    public function setTone(VoiceTone $tone): void
    {
        $this->tone = $tone;
    }

    public function getAge(): Age
    {
        return $this->age;
    }

    public function setAge(Age $age): void
    {
        $this->age = $age;
    }

    public function getUseCase(): UseCase
    {
        return $this->useCase;
    }

    public function setUseCase(UseCase $useCase): void
    {
        $this->useCase = $useCase;
    }
}
