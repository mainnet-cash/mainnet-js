import {qrAddress} from "./Qr"

test("Generate a qr address", async () => {
    if(process.env.ADDRESS){
        expect(typeof qrAddress(process.env.ADDRESS)).toBe("string")
    }else{
        throw Error("Cash address not set in env")
    }

  });
  