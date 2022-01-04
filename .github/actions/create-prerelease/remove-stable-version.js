const fs = require('fs');
const myArgs = process.argv.slice(2);
const pJson = require(`${myArgs[0]}/package.json`)

if (pJson.stableVersion){
    delete pJson.stableVersion
    fs.writeFileSync(`${myArgs[0]}/package.json`, JSON.stringify(pJson, null, 2))
}
