<?php

declare(strict_types=1);

namespace User\Domain\Entities;

use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\Count;
use Billing\Domain\ValueObjects\PaymentGateway;
use Billing\Domain\ValueObjects\Status as SubscriptionStatus;
use Billing\Domain\ValueObjects\TrialPeriodDays;
use Billing\Domain\ValueObjects\Usage;
use DateTime;
use DateTimeInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\Criteria;
use Doctrine\Common\Collections\Selectable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Exception;
use LogicException;
use Ramsey\Uuid\Uuid;
use Shared\Domain\ValueObjects\CurrencyCode;
use Shared\Domain\ValueObjects\Id;
use Traversable;
use User\Domain\Exceptions\InvalidPasswordException;
use User\Domain\Exceptions\InvalidTokenException;
use User\Domain\Exceptions\SubscriptionNotFoundException;
use User\Domain\ValueObjects\Email;
use User\Domain\ValueObjects\EmailVerificationToken;
use User\Domain\ValueObjects\FirstName;
use User\Domain\ValueObjects\IsEmailVerified;
use User\Domain\ValueObjects\Language;
use User\Domain\ValueObjects\LastName;
use User\Domain\ValueObjects\Password;
use User\Domain\ValueObjects\PasswordHash;
use User\Domain\ValueObjects\RecoveryToken;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\Status;

/** @package User\Domain\Entities */
#[ORM\Entity]
#[ORM\Table(name: 'user')]
#[ORM\Index(columns: ['first_name'])]
#[ORM\Index(columns: ['last_name'])]
class UserEntity
{
    /**
     * A unique numeric identifier of the entity. Don't set this property
     * programmatically. It is automatically set by Doctrine ORM.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Column(type: Types::SMALLINT, enumType: Role::class, name: 'role')]
    private Role $role;

    /** The email of the user entity */
    #[ORM\Embedded(class: Email::class, columnPrefix: false)]
    private Email $email;

    /** Password hash of the user */
    #[ORM\Embedded(class: PasswordHash::class, columnPrefix: false)]
    private PasswordHash $passwordHash;

    /** First name of the user entity */
    #[ORM\Embedded(class: FirstName::class, columnPrefix: false)]
    private FirstName $firstName;

    /** Last name of the user entity */
    #[ORM\Embedded(class: LastName::class, columnPrefix: false)]
    private LastName $lastName;

    /** Language of the user */
    #[ORM\Embedded(class: Language::class, columnPrefix: false)]
    private Language $language;

    /** Creation date and time of the entity */
    #[ORM\Column(type: 'datetime', name: 'created_at')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: 'datetime', name: 'updated_at', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    #[ORM\Column(type: Types::SMALLINT, enumType: Status::class, name: 'status')]
    private Status $status;

    #[ORM\Embedded(class: RecoveryToken::class, columnPrefix: false)]
    private RecoveryToken $recoveryToken;

    #[ORM\Embedded(class: IsEmailVerified::class, columnPrefix: false)]
    private IsEmailVerified $isEmailVerified;

    #[ORM\Embedded(class: EmailVerificationToken::class, columnPrefix: false)]
    private EmailVerificationToken $emailVerificationToken;

    #[ORM\OneToMany(targetEntity: SubscriptionEntity::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
    private Collection&Selectable $subscriptions;

    #[ORM\OneToOne(targetEntity: SubscriptionEntity::class)]
    #[ORM\JoinColumn(name: 'active_subscription_id', nullable: true)]
    private ?SubscriptionEntity $activeSubscription = null;

    public function __construct(
        Email $email,
        FirstName $firstName,
        LastName $lastName
    ) {
        $this->id = new Id();
        $this->role = Role::USER;
        $this->email = $email;
        $this->passwordHash = new PasswordHash();
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->language = new Language();
        $this->createdAt = new DateTime();
        $this->status = Status::ACTIVE;
        $this->recoveryToken = new RecoveryToken();

        $this->isEmailVerified = new IsEmailVerified();
        $this->emailVerificationToken = new EmailVerificationToken(Uuid::uuid4()->toString());

        $this->subscriptions = new ArrayCollection();
    }

    /** @return Id  */
    public function getId(): Id
    {
        return $this->id;
    }

    /** @return Role  */
    public function getRole(): Role
    {
        return $this->role;
    }

    /**
     * @param Role $role
     * @return UserEntity
     */
    public function setRole(Role $role): self
    {
        $this->role = $role;
        return $this;
    }

    /** @return Email  */
    public function getEmail(): Email
    {
        return $this->email;
    }

    /** @return FirstName  */
    public function getFirstName(): FirstName
    {
        return $this->firstName;
    }

    /**
     * @param FirstName $firstName
     * @return UserEntity
     */
    public function setFirstName(FirstName $firstName): self
    {
        $this->firstName = $firstName;
        return $this;
    }

    /** @return LastName  */
    public function getLastName(): LastName
    {
        return $this->lastName;
    }

    /**
     * @param LastName $lastName
     * @return UserEntity
     */
    public function setLastName(LastName $lastName): self
    {
        $this->lastName = $lastName;
        return $this;
    }

