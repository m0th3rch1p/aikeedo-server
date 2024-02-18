<?php

declare(strict_types=1);

namespace Presentation\Commands\Generators;

use Application;
use DateTime;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping as ORM;
use Easy\Container\Attributes\Inject;
use Exception;
use InvalidArgumentException;
use Iterator;
use Nette\InvalidArgumentException as NetteInvalidArgumentException;
use Nette\InvalidStateException;
use Nette\PhpGenerator\ClassType;
use Nette\PhpGenerator\Literal;
use Nette\PhpGenerator\Method;
use Nette\PhpGenerator\PhpFile;
use Nette\PhpGenerator\PhpNamespace;
use Nette\PhpGenerator\Property;
use Nette\PhpGenerator\PsrPrinter;
use Psr\EventDispatcher\EventDispatcherInterface;
use RuntimeException;
use Shared\Domain\Repositories\RepositoryInterface;
use Shared\Domain\ValueObjects\CursorDirection;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\MaxResults;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Infrastructure\BootstrapperInterface;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;
use Throwable;
use Traversable;

/** @package Presentation\Commands\Generators */
class ModuleGenerator
{
    /**
     * @param string $rootDir 
     * @return void 
     */
    public function __construct(
        #[Inject('config.dirs.root')]
        private string $rootDir,
    ) {
    }

