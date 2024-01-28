<?php

declare(strict_types=1);

use Easy\Http\Message\StatusCode;
use PHPUnit\Framework\TestCase;

class StatusCodeEnumTest extends TestCase
{
    /** @test */
    public function assertGetPhase(): void
    {
        foreach (StatusCode::cases() as $enum) {
            match ($enum) {
                StatusCode::CONTINUE => $this->assertEquals('Continue', $enum->getPhrase()),
                StatusCode::SWITCHING_PROTOCOLS => $this->assertEquals('Switching Protocols', $enum->getPhrase()),
                StatusCode::PROCESSING => $this->assertEquals('Processing', $enum->getPhrase()),
                StatusCode::EARLY_HINTS => $this->assertEquals('Early Hints', $enum->getPhrase()),
                StatusCode::OK => $this->assertEquals('OK', $enum->getPhrase()),
                StatusCode::CREATED => $this->assertEquals('Created', $enum->getPhrase()),
                StatusCode::ACCEPTED => $this->assertEquals('Accepted', $enum->getPhrase()),
                StatusCode::NON_AUTHORITATIVE_INFORMATION => $this->assertEquals('Non-Authoritative Information', $enum->getPhrase()),
                StatusCode::NO_CONTENT => $this->assertEquals('No Content', $enum->getPhrase()),
                StatusCode::RESET_CONTENT => $this->assertEquals('Reset Content', $enum->getPhrase()),
                StatusCode::PARTIAL_CONTENT => $this->assertEquals('Partial Content', $enum->getPhrase()),
                StatusCode::MULTI_STATUS => $this->assertEquals('Multi-Status', $enum->getPhrase()),
                StatusCode::ALREADY_REPORTED => $this->assertEquals('Already Reported', $enum->getPhrase()),
                StatusCode::IM_USED => $this->assertEquals('IM Used', $enum->getPhrase()),
                StatusCode::MULTIPLE_CHOICES => $this->assertEquals('Multiple Choices', $enum->getPhrase()),
                StatusCode::MOVED_PERMANENTLY => $this->assertEquals('Moved Permanently', $enum->getPhrase()),
                StatusCode::FOUND => $this->assertEquals('Found', $enum->getPhrase()),
                StatusCode::SEE_OTHER => $this->assertEquals('See Other', $enum->getPhrase()),
                StatusCode::NOT_MODIFIED => $this->assertEquals('Not Modified', $enum->getPhrase()),
                StatusCode::USE_PROXY => $this->assertEquals('Use Proxy', $enum->getPhrase()),
                StatusCode::RESERVED => $this->assertEquals('Reserved', $enum->getPhrase()),
                StatusCode::TEMPORARY_REDIRECT => $this->assertEquals('Temporary Redirect', $enum->getPhrase()),
                StatusCode::PERMANENT_REDIRECT => $this->assertEquals('Permanent Redirect', $enum->getPhrase()),
                StatusCode::BAD_REQUEST => $this->assertEquals('Bad Request', $enum->getPhrase()),
                StatusCode::UNAUTHORIZED => $this->assertEquals('Unauthorized', $enum->getPhrase()),
                StatusCode::PAYMENT_REQUIRED => $this->assertEquals('Payment Required', $enum->getPhrase()),
                StatusCode::FORBIDDEN => $this->assertEquals('Forbidden', $enum->getPhrase()),
                StatusCode::NOT_FOUND => $this->assertEquals('Not Found', $enum->getPhrase()),
                StatusCode::METHOD_NOT_ALLOWED => $this->assertEquals('Method Not Allowed', $enum->getPhrase()),
                StatusCode::NOT_ACCEPTABLE => $this->assertEquals('Not Acceptable', $enum->getPhrase()),
                StatusCode::PROXY_AUTHENTICATION_REQUIRED => $this->assertEquals('Proxy Authentication Required', $enum->getPhrase()),
                StatusCode::REQUEST_TIMEOUT => $this->assertEquals('Request Timeout', $enum->getPhrase()),
                StatusCode::CONFLICT => $this->assertEquals('Conflict', $enum->getPhrase()),
                StatusCode::GONE => $this->assertEquals('Gone', $enum->getPhrase()),
                StatusCode::LENGTH_REQUIRED => $this->assertEquals('Length Required', $enum->getPhrase()),
                StatusCode::PRECONDITION_FAILED => $this->assertEquals('Precondition Failed', $enum->getPhrase()),
                StatusCode::PAYLOAD_TOO_LARGE => $this->assertEquals('Payload Too Large', $enum->getPhrase()),
                StatusCode::URI_TOO_LONG => $this->assertEquals('URI Too Long', $enum->getPhrase()),
                StatusCode::UNSUPPORTED_MEDIA_TYPE => $this->assertEquals('Unsupported Media Type', $enum->getPhrase()),
                StatusCode::RANGE_NOT_SATISFIABLE => $this->assertEquals('Range Not Satisfiable', $enum->getPhrase()),
                StatusCode::EXPECTATION_FAILED => $this->assertEquals('Expectation Failed', $enum->getPhrase()),
                StatusCode::IM_A_TEAPOT => $this->assertEquals('I\'m a teapot', $enum->getPhrase()),
                StatusCode::MISDIRECTED_REQUEST => $this->assertEquals('Misdirected Request', $enum->getPhrase()),
                StatusCode::UNPROCESSABLE_ENTITY => $this->assertEquals('Unprocessable Entity', $enum->getPhrase()),
                StatusCode::LOCKED => $this->assertEquals('Locked', $enum->getPhrase()),
                StatusCode::FAILED_DEPENDENCY => $this->assertEquals('Failed Dependency', $enum->getPhrase()),
                StatusCode::TOO_EARLY => $this->assertEquals('Too Early', $enum->getPhrase()),
                StatusCode::UPGRADE_REQUIRED => $this->assertEquals('Upgrade Required', $enum->getPhrase()),
                StatusCode::PRECONDITION_REQUIRED => $this->assertEquals('Precondition Required', $enum->getPhrase()),
                StatusCode::TOO_MANY_REQUESTS => $this->assertEquals('Too Many Requests', $enum->getPhrase()),
                StatusCode::REQUEST_HEADER_FIELDS_TOO_LARGE => $this->assertEquals('Request Header Fields Too Large', $enum->getPhrase()),
                StatusCode::UNAVAILABLE_FOR_LEGAL_REASONS => $this->assertEquals('Unavailable For Legal Reasons', $enum->getPhrase()),
                StatusCode::INTERNAL_SERVER_ERROR => $this->assertEquals('Internal Server Error', $enum->getPhrase()),
                StatusCode::NOT_IMPLEMENTED => $this->assertEquals('Not Implemented', $enum->getPhrase()),
                StatusCode::BAD_GATEWAY => $this->assertEquals('Bad Gateway', $enum->getPhrase()),
                StatusCode::SERVICE_UNAVAILABLE => $this->assertEquals('Service Unavailable', $enum->getPhrase()),
                StatusCode::GATEWAY_TIMEOUT => $this->assertEquals('Gateway Timeout', $enum->getPhrase()),
                StatusCode::HTTP_VERSION_NOT_SUPPORTED => $this->assertEquals('HTTP Version Not Supported', $enum->getPhrase()),
                StatusCode::VARIANT_ALSO_NEGOTIATES => $this->assertEquals('Variant Also Negotiates', $enum->getPhrase()),
                StatusCode::INSUFFICIENT_STORAGE => $this->assertEquals('Insufficient Storage', $enum->getPhrase()),
                StatusCode::LOOP_DETECTED => $this->assertEquals('Loop Detected', $enum->getPhrase()),
                StatusCode::NOT_EXTENDED => $this->assertEquals('Not Extended', $enum->getPhrase()),
                StatusCode::NETWORK_AUTHENTICATION_REQUIRED => $this->assertEquals('Network Authentication Required', $enum->getPhrase()),

                default => throw new \Exception('Unknown status code: ' . $enum->name),
            };
        }
    }
}
