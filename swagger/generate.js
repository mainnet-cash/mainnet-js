const { spawnSync } = require("child_process");
let USER = require("os").userInfo().username
let args = process.argv.slice(); // remove ts-node
args.shift(); // remove ts-node
args.shift(); // remove cli.ts

(async () => {
    let command = args.shift();
    let dockerArgs = [`run`, `--rm`, `--user`, `${process.geteuid()}:${process.getegid()}`, 
    `-v`, `${process.cwd()}:/local`, 
    `2qxx/openapi-generator`, 
    `generate`,
    `--git-repo-id=mainnet-${command}-generated`, 
    `--git-user-id=mainnet-cash`,
     `-i`, `/local/swagger/v1/api.yml`, `-g`, command,
     `-o`, `/local/generated/client/${command}`]
    let additionalProperties = []
    switch (command) {
        case "php":
            additionalProperties = [`--additional-properties=packageName=Mainnet,invokerPackage=Mainnet`];
            break;
        case "python":
            additionalProperties = [`--additional-properties=packageName=mainnet,projectName=mainnet`];
            break;
        default:
            console.log(`${command} had no additional arguments`);
    }
    const cli = spawnSync(`docker`, dockerArgs.concat(additionalProperties));
    if (cli.stderr.length > 0) {
        console.log(cli.stderr.toString());
    }
    console.log(cli.stdout.toString());
    
})();
