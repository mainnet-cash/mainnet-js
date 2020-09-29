# coding: utf-8

"""
    Mainnet Cash

    A developer friendly bitcoin cash wallet api  This API is currently in active development, breaking changes may be made prior to official release of version 1.  **Important:** modifying this library to prematurely operate on mainnet may result in loss of funds   # noqa: E501

    The version of the OpenAPI document: 0.0.2
    Contact: hello@mainnet.cash
    Generated by: https://openapi-generator.tech
"""


import pprint
import re  # noqa: F401

import six

from openapi_client.configuration import Configuration


class PortableNetworkGraphic(object):
    """NOTE: This class is auto generated by OpenAPI Generator.
    Ref: https://openapi-generator.tech

    Do not edit the class manually.
    """

    """
    Attributes:
      openapi_types (dict): The key is attribute name
                            and the value is attribute type.
      attribute_map (dict): The key is attribute name
                            and the value is json key in definition.
    """
    openapi_types = {
        'src': 'str'
    }

    attribute_map = {
        'src': 'src'
    }

    def __init__(self, src=None, local_vars_configuration=None):  # noqa: E501
        """PortableNetworkGraphic - a model defined in OpenAPI"""  # noqa: E501
        if local_vars_configuration is None:
            local_vars_configuration = Configuration()
        self.local_vars_configuration = local_vars_configuration

        self._src = None
        self.discriminator = None

        if src is not None:
            self.src = src

    @property
    def src(self):
        """Gets the src of this PortableNetworkGraphic.  # noqa: E501

        A Qr code image data in png format as base64 encoded string. Suitable for inclusion in html using:     - \\<img src\\=\\\"data:image/png;base64,**iVBORw0KGgoAAAANSUhEUg...   ...Jggg==**\"\\>    # noqa: E501

        :return: The src of this PortableNetworkGraphic.  # noqa: E501
        :rtype: str
        """
        return self._src

    @src.setter
    def src(self, src):
        """Sets the src of this PortableNetworkGraphic.

        A Qr code image data in png format as base64 encoded string. Suitable for inclusion in html using:     - \\<img src\\=\\\"data:image/png;base64,**iVBORw0KGgoAAAANSUhEUg...   ...Jggg==**\"\\>    # noqa: E501

        :param src: The src of this PortableNetworkGraphic.  # noqa: E501
        :type src: str
        """

        self._src = src

    def to_dict(self):
        """Returns the model properties as a dict"""
        result = {}

        for attr, _ in six.iteritems(self.openapi_types):
            value = getattr(self, attr)
            if isinstance(value, list):
                result[attr] = list(map(
                    lambda x: x.to_dict() if hasattr(x, "to_dict") else x,
                    value
                ))
            elif hasattr(value, "to_dict"):
                result[attr] = value.to_dict()
            elif isinstance(value, dict):
                result[attr] = dict(map(
                    lambda item: (item[0], item[1].to_dict())
                    if hasattr(item[1], "to_dict") else item,
                    value.items()
                ))
            else:
                result[attr] = value

        return result

    def to_str(self):
        """Returns the string representation of the model"""
        return pprint.pformat(self.to_dict())

    def __repr__(self):
        """For `print` and `pprint`"""
        return self.to_str()

    def __eq__(self, other):
        """Returns true if both objects are equal"""
        if not isinstance(other, PortableNetworkGraphic):
            return False

        return self.to_dict() == other.to_dict()

    def __ne__(self, other):
        """Returns true if both objects are not equal"""
        if not isinstance(other, PortableNetworkGraphic):
            return True

        return self.to_dict() != other.to_dict()
