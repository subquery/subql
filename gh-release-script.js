const fs = require('fs');
const { exit } = require('process');
const { request } = require('@octokit/request');

const myArgs = process.argv.slice(2);
const pJson = require(`${myArgs[0]}/package.json`);

const version = pJson.version;
const repoName = pJson.name; 

//excluding beta versions from github releases
function checkForBetaVersion(version) {
    if (version.includes('-')){
        exit();
    }
}

function gatherReleaseInfo(logPath) {
    const changeLogs = fs.readFileSync(logPath, 'utf8');
    const regex = /## \[([0-9]+(\.[0-9]+)+)] - [0-9]{4}-[0-9]{2}-[0-9]{2}/i;
    
    let lines = changeLogs.split(/\n/);
    let releaseInfo = '';
    let i = 0;

    for(let j = 0; j < lines.length; j++){
       if(lines[j].includes(`[${version}]`)){
           i = j;
           j = lines.length;
       } 
    }

    lines = lines.slice(i);
    
    for(let j = 0; j < lines.length; j++){
        if(j == 0){
           releaseInfo += `${lines[j]}`+ '\n';
           continue;
        }        

        if(!regex.test(lines[j])){
            releaseInfo += `${lines[j]}`+ '\n';
        } else {
            j = lines.length;
        }
    }  

    console.log("Gathered release info...")  
    return releaseInfo;
}

async function publishRelease(releaseInfo) {
    const repoTagName = repoName.split('/');

    await request('POST /repos/{owner}/{repo}/releases', {
        headers: {
            authorization: `token ${process.env.REPO_TOKEN}`,
        },
        owner: 'subql',
        name: `[${version}] ${repoName}`,
        repo: 'subql',
        tag_name: `${repoTagName[1]}/${version}`,
        body: releaseInfo
    }).catch( err => console.error(err))

    console.log("Release Created...")  
}

checkForBetaVersion(version);

const releaseInfo = gatherReleaseInfo(`${myArgs[0]}/CHANGELOG.md`);

publishRelease(releaseInfo);
