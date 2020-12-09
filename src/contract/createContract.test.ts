import {
  createContract,
  createContractResponse,
  contractFromId,
} from "./createContract";

describe(`Create Contract Tests`, () => {
  test("Should create an escrow contract", async () => {
    let contract = await createContract({
      type: "escrow",
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 5000,
    });

    expect(contract.getDepositAddress()).toBe(
      "bchtest:pqx9kffugfzrrl3z94f8h35g7cj7ma85ls92csf2s6"
    );
    expect(contract.toString().length).toBeGreaterThan(30);
    expect(contract.toString()).toBe(
      (await contractFromId(contract.toString())).toString()
    );
    expect(contract.toString().slice(0, 8)).toBe("testnet␝");
  });

  test("Should create return a contract object", async () => {
    let response = await createContractResponse({
      type: "escrow",
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 5000,
    });

    expect(response.cashaddr).toBe(
      "bchtest:pqx9kffugfzrrl3z94f8h35g7cj7ma85ls92csf2s6"
    );
    expect(response.contractId).toBe(
      (await contractFromId(response.contractId)).toString()
    );
  });

  test("Should create a contract from serialized id", async () => {
    let createResponse = await createContractResponse({
      type: "escrow",
      sellerAddr: "bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e",
      buyerAddr: "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
      arbiterAddr: "bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8",
      amount: 12000,
      nonce: 1,
    });

    let response = await contractFromId(createResponse.contractId);
    expect(response.getDepositAddress()).toBe(createResponse.cashaddr);
    expect(response.toString().slice(0, 201)).toBe(
      createResponse.contractId.slice(0, 201)
    );
  });
});
