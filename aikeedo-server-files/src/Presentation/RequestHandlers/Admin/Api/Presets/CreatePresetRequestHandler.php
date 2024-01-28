<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Presets;

use Category\Domain\Exceptions\CategoryNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Preset\Application\Commands\CreatePresetCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\LockedPresetException;
use Preset\Domain\ValueObjects\Status;
use Preset\Domain\ValueObjects\Type;
use Presentation\Resources\Admin\Api\PresetResource;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Preset\Domain\Exceptions\TemplateExistsException;

/** @package Preset\Presentation\Admin\Api\RequestHandlers */
#[Route(path: '/', method: RequestMethod::POST)]
class CreatePresetRequestHandler extends PresetApi implements
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
     * @throws LockedPresetException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new CreatePresetCommand(
            $payload->type ?? Type::COMPLETION->value,
            $payload->title,
        );

        if (property_exists($payload, 'description')) {
            $cmd->setDescription($payload->description);
        }

        if (property_exists($payload, 'status')) {
            $cmd->setStatus((int) $payload->status);
        }

        if (property_exists($payload, 'template')) {
            $cmd->setTemplate($payload->template);
        }

        if (property_exists($payload, 'image')) {
            $cmd->setImage($payload->image);
        }

        if (property_exists($payload, 'color')) {
            $cmd->setColor($payload->color);
        }

        if (property_exists($payload, 'category_id')) {
            $cmd->setCategoryId($payload->category_id);
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
            'type' => 'string|in:' . implode(",", array_map(fn (Type $type) => $type->value, Type::cases())),
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'integer|in:' . implode(",", array_map(fn (Status $type) => $type->value, Status::cases())),
            'template' => 'nullable|string',
            'image' => 'nullable|string',
            'color' => 'nullable|string',
            'category_id' => 'nullable|string'
        ]);
    }
}
