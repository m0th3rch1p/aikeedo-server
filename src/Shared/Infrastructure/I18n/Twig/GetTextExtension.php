<?php

declare(strict_types=1);

namespace Shared\Infrastructure\I18n\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

class GetTextExtension extends AbstractExtension
{
    private array $names = [
        '__',
        'noop__',
        'n__',
        'p__',
        'd__',
        'dp__',
        'dn__',
        'np__',
        'dnp__'
    ];

    public function getFilters()
    {
        $filters = [];

        foreach ($this->names as $name) {
            $filters[] = new TwigFilter($name, $name);
        }

        return $filters;
    }

    public function getFunctions()
    {
        $functions = [];

        foreach ($this->names as $name) {
            $functions[] = new TwigFunction($name, $name);
        }

        return $functions;
    }
}
