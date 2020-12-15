# Quick start


The Starter Package is an example that you can use as a starting point for developing your SubQuery project.
A subquery package defines which data The Subquery will index from the Substrate blockchain, and how it will store it. 

## Preparation

#### Install the SubQuery CLI

Install Subquery CLI globally on your terminal by using Yarn or NPM:

```
$npm install -g @subql-cli
$yarn global add @subql-cli
```

Run help to see available commands and usage provide by CLI
```
$suqbl help
```

## Initialize the starter package

Inside the folder in which you want to create the subquery project, and run this command:

```
$subql  init --starter
```
Then you should see a directory `subql-starter` has been created inside your folder, you can use this 
as the start point of your project. And the files should be identical as in the [Directory Structure](/directory_structure).

Last, under the `suql-starter` directory, run follow command to install all the dependency.
```
$npm install
```


## Configure your project

In the starter package, we have provided a simple example of project configuration. You will be mainly working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

For more information on how to write the SubQuery, 
check out our doc section on [Define the SubQuery](/define_a_subquery) 

#### Code generation

Next, run codegen command under your project root directory.

```
$subql codegen
```

## Deploy a subquery project

#### Pack and upload

In order to deploy your subquery project to our hosted service, it is mandatory to pack your configuration before upload.
Run pack command from root directory of your project will automatically generate a `your-project-name.tgz` file.

```
$subql build
```

Last, all you need to do is upload this file to our host. 
All good to go.
