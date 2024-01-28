<?php
declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Aws;

use Aws\Domain\Entities\AwsEntity;
use Aws\Infrastructure\Services\EntitlementService;
use Aws\Infrastructure\Services\MeteringService;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\RedirectResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

#[Route(path: '/resolve', method: RequestMethod::POST)]
class ResolveCustomerRequestHandler extends AwsApi implements
    RequestHandlerInterface
{
    public function __construct(private Validator $validator,
                                private MeteringService $meteringService,
                                private EntitlementService $entitlementService,
                                private Dispatcher $dispatcher)
    {
    }

    /**
     * @throws ValidationException
     * @throws NoHandlerFoundException
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // TODO: Implement handle() method.
        $this->validateRequest($request);

        $payload = $request->getParsedBody();

        $customer = $this->meteringService->resolve($payload['x-amzn-marketplacetoken']);
        if (!$customer || !isset($customer['CustomerIdentifier'])) {
            //Handle Error Redirection
        }


        $awsCommand = new AwsEntity($customer['CustomerIdentifier'], $customer['ProductCode']);
        $this->dispatcher->dispatch($awsCommand);

        $entitlementResults = $this->entitlementService->getEntitlementByCustomerId($customer['CustomerIdentifier'], $customer['ProductCode']);

        $entitlements = $entitlementResults['Entitlements'];

        if (!count($entitlements)) {
            //Handle not active subscription
        }

        // Finish up registration
        return new RedirectResponse(uri: '/aws/register?c_id='.$customer['CustomerIdentifier']);
    }

    /**
     * @throws ValidationException
     */
    private function validateRequest (ServerRequestInterface $request): void
    {
        $this->validator->validateRequest($request, [
            'x-amzn-marketplacetoken' => 'required|string'
        ]);
    }

}