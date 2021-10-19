const fs = require('fs');
const { exit } = require('process');
const core = require('@actions/core');
const { request } = require('@octokit/request');

const myArgs = process.argv.slice(2);

const pJson = require(`${myArgs[0]}/package.json`)

const version = pJson.version;
const repoName = pJson.name; 

function checkForBetaVersion(version) {
    if (version.includes('-')){
        exit(0); //skip this package but continue trying to release others
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
    
    if(releaseInfo === ''){
        core.setFailed("No release info found, either missing in changelog or changelog is formatted incorrectly")
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
        owner: 'subquery',
        name: `[${version}] ${repoName}`,
        repo: 'subql',
        tag_name: `${repoTagName[1]}/${version}`,
        body: releaseInfo
    }).catch( err => {
        core.setFailed(err)
    })

    console.log("Release Created...")  
}
 
checkForBetaVersion(version);

const releaseInfo = gatherReleaseInfo(`./packages/common/CHANGELOG.md`);

publishRelease(releaseInfo);
