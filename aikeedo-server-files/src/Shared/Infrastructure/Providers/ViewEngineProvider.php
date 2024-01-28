<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Providers;

use Application;
use Easy\Container\Attributes\Inject;
use Shared\Infrastructure\ServiceProviderInterface;
use Shared\Infrastructure\I18n\Twig\GetTextExtension;
use Twig\Environment;
use Twig\Extra\Intl\IntlExtension;
use Twig\Extra\Markdown\DefaultMarkdown;
use Twig\Extra\Markdown\MarkdownExtension;
use Twig\Extra\Markdown\MarkdownRuntime;
use Twig\Loader\FilesystemLoader;
use Twig\RuntimeLoader\RuntimeLoaderInterface;

/** @package Shared\Infrastructure\Providers */
class ViewEngineProvider implements ServiceProviderInterface
{
    /**
     * @param string $viewsDir 
     * @param string $cacheDir 
     * @param bool $enableDebugging 
     * @return void 
     */
    public function __construct(
        #[Inject('config.dirs.root')]
        private string $rootDir,
        #[Inject('config.dirs.views')]
        private string $viewsDir,
        #[Inject('config.dirs.cache')]
        private string $cacheDir,
        #[Inject('config.dirs.themes')]
        private string $themesDir,
        #[Inject('config.enable_debugging')]
        private bool $enableDebugging = false,
        #[Inject('config.enable_caching')]
        private bool $enableCaching = false,
    ) {
    }

    /** @inheritDoc */
    public function register(Application $app): void
    {
        $loader = new FilesystemLoader($this->viewsDir);
        $loader->addPath($this->viewsDir);
        $loader->addPath($this->themesDir . '/default', 'theme');
        $loader->addPath($this->rootDir . '/resources/emails', 'emails');

        $twig = new Environment($loader, [
            // Disable caching in debug mode.
            'cache' => !$this->enableDebugging && $this->enableCaching ? $this->cacheDir : false,

            // Enable debugging in debug mode.
            'debug' => $this->enableDebugging,

            // Enable strict variables in debug mode.
            'strict_variables' => $this->enableDebugging,
        ]);

        $twig->addExtension(new IntlExtension());
        $twig->addExtension(new MarkdownExtension());
        $twig->addExtension(new GetTextExtension());

        $twig->addRuntimeLoader(new class implements RuntimeLoaderInterface
        {
            public function load($class)
            {
                if (MarkdownRuntime::class === $class) {
                    return new MarkdownRuntime(new DefaultMarkdown());
                }
            }
        });

        $app
            ->set(Environment::class, $twig)
            ->set(FilesystemLoader::class, $loader);
    }
}
