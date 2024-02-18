<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Ai;

use Ai\Domain\Exceptions\ApiException;
use Ai\Domain\Images\ImageGeneratorServiceInterface;
use Ai\Domain\Images\TextToImageRequest;
use Ai\Domain\Services\AiServiceFactoryInterface;
use Billing\Application\Commands\UseCreditCommand;
use Billing\Domain\ValueObjects\Usage;
use Billing\Domain\ValueObjects\UsageType;
use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Presentation\Middlewares\DemoEnvironmentMiddleware;
use Presentation\Response\JsonResponse;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Ramsey\Uuid\Uuid;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Entities\UserEntity;

#[Middleware(DemoEnvironmentMiddleware::class)]
#[Route(path: '/image-generator', method: RequestMethod::POST)]
class ImageGeneratorRequestHandler extends AiServicesApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher,
        private AiServiceFactoryInterface $factory,

        #[Inject('config.dirs.uploads')]
        private string $uploadsDir,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        if (
            $user->getImageCredit()->value != null
            && $user->getImageCredit()->value < 1
        ) {
            throw new HttpException(
                message: 'You have run out of credits. Please purchase more credits to continue using the app.',
                statusCode: StatusCode::PAYMENT_REQUIRED,
            );
        }

        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $model = $payload->model ?? null;

        $service = $this->factory->create(
            ImageGeneratorServiceInterface::class,
            $model
        );

        $req = new TextToImageRequest($payload->prompt);

        $req->model = $model;

        if (isset($payload->width)) {
            $req->width = (int) $payload->width;
        }

        if (isset($payload->height)) {
            $req->height = (int) $payload->height;
        }

        if (isset($payload->art)) {
            $req->style = $payload->art;
        }

        if (isset($payload->lightning)) {
            $req->lightning = $payload->lightning;
        }

        if (isset($payload->mood)) {
            $req->mood = $payload->mood;
        }

        try {
            $image = $service->generateImage($req);
        } catch (ApiException $th) {
            throw new HttpException(
                message: $th->getMessage(),
                statusCode: StatusCode::BAD_REQUEST,
                previous: $th
            );
        }

        // Save image
        $id = Uuid::uuid4()->toString();
        $name = $id . '.png';
        file_put_contents(
            $this->uploadsDir . '/' . $name,
            base64_decode($image->src)
        );

        $usage = [new Usage(UsageType::IMAGE, 1)];
        $cmd = new UseCreditCommand($user, ...$usage);
        $this->dispatcher->dispatch($cmd);

        return new JsonResponse([
            'image' => $image,
            'usage' => $usage,
            'url' => 'uploads/' . $name,
            'id' => $id,
            'model' => $model
        ]);
    }

    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'prompt' => 'required|string'
        ]);
    }
}
