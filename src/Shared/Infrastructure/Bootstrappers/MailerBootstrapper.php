<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Bootstrappers;

use Application;
use Easy\Container\Attributes\Inject;
use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Log\LoggerInterface;
use Shared\Infrastructure\BootstrapperInterface;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mailer\Transport\NullTransport;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;

/** @package Shared\Infrastructure\Bootstrappers */
class MailerBootstrapper implements BootstrapperInterface
{
    /**
     * @param Application $app 
     * @param EventDispatcherInterface $dispatcher 
     * @param LoggerInterface $logger 
     * @param null|string $transport 
     * @param array $smtp 
     * @return void 
     */
    public function __construct(
        private Application $app,
        private EventDispatcherInterface $dispatcher,
        private LoggerInterface $logger,

        #[Inject('option.mail.transport')]
        private ?string $transport = null,

        #[Inject('option.smtp')]
        private array $smtp = [],
    ) {
    }

    /** @return void  */
    public function bootstrap(): void
    {
        switch ($this->transport) {
            case 'smtp':
                $transport = new EsmtpTransport(
                    $this->smtp['host'] ?? 'localhost',
                    (int)($this->smtp['port'] ?? 0),
                    dispatcher: $this->dispatcher,
                    logger: $this->logger,
                );

                if (isset($this->smtp['username'])) {
                    $transport->setUsername($this->smtp['username']);
                }

                if (isset($this->smtp['password'])) {
                    $transport->setPassword($this->smtp['password']);
                }

                break;

            default:
                $transport = new NullTransport(
                    dispatcher: $this->dispatcher,
                    logger: $this->logger,
                );
                break;
        }

        $mailer = new Mailer($transport, null, $this->dispatcher);
        $this->app->set(MailerInterface::class, $mailer);
    }
}
