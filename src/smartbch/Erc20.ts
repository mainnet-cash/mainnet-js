import { SlpTokenBalance, SlpTokenType } from "../slp/interface";
import {
  SmartBchWallet
} from "../wallet/Wif";
import { ethers, utils } from "ethers";


/**
 * Class to manage an Erc20 tokens.
 */
export class Erc20 {
  readonly wallet: SmartBchWallet;

  static get walletType() {
    return SmartBchWallet;
  }

  /**
   * Initializes an Slp Wallet.
   *
   * @param wallet     A non-slp wallet object
   */
  constructor(wallet: SmartBchWallet) {
    this.wallet = wallet;
  }

  /**
   * getBalance - get a token balance for a particular address
   *
   * a high-level function, see also /wallet/slp/balance REST endpoint
   *
   * @param tokenId   The id of the slp token
   *
   * @returns Promise to an SlpTokenBalance
   */
   public async getBalance(tokenId: string): Promise<SlpTokenBalance> {
    if (!tokenId) {
      throw new Error(`Invalid tokenId ${tokenId}`);
    }

    const daiContract = new ethers.Contract(tokenId, Erc20Abi, this.wallet.provider);
    const result = await Promise.all([daiContract.name(), daiContract.symbol(), daiContract.decimals(),
          daiContract.balanceOf(this.wallet.address!)]);
    result[3] = ethers.utils.formatUnits(result[3], result[2]);

    return <SlpTokenBalance>{name: result[0], ticker: result[1], decimals: result[2], value: result[3], tokenId: tokenId};
  }

}

const Erc20Abi = [
  // Some details about the token
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",

  // Get the account balance
  "function balanceOf(address) view returns (uint)",

  // Send some of your tokens to someone else
  "function transfer(address to, uint amount)",

  // An event triggered whenever anyone transfers to someone else
  "event Transfer(address indexed from, address indexed to, uint amount)"
];