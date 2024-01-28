<?php

declare(strict_types=1);

namespace Presentation\Commands;

use Easy\Container\Attributes\Inject;
use Gettext\Generator\PoGenerator;
use Gettext\Loader\PoLoader;
use Gettext\Merge;
use Gettext\Translations;
use Shared\Infrastructure\I18n\Twig\Scanner;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Twig\Environment;

#[AsCommand(name: 'app:locale:extract')]
class ExtractLocaleMessagesCommand extends Command
{
    public function __construct(
        private Environment $twig,

        #[Inject('config.dirs.root')]
        private string $rootDir,

        #[Inject('config.dirs.locale')]
        private string $localeDir,

        #[Inject('config.dirs.views')]
        private string $viewsDir,
    ) {
        parent::__construct();
    }

    protected function execute(
        InputInterface $input,
        OutputInterface $output
    ): int {
        //Create a new scanner, adding a translation for each domain:
        $scanner = new Scanner(
            $this->twig,
            $this->rootDir,
            Translations::create('messages')
        );

        //Set a default domain, so any translations with no domain specified, 
        // will be added to that domain
        $scanner->setDefaultDomain('messages');
        $scanner->addReferences(true);

        //Scan files
        foreach ($this->glob($this->viewsDir . '/*/*.twig') as $file) {
            $scanner->scanFile($file);
        }

        // Get possible languages
        $languages = array_map(
            fn ($dir) => basename($dir),
            glob($this->localeDir . '/*', GLOB_ONLYDIR)
        );

        //Save the translations in .po files
        $generator = new PoGenerator();
        $loader = new PoLoader();

        foreach ($scanner->getTranslations() as $domain => $translations) {
            foreach ($languages as $language) {
                if (!file_exists("{$this->localeDir}/{$language}/LC_MESSAGES")) {
                    mkdir("{$this->localeDir}/{$language}/LC_MESSAGES", 0777, true);
                }

                if (file_exists("{$this->localeDir}/{$language}/LC_MESSAGES/{$domain}.po")) {
                    $finalTranslations = $translations->mergeWith(
                        $loader->loadFile("{$this->localeDir}/{$language}/LC_MESSAGES/{$domain}.po"),
                        Merge::SCAN_AND_LOAD
                    );
                } else {
                    $finalTranslations = clone $translations;
                }

                $generator->generateFile(
                    $finalTranslations,
                    "{$this->localeDir}/{$language}/LC_MESSAGES/{$domain}.po"
                );
            }
        }

        return Command::SUCCESS;
    }

    private function glob($pattern, $flags = 0)
    {
        $files = glob($pattern, $flags);

        foreach (glob(dirname($pattern) . '/*', GLOB_ONLYDIR | GLOB_NOSORT) as $dir) {
            $files = array_merge($files, $this->glob($dir . '/' . basename($pattern), $flags));
        }

        return $files;
    }
}
