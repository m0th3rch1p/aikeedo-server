<?php

namespace Aws\Domain\Repositories;

interface SnsFactoryInterface
{
    public function register (string|SnsServiceInterface $snsService): self;
    public function makeSubscriptions (): void;
}