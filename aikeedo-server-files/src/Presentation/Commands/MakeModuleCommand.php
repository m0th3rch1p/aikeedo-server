<?php

declare(strict_types=1);

namespace Presentation\Commands;

use Easy\Container\Attributes\Inject;
use Nette\InvalidStateException;
use Nette\InvalidArgumentException as NetteInvalidArgumentException;
use Presentation\Commands\Generators\ModuleGenerator;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Exception\InvalidArgumentException;
use Symfony\Component\Console\Exception\LogicException;
use Symfony\Component\Console\Exception\RuntimeException;
use Symfony\Component\Console\Helper\QuestionHelper;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

#[AsCommand(name: 'app:make:module')]
class MakeModuleCommand extends Command
{
    /**
     * @param string $rootDir 
     * @return void 
     * @throws InvalidArgumentException 
     */
    public function __construct(
        #[Inject('config.dirs.root')]
        private string $rootDir,
    ) {
        parent::__construct();
    }

    /**
     * @param InputInterface $input 
     * @param OutputInterface $output 
     * @return int 
     * @throws LogicException 
     * @throws InvalidArgumentException 
     * @throws RuntimeException 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    public function execute(
        InputInterface $input,
        OutputInterface $output
    ): int {
        $moduleName = $this->askModuleName($input, $output);

        $generator = new ModuleGenerator($this->rootDir);
        $generator->generate($moduleName);

        return Command::SUCCESS;
    }

    private function askModuleName(
        InputInterface $input,
        OutputInterface $output
    ): string {
        /** @var QuestionHelper $helper */
        $helper = $this->getHelper('question');

        $question = new Question('<info>Name of the Module</info>:' . PHP_EOL . '> ');
        $question->setNormalizer(function (string $value): string {
            return $value ? ucfirst(strtolower(trim($value))) : '';
        });

        $moduleName = null;
        while (!$moduleName) {
            $moduleName = $helper->ask($input, $output, $question);

            if (!$moduleName) {
                $output->writeln('<error>Module name is required</error>');
                $moduleName = null;
                continue;
            }

            if (file_exists($this->rootDir . '/src/' . $moduleName)) {
                $output->writeln('<error>Module already exists</error>');
                $moduleName = null;
                continue;
            }
        }

        return $moduleName;
    }
}
