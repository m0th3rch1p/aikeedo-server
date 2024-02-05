<?php

namespace Aws\Domain\Repositories;

interface SnsServiceInterface
{
    public function getArnTopic () : string;
    public function getUrl (): string;

    public function getProtocol (): string;
}