<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Options;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use InvalidArgumentException;
use Option\Application\Commands\SaveOptionCommand;
use Presentation\Exceptions\UnprocessableEntityException;
use Presentation\Response\EmptyResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;

/** @package Presentation\RequestHandlers\Admin\Api\Options */
#[Route(path: '/smtp', method: RequestMethod::POST)]
class SaveSmtpOptionsRequestHandler extends OptionsApi implements
    RequestHandlerInterface
{
    /**
     * @param ClientInterface $client 
     * @param RequestFactoryInterface $requestFactory 
     * @param Validator $validator 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private ClientInterface $client,
        private RequestFactoryInterface $requestFactory,
        private Validator $validator,
        private Dispatcher $dispatcher,
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws ValidationException 
     * @throws InvalidArgumentException 
     * @throws ClientExceptionInterface 
     * @throws UnprocessableEntityException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $payload = $this->validateRequest($request);

        foreach ($payload as $key => $value) {
            $cmd = new SaveOptionCommand(
                $key,
                is_string($value) ? trim($value) : json_encode($value)
            );

            $this->dispatcher->dispatch($cmd);
        }

        return new EmptyResponse();
    }

    /**
     * @param ServerRequestInterface $req 
     * @return array{host:string,port:int,username:string,password:string}  
     * @throws ValidationException 
     * @throws UnprocessableEntityException 
     */
    private function validateRequest(ServerRequestInterface $req): array
    {
        $params = json_decode(json_encode($req->getParsedBody()), true);

        $this->validator->validate(
            $params,

            [
                'smtp.host' => 'required|string',
                'smtp.port' => 'required|integer|in:25,465,587',
                'smtp.username' => 'required|string',
                'smtp.password' => 'required|string',
            ]
        );

        $this->testSmtpConnection(
            $params['smtp']['host'],
            (int) $params['smtp']['port'],
            $params['smtp']['username'],
            $params['smtp']['password']
        );

        return $params;
    }

    /**
     * @param string $host 
     * @param int $port 
     * @param string $username 
     * @param string $password 
     * @return void 
     * @throws UnprocessableEntityException 
     */
    private function testSmtpConnection(
        string $host,
        int $port,
        string $username,
        string $password
    ) {
        try {
            $transport = new EsmtpTransport($host, $port);

            $transport->setUsername($username);
            $transport->setPassword($password);

            $transport->start();
        } catch (TransportException $th) {
            throw new UnprocessableEntityException(
                'SMTP connection can not be established'
            );
        }
    }
}
