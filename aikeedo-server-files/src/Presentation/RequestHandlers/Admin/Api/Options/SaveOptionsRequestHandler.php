<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Options;

use Adbar\Dot;
use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Menv\Env;
use Easy\Router\Attributes\Route;
use Option\Application\Commands\SaveOptionCommand;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\UploadedFileInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Dispatcher;

/** @package Presentation\RequestHandlers\Admin\Api\Options */
#[Route(path: '/', method: RequestMethod::POST)]
class SaveOptionsRequestHandler extends OptionsApi
implements RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher,

        #[Inject('config.dirs.uploads')]
        private string $uploadDir,

        #[Inject('config.dirs.root')]
        private string $rootDir,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $payload = (object) $request->getParsedBody();

        $path = $this->rootDir . '/.env';
        $menv = new Env($path);

        if (isset($payload->env->DEBUG)) {
            $menv->set('DEBUG', $payload->env->DEBUG ? 1 : 0);
        }

        if (isset($payload->env->CACHE)) {
            $menv->set('CACHE', $payload->env->CACHE ? 1 : 0);
        }

        $menv->save();

        foreach ($payload as $key => $value) {
            $cmd = new SaveOptionCommand($key, is_string($value) ? trim($value) : json_encode($value));
            $this->dispatcher->dispatch($cmd);
        }

        $dot = new Dot();
        foreach ($this->getFiles($request->getUploadedFiles()) as $key => $file) {
            if ($file->getSize() > 0) {
                $dot->set($key, $this->saveFile($file));
            }
        }

        foreach ($dot->all() as $key => $value) {
            $cmd = new SaveOptionCommand(
                $key,
                is_string($value) ? trim($value) : json_encode($value)
            );
            $this->dispatcher->dispatch($cmd);
        }

        return new EmptyResponse();
    }

    /**
     * @param array $files 
     * @param string $prefix 
     * @return array<string,UploadedFileInterface> 
     */
    function getFiles(array $files, $prefix = ''): array
    {
        $map = [];

        foreach ($files as $key => $value) {
            if ($value instanceof UploadedFileInterface) {
                $map[$prefix . '.' . $key] = $value;
                continue;
            }

            if (is_array($value)) {
                $map = array_merge(
                    $map,
                    $this->getFiles($value, $prefix ? "$prefix.$key" : $key)
                );
            }
        }

        return $map;
    }

    /**
     * @param UploadedFileInterface $file 
     * @return string 
     */
    function saveFile(UploadedFileInterface $file): string
    {
        $id = new Id();
        $ext = pathinfo($file->getClientFilename(), PATHINFO_EXTENSION);
        $filename = $id->getValue()->toString() . '.' . $ext;

        $path = $this->uploadDir . DIRECTORY_SEPARATOR . $filename;
        $file->moveTo($path);

        return DIRECTORY_SEPARATOR . "uploads" . DIRECTORY_SEPARATOR . $filename;
    }
}
