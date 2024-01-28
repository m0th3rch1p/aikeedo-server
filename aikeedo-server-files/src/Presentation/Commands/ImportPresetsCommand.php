<?php

declare(strict_types=1);

namespace Presentation\Commands;

use Category\Application\Commands\CreateCategoryCommand;
use Category\Application\Commands\ListCategoriesCommand;
use Category\Domain\Entities\CategoryEntity;
use Preset\Application\Commands\CreatePresetCommand;
use Preset\Application\Commands\ListPresetsCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\TemplateExistsException;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Exception\InvalidArgumentException;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Yaml\Yaml;
use Traversable;

/** @package Presentation\Commands */
#[AsCommand(name: 'app:import:presets')]
class ImportPresetsCommand extends Command
{
    /** @var null|Traversable<int,CategoryEntity> $categories */
    private ?Traversable $categories = null;

    /** @var null|Traversable<int,PresetEntity> $presets */
    private ?Traversable $presets = null;

    /**
     * @param Dispatcher $dispatcher 
     * @return void 
     * @throws InvalidArgumentException 
     */
    public function __construct(
        private Dispatcher $dispatcher,
    ) {
        parent::__construct();
    }

    /**
     * @param InputInterface $input 
     * @param OutputInterface $output 
     * @return int 
     * @throws NoHandlerFoundException 
     */
    protected function execute(
        InputInterface $input,
        OutputInterface $output
    ): int {
        $output->writeln('Importing presets...');

        $presets = Yaml::parseFile('database/seeds/presets.yml');
        $presets = json_decode(json_encode($presets));

        foreach ($presets as $presetJson) {
            // Check if the category exists, if not, create it
            $category = $this->findOrCreateCategory($presetJson->category);

            $output->writeln(
                sprintf(
                    '<info>•</info> Importing preset <options=bold>%s</> into category <options=bold>%s</>',
                    $presetJson->title,
                    $category->getTitle()->value
                )
            );

            $cmd = new CreatePresetCommand(
                $presetJson->type,
                $presetJson->title
            );

            $cmd
                ->setDescription($presetJson->description)
                ->setStatus($presetJson->status)
                ->setTemplate($presetJson->template)
                ->setImage($presetJson->image)
                ->setColor($presetJson->color);

            $cmd->categoryId = $category->getId();
            $cmd->lock = true; // Built-in presets are locked

            try {
                $this->dispatcher->dispatch($cmd);
            } catch (TemplateExistsException $th) {
                $output->writeln(
                    sprintf(
                        '<comment>•</comment> Preset <options=bold>%s</> already exists',
                        $presetJson->title
                    )
                );
            }
        }

        return Command::SUCCESS;
    }

    /**
     * @param string $title 
     * @return CategoryEntity 
     * @throws NoHandlerFoundException 
     */
    private function findOrCreateCategory(string $title): CategoryEntity
    {
        if (!$this->categories) {
            /** @property null|Traversable<int,CategoryEntity> $categories */
            $this->categories = $this->dispatcher->dispatch(
                new ListCategoriesCommand()
            );
        }

        foreach ($this->categories as $category) {
            if ($category->getTitle()->value === $title) {
                return $category;
            }
        }

        $cmd = new CreateCategoryCommand($title);
        $category = $this->dispatcher->dispatch($cmd);

        return $category;
    }

    /**
     * @param string $template 
     * @return null|PresetEntity 
     * @throws NoHandlerFoundException 
     */
    private function getPreset(string $template): ?PresetEntity
    {
        if (!$this->presets) {
            /** @property null|Traversable<int,PresetEntity> $presets */
            $this->presets = $this->dispatcher->dispatch(
                new ListPresetsCommand()
            );
        }

        foreach ($this->presets as $preset) {
            if (
                $preset->isLocked()
                && $preset->getTemplate()->value === $template
            ) {
                return $preset;
            }
        }

        return null;
    }
}
