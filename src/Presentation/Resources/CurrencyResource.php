<?php

declare(strict_types=1);

namespace Presentation\Resources;

use Shared\Domain\ValueObjects\CurrencyCode;
use Symfony\Component\Intl\Currencies;
use Symfony\Component\Intl\Exception\MissingResourceException;

/** @package Presentation\Resources */
class CurrencyResource
{
    public string $code;
    public string $name;
    public ?string $symbol;
    public int $fraction_digits;

    /**
     * @param CurrencyCode $code 
     * @return void 
     * @throws MissingResourceException 
     */
    public function __construct(string|CurrencyCode $code)
    {
        $this->code = $code instanceof CurrencyCode ? $code->value : $code;
        $this->name = Currencies::getName($this->code);

        $symbol = Currencies::getSymbol($this->code);
        $this->symbol = $symbol === $this->code ? null : $symbol;
        $this->fraction_digits = Currencies::getFractionDigits($this->code);
    }
}
