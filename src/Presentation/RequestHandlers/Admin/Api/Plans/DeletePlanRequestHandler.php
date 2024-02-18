<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Plans;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Billing\Application\Commands\DeletePlanCommand;
use Billing\Domain\Exceptions\PlanIsLockedException;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Easy\Http\Message\StatusCode;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\NotFoundException;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Presentation\RequestHandlers\Admin\Api\Plans */
#[Route(path: '/[uuid:id]', method: RequestMethod::DELETE)]
class DeletePlanRequestHandler extends PlanApi implements
    RequestHandlerInterface
{
    /**
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws NotFoundException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');

        $cmd = new DeletePlanCommand($id);

        try {
            $this->dispatcher->dispatch($cmd);
        } catch (PlanNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        } catch (PlanIsLockedException $th) {
            throw new HttpException(
                $th->getMessage(),
                StatusCode::LOCKED,
                null,
                $th
            );
        }

        return new EmptyResponse();
    }
}
