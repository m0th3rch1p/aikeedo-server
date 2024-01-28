<?php

declare(strict_types=1);

namespace Shared\Infrastructure;

/** @package Shared\Infrastructure */
interface BootstrapperInterface
{
    /**
     * Method must be invoked after registration
     * of all ServiceProviderInterface implementations.
     * @return void
     * */
    public function bootstrap(): void;
}
