<?php


namespace Aws\Infrastructure\Aws\Sns\Services;

use Aws\Domain\Repositories\SnsServiceInterface;

class SubscriptionSnsService extends SnsService implements SnsServiceInterface
{
    private string $url = "/api/aws/subscription/webhook";
//    private string $url = "arn:aws:sqs:us-east-1:436917423698:chatrov2";
    private string $topicArn = "arn:aws:sns:us-east-1:287250355862:aws-mp-subscription-notification-1cothn9ewdy8kts24xi9fre3y";
    private string $protocol = "https";

    public function subscribe(string $url, string $protocol = null, string $topic = null): \Aws\Result
    {
        return parent::subscribe($url.$this->getUrl(), $this->getProtocol(), $this->getArnTopic());    }

    public function getArnTopic(): string
    {
        // TODO: Implement getArnTopic() method.
        return $this->topicArn;
    }

    public function getUrl(): string
    {
        // TODO: Implement getUrl() method.
        return $this->url;
    }

    public function getProtocol(): string
    {
        // TODO: Implement getProtocol() method.
        return $this->protocol;
    }
}