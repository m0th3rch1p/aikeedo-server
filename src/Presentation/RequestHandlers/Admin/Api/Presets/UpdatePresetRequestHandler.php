<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Presets;

use Category\Domain\Exceptions\CategoryNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\UnprocessableEntityException;
use Preset\Application\Commands\UpdatePresetCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\ValueObjects\Status;
use Presentation\Resources\Admin\Api\PresetResource;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Preset\Domain\Exceptions\LockedPresetException;
use Preset\Domain\Exceptions\TemplateExistsException;

/** @package Preset\Presentation\Admin\Api\RequestHandlers */
#[Route(path: '/[uuid:id]', method: RequestMethod::PUT)]
#[Route(path: '/[uuid:id]', method: RequestMethod::POST)]
class UpdatePresetRequestHandler extends PresetApi implements
    RequestHandlerInterface
{
    /**
     * @param Validator $validator 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws ValidationException 
     * @throws HttpException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);

        $id = $request->getAttribute('id');
        $payload = (object) $request->getParsedBody();

        $cmd = new UpdatePresetCommand($id);

        if (property_exists($payload, 'title')) {
            $cmd->setTitle($payload->title);
        }

        if (property_exists($payload, 'description')) {
            $cmd->setDescription($payload->description);
        }

        if (property_exists($payload, 'status')) {
            $cmd->setStatus((int)$payload->status);
        }

        if (property_exists($payload, 'template')) {
            $cmd->setTemplate($payload->template ?: null);
        }

        if (property_exists($payload, 'image')) {
            $cmd->setImage($payload->image ?: null);
        }

        if (property_exists($payload, 'color')) {
            $cmd->setColor($payload->color ?: null);
        }

        if (property_exists($payload, 'category_id')) {
            $cmd->setCategoryId($payload->category_id ?: null);
        }

        try {
            /** @var PresetEntity $preset */
            $preset = $this->dispatcher->dispatch($cmd);
        } catch (CategoryNotFoundException $th) {
            throw new ValidationException(
                'Category not found',
                'category_id',
                previous: $th
            );
        } catch (TemplateExistsException $th) {
            throw new HttpException(
                message: 'Template already exists',
                statusCode: StatusCode::CONFLICT,
                param: 'template',
                previous: $th
            );
        } catch (LockedPresetException $th) {
            throw new UnprocessableEntityException(
                'Modifying the template of the locked preset is not possible.',
                previous: $th
            );
        }

        return new JsonResponse(new PresetResource($preset));
    }

    /**
     * @param ServerRequestInterface $req 
     * @return void 
     * @throws ValidationException 
     */
    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'title' => 'string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:' . implode(",", array_map(fn (Status $status) => $status->value, Status::cases())),
            'template' => 'nullable|string',
            'image' => 'nullable|string',
            'color' => 'nullable|string',
            'category_id' => 'nullable|string'
        ]);
    }
}
