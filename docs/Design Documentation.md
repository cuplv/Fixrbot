# Fixrbot Design Documentation
## Overview
**Fixrbot** is a GitHub App that analyses the API usage patterns. It leverages our existing programming pattern-mining tool [biggroum](https://github.com/cuplv/biggroum).

## Milestones
### Milestone 1 : Project Setup
- Github App that reacts to push and pull request
- Unit test, CI
- Deployment

## Requirements
### Tool Output
After each push or pull request, the bot scans all new created/modified files and try to find the potential problems. If the tool can find an automatic fix, it generates a Github pull request per warning; otherwise, it will open GitHub issues. The tool produces the following information in issues or pull requests:
- [File, Location]: Warning [Text]
- [File, Location]: Suggest Change [DIFF] (For pull requests)
- [File, Location]: Link to code sample [Link]
- [File, Location]: Link to codes of the pattern and pattern statistics (A GitHub public repository) [Link]

The tool will also put a comment on the pull request page like other continuous integration services. The following information should be shown on a user's pull request page:
- Alarms (Pass or not): [Flag]
- Summary of the alarm categories (group by method): [table]
- Links to individual pull requests or issues [link, table]

### User Interaction
#### Apply/suppress the fixes
Users can apply the fixes by merging pull requests. Also, close pull requests will suppress the warning.

## Questions
- Q: What programming language is currently supported?

- Q: How to customize the bot's behavior on my repository?
  A: **Fixrbot** should provide a sane default, but you can add customization files in the root of your repository.
- Q: What about duplications of errors?
  A: The tool should not generate warnings for the same problems multiple times.

- Q: What happened if a push from user fixed a particular problem?
  A: The tool should close issues or pull requests if the problem no longer exists.
