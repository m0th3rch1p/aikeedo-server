<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Api\PresetResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Preset\Application\Commands\ReadPresetCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Preset\Domain\Placeholder\ParserService;
use Preset\Domain\Placeholder\PlaceholderFactory;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

/** @package Presentation\RequestHandlers */
#[Route(path: '/writer/[uuid:id]?', method: RequestMethod::GET)]
class WriterView  extends AppView implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher,
        private ParserService $parser,
        private PlaceholderFactory $factory
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');

        $data = [];
        $data['placeholders'] = [
            $this->factory->create('query', [
                'type' => 'text',
                'multiline' => true,
                'placeholder' => 'Enter your query here',
                'value' => $request->getQueryParams()['q'] ?? ''
            ])
        ];

        if ($id) {
            $cmd = new ReadPresetCommand($id);

            try {
                /** @var PresetEntity $preset */
                $preset = $this->dispatcher->dispatch($cmd);
            } catch (PresetNotFoundException $th) {
                return new RedirectResponse('/app/writer');
            }

            $data['preset'] = json_decode(json_encode(new PresetResource($preset)));
            $data['placeholders'] = $this->parser->parse(
                $preset->getTemplate()->value
            );
        }

        return new ViewResponse(
            '/templates/app/writer.twig',
            $data
        );
    }
}
