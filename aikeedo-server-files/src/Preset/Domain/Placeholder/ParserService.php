<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

/** @package Preset\Domain\Placeholder */
class ParserService
{
    /**
     * @param PlaceholderFactory $factory 
     * @return void 
     */
    public function __construct(
        private PlaceholderFactory $factory
    ) {
    }

    /**
     * @param string $template 
     * @return PlaceholderInterface[]
     */
    public function parse(string $template): array
    {
        $placeholders = [];

        if (!$template) {
            return $placeholders;
        }

        $pattern = '/{\s*([^}]+)\s*}/';
        preg_match_all($pattern, $template, $matches);

        foreach ($matches[1] as $match) {
            $plch = $this->getPlaceholder($match);

            if ($plch) {
                $placeholders[] = $plch;
            }
        }

        // Remove duplicates
        $found = [];
        $placeholders = array_filter(
            $placeholders,
            function ($plch) use (&$found) {
                if (in_array($plch->name, $found)) {
                    return false;
                }

                $found[] = $plch->name;
                return true;
            }
        );

        return $placeholders;
    }

    /**
     * @param string $template 
     * @param array $params 
     * @return string 
     */
    public function fillTemplate(string $template, array $params = []): string
    {
        $pattern = '/{\s*([^}]+)\s*}/';
        preg_replace_callback($pattern, function ($matches) use (&$template, $params) {
            $plch = $this->getPlaceholder($matches[1]);

            if ($plch) {
                $value = $params[$plch->name] ?? null;

                if ($value) {
                    $template = str_replace($matches[0], $value, $template);
                }
            }
        }, $template);

        return $template;
    }

    /**
     * @param string $plch 
     * @return null|PlaceholderInterface 
     */
    private function getPlaceholder(string $plch): ?PlaceholderInterface
    {
        $parts = explode('|', $plch);

        array_walk($parts, fn (&$part) => $part = trim($part));
        array_filter($parts);

        if (count($parts) < 1) {
            return null;
        }

        $name = array_shift($parts);

        $filters = [];
        foreach ($parts as $part) {
            $part = explode(':', $part, 2);
            array_walk($part, fn (&$p) => $p = trim($p));

            $filters[$part[0]] = $part[1] ?? true;
        }

        return $this->factory->create($name, $filters);
    }
}
