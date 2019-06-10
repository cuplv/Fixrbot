# Fixrbot

Fixrbot is a GitHub App that analyses the API usage patterns of the Java Programming Language.

[![Build Status](https://travis-ci.org/cuplv/Fixrbot.svg?branch=master)](https://travis-ci.org/cuplv/Fixrbot)

## Build and test locally

### Install Dependencies

```shell
npm install
```

### Run the bot locally

```shell
npm run build
npm start
```

### Configuring the Github App

You need to a corresponding Github App to use the bot on Github. You can follow either the instructions of [configuring a GitHub app](https://probot.github.io/docs/development/#configuring-a-github-app) automatically or [Manually Configuring a GitHub App](https://probot.github.io/docs/development/#manually-configuring-a-github-app). The important part is to set up the environment variable in `.env` and download the private key from the Github App into the root of this project.
