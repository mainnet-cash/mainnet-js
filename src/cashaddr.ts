import {
  authenticationTemplateP2pkhNonHd,
  authenticationTemplateToCompilerBCH,
  CashAddressNetworkPrefix,
  CompilationData,
  lockingBytecodeToCashAddress,
  validateAuthenticationTemplate,
} from "@bitauth/libauth";

// Given a private key and network, derive cashaddr from the locking code
// TODO, is there a more direct way to do this?
// TODO, This can be moved off the Wallet Class
export async function deriveCashAddr(
  privateKey: Uint8Array,
  networkPrefix: CashAddressNetworkPrefix
) {
  const lockingScript = "lock";
  const template = validateAuthenticationTemplate(
    authenticationTemplateP2pkhNonHd
  );
  if (typeof template === "string") {
    throw new Error("Address template error");
  }
  const lockingData: CompilationData<never> = {
    keys: { privateKeys: { key: privateKey } },
  };
  const compiler = await authenticationTemplateToCompilerBCH(template);
  const lockingBytecode = compiler.generateBytecode(lockingScript, lockingData);

  if (!lockingBytecode.success) {
    throw Error(JSON.stringify(lockingBytecode));
  } else {
    return lockingBytecodeToCashAddress(
      lockingBytecode.bytecode,
      networkPrefix
    );
  }
}
