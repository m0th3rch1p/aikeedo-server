<?php

declare(strict_types=1);

namespace Easy\Http\Message;

/**
 * Enumaration of HTTP status codes.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
enum StatusCode: int
{
    /**
     * ------------------------------------------------------------------------
     * 1XX INFORMATION CODES
     * ------------------------------------------------------------------------
     */

    /**
     * This interim response indicates that the client should continue the
     * request or ignore the response if the request is already finished.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/100
     */
    case CONTINUE = 100;

    /**
     * This code is sent in response to an Upgrade request header from the
     * client and indicates the protocol the server is switching to.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/101
     */
    case SWITCHING_PROTOCOLS = 101;

    /**
     * This code indicates that the server has received and is processing the
     * request, but no response is available yet.
     *
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case PROCESSING = 102;

    /**
     * This status code is primarily intended to be used with the Link header,
     * letting the user agent start preloading resources while the server
     * prepares a response.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/103
     */
    case EARLY_HINTS = 103;

    /**
     * ------------------------------------------------------------------------
     * 2XX SUCCESSFUL CODES
     * ------------------------------------------------------------------------
     */

    /**
     * The request succeeded. The result meaning of "success" depends
     * on the HTTP method:
     *
     * GET: The resource has been fetched and transmitted in the message body.
     *
     * HEAD: The representation headers are included in the response without
     * any message body.
     *
     * PUT or POST: The resource describing the result of the action is
     * transmitted in the message body.
     *
     * TRACE: The message body contains the request message as received by the
     * server.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/200
     */
    case OK = 200;

    /**
     * The request succeeded, and a new resource was created as a result. This
     * is typically the response sent after POST requests, or some PUT requests.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/201
     */
    case CREATED = 201;

    /**
     * The request has been received but not yet acted upon. It is noncommittal,
     * since there is no way in HTTP to later send an asynchronous response
     * indicating the outcome of the request. It is intended for cases where
     * another process or server handles the request, or for batch processing.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/202
     */
    case ACCEPTED = 202;

    /**
     * This response code means the returned metadata is not exactly the same
     * as is available from the origin server, but is collected from a local or
     * a third-party copy. This is mostly used for mirrors or backups of another
     * resource. Except for that specific case, the 200 OK response is preferred
     * to this status.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/203
     */
    case NON_AUTHORITATIVE_INFORMATION = 203;

    /**
     * There is no content to send for this request, but the headers may be
     * useful. The user agent may update its cached headers for this resource
     * with the new ones.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/204
     */
    case NO_CONTENT = 204;

    /**
     * Tells the user agent to reset the document which sent this request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/205
     */
    case RESET_CONTENT = 205;

    /**
     * This response code is used when the Range header is sent from the
     * client to request only part of a resource.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/206
     */
    case PARTIAL_CONTENT = 206;

    /**
     * Conveys information about multiple resources, for situations where
     * multiple status codes might be appropriate.
     *
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case MULTI_STATUS = 207;

    /**
     * Used inside a <dav:propstat> response element to avoid repeatedly
     * enumerating the internal members of multiple bindings to the same
     * collection.
     *
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case ALREADY_REPORTED = 208;

    /**
     * The server has fulfilled a GET request for the resource, and the response
     * is a representation of the result of one or more instance-manipulations
     * applied to the current instance.
     *
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case IM_USED = 226;

    /**
     * ------------------------------------------------------------------------
     * 3XX REDIRECTION CODES
     * ------------------------------------------------------------------------
     */

    /**
     * The request has more than one possible response. The user agent or user
     * should choose one of them. (There is no standardized way of choosing one
     * of the responses, but HTML links to the possibilities are recommended so
     * the user can pick.)
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/300
     */
    case MULTIPLE_CHOICES = 300;

    /**
     * The URL of the requested resource has been changed permanently. The new
     * URL is given in the response.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301
     */
    case MOVED_PERMANENTLY = 301;

    /**
     * This response code means that the URI of requested resource has been
     * changed temporarily. Further changes in the URI might be made in the
     * future. Therefore, this same URI should be used by the client in
     * future requests.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302
     */
    case FOUND = 302;

    /**
     * The server sent this response to direct the client to get the requested
     * resource at another URI with a GET request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303
     */
    case SEE_OTHER = 303;

    /**
     * This is used for caching purposes. It tells the client that the response
     * has not been modified, so the client can continue to use the same cached
     * version of the response.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304
     */
    case NOT_MODIFIED = 304;

    /**
     * Defined in a previous version of the HTTP specification to indicate that
     * a requested response must be accessed by a proxy. It has been deprecated
     * due to security concerns regarding in-band configuration of a proxy.
     *
     * @deprecated Not for use in new websites
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/305
     */
    case USE_PROXY = 305;

    /**
     * This response code is no longer used; it is just reserved. It was used
     * in a previous version of the HTTP/1.1 specification.
     */
    case RESERVED = 306;

    /**
     * The server sends this response to direct the client to get the requested
     * resource at another URI with same method that was used in the prior
     * request. This has the same semantics as the 302 Found HTTP response code,
     * with the exception that the user agent must not change the HTTP method
     * used: if a POST was used in the first request, a POST must be used in the
     * second request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/307
     */
    case TEMPORARY_REDIRECT = 307;

    /**
     * This means that the resource is now permanently located at another URI,
     * specified by the Location: HTTP Response header. This has the same
     * semantics as the 301 Moved Permanently HTTP response code, with the
     * exception that the user agent must not change the HTTP method used: if a
     * POST was used in the first request, a POST must be used in the second
     * request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/308
     */
    case PERMANENT_REDIRECT = 308;

    /**
     * ------------------------------------------------------------------------
     * 4XX CLIENT ERROR CODES
     * ------------------------------------------------------------------------
     */

    /**
     * The server cannot or will not process the request due to something that
     * is perceived to be a client error (e.g., malformed request syntax,
     * invalid request message framing, or deceptive request routing).
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
     */
    case BAD_REQUEST = 400;

    /**
     * Although the HTTP standard specifies "unauthorized", semantically this
     * response means "unauthenticated". That is, the client must authenticate
     * itself to get the requested response.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
     */
    case UNAUTHORIZED = 401;

    /**
     * This response code is reserved for future use. The initial aim for
     * creating this code was using it for digital payment systems, however this
     * status code is used very rarely and no standard convention exists.
     *
     * @experimental Expect behavior to change in the future
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402
     */
    case PAYMENT_REQUIRED = 402;

    /**
     * The client does not have access rights to the content; that is, it is
     * unauthorized, so the server is refusing to give the requested resource.
     * Unlike 401 Unauthorized, the client's identity is known to the server.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403
     */
    case FORBIDDEN = 403;

    /**
     * The server cannot find the requested resource. In the browser, this means
     * the URL is not recognized. In an API, this can also mean that the
     * endpoint is valid but the resource itself does not exist. Servers may
     * also send this response instead of 403 Forbidden to hide the existence of
     * a resource from an unauthorized client. This response code is probably
     * the most well known due to its frequent occurrence on the web.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404
     */
    case NOT_FOUND = 404;

    /**
     * The request method is known by the server but is not supported by the
     * target resource. For example, an API may not allow calling DELETE to
     * remove a resource.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
     */
    case METHOD_NOT_ALLOWED = 405;

    /**
     * This response is sent when the web server, after performing server-driven
     * content negotiation, doesn't find any content that conforms to the
     * criteria given by the user agent.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/406
     */
    case NOT_ACCEPTABLE = 406;

    /**
     * This is similar to 401 but authentication is needed to be done by a
     * proxy.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/407
     */
    case PROXY_AUTHENTICATION_REQUIRED = 407;

    /**
     * This response is sent on an idle connection by some servers, even without
     * any previous request by the client. It means that the server would like
     * to shut down this unused connection. This response is used much more
     * since some browsers, like Chrome, Firefox 27+, or IE9, use HTTP pre-
     * fetching to speed up surfing. Also note that some servers merely shut
     * down the connection without sending this message.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/408
     */
    case REQUEST_TIMEOUT = 408;

    /**
     * This response is sent when a request conflicts with the current state of
     * the server.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409
     */
    case CONFLICT = 409;

    /**
     * This response is sent when the requested content has been permanently
     * deleted from server, with no forwarding address. Clients are expected to
     * remove their caches and links to the resource. The HTTP specification
     * intends this status code to be used for "limited-time, promotional
     * services". APIs should not feel compelled to indicate resources that have
     * been deleted with this status code.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/410
     */
    case GONE = 410;

    /**
     * Server rejected the request because the Content-Length header field is
     * not defined and the server requires it.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/411
     */
    case LENGTH_REQUIRED = 411;

    /**
     * The client has indicated preconditions in its headers which the server
     * does not meet.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/412
     */
    case PRECONDITION_FAILED = 412;

    /**
     * Request entity is larger than limits defined by server; the server might
     * close the connection or return an Retry-After header field.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/413
     */
    case PAYLOAD_TOO_LARGE = 413;

    /**
     * The URI requested by the client is longer than the server is willing to
     * interpret.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/414
     */
    case URI_TOO_LONG = 414;

    /**
     * The media format of the requested data is not supported by the server,
     * so the server is rejecting the request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/415
     */
    case UNSUPPORTED_MEDIA_TYPE = 415;

    /**
     * The range specified by the Range header field in the request can't be
     * fulfilled; it's possible that the range is outside the size of the
     * target URI's data.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/416
     */
    case RANGE_NOT_SATISFIABLE = 416;

    /**
     * This response code means the expectation indicated by the Expect request
     * header field can't be met by the server.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/417
     */
    case EXPECTATION_FAILED = 417;

    /**
     * The server refuses the attempt to brew coffee with a teapot.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418
     */
    case IM_A_TEAPOT = 418;

    /**
     * The request was directed at a server that is not able to produce a
     * response (for example because of connection reuse).
     */
    case MISDIRECTED_REQUEST = 421;

    /**
     * The request was well-formed but was unable to be followed due to semantic
     * errors.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case UNPROCESSABLE_ENTITY = 422;

    /**
     * The resource that is being accessed is locked.
     *
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case LOCKED = 423;

    /**
     * The request failed due to failure of a previous request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case FAILED_DEPENDENCY = 424;

    /**
     * Indicates that the server is unwilling to risk processing a request that
     * might be replayed.
     *
     * @experimental Expect behavior to change in the future
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/425
     */
    case TOO_EARLY = 425;

    /**
     * The client should switch to a different protocol such as TLS/1.0, given
     * in the Upgrade header field.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/426
     */
    case UPGRADE_REQUIRED = 426;

    /**
     * The origin server requires the request to be conditional. Intended to
     * prevent the 'lost update' problem, where a client GETs a resource's
     * state, modifies it, and PUTs it back to the server, when meanwhile a
     * third party has modified the state on the server, leading to a conflict.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/428
     */
    case PRECONDITION_REQUIRED = 428;

    /**
     * The user has sent too many requests in a given amount of time. Intended
     * for use with rate-limiting schemes.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429
     */
    case TOO_MANY_REQUESTS = 429;

    /**
     * The server is unwilling to process the request because either an
     * individual header field, or all the header fields collectively, are too
     * large.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/431
     */
    case REQUEST_HEADER_FIELDS_TOO_LARGE = 431;

    /**
     * The user agent requested a resource that cannot legally be provided, such
     * as a web page censored by a government.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/451
     */
    case UNAVAILABLE_FOR_LEGAL_REASONS = 451;

    /**
     * ------------------------------------------------------------------------
     * 5XX SERVER ERROR CODES
     * ------------------------------------------------------------------------
     */

    /**
     * The server has encountered a situation it does not know how to handle.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
     */
    case INTERNAL_SERVER_ERROR = 500;

    /**
     * The request method is not supported by the server and cannot be handled.
     * The only methods that servers are required to support (and therefore that
     * must not return this code) are GET and HEAD.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501
     */
    case NOT_IMPLEMENTED = 501;

    /**
     * This error response means that the server, while working as a gateway to
     * get a response needed to handle the request, got an invalid response.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/502
     */
    case BAD_GATEWAY = 502;

    /**
     * The server is not ready to handle the request. Common causes are a server
     * that is down for maintenance or that is overloaded. Note that together
     * with this response, a user-friendly page explaining the problem should be
     * sent. This responses should be used for temporary conditions and the
     * Retry-After HTTP header should, if possible, contain the estimated time
     * before the recovery of the service. The webmaster must also take care
     * about the caching-related headers that are sent along with this response,
     * as these temporary condition responses should usually not be cached.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/503
     */
    case SERVICE_UNAVAILABLE = 503;

    /**
     * This error response is given when the server is acting as a gateway and
     * cannot get a response in time.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/504
     */
    case GATEWAY_TIMEOUT = 504;

    /**
     * The HTTP version used in the request is not supported by the server.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/505
     */
    case HTTP_VERSION_NOT_SUPPORTED = 505;

    /**
     * The server has an internal configuration error: transparent content
     * negotiation for the request results in a circular reference.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/506
     */
    case VARIANT_ALSO_NEGOTIATES = 506;

    /**
     * The method could not be performed on the resource because the server is
     * unable to store the representation needed to successfully complete the
     * request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/507
     * @link https://developer.mozilla.org/en-US/docs/Glossary/WebDAV
     */
    case INSUFFICIENT_STORAGE = 507;

    /**
     * The server detected an infinite loop while processing the request.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/508
     */
    case LOOP_DETECTED = 508;

    /**
     * Further extensions to the request are required for the server to fulfill
     * it.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/510
     */
    case NOT_EXTENDED = 510;

    /**
     * The client needs to authenticate to gain network access. Intended for use
     * by intercepting proxies used to control access to the network (e.g.,
     * "captive portals" used to require agreement to Terms of Service before
     * granting full Internet access via a Wi-Fi hotspot).
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/511
     */
    case NETWORK_AUTHENTICATION_REQUIRED = 511;

    /** @return string  */
    public function getPhrase(): string
    {
        return match ($this) {
            self::OK => 'OK',
            self::NON_AUTHORITATIVE_INFORMATION => 'Non-Authoritative Information',
            self::MULTI_STATUS => 'Multi-Status',
            self::IM_USED => 'IM Used',
            self::URI_TOO_LONG => 'URI Too Long',
            self::IM_A_TEAPOT => "I'm a teapot",
            self::HTTP_VERSION_NOT_SUPPORTED => 'HTTP Version Not Supported',

            default => ucwords(strtolower(str_replace('_', ' ', $this->name))),
        };
    }
}