    /** @return Language  */
    public function getLanguage(): Language
    {
        return $this->language;
    }

    /**
     * @param Language $language
     * @return UserEntity
     */
    public function setLanguage(Language $language): self
    {
        $this->language = $language;
        return $this;
    }

    /** @return DateTimeInterface  */
    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    /** @return null|DateTimeInterface  */
    public function getUpdatedAt(): ?DateTimeInterface
    {
        return $this->updatedAt;
    }

    /** @return Status  */
    public function getStatus(): Status
    {
        return $this->status;
    }

    /**
     * @param Status $status
     * @return UserEntity
     */
    public function setStatus(Status $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getRecoveryToken(): RecoveryToken
    {
        return $this->recoveryToken;
    }

    public function generateRecoveryToken(): void
    {
        $this->recoveryToken = new RecoveryToken(Uuid::uuid4()->toString());
    }

    public function validateRecoveryToken(RecoveryToken $token): true
    {
        if ($this->recoveryToken->value !== $token->value) {
            throw new InvalidTokenException($this, $token);
        }

        return true;
    }

    public function isEmailVerified(): IsEmailVerified
    {
        return $this->isEmailVerified;
    }

    public function verifyEmail(EmailVerificationToken $token): void
    {
        if ($this->emailVerificationToken->value !== $token->value) {
            throw new InvalidTokenException($this, $token);
        }

        $this->isEmailVerified = new IsEmailVerified(true);
        $this->emailVerificationToken = new EmailVerificationToken();
    }

    public function getEmailVerificationToken(): EmailVerificationToken
    {
        return $this->emailVerificationToken;
    }

    public function unverifyEmail(): void
    {
        $this->isEmailVerified = new IsEmailVerified(false);
        $this->emailVerificationToken = new EmailVerificationToken(
            Uuid::uuid4()->toString()
        );
    }

    /**
     * @return Traversable<SubscriptionEntity>
     * @throws Exception 
     */
    public function getSubscriptions(): Traversable
    {
        return $this->subscriptions->getIterator();
    }

    /** @return SubscriptionEntity|null  */
    public function getActiveSubscription(): ?SubscriptionEntity
    {
        return $this->activeSubscription;
    }

    /**
     * @param SubscriptionEntity $subscription 
     * @return UserEntity 
     * @throws LogicException 
     */
    public function setActiveSubscription(
        SubscriptionEntity $subscription
    ): self {
        if ($subscription->getStatus() != SubscriptionStatus::ACTIVE) {
            throw new LogicException('Subscription is not in active status');
        }

        if ($subscription->getUser()->getId() != $this->id) {
            throw new LogicException(sprintf(
                'Subscription<%s> does not belong to user<%s>',
                $subscription->getId()->getValue(),
                $this->id->getValue()
            ));
        }

        if ($subscription->getPlan()->getBillingCycle() == BillingCycle::ONE_TIME) {
            throw new LogicException(sprintf(
                'Subscription<%s> is a one-time plan',
                $subscription->getId()->getValue()
            ));
        }

        $this->activeSubscription = $subscription;
        return $this;
    }

    /** @return UserEntity  */
    public function removeActiveSubscription(): self
    {
        if ($this->activeSubscription) {
            $this->activeSubscription->cancel();
            $this->activeSubscription = null;
        }

        return $this;
    }

    public function findSubscription(Id $id): SubscriptionEntity
    {
        /** @var SubscriptionEntity */
        foreach ($this->subscriptions as $sub) {
            if ($sub->getId()->getValue() == $id->getValue()) {
                return $sub;
            }
        }

        throw new SubscriptionNotFoundException($this, $id);
    }

    /**
     * Password is required to change the email
     *
     * @param Email $email
     * @param Password $password
     * @return UserEntity
     * @throws InvalidPasswordException
     */
    public function updateEmail(Email $email, Password $password): self
    {
        $this->verifyPassword($password);

        $this->email = $email;
        $this->isEmailVerified = new IsEmailVerified(false);
        $this->emailVerificationToken = new EmailVerificationToken(
            Uuid::uuid4()->toString()
        );

        return $this;
    }

    /**
     * Current password is required to change the password
     *
     * @param Password $currentPassword
     * @param Password $password
     * @return UserEntity
     * @throws InvalidPasswordException
     */
    public function updatePassword(
        Password $currentPassword,
        Password $password
    ): self {
        $this->verifyPassword($currentPassword);

        if ($currentPassword->value === $password->value) {
            throw new InvalidPasswordException(
                $this,
                $password,
                InvalidPasswordException::TYPE_SAME_AS_OLD
            );
        }

        $this->setPassword($password);
        return $this;
    }

    public function resetPassword(
        RecoveryToken $token,
        Password $password
    ): self {
        // Validate the recovery token
        $this->validateRecoveryToken($token);

        // Set the new password
        $this->setPassword($password);

        // Reset the recovery token
        $this->recoveryToken = new RecoveryToken();

        return $this;
    }

    /**
     * @param Password $password
     * @return bool
     * @throws InvalidPasswordException
     */
    public function verifyPassword(Password $password): bool
    {
        if (
            !$this->passwordHash->value
            || !password_verify(
                $password->value,
                $this->passwordHash->value
            )
        ) {
            throw new InvalidPasswordException(
                $this,
                $password,
                InvalidPasswordException::TYPE_INCORRECT
            );
        }

        return true;
    }

    public function hasPassword(): bool
    {
        return !is_null($this->passwordHash->value);
    }

    /**
     * @param PlanEntity $plan
     * @param CurrencyCode $currency
     * @param PaymentGateway $paymentGateway
     * @param TrialPeriodDays $trialPeriodDays
     * @return SubscriptionEntity
     * @throws Exception
     */
    public function subscribeToPlan(
        PlanEntity $plan,
        CurrencyCode $currency,
        PaymentGateway $paymentGateway,
        TrialPeriodDays $trialPeriodDays
    ): SubscriptionEntity {
        $sub = new SubscriptionEntity(
            $this,
            $plan,
            $currency,
            $paymentGateway,
            $this->isEligibleForTrial()
                ? $trialPeriodDays
                : new TrialPeriodDays(null)
        );

        $this->subscriptions->add($sub);
        return $sub;
    }

    /**
     * @param Password $password
     * @return void
     */
    public function setPassword(Password $password): void
    {
        $this->passwordHash = new PasswordHash(
            $password->value ?
                password_hash($password->value, PASSWORD_DEFAULT)
                : null
        );
    }

    /** @return void  */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    /**
     * @param Usage $usage 
     * @return void 
     * @throws Exception 
     */
    public function useCredit(Usage $usage): void
    {
        $sub = $this->getActiveSubscription();

        if ($sub) {
            $usage = $sub->useCredit($usage);
        }

        if ($usage->value == 0) {
            return;
        }

        $criteria = Criteria::create()
            ->where(Criteria::expr()->eq('status', SubscriptionStatus::ACTIVE))
            ->orderBy(['createdAt' => Criteria::ASC]);

        $packs = $this->subscriptions->matching($criteria);

        foreach ($packs as $pack) {
            if ($pack->getPlan()->getBillingCycle() != BillingCycle::ONE_TIME) {
                continue;
            }

            $usage = $pack->useCredit($usage);

            if ($usage->value == 0) {
                break;
            }
        }
    }

    /**
     * @return bool 
     * @throws Exception 
     */
    public function isEligibleForTrial(): bool
    {
        $criteria = Criteria::create()
            ->where(Criteria::expr()->eq('status', SubscriptionStatus::ACTIVE))
            ->orderBy(['createdAt' => Criteria::ASC]);

        $subs = $this->subscriptions->matching($criteria);

        /** @var SubscriptionEntity */
        foreach ($subs as $sub) {
            if ($sub->getTrialPeriodDays()->value) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return Traversable<SubscriptionEntity>
     * @throws Exception 
     */
    public function getTokenPacks(): Traversable
    {
        $criteria = Criteria::create()
            ->where(Criteria::expr()->eq('status', SubscriptionStatus::ACTIVE))
            ->orderBy(['createdAt' => Criteria::ASC]);

        $packs = $this->subscriptions->matching($criteria);

        foreach ($packs as $pack) {
            if ($pack->getPlan()->getBillingCycle() != BillingCycle::ONE_TIME) {
                continue;
            }

            yield $pack;
        }
    }

    /**
     * @return Count 
     * @throws Exception 
     */
    public function getTokenCredit(): Count
    {
        $count = 0;
        $sub = $this->getActiveSubscription();

        if ($sub) {
            $value = $sub->getTokenCredit()->value;

            if (is_null($value)) {
                return new Count(null);
            }

            $count += $sub->getTokenCredit()->value;
        }

        foreach ($this->getTokenPacks() as $pack) {
            $value = $pack->getTokenCredit()->value;

            if (is_null($value)) {
                return new Count(null);
            }

            $count += $pack->getTokenCredit()->value;
        }

        return new Count($count);
    }

    /**
     * @return Count 
     * @throws Exception 
     */
    public function getImageCredit(): Count
    {
        $count = 0;
        $sub = $this->getActiveSubscription();

        if ($sub) {
            $value = $sub->getImageCredit()->value;

            if (is_null($value)) {
                return new Count(null);
            }

            $count += $sub->getImageCredit()->value;
        }

        foreach ($this->getTokenPacks() as $pack) {
            $value = $pack->getTokenCredit()->value;

            if (is_null($value)) {
                return new Count(null);
            }

            $count += $pack->getImageCredit()->value;
        }

        return new Count($count);
    }

    /**
     * @return Count 
     * @throws Exception 
     */
    public function getAudioCredit(): Count
    {
        $count = 0;
        $sub = $this->getActiveSubscription();

        if ($sub) {
            $value = $sub->getAudioCredit()->value;

            if (is_null($value)) {
                return new Count(null);
            }

            $count += $sub->getAudioCredit()->value;
        }

        foreach ($this->getTokenPacks() as $pack) {
            $value = $pack->getTokenCredit()->value;

            if (is_null($value)) {
                return new Count(null);
            }

            $count += $pack->getAudioCredit()->value;
        }

        return new Count($count);
    }
}
