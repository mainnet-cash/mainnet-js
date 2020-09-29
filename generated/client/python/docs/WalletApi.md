# openapi_client.WalletApi

All URIs are relative to *http://localhost:3000/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**balance**](WalletApi.md#balance) | **POST** /wallet/balance | Get total balance for wallet
[**create_wallet**](WalletApi.md#create_wallet) | **POST** /wallet | create a new wallet
[**deposit_address**](WalletApi.md#deposit_address) | **POST** /wallet/deposit_address | Get a deposit address in cash address format
[**deposit_qr**](WalletApi.md#deposit_qr) | **POST** /wallet/deposit_qr | Get receiving cash address as a qrcode
[**max_amount_to_send**](WalletApi.md#max_amount_to_send) | **POST** /wallet/max_amount_to_send | Get maximum spendable amount
[**send**](WalletApi.md#send) | **POST** /wallet/send | Send some amount to a given address
[**send_max**](WalletApi.md#send_max) | **POST** /wallet/send_max | Send all available funds to a given address
[**utxos**](WalletApi.md#utxos) | **POST** /wallet/utxo | Get detailed information about unspent outputs (utxos)


# **balance**
> BalanceResponse balance(serialized_wallet)

Get total balance for wallet

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    serialized_wallet = openapi_client.SerializedWallet() # SerializedWallet | Request for a wallet balance 

    try:
        # Get total balance for wallet
        api_response = api_instance.balance(serialized_wallet)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->balance: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **serialized_wallet** | [**SerializedWallet**](SerializedWallet.md)| Request for a wallet balance  | 

### Return type

[**BalanceResponse**](BalanceResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | successful operation |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **create_wallet**
> WalletResponse create_wallet(wallet_request)

create a new wallet

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    wallet_request = openapi_client.WalletRequest() # WalletRequest | Request a new new random wallet

    try:
        # create a new wallet
        api_response = api_instance.create_wallet(wallet_request)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->create_wallet: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **wallet_request** | [**WalletRequest**](WalletRequest.md)| Request a new new random wallet | 

### Return type

[**WalletResponse**](WalletResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | successful operation |  -  |
**405** | Invalid input |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deposit_address**
> DepositAddressResponse deposit_address(serialized_wallet)

Get a deposit address in cash address format

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    serialized_wallet = openapi_client.SerializedWallet() # SerializedWallet | Request for a deposit address given a wallet 

    try:
        # Get a deposit address in cash address format
        api_response = api_instance.deposit_address(serialized_wallet)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->deposit_address: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **serialized_wallet** | [**SerializedWallet**](SerializedWallet.md)| Request for a deposit address given a wallet  | 

### Return type

[**DepositAddressResponse**](DepositAddressResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | successful operation |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deposit_qr**
> ScalableVectorGraphic deposit_qr(serialized_wallet)

Get receiving cash address as a qrcode

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    serialized_wallet = openapi_client.SerializedWallet() # SerializedWallet | Request for a deposit cash address as a Quick Response code (qrcode) 

    try:
        # Get receiving cash address as a qrcode
        api_response = api_instance.deposit_qr(serialized_wallet)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->deposit_qr: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **serialized_wallet** | [**SerializedWallet**](SerializedWallet.md)| Request for a deposit cash address as a Quick Response code (qrcode)  | 

### Return type

[**ScalableVectorGraphic**](ScalableVectorGraphic.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | A Qr code image data encoded string in the src field suitable for inclusion in html using:    - \\&lt;img src\\&#x3D;\\\&quot;{response.src}\&quot;\\&gt;                  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **max_amount_to_send**
> BalanceResponse max_amount_to_send(max_amount_to_send_request)

Get maximum spendable amount

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    max_amount_to_send_request = openapi_client.MaxAmountToSendRequest() # MaxAmountToSendRequest | get amount that will be spend with a spend max request

    try:
        # Get maximum spendable amount
        api_response = api_instance.max_amount_to_send(max_amount_to_send_request)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->max_amount_to_send: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **max_amount_to_send_request** | [**MaxAmountToSendRequest**](MaxAmountToSendRequest.md)| get amount that will be spend with a spend max request | 

### Return type

[**BalanceResponse**](BalanceResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | transaction accepted |  -  |
**400** | Invalid Request |  -  |
**418** | Invalid network for given address |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send**
> SendResponse send(send_request)

Send some amount to a given address

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    send_request = openapi_client.SendRequest() # SendRequest | place a send request

    try:
        # Send some amount to a given address
        api_response = api_instance.send(send_request)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->send: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **send_request** | [**SendRequest**](SendRequest.md)| place a send request | 

### Return type

[**SendResponse**](SendResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**202** | transaction accepted |  -  |
**400** | Invalid Request |  -  |
**418** | Invalid network for given address |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_max**
> SendMaxResponse send_max(send_max_request)

Send all available funds to a given address

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    send_max_request = openapi_client.SendMaxRequest() # SendMaxRequest | Request to all available funds to a given address

    try:
        # Send all available funds to a given address
        api_response = api_instance.send_max(send_max_request)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->send_max: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **send_max_request** | [**SendMaxRequest**](SendMaxRequest.md)| Request to all available funds to a given address | 

### Return type

[**SendMaxResponse**](SendMaxResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**202** | transaction accepted |  -  |
**400** | Invalid Request |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **utxos**
> UtxoResponse utxos(serialized_wallet)

Get detailed information about unspent outputs (utxos)

### Example

```python
from __future__ import print_function
import time
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint
# Defining the host is optional and defaults to http://localhost:3000/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3000/v1"
)


# Enter a context with an instance of the API client
with openapi_client.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.WalletApi(api_client)
    serialized_wallet = openapi_client.SerializedWallet() # SerializedWallet | Request detailed list of unspent transaction outputs 

    try:
        # Get detailed information about unspent outputs (utxos)
        api_response = api_instance.utxos(serialized_wallet)
        pprint(api_response)
    except ApiException as e:
        print("Exception when calling WalletApi->utxos: %s\n" % e)
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **serialized_wallet** | [**SerializedWallet**](SerializedWallet.md)| Request detailed list of unspent transaction outputs  | 

### Return type

[**UtxoResponse**](UtxoResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | successful operation |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

