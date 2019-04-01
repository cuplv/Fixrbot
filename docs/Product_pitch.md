# Fixrbot
## Overview
**Fixrbot** is a GitHub App that analyses the API usage patterns. It leverages our existing programming pattern-mining tool [biggroum](https://github.com/cuplv/biggroum).

## Questions
- Q: What programming language is currently supported?
  A: Our backend, the biggroum project, currently only support **java**,

- Q: How to customize the bot's behavior on my repository?
  A: Fixrbot should provide a sane default, but you can add customization files in the root of your repository.
- Q: What about duplications of errors?
  A: The tool should not generate warnings for the same problems multiple times.

- Q: What happened if a push from user fixed a particular problem?
  A: The tool should close issues or pull requests if the problem no longer exists.
