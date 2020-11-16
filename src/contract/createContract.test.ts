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
    });

    expect(contract.getAddress()).toBe(
      "bchtest:pqd2q2hufc20hqlqya66x4nqqvrmy2nsfvaxvkmt6v"
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
      "bchtest:pqd2q2hufc20hqlqya66x4nqqvrmy2nsfvaxvkmt6v"
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
      "bchreg:pzcrzldz5vdyr6w4kx6vrktslh2nqaf6zvw7n009wy"
    );
    expect(response.toString()).toBe(
      "escrow:bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e:bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0:bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8"
    );
  });
});
