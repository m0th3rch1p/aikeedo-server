<?php

declare(strict_types=1);

namespace User\Infrastructure\Services;

use Easy\Container\Attributes\Inject;
use Laminas\Diactoros\ServerRequestFactory;
use Option\Infrastructure\OptionResolver;
use Presentation\Resources\UserResource;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;
use User\Domain\Entities\UserEntity;

class VerificationEmailService
{
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

        #[Inject('option.site.email_verification_policy')]
        private ?string $policy = null,
    ) {
    }

    public function send(UserEntity $user)
    {
        if (
            !in_array($this->policy, ['strict', 'relaxed'])
            || $user->isEmailVerified()->value
        ) {
            return;
        }

        try {
            $email = new Email();

            if ($this->fromAddress) {
                $email->from(new Address(
                    $this->fromAddress,
                    $this->fromName ?: ''
                ));
            }

            // Create reset URL from the User ID and Recovery Token
            $path = '/verification/email'
                . '/' . (string) $user->getId()->getValue()
                . '/' . $user->getEmailVerificationToken()->value;

            $req = ServerRequestFactory::fromGlobals();
            $uri = $req->getUri()
                ->withPath($path)
                ->withQuery('')
                ->withFragment('');

            // Prepare data for the email template
            $data = [
                'user' => new UserResource($user),
                'verification_url' => (string) $uri,
            ];
            $data = array_merge($data, $this->optionResolver->getOptionMap());

            // Set up the email
            $email
                ->to($user->getEmail()->value)
                ->subject('Email verification required for your account')
                ->html($this->twig->render('@emails/verify-email.twig', $data));

            // Send the email
            $this->mailer->send($email);
        } catch (TransportExceptionInterface $th) {
            // Catch exception here to avoid breaking the application
        }
    }
}
