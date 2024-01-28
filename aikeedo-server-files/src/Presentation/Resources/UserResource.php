<?php

declare(strict_types=1);

namespace Presentation\Resources;

use Generator;
use Exception;
use Traversable;
use User\Domain\Entities\UserEntity;

/** @package Presentation\Resources */
class UserResource
{
    public readonly string $id;
    public readonly string $role;
    public readonly string $email;
    public readonly string $first_name;
    public readonly string $last_name;
    public readonly string $language;
    public readonly bool $has_password;
    public readonly string $avatar;
    public readonly ?int $created_at;
    public readonly ?int $updated_at;
    public readonly bool $is_elibible_for_trial;
    public readonly ?int $token_credit;
    public readonly ?int $image_credit;
    public readonly ?int $audio_credit;
    public readonly bool $is_email_verified;

    public readonly ?SubscriptionResource $subscription;
    public readonly Traversable $packs;

    /**
     * @param UserEntity $user 
     * @return void 
     */
    public function __construct(private UserEntity $user)
    {
        $this->id = $user->getId()->getValue()->toString();
        $this->role = $user->getRole()->value == 1 ? 'admin' : 'user';
        $this->email = $user->getEmail()->value;
        $this->first_name = $user->getFirstName()->value;
        $this->last_name = $user->getLastName()->value;
        $this->language = $user->getLanguage()->value;
        $this->has_password = $user->hasPassword();
        $this->avatar = "https://www.gravatar.com/avatar/" . md5($user->getEmail()->value) . "?d=blank";

        $this->created_at = $user->getCreatedAt()->getTimestamp();
        $this->updated_at = $user->getUpdatedAt()
            ? $user->getUpdatedAt()->getTimestamp()
            : null;

        $this->is_elibible_for_trial = $user->isEligibleForTrial();
        $this->token_credit = $user->getTokenCredit()->value;
        $this->image_credit = $user->getImageCredit()->value;
        $this->audio_credit = $user->getAudioCredit()->value;
        $this->is_email_verified = $user->isEmailVerified()->value ?? false;

        $this->subscription = $user->getActiveSubscription()
            ? new SubscriptionResource($user->getActiveSubscription())
            : null;

        $this->packs = $this->getPacks();
    }

    /**
     * @return Traversable<SubscriptionResource> 
     * @throws Exception 
     */
    private function getPacks(): Traversable
    {
        foreach ($this->user->getTokenPacks() as $pack) {
            yield new SubscriptionResource($pack);
        }
    }
}
