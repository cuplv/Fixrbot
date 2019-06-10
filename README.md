# Fixrbot

[![Build Status](https://travis-ci.org/cuplv/Fixrbot.svg?branch=master)](https://travis-ci.org/cuplv/Fixrbot)

Fixrbot is a GitHub App that analyses the API usage patterns of the Java Programming Language. Go to [the public github app page](https://github.com/apps/cuplv-fixrbot) to integrate this app into your java application build pipeline. This project is built upon the [Probot](https://probot.github.io) project.

## Setup Locally

### Install Dependencies

```shell
npm install
```

### Run the bot

```shell
npm run build
npm start
```

### Run tests

```shell
npm test
```

### Configuring the Github App

You need to a corresponding Github App to use the bot on Github. You can follow either the instructions of [configuring a GitHub app](https://probot.github.io/docs/development/#configuring-a-github-app) automatically or [Manually Configuring a GitHub App](https://probot.github.io/docs/development/#manually-configuring-a-github-app). The important part is to set up the environment variable in `.env` and download the private key from the Github App into the root of this project.

## Deployment

The bot is currently deployed on [heroku](https://fixrbot.herokuapp.com/probot), refer [this section](https://probot.github.io/docs/deployment/#heroku) of the probot documentation to learn more.
