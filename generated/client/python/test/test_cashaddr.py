# coding: utf-8

"""
    Mainnet Cash

    A developer friendly bitcoin cash wallet api  This API is currently in active development, breaking changes may be made prior to official release of version 1.  **Important:** modifying this library to prematurely operate on mainnet may result in loss of funds   # noqa: E501

    The version of the OpenAPI document: 0.0.2
    Contact: hello@mainnet.cash
    Generated by: https://openapi-generator.tech
"""


from __future__ import absolute_import

import unittest
import datetime

import openapi_client
from openapi_client.models.cashaddr import Cashaddr  # noqa: E501
from openapi_client.rest import ApiException

class TestCashaddr(unittest.TestCase):
    """Cashaddr unit test stubs"""

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def make_instance(self, include_optional):
        """Test Cashaddr
            include_option is a boolean, when False only required
            params are included, when True both required and
            optional params are included """
        # model = openapi_client.models.cashaddr.Cashaddr()  # noqa: E501
        if include_optional :
            return Cashaddr(
                cashaddr = 'bchtest:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0'
            )
        else :
            return Cashaddr(
        )

    def testCashaddr(self):
        """Test Cashaddr"""
        inst_req_only = self.make_instance(include_optional=False)
        inst_req_and_optional = self.make_instance(include_optional=True)


if __name__ == '__main__':
    unittest.main()