    /**
     * @param string $moduleName 
     * @return void 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    public function generate(string $moduleName): void
    {
        // Generate application layer
        $this->generateCountCommandHandler($moduleName)
            ->generateCreateCommandHandler($moduleName)
            ->generateDeleteCommandHandler($moduleName)
            ->generateListCommandHandler($moduleName)
            ->generateReadCommandHandler($moduleName)
            ->generateUpdateCommandHandler($moduleName)

            ->generateCountCommand($moduleName)
            ->generateCreateCommand($moduleName)
            ->generateDeleteCommand($moduleName)
            ->generateListCommand($moduleName)
            ->generateReadCommand($moduleName)
            ->generateUpdateCommand($moduleName);

        // Generate domain layer
        $this->generateEntity($moduleName)
            ->generateEvents($moduleName)
            ->generateExceptions($moduleName)
            ->generateRepositoryInterface($moduleName)
            ->generateCreateServices($moduleName)
            ->generateReadService($moduleName)
            ->generateUpdateService($moduleName)
            ->generateDeleteService($moduleName)
            ->generateSortParameter($moduleName);

        // Generate infrastructure layer
        $this->generateRepository($moduleName)
            ->generateModuleBootstrapper($moduleName);
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateCountCommandHandler(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\CommandHandlers');

        $namespace
            ->addUse($moduleName . '\Application\Commands\Count' . $moduleName . 'sCommand')
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface');

        $class = $namespace
            ->addClass('Count' . $moduleName . 'sCommandHandler')
            ->addComment('@package ' . $moduleName . '\Application\CommandHandlers');

        $class->addMethod('__construct')
            ->addComment('@param ' . $moduleName . 'RepositoryInterface $repo')
            ->addComment('@return void')
            ->setVisibility('public')
            ->addPromotedParameter('repo')
            ->setType($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->setVisibility('private');

        $method = $class->addMethod('handle')
            ->addComment('@param Count' . $moduleName . 'sCommand $cmd')
            ->addComment('@return int')
            ->setVisibility('public')
            ->setReturnType('int');

        $method->addParameter('cmd')
            ->setType($moduleName . '\Application\Commands\Count' . $moduleName . 'sCommand');

        $method->addBody('$' . lcfirst($moduleName) . 's = $this->repo;')
            ->addBody('')
            ->addBody('return $' . lcfirst($moduleName) . 's->count();');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/CommandHandlers/Count' . $moduleName . 'sCommandHandler.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateCreateCommandHandler(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\CommandHandlers');

        $namespace
            ->addUse($moduleName . '\Application\Commands\Create' . $moduleName . 'Command')
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Services\Create' . $moduleName . 'Service');

        $class = $namespace
            ->addClass('Create' . $moduleName . 'CommandHandler')
            ->addComment('@package ' . $moduleName . '\Application\CommandHandlers');

        $class->addMethod('__construct')
            ->addComment('@param Create' . $moduleName . 'Service $service')
            ->addComment('@return void')
            ->setVisibility('public')
            ->addPromotedParameter('service')
            ->setType($moduleName . '\Domain\Services\Create' . $moduleName . 'Service')
            ->setVisibility('private');

        $method = $class->addMethod('handle')
            ->addComment('@param Create' . $moduleName . 'Command $cmd')
            ->addComment('@return ' . $moduleName . 'Entity')
            ->setVisibility('public')
            ->setReturnType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addParameter('cmd')
            ->setType($moduleName . '\Application\Commands\Create' . $moduleName . 'Command');

        $method->addBody('$' . lcfirst($moduleName) . ' = new ' . $moduleName . 'Entity();')
            ->addBody('')
            ->addBody('$this->service->create' . $moduleName . '($' . lcfirst($moduleName) . ');')
            ->addBody('return $' . lcfirst($moduleName) . ';');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/CommandHandlers/Create' . $moduleName . 'CommandHandler.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateDeleteCommandHandler(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\CommandHandlers');

        $namespace
            ->addUse($moduleName . '\Application\Commands\Delete' . $moduleName . 'Command')
            ->addUse($moduleName . '\Domain\Exceptions\\' . $moduleName . 'NotFoundException')
            ->addUse($moduleName . '\Domain\Services\Delete' . $moduleName . 'Service');

        $class = $namespace
            ->addClass('Delete' . $moduleName . 'CommandHandler')
            ->addComment('@package ' . $moduleName . '\Application\CommandHandlers');

        $class->addMethod('__construct')
            ->addComment('@param Delete' . $moduleName . 'Service $service')
            ->addComment('@return void')
            ->setVisibility('public')
            ->addPromotedParameter('service')
            ->setType($moduleName . '\Domain\Services\Delete' . $moduleName . 'Service')
            ->setVisibility('private');

        $method = $class->addMethod('handle')
            ->addComment('@param Delete' . $moduleName . 'Command $cmd')
            ->addComment('@return void')
            ->addComment('@throws ' . $moduleName . 'NotFoundException')
            ->setVisibility('public')
            ->setReturnType('void');

        $method->addParameter('cmd')
            ->setType($moduleName . '\Application\Commands\Delete' . $moduleName . 'Command');

        $method->addBody('$' . lcfirst($moduleName) . ' = $this->service->find' . $moduleName . 'OrFail($cmd->id);')
            ->addBody('$this->service->delete' . $moduleName . '($' . lcfirst($moduleName) . ');');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/CommandHandlers/Delete' . $moduleName . 'CommandHandler.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateListCommandHandler(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\CommandHandlers');

        $namespace
            ->addUse($moduleName . '\Application\Commands\List' . $moduleName . 'sCommand')
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Exceptions\\' . $moduleName . 'NotFoundException')
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->addUse($moduleName . '\Domain\Services\Read' . $moduleName . 'Service')
            ->addUse(CursorDirection::class)
            ->addUse(Traversable::class);

        $class = $namespace
            ->addClass('List' . $moduleName . 'sCommandHandler')
            ->addComment('@package ' . $moduleName . '\Application\CommandHandlers');

        $construct = $class->addMethod('__construct')
            ->addComment('@param ' . $moduleName . 'RepositoryInterface $repo')
            ->addComment('@param Read' . $moduleName . 'Service $service')
            ->addComment('@return void')
            ->setVisibility('public');

        $construct->addPromotedParameter('repo')
            ->setType($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->setVisibility('private');

        $construct->addPromotedParameter('service')
            ->setType($moduleName . '\Domain\Services\Read' . $moduleName . 'Service')
            ->setVisibility('private');

        $method = $class->addMethod('handle')
            ->addComment('@param List' . $moduleName . 'sCommand $cmd')
            ->addComment('@return Traversable<' . $moduleName . 'Entity>')
            ->addComment('@throws ' . $moduleName . 'NotFoundException')
            ->setVisibility('public')
            ->setReturnType('Traversable');

        $method->addParameter('cmd')
            ->setType($moduleName . '\Application\Commands\List' . $moduleName . 'sCommand');

        $method->addBody('$cursor = $cmd->cursor')
            ->addBody('    ? $this->service->find' . $moduleName . 'OrFail($cmd->cursor)')
            ->addBody('    : null;')
            ->addBody('')
            ->addBody('$' . lcfirst($moduleName) . 's = $this->repo')
            ->addBody('    ->sort($cmd->sortDirection, $cmd->sortParameter);')
            ->addBody('')
            ->addBody('if ($cmd->maxResults) {')
            ->addBody('    $' . lcfirst($moduleName) . 's = $' . lcfirst($moduleName) . 's->setMaxResults($cmd->maxResults);')
            ->addBody('}')
            ->addBody('')
            ->addBody('if ($cursor) {')
            ->addBody('    if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {')
            ->addBody('        return $' . lcfirst($moduleName) . 's = $' . lcfirst($moduleName) . 's->endingBefore($cursor);')
            ->addBody('    }')
            ->addBody('')
            ->addBody('    return $' . lcfirst($moduleName) . 's->startingAfter($cursor);')
            ->addBody('}')
            ->addBody('')
            ->addBody('return $' . lcfirst($moduleName) . 's;');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/CommandHandlers/List' . $moduleName . 'sCommandHandler.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateReadCommandHandler(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\CommandHandlers');

        $namespace
            ->addUse($moduleName . '\Application\Commands\Read' . $moduleName . 'Command')
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Exceptions\\' . $moduleName . 'NotFoundException')
            ->addUse($moduleName . '\Domain\Services\Read' . $moduleName . 'Service');

        $class = $namespace
            ->addClass('Read' . $moduleName . 'CommandHandler')
            ->addComment('@package ' . $moduleName . '\Application\CommandHandlers');

        $class->addMethod('__construct')
            ->addComment('@param Read' . $moduleName . 'Service $service')
            ->addComment('@return void')
            ->setVisibility('public')
            ->addPromotedParameter('service')
            ->setType($moduleName . '\Domain\Services\Read' . $moduleName . 'Service')
            ->setVisibility('private');

        $method = $class->addMethod('handle')
            ->addComment('@param Read' . $moduleName . 'Command $cmd')
            ->addComment('@return ' . $moduleName . 'Entity')
            ->addComment('@throws ' . $moduleName . 'NotFoundException')
            ->setVisibility('public')
            ->setReturnType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addParameter('cmd')
            ->setType($moduleName . '\Application\Commands\Read' . $moduleName . 'Command');

        $method->addBody('return $this->service->find' . $moduleName . 'OrFail($cmd->id);');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/CommandHandlers/Read' . $moduleName . 'CommandHandler.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateUpdateCommandHandler(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\CommandHandlers');

        $namespace
            ->addUse($moduleName . '\Application\Commands\Update' . $moduleName . 'Command')
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Exceptions\\' . $moduleName . 'NotFoundException')
            ->addUse($moduleName . '\Domain\Services\Update' . $moduleName . 'Service');

        $class = $namespace
            ->addClass('Update' . $moduleName . 'CommandHandler')
            ->addComment('@package ' . $moduleName . '\Application\CommandHandlers');

        $class->addMethod('__construct')
            ->addComment('@param Update' . $moduleName . 'Service $service')
            ->addComment('@return void')
            ->setVisibility('public')
            ->addPromotedParameter('service')
            ->setType($moduleName . '\Domain\Services\Update' . $moduleName . 'Service')
            ->setVisibility('private');

        $method = $class->addMethod('handle')
            ->addComment('@param Update' . $moduleName . 'Command $cmd')
            ->addComment('@return ' . $moduleName . 'Entity')
            ->addComment('@throws ' . $moduleName . 'NotFoundException')
            ->setVisibility('public')
            ->setReturnType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addParameter('cmd')
            ->setType($moduleName . '\Application\Commands\Update' . $moduleName . 'Command');

        $method->addBody('$' . lcfirst($moduleName) . ' = $this->service->find' . $moduleName . 'OrFail($cmd->id);')
            ->addBody('$this->service->update' . $moduleName . '($' . lcfirst($moduleName) . ');')
            ->addBody('return $' . lcfirst($moduleName) . ';');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/CommandHandlers/Update' . $moduleName . 'CommandHandler.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateCountCommand(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\Commands');

        $namespace
            ->addUse($moduleName . '\Application\CommandHandlers\Count' . $moduleName . 'sCommandHandler')
            ->addUse(Handler::class);

        $namespace
            ->addClass('Count' . $moduleName . 'sCommand')
            ->addComment('@package ' . $moduleName . '\Application\Commands')
            ->addAttribute(Handler::class, [
                new Literal('Count' . $moduleName . 'sCommandHandler::class')
            ]);

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/Commands/Count' . $moduleName . 'sCommand.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateCreateCommand(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\Commands');

        $namespace
            ->addUse($moduleName . '\Application\CommandHandlers\Create' . $moduleName . 'CommandHandler')
            ->addUse(Handler::class);

        $namespace
            ->addClass('Create' . $moduleName . 'Command')
            ->addComment('@package ' . $moduleName . '\Application\Commands')
            ->addAttribute(Handler::class, [
                new Literal('Create' . $moduleName . 'CommandHandler::class')
            ]);

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/Commands/Create' . $moduleName . 'Command.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateDeleteCommand(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\Commands');

        $namespace
            ->addUse($moduleName . '\Application\CommandHandlers\Delete' . $moduleName . 'CommandHandler')
            ->addUse(Handler::class)
            ->addUse(Id::class);

        $class = $namespace
            ->addClass('Delete' . $moduleName . 'Command')
            ->addComment('@package ' . $moduleName . '\Application\Commands')
            ->addAttribute(Handler::class, [
                new Literal('Delete' . $moduleName . 'CommandHandler::class')
            ]);

        $class->addProperty('id')
            ->setVisibility('public')
            ->setType(Id::class);

        $method = $class->addMethod('__construct')
            ->addComment('@param string $id')
            ->addComment('@return void')
            ->addBody('$this->id = new Id($id);')
            ->setVisibility('public');

        $method->addParameter('id')
            ->setType('string');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/Commands/Delete' . $moduleName . 'Command.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateListCommand(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\Commands');

        $namespace
            ->addUse($moduleName . '\Application\CommandHandlers\List' . $moduleName . 'sCommandHandler')
            ->addUse($moduleName . '\Domain\ValueObjects\SortParameter')
            ->addUse(CursorDirection::class)
            ->addUse(Id::class)
            ->addUse(MaxResults::class)
            ->addUse(SortDirection::class)
            ->addUse(Handler::class);

        $class = $namespace
            ->addClass('List' . $moduleName . 'sCommand')
            ->addComment('@package ' . $moduleName . '\Application\Commands')
            ->addAttribute(Handler::class, [
                new Literal('List' . $moduleName . 'sCommandHandler::class')
            ])
            ->setExtends($moduleName . '\Application\Commands\Count' . $moduleName . 'sCommand');

        $class->addProperty('sortParameter')
            ->setVisibility('public')
            ->setType($moduleName . '\Domain\ValueObjects\SortParameter')
            ->setNullable(true)
            ->setValue(null);

        $class->addProperty('sortDirection')
            ->setVisibility('public')
            ->setType(SortDirection::class)
            ->setValue(new Literal('SortDirection::DESC'));

        $class->addProperty('cursor')
            ->setVisibility('public')
            ->setType(Id::class)
            ->setNullable(true)
            ->setValue(null);

        $class->addProperty('maxResults')
            ->setVisibility('public')
            ->setType(MaxResults::class)
            ->setNullable(true);

        $class->addProperty('cursorDirection')
            ->setVisibility('public')
            ->setType(CursorDirection::class)
            ->setValue(new Literal('CursorDirection::STARTING_AFTER'));

        $class->addMethod('__construct')
            ->addComment('@return void')
            ->addBody('$this->maxResults = new MaxResults(MaxResults::DEFAULT);')
            ->setVisibility('public');

        $method = $class->addMethod('setOrderBy')
            ->addComment('@param string $orderBy')
            ->addComment('@param string $dir')
            ->addComment('@return void')
            ->setVisibility('public')
            ->setReturnType('void');

        $method->addParameter('orderBy')
            ->setType('string');

        $method->addParameter('dir')
            ->setType('string');

        $method->addBody('$this->sortParameter =  SortParameter::from($orderBy);')
            ->addBody('$this->sortDirection = SortDirection::from(strtoupper($dir));');

        $method = $class->addMethod('setCursor')
            ->addComment('@param string $id')
            ->addComment('@param string $dir')
            ->addComment('@return List' . $moduleName . 'sCommand')
            ->setVisibility('public')
            ->setReturnType('self');

        $method->addParameter('id')
            ->setType('string');

        $method->addParameter('dir')
            ->setType('string')
            ->setDefaultValue('starting_after');

        $method->addBody('$this->cursor = new Id($id);')
            ->addBody('$this->cursorDirection = CursorDirection::from($dir);')
            ->addBody('')
            ->addBody('return $this;');

        $method = $class->addMethod('setLimit')
            ->addComment('@param int $limit')
            ->addComment('@return List' . $moduleName . 'sCommand')
            ->setVisibility('public')
            ->setReturnType('self');

        $method->addParameter('limit')
            ->setType('int');

        $method->addBody('$this->maxResults = new MaxResults($limit);')
            ->addBody('')
            ->addBody('return $this;');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/Commands/List' . $moduleName . 'sCommand.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateReadCommand(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\Commands');

        $namespace
            ->addUse($moduleName . '\Application\CommandHandlers\Read' . $moduleName . 'CommandHandler')
            ->addUse(Handler::class)
            ->addUse(Id::class);

        $class = $namespace
            ->addClass('Read' . $moduleName . 'Command')
            ->addComment('@package ' . $moduleName . '\Application\Commands')
            ->addAttribute(Handler::class, [
                new Literal('Read' . $moduleName . 'CommandHandler::class')
            ]);

        $class->addProperty('id')
            ->setVisibility('public')
            ->setType(Id::class);

        $method = $class->addMethod('__construct')
            ->addComment('@param string $id')
            ->addComment('@return void')
            ->addBody('$this->id = new Id($id);')
            ->setVisibility('public');

        $method->addParameter('id')
            ->setType('string');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/Commands/Read' . $moduleName . 'Command.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateUpdateCommand(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Application\Commands');

        $namespace
            ->addUse($moduleName . '\Application\CommandHandlers\Update' . $moduleName . 'CommandHandler')
            ->addUse(Handler::class)
            ->addUse(Id::class);

        $class = $namespace
            ->addClass('Update' . $moduleName . 'Command')
            ->addComment('@package ' . $moduleName . '\Application\Commands')
            ->addAttribute(Handler::class, [
                new Literal('Update' . $moduleName . 'CommandHandler::class')
            ]);

        $class->addProperty('id')
            ->setVisibility('public')
            ->setType(Id::class);

        $method = $class->addMethod('__construct')
            ->addComment('@param string $id')
            ->addComment('@return void')
            ->addBody('$this->id = new Id($id);')
            ->setVisibility('public');

        $method->addParameter('id')
            ->setType('string');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Application/Commands/Update' . $moduleName . 'Command.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateEntity(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Entities');
        $namespace
            ->addUse(DateTime::class)
            ->addUse(DateTimeInterface::class)
            ->addUse('Doctrine\ORM\Mapping', 'ORM')
            ->addUse(Id::class);

        $class = new ClassType($moduleName . 'Entity');
        $class
            ->addComment('@package ' . $moduleName . '\Domain\Entities')
            ->addAttribute(ORM\Entity::class)
            ->addAttribute(ORM\Table::class, [
                'name' => $this->getTableName($moduleName)
            ]);
        $namespace->add($class);

        $property = new Property('id');
        $property
            ->setVisibility('private')
            ->addComment('A unique numeric identifier of the entity. Don\'t set this property')
            ->addComment('programmatically. It is automatically set by Doctrine ORM.')
            ->addAttribute(ORM\Embedded::class, [
                'class' => new Literal('Id::class'),
                'columnPrefix' => false,
            ])
            ->setType(Id::class);
        $class->addMember($property);

        $property = new Property('createdAt');
        $property
            ->setVisibility('private')
            ->addComment('Creation date and time of the entity')
            ->addAttribute(ORM\Column::class, [
                'type' => 'datetime',
                'name' => 'created_at'
            ])
            ->setType(DateTimeInterface::class);
        $class->addMember($property);

        $property = new Property('updatedAt');
        $property
            ->setVisibility('private')
            ->addComment('The date and time when the entity was last modified.')
            ->addAttribute(ORM\Column::class, [
                'type' => 'datetime',
                'name' => 'updated_at',
                'nullable' => true,
            ])
            ->setNullable(true)
            ->setType(DateTimeInterface::class)
            ->setValue(null);
        $class->addMember($property);

        $method = new Method('__construct');
        $method
            ->setVisibility('public')
            ->addComment('@return void')
            ->addBody('$this->id = new Id();')
            ->addBody('$this->createdAt = new DateTime();');
        $class->addMember($method);

        $method = new Method('getId');
        $method
            ->setVisibility('public')
            ->addComment('@return Id')
            ->setReturnType(Id::class)
            ->setBody('return $this->id;');
        $class->addMember($method);

        $method = new Method('getCreatedAt');
        $method
            ->setVisibility('public')
            ->addComment('@return DateTimeInterface')
            ->setReturnType(DateTimeInterface::class)
            ->setBody('return $this->createdAt;');
        $class->addMember($method);

        $method = new Method('getUpdatedAt');
        $method
            ->setVisibility('public')
            ->addComment('@return null|DateTimeInterface')
            ->setReturnNullable(true)
            ->setReturnType(DateTimeInterface::class)
            ->setBody('return $this->updatedAt;');
        $class->addMember($method);

        $method = new Method('preUpdate');
        $method
            ->setVisibility('public')
            ->addComment('@return void')
            ->setReturnType('void')
            ->setBody('$this->updatedAt = new DateTime();');
        $class->addMember($method);

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Entities/' . $moduleName . 'Entity.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateAbstractEvent(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Events');
        $namespace
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $class = $namespace
            ->addClass('Abstract' . $moduleName . 'Event')
            ->addComment('@package ' . $moduleName . '\Domain\Events')
            ->setAbstract(true);

        $class->addMethod('__construct')
            ->addComment('@param ' . $moduleName . 'Entity $' . lcfirst($moduleName))
            ->addComment('@return void')
            ->addPromotedParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->setVisibility('public')
            ->setReadOnly(true);

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Events/Abstract' . $moduleName . 'Event.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateEvents(string $moduleName): self
    {
        $this->generateAbstractEvent($moduleName);

        $actions = ['Created', 'Updated', 'Deleted'];
        foreach ($actions as $action) {
            $namespace = new PhpNamespace($moduleName . '\Domain\Events');

            $namespace
                ->addClass($moduleName . $action . 'Event')
                ->addComment('@package ' . $moduleName . '\Domain\Events')
                ->setExtends($moduleName . '\Domain\Events\Abstract' . $moduleName . 'Event');

            $this->saveToFile(
                $namespace,
                $this->rootDir . '/src/' . $moduleName . '/Domain/Events/' . $moduleName . $action . 'Event.php'
            );
        }

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateExceptions(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Exceptions');

        $namespace
            ->addUse(Exception::class)
            ->addUse(Throwable::class)
            ->addUse(Id::class);

        $class = $namespace
            ->addClass($moduleName . 'NotFoundException')
            ->addComment('@package ' . $moduleName . '\Domain\Exceptions')
            ->setExtends(Exception::class);

        $method = $class->addMethod('__construct')
            ->addComment('@param Id $id')
            ->addComment('@param int $code')
            ->addComment('@param null|Throwable $previous')
            ->addComment('@return void')
            ->setVisibility('public');

        $method->addPromotedParameter('id')
            ->setType(Id::class)
            ->setReadOnly(true);

        $method->addParameter('code')
            ->setType('int')
            ->setDefaultValue(0);

        $method->addParameter('previous')
            ->setType(Throwable::class)
            ->setNullable(true)
            ->setDefaultValue(null);

        $method->addBody('parent::__construct(')
            ->addBody('    sprintf(')
            ->addBody('        "' . $moduleName . ' with id <%s> doesn\'t exists!",')
            ->addBody('        $id->getValue()')
            ->addBody('    ),')
            ->addBody('    $code,')
            ->addBody('    $previous')
            ->addBody(');');

        $method = $class->addMethod('getId')
            ->addComment('@return Id')
            ->setReturnType(Id::class)
            ->setBody('return $this->id;');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Exceptions/' . $moduleName . 'NotFoundException.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateRepositoryInterface(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Repositories');

        $namespace
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse(Iterator::class)
            ->addUse($moduleName . '\Domain\ValueObjects\SortParameter')
            ->addUse(SortDirection::class)
            ->addUse(RepositoryInterface::class)
            ->addUse(Id::class);

        $interface = $namespace
            ->addInterface($moduleName . 'RepositoryInterface')
            ->setExtends(RepositoryInterface::class)
            ->addComment('@package ' . $moduleName . '\Domain\Repositories');

        $interface->addMethod('add')
            ->setVisibility('public')
            ->addComment('Add new entityt to the repository')
            ->addComment('')
            ->addComment('@param ' . $moduleName . 'Entity $' . lcfirst($moduleName))
            ->addComment('@return ' . $moduleName . 'RepositoryInterface')
            ->setReturnType('self')
            ->addParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $interface->addMethod('remove')
            ->setVisibility('public')
            ->addComment('Remove the entity from the repository')
            ->addComment('')
            ->addComment('@param ' . $moduleName . 'Entity $' . lcfirst($moduleName))
            ->addComment('@return ' . $moduleName . 'RepositoryInterface')
            ->setReturnType('self')
            ->addParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $interface->addMethod('ofId')
            ->setVisibility('public')
            ->addComment('Find entity by id')
            ->addComment('')
            ->addComment('@param Id $id')
            ->addComment('@return null|' . $moduleName . 'Entity')
            ->setReturnType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->setReturnNullable(true)
            ->addParameter('id')
            ->setType(Id::class);

        $method = $interface->addMethod('sort')
            ->setVisibility('public')
            ->addComment('@param SortDirection $dir')
            ->addComment('@param null|SortParameter $sortParameter')
            ->addComment('@return static')
            ->setReturnType('static');

        $method->addParameter('dir')
            ->setType(SortDirection::class);

        $method->addParameter('sortParameter')
            ->setType($moduleName . '\Domain\ValueObjects\SortParameter')
            ->setNullable(true)
            ->setDefaultValue(null);

        $interface->addMethod('startingAfter')
            ->setVisibility('public')
            ->addComment('@param ' . $moduleName . 'Entity $cursor')
            ->addComment('@return Iterator<' . $moduleName . 'Entity>')
            ->setReturnType(Iterator::class)
            ->addParameter('cursor')
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $interface->addMethod('endingBefore')
            ->setVisibility('public')
            ->addComment('@param ' . $moduleName . 'Entity $cursor')
            ->addComment('@return Iterator<' . $moduleName . 'Entity>')
            ->setReturnType(Iterator::class)
            ->addParameter('cursor')
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Repositories/' . $moduleName . 'RepositoryInterface.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateCreateServices(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Services');

        $namespace
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Events\\' . $moduleName . 'CreatedEvent')
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->addUse(EventDispatcherInterface::class);

        $class = $namespace
            ->addClass('Create' . $moduleName . 'Service')
            ->addComment('@package ' . $moduleName . '\Domain\Services');

        $construct = $class->addMethod('__construct')
            ->addComment('@param ' . $moduleName . 'RepositoryInterface $repo')
            ->addComment('@param EventDispatcherInterface $dispatcher')
            ->addComment('@return void')
            ->setVisibility('public');

        $construct->addPromotedParameter('repo')
            ->setType($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->setVisibility('private');

        $construct->addPromotedParameter('dispatcher')
            ->setType(EventDispatcherInterface::class)
            ->setVisibility('private');

        $method = $class->addMethod('create' . $moduleName)
            ->addComment('@param ' . $moduleName . 'Entity $' . lcfirst($moduleName))
            ->addComment('@return void')
            ->setVisibility('public');

        $method->addParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addBody('// Add the ' . lcfirst($moduleName) . ' to the repository')
            ->addBody('$this->repo')
            ->addBody('    ->add($' . lcfirst($moduleName) . ')')
            ->addBody('    ->flush();')
            ->addBody('')
            ->addBody('// Dispatch the ' . lcfirst($moduleName) . ' created event')
            ->addBody('$event = new ' . $moduleName . 'CreatedEvent($' . lcfirst($moduleName) . ');')
            ->addBody('$this->dispatcher->dispatch($event);');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Services/Create' . $moduleName . 'Service.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateDeleteService(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Services');

        $namespace
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Events\\' . $moduleName . 'DeletedEvent')
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->addUse(EventDispatcherInterface::class);

        $class = $namespace
            ->addClass('Delete' . $moduleName . 'Service')
            ->addComment('@package ' . $moduleName . '\Domain\Services')
            ->setExtends($moduleName . '\Domain\Services\Read' . $moduleName . 'Service');

        $construct = $class->addMethod('__construct')
            ->addComment('@param ' . $moduleName . 'RepositoryInterface $repo')
            ->addComment('@param EventDispatcherInterface $dispatcher')
            ->addComment('@return void')
            ->setVisibility('public')
            ->addBody('parent::__construct($repo);');

        $construct->addPromotedParameter('repo')
            ->setType($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->setVisibility('private');

        $construct->addPromotedParameter('dispatcher')
            ->setType(EventDispatcherInterface::class)
            ->setVisibility('private');

        $method = $class->addMethod('delete' . $moduleName)
            ->addComment('@param ' . $moduleName . 'Entity $' . lcfirst($moduleName))
            ->addComment('@return void')
            ->setVisibility('public');

        $method->addParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addBody('// Delete the ' . lcfirst($moduleName) . ' from the repository')
            ->addBody('$this->repo')
            ->addBody('    ->remove($' . lcfirst($moduleName) . ')')
            ->addBody('    ->flush();')
            ->addBody('')
            ->addBody('// Dispatch the ' . lcfirst($moduleName) . ' deleted event')
            ->addBody('$event = new ' . $moduleName . 'DeletedEvent($' . lcfirst($moduleName) . ');')
            ->addBody('$this->dispatcher->dispatch($event);');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Services/Delete' . $moduleName . 'Service.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateReadService(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Services');

        $namespace
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Exceptions\\' . $moduleName . 'NotFoundException')
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->addUse(Id::class);

        $class = $namespace
            ->addClass('Read' . $moduleName . 'Service')
            ->addComment('@package ' . $moduleName . '\Domain\Services');

        $construct = $class->addMethod('__construct')
            ->addComment('@param ' . $moduleName . 'RepositoryInterface $repo')
            ->addComment('@return void')
            ->setVisibility('public');

        $construct->addPromotedParameter('repo')
            ->setType($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->setVisibility('private');

        $method = $class->addMethod('find' . $moduleName . 'OrFail')
            ->addComment('@param Id $id')
            ->addComment('@return ' . $moduleName . 'Entity')
            ->addComment('@throws ' . $moduleName . 'NotFoundException')
            ->setVisibility('public');

        $method->addParameter('id')
            ->setType(Id::class);

        $method->addBody('$' . lcfirst($moduleName) . ' = $this->repo->ofId($id);')
            ->addBody('if (null === $' . lcfirst($moduleName) . ') {')
            ->addBody('    throw new ' . $moduleName . 'NotFoundException($id);')
            ->addBody('}')
            ->addBody('')
            ->addBody('return $' . lcfirst($moduleName) . ';');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Services/Read' . $moduleName . 'Service.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateUpdateService(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\Services');

        $namespace
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Events\\' . $moduleName . 'UpdatedEvent')
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->addUse(EventDispatcherInterface::class);

        $class = $namespace
            ->addClass('Update' . $moduleName . 'Service')
            ->addComment('@package ' . $moduleName . '\Domain\Services')
            ->setExtends($moduleName . '\Domain\Services\Read' . $moduleName . 'Service');

        $construct = $class->addMethod('__construct')
            ->addComment('@param ' . $moduleName . 'RepositoryInterface $repo')
            ->addComment('@param EventDispatcherInterface $dispatcher')
            ->addComment('@return void')
            ->setVisibility('public')
            ->addBody('parent::__construct($repo);');

        $construct->addPromotedParameter('repo')
            ->setType($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->setVisibility('private');

        $construct->addPromotedParameter('dispatcher')
            ->setType(EventDispatcherInterface::class)
            ->setVisibility('private');

        $method = $class->addMethod('update' . $moduleName)
            ->addComment('@param ' . $moduleName . 'Entity $' . lcfirst($moduleName))
            ->addComment('@return void')
            ->setVisibility('public');

        $method->addParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addBody('// Call the pre update hooks')
            ->addBody('$' . lcfirst($moduleName) . '->preUpdate();')
            ->addBody('')
            ->addBody('// Update the ' . lcfirst($moduleName) . ' in the repository')
            ->addBody('$this->repo->flush();')
            ->addBody('')
            ->addBody('// Dispatch the ' . lcfirst($moduleName) . ' updated event')
            ->addBody('$event = new ' . $moduleName . 'UpdatedEvent($' . lcfirst($moduleName) . ');')
            ->addBody('$this->dispatcher->dispatch($event);');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/Services/Update' . $moduleName . 'Service.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws NetteInvalidArgumentException 
     * @throws InvalidStateException 
     */
    private function generateSortParameter(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Domain\ValueObjects');

        $enum = $namespace->addEnum('SortParameter')
            ->setType('string')
            ->addComment('@package ' . $moduleName . '\Domain\ValueObjects');
        $enum->addCase('ID', 'id');
        $enum->addCase('CREATED_AT', 'created_at');
        $enum->addCase('UPDATED_AT', 'updated_at');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Domain/ValueObjects/SortParameter.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateRepository(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Infrastructure\Repositories\DoctrineOrm');

        $namespace
            ->addUse(DateTimeInterface::class)
            ->addUse(EntityManagerInterface::class)
            ->addUse(InvalidArgumentException::class)
            ->addUse(Iterator::class)
            ->addUse($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->addUse($moduleName . '\Domain\ValueObjects\SortParameter')
            ->addUse(RuntimeException::class)
            ->addUse(Id::class)
            ->addUse(SortDirection::class)
            ->addUse(AbstractRepository::class);

        $class = $namespace
            ->addClass($moduleName . 'Repository')
            ->addComment('@package ' . $moduleName . '\Infrastructure\Repositories\DoctrineOrm')
            ->setExtends(AbstractRepository::class)
            ->addImplement($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface');

        $class->addConstant('ENTITY_CLASS', new Literal($moduleName . 'Entity::class'))
            ->setVisibility('private');

        $class->addConstant('ALIAS', $this->getTableName($moduleName))
            ->setVisibility('private');

        $class->addProperty('sortParameter')
            ->setVisibility('private')
            ->setType($moduleName . '\Domain\ValueObjects\SortParameter')
            ->setNullable(true)
            ->setValue(null);

        $construct = $class->addMethod('__construct')
            ->addComment('@param EntityManagerInterface $em')
            ->addComment('@return void')
            ->addComment('@throws InvalidArgumentException')
            ->addComment('@throws RuntimeException')
            ->setVisibility('public');

        $construct->addParameter('em')
            ->setType(EntityManagerInterface::class);

        $construct->addBody('parent::__construct($em, self::ENTITY_CLASS, self::ALIAS);');

        $class->addMethod('add')
            ->addComment('@inheritDoc')
            ->setReturnType('self')
            ->addBody('$this->em->persist($' . lcfirst($moduleName) . ');')
            ->addBody('return $this;')
            ->addParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $class->addMethod('remove')
            ->addComment('@inheritDoc')
            ->setReturnType('self')
            ->addBody('$this->em->remove($' . lcfirst($moduleName) . ');')
            ->addBody('return $this;')
            ->addParameter(lcfirst($moduleName))
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $class->addMethod('ofId')
            ->addComment('@inheritDoc')
            ->setReturnType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity')
            ->setReturnNullable(true)
            ->addBody('$object = $this->em->find(self::ENTITY_CLASS, $id);')
            ->addBody('return $object instanceof ' . $moduleName . 'Entity ? $object : null;')
            ->addParameter('id')
            ->setType(Id::class);

        $method = $class->addMethod('sort')
            ->addComment('@inheritDoc')
            ->setReturnType('static');

        $method->addParameter('dir')
            ->setType(SortDirection::class);

        $method->addParameter('sortParameter')
            ->setType($moduleName . '\Domain\ValueObjects\SortParameter')
            ->setNullable(true)
            ->setDefaultValue(null);

        $method->addBody('$cloned = $this->doSort($dir, $this->getSortKey($sortParameter));')
            ->addBody('$cloned->sortParameter = $sortParameter;')
            ->addBody('')
            ->addBody('return $cloned;');

        $method = $class->addMethod('startingAfter')
            ->addComment('@inheritDoc')
            ->setReturnType(Iterator::class);

        $method->addParameter('cursor')
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addBody('return $this->doStartingAfter(')
            ->addBody('    $cursor->getId(),')
            ->addBody('    $this->getCompareValue($cursor)')
            ->addBody(');');

        $method = $class->addMethod('endingBefore')
            ->addComment('@inheritDoc')
            ->setReturnType(Iterator::class);

        $method->addParameter('cursor')
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addBody('return $this->doEndingBefore(')
            ->addBody('    $cursor->getId(),')
            ->addBody('    $this->getCompareValue($cursor)')
            ->addBody(');');

        $method = $class->addMethod('getSortKey')
            ->addComment('@param null|SortParameter $param')
            ->addComment('@return string')
            ->setVisibility('private')
            ->setReturnType('?string');

        $method->addParameter('param')
            ->setNullable(true)
            ->setType($moduleName . '\Domain\ValueObjects\SortParameter');

        $method->addBody('return match ($param) {')
            ->addBody('    SortParameter::ID => \'id.value\',')
            ->addBody('    SortParameter::CREATED_AT => \'createdAt\',')
            ->addBody('    SortParameter::UPDATED_AT => \'updatedAt\',')
            ->addBody('    default => null,')
            ->addBody('};');

        $method = $class->addMethod('getCompareValue')
            ->addComment('@param ' . $moduleName . 'Entity $cursor')
            ->addComment('@return null|string|DateTimeInterface')
            ->setVisibility('private')
            ->setReturnType('null|string|' . DateTimeInterface::class);

        $method->addParameter('cursor')
            ->setType($moduleName . '\Domain\Entities\\' . $moduleName . 'Entity');

        $method->addBody('return match ($this->sortParameter) {')
            ->addBody('    SortParameter::ID => $cursor->getId()->getValue()->getBytes(),')
            ->addBody('    SortParameter::CREATED_AT => $cursor->getCreatedAt(),')
            ->addBody('    SortParameter::UPDATED_AT => $cursor->getUpdatedAt(),')
            ->addBody('    default => null')
            ->addBody('};');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Infrastructure/Repositories/DoctrineOrm/' . $moduleName . 'Repository.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return ModuleGenerator 
     * @throws InvalidStateException 
     * @throws NetteInvalidArgumentException 
     */
    private function generateModuleBootstrapper(string $moduleName): self
    {
        $namespace = new PhpNamespace($moduleName . '\Infrastructure');

        $namespace
            ->addUse(Application::class)
            ->addUse($moduleName . '\Domain\Repositories\\' . $moduleName . 'RepositoryInterface')
            ->addUse($moduleName . '\Infrastructure\Repositories\DoctrineOrm\\' . $moduleName . 'Repository')
            ->addUse(BootstrapperInterface::class);

        $class = $namespace
            ->addClass($moduleName . 'ModuleBootstrapper')
            ->addComment('@package ' . $moduleName . '\Infrastructure')
            ->addImplement(BootstrapperInterface::class);

        $construct = $class->addMethod('__construct')
            ->addComment('@param Application $app')
            ->addComment('@return void')
            ->setVisibility('public');

        $construct->addPromotedParameter('app')
            ->setType(Application::class)
            ->setVisibility('private');

        $method = $class->addMethod('bootstrap')
            ->addComment('@inheritDoc')
            ->setVisibility('public')
            ->setReturnType('void');

        $method->addBody('// Register repository implementations')
            ->addBody('$this->app->set(')
            ->addBody('    ' . $moduleName . 'RepositoryInterface::class,')
            ->addBody('    ' . $moduleName . 'Repository::class')
            ->addBody(');');

        $this->saveToFile(
            $namespace,
            $this->rootDir . '/src/' . $moduleName . '/Infrastructure/' . $moduleName . 'ModuleBootstrapper.php'
        );

        return $this;
    }

    /**
     * @param string $moduleName 
     * @return string 
     */
    private function getTableName(string $moduleName): string
    {
        preg_match_all(
            '!([A-Z][A-Z0-9]*(?=$|[A-Z][a-z0-9])|[A-Za-z][a-z0-9]+)!',
            $moduleName,
            $matches
        );

        $ret = $matches[0];

        foreach ($ret as &$match) {
            $match = $match == strtoupper($match) ? strtolower($match) : lcfirst($match);
        }

        return implode('_', $ret);
    }

    /**
     * @param PhpNamespace $namespace 
     * @param string $path 
     * @return void 
     * @throws InvalidStateException 
     */
    private function saveToFile(PhpNamespace $namespace, string $path)
    {
        $file = new PhpFile();
        $file->setStrictTypes(true);
        $file->addNamespace($namespace);

        if (is_file($path)) {
            return;
        }

        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $printer = new PsrPrinter();
        file_put_contents($path, $printer->printFile($file));
    }
}
