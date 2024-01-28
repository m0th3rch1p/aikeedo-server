<?php

declare(strict_types=1);

namespace Shared\Infrastructure\I18n\Twig;

use Gettext\Scanner\FunctionsScannerInterface;
use Gettext\Scanner\ParsedFunction;
use Twig\Environment;
use Twig\Node\Expression\FunctionExpression;
use Twig\Node\ModuleNode;
use Twig\Source;

class FunctionsScanner implements FunctionsScannerInterface
{
    public function __construct(
        private Environment $twig,
        private array $functions = [],
        private ?string $baseDir = null,
    ) {
        $this->twig = $twig;
        $this->functions = $functions;
    }

    public function scan(string $code, string $filename): array
    {
        $functions = [];

        $tokens = $this->twig->parse(
            $this->twig->tokenize(new Source($code, $filename))
        );

        $this->extractGettextFunctions($tokens, $filename, $functions);

        return $functions;
    }

    private function createFunction(
        FunctionExpression $node,
        string $filename
    ): ?ParsedFunction {
        $name = $node->getAttribute('name');

        if (!isset($this->functions[$name])) {
            return null;
        }

        $line = $node->getTemplateLine();

        if ($this->baseDir && strpos($filename, $this->baseDir) === 0) {
            $filename = substr($filename, strlen($this->baseDir));
        }

        $function = new ParsedFunction($name, $filename, $line);

        foreach ($node->getNode('arguments')->getIterator() as $argument) {
            // Some *n*gettext() arguments may not be regular values but expressions.
            $arg = $argument->hasAttribute('value') ? $argument->getAttribute('value') : null;
            $function->addArgument($arg);
        }

        return $function;
    }

    /**
     * Extract twig nodes corresponding to one of the known i18n function calls.
     * @param mixed $token
     */
    private function extractGettextFunctions(
        $token,
        string $filename,
        array &$functions
    ): void {
        if ($token instanceof FunctionExpression) {
            $function = $this->createFunction($token, $filename);

            if ($function) {
                $functions[] = $function;
            }

            return;
        }

        foreach ($token->getIterator() as $subToken) {
            $this->extractGettextFunctions($subToken, $filename, $functions);
        }

        if ($token instanceof ModuleNode) {
            $embeddedTemplates = $token->getAttribute('embedded_templates');
            foreach ($embeddedTemplates as $embed) {
                $this->extractGettextFunctions($embed, $filename, $functions);
            }
        }
    }
}
