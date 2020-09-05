
var QRCode = require("qrcode-svg");

export function qrAddress(address:string, size=256): string{
    return new QRCode(
        {content:address,
        width:size,
        height:size
    }
    ).svg();
}


