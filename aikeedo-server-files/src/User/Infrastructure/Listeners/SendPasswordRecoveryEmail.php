<?php

declare(strict_types=1);

namespace User\Infrastructure\Listeners;

use Easy\Container\Attributes\Inject;
use Laminas\Diactoros\ServerRequestFactory;
use Option\Infrastructure\OptionResolver;
use Presentation\Resources\UserResource;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;
use User\Domain\Events\PasswordRecoveryCreatedEvent;

/** 
 * Class SendPasswordRecoveryEmail
 *
 * This class listens to the event of password recovery creation. 
 * When triggered, it will send a password recovery email to the user.
 *
 * @package User\Infrastructure\Listeners 
 */
class SendPasswordRecoveryEmail
{
    /**
     * Constructs an instance of this listener.
     *
     * Injects necessary services and configuration values.
     *
     * @param MailerInterface $mailer The mailer service to send emails
     * @param Environment $twig The Twig environment for rendering email 
     * templates
     * @param OptionResolver $optionResolver Resolver for application options
     * @param null|string $fromAddress Email sender address
     * @param null|string $fromName Email sender name
     * @param null|string $siteName Application website name
     */
    public function __construct(
        private MailerInterface $mailer,
        private Environment $twig,
        private OptionResolver $optionResolver,

        #[Inject('option.mail.from.address')]
        private ?string $fromAddress = null,

        #[Inject('option.mail.from.name')]
        private ?string $fromName = null,

        #[Inject('option.site.name')]
        private ?string $siteName = null,
    ) {
    }

    /**
     * Invoked when a PasswordRecoveryCreatedEvent is dispatched.
     *
     * This listener responds to the event by sending an email to the user with 
     * information on how to recover their password.
     *
     * @param PasswordRecoveryCreatedEvent $event The password recovery creation 
     * event
     */
    public function __invoke(PasswordRecoveryCreatedEvent $event)
    {
        $user = $event->user;

        try {
            $email = new Email();

            if ($this->fromAddress) {
                $email->from(new Address(
                    $this->fromAddress,
                    $this->fromName ?: ''
                ));
            }

            // Create reset URL from the User ID and Recovery Token
            $path = '/recovery'
                . '/' . (string) $user->getId()->getValue()
                . '/' . $user->getRecoveryToken()->value;

            $req = ServerRequestFactory::fromGlobals();
            $uri = $req->getUri()
                ->withPath($path)
                ->withQuery('')
                ->withFragment('');

            // Prepare data for the email template
            $data = [
                'user' => new UserResource($user),
                'reset_url' => (string) $uri,
            ];
            $data = array_merge($data, $this->optionResolver->getOptionMap());

            // Set up the email
            $email
                ->to($user->getEmail()->value)
                ->subject('Password Reset Request')
                ->html($this->twig->render('@emails/password-reset.twig', $data));

            // Send the email
            $this->mailer->send($email);
        } catch (TransportExceptionInterface $th) {
            // Catch exception here to avoid breaking the application
        }
    }
}
