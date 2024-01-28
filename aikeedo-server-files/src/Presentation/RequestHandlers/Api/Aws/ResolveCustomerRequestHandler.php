<?php
declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Aws;

use Aws\Application\Commands\CreateAwsCommand;
use Aws\Domain\Entities\AwsEntity;
use Aws\Infrastructure\Services\EntitlementService;
use Aws\Infrastructure\Services\MeteringService;
use Aws\MarketplaceEntitlementService\Exception\MarketplaceEntitlementServiceException;
use Aws\MarketplaceMetering\Exception\MarketplaceMeteringException;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Response\JsonResponse;
use Presentation\Response\RedirectResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Exceptions\InvalidTokenException;

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

        try {
            $customer = $this->meteringService->resolve($payload->{'x-amzn-marketplace-token'});
            dump($customer);
            if (!$customer || !isset($customer['CustomerIdentifier'])) {
                //Handle Error Redirection
            }

//            $awsCommand = new CreateAwsCommand($customer['CustomerIdentifier'], $customer['ProductCode']);
//            $this->dispatcher->dispatch($awsCommand);

            $entitlementResults = $this->entitlementService->getEntitlementByCustomerId($customer['CustomerIdentifier'], $customer['ProductCode']);

            dump("Entitlement Results", $entitlementResults);
            $entitlements = $entitlementResults['Entitlements'];

            if (!count($entitlements)) {
                //Handle not active subscription
            }

            // Finish up registration
            return new RedirectResponse(uri: '/aws/register?c_id='.$customer['CustomerIdentifier']);
        } catch (MarketplaceMeteringException|MarketplaceEntitlementServiceException $e) {
            return new JsonResponse(json_encode([
                'message' => $e->getAwsErrorMessage()
            ]), StatusCode::BAD_REQUEST);
        }
    }

    /**
     * @throws ValidationException
     */
    private function validateRequest (ServerRequestInterface $request): void
    {
        $this->validator->validateRequest($request, [
            'x-amzn-marketplace-token' => 'required|string'
        ]);
    }

}