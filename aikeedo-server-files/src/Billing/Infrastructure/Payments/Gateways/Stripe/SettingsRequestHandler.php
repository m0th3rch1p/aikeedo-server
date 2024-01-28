<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Payments\Gateways\Stripe;

use Billing\Domain\Payments\PaymentGatewayFactoryInterface;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\RequestHandlers\Admin\AbstractAdminViewRequestHandler;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Symfony\Component\Intl\Exception\MissingResourceException;
use Twig\Loader\FilesystemLoader;

/** @package Presentation\RequestHandlers\Admin */
#[Route(path: '/settings/payments/stripe', method: RequestMethod::GET)]
class SettingsRequestHandler extends AbstractAdminViewRequestHandler implements
    RequestHandlerInterface
{
    /**
     * @param Dispatcher $dispatcher 
     * @param PaymentGatewayFactoryInterface $factory 
     * @return void 
     */
    public function __construct(
        private Dispatcher $dispatcher,
        private PaymentGatewayFactoryInterface $factory,
        FilesystemLoader $loader,
    ) {
        $loader->addPath(__DIR__, "stripe");
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws MissingResourceException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return new ViewResponse(
            '@stripe/settings.twig'
        );
    }
}
