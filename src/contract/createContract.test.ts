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
      amount: 5000
    });

    expect(contract.getAddress()).toBe(
      "bchtest:pqx9kffugfzrrl3z94f8h35g7cj7ma85ls92csf2s6"
    );
    expect(contract.toString().slice(0,211)).toBe(
      "escrow:bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj:bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6:bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev:5000:0:%7B%22contractName%22%3A%22EscrowContract%22"
    );
  });

  test("Should create return a contract object", async () => {
    let response = await createContractResponse({
      type: "escrow",
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 5000
    });

    expect(response.address).toBe(
      "bchtest:pqx9kffugfzrrl3z94f8h35g7cj7ma85ls92csf2s6"
    );
    expect(response.contractId.slice(0,211)).toBe(
      "escrow:bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj:bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6:bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev:5000:0:%7B%22contractName%22%3A%22EscrowContract%22"
    );
  });

  test("Should create a contract from serialized id", async () => {
    let response = await contractFromId(
      "escrow:bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e:bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0:bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8:12000:1"
    );

    let createResponse = await createContractResponse({
      type: "escrow",
      sellerAddr: "bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e",
      buyerAddr: "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
      arbiterAddr: "bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8",
      amount: 12000,
      nonce:1
    });
    expect(response.getAddress()).toBe(
      createResponse.address
    );
    expect(response.toString().slice(0,201)).toBe(
      createResponse.contractId.slice(0,201)
    );
  });
});
