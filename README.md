# Fixrbot
Fixrbot is a GitHub App that analyses the API usage patterns.

[![Build Status](https://travis-ci.org/cuplv/Fixrbot.svg?branch=master)](https://travis-ci.org/cuplv/Fixrbot)

## Setup

```sh
# Install dependencies
npm install

#If this doesn't initially install node-fetch and probot, install
npm install node-fetch
npm i @types/node
npm install probot

# Run typescript
npm run build

# Run the bot
npm start
```
## Deployment
The bot has been deployed to  https://vast-atoll-23282.herokuapp.com/ with all changes as of May 31 2019.

If you need to redeploy it, the deployment of the bot follows the process discussed in [Deployment | Probot](https://probot.github.io/docs/deployment/).
These instructions should be sufficient, but if you receive an error trying to deplay that you have both yarn.lock and package-lock.json, you may need to delete it, and if you still have issues, you may need to re-clone the repository. It doesn't currently have a yarn.lock file.
You should use a .pem file for your private key.
