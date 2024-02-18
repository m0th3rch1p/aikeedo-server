<?php

declare(strict_types=1);

namespace Shared\Infrastructure\I18n\Twig;

use Gettext\Scanner\CodeScanner;
use Gettext\Scanner\FunctionsScannerInterface;
use Gettext\Scanner\ParsedFunction;
use Gettext\Translation;
use Gettext\Translations;
use Twig\Environment;

class Scanner extends CodeScanner
{
    protected $functions = [
        '__' => 'handler',
        'noop__' => 'handler',
        'n__' => 'handler',
        'p__' => 'handler',
        'd__' => 'handler',
        'dp__' => 'handler',
        'dn__' => 'handler',
        'np__' => 'handler',
        'dnp__' => 'handler'
    ];

    public function __construct(
        private Environment $twig,
        private string $baseDir = '',
        Translations ...$translations,
    ) {
        parent::__construct(...$translations);
    }

    public function getFunctionsScanner(): FunctionsScannerInterface
    {
        return new FunctionsScanner($this->twig, $this->functions, $this->baseDir);
    }

    protected function handler(ParsedFunction $function): ?Translation
    {
        $original = null;
        $plural = null;
        $domain = null;
        $context = null;

        match ($function->getName()) {
            '__' => list($original) = array_pad($function->getArguments(), 1, null),
            'n__' => list($original, $plural) = array_pad($function->getArguments(), 2, null),
            'p__' => list($context, $original) = array_pad($function->getArguments(), 2, null),
            'd__' => list($domain, $original) = array_pad($function->getArguments(), 2, null),
            'dp__' => list($domain, $context, $original) = array_pad($function->getArguments(), 3, null),
            'dn__' => list($domain, $original, $plural) = array_pad($function->getArguments(), 3, null),
            'np__' => list($context, $original, $plural) = array_pad($function->getArguments(), 3, null),
            'dnp__' => list($domain, $context, $original, $plural) = array_pad($function->getArguments(), 4, null),
            default => null,
        };

        return $original ? $this->addComments(
            $function,
            $this->saveTranslation($domain, $context, $original, $plural)
        ) : null;
    }
}
