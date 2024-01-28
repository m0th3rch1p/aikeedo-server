<?php

namespace Aws\Application\Messages;

class EntitlementMessage
{
    private $customerIdentifier;
    private $productCode;
    private $entitlementStatus;
    private $effectiveDate;

    /**
     * @return mixed
     */
    public function getCustomerIdentifier()
    {
        return $this->customerIdentifier;
    }

    /**
     * @return mixed
     */
    public function getProductCode()
    {
        return $this->productCode;
    }

    /**
     * @return mixed
     */
    public function getEntitlementStatus()
    {
        return $this->entitlementStatus;
    }

    /**
     * @return mixed
     */
    public function getEffectiveDate()
    {
        return $this->effectiveDate;
    }


}