import {
  createContract,
  createContractResponse,
  contractFromId,
} from "./createContract";

describe(`Create Contract Tests`, () => {
  test("Do nothing", async () => {
    expect(1).toBe(1);
  });

  test("Should create an escrow contract", async () => {
    let contract = await createContract({
      type: "escrow",
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
    });

    expect(contract.getAddress()).toBe(
      "bchtest:pqzlcfjp24sclsd5n8pqlkudmatckq26c5cnhefcph"
    );
    expect(contract.toString()).toBe(
      "escrow:bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj:bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6:bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev"
    );
  });

  test("Should create return a contract object", async () => {
    let response = await createContractResponse({
      type: "escrow",
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
    });

    expect(response.address).toBe(
      "bchtest:pqzlcfjp24sclsd5n8pqlkudmatckq26c5cnhefcph"
    );
    expect(response.contractId).toBe(
      "escrow:bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj:bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6:bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev"
    );
  });

  test("Should create a contract from serialized id", async () => {
    let response = await contractFromId(
      "escrow:bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e:bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0:bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8"
    );
    expect(response.getAddress()).toBe(
      "bchreg:prddwfmk63tzsucl0mkftn4f0ydsy5wascfd4qf8h5"
    );
    expect(response.toString()).toBe(
      "escrow:bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e:bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0:bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8"
    );
  });
});
