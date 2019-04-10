# Fixrbot Product Pitch
## Overview
**Fixrbot** is a GitHub App that analyses the API usage patterns. It leverages our existing programming pattern-mining tool [BigGroum](https://github.com/cuplv/biggroum).

Fixrbot is easy to set up. The plan is to make the bot available on the GitHub Marketplace. To use the Fixrbot, install it for a Github project, and it should start working automatically without any further settings.

Whenever a push or pull request happens, Fixrbot analyze the program and alert developers on potential misuse of an API usage pattern. Fixrbot will try to make pull requests to fix the issues

## Questions
Q: How to customize the bot's behavior on my repository?

A: Fixrbot should provide a sane default, but you can add customization files in the root of your repository.


Q: What is the advantage of BigGroum in term of static analysis compare to traditional linters?

A: Linters rules need to be written by programmers, so all those linting tools will miss a lot of useful rules. Also, current linters will not do the symbolic analysis in terms of a graph-based representation and a pattern mining algorithm, so they cannot delve the program as deep as BigGroum.


Q: What is the advantage of BigGroum compare to other graph-based mining tools?

A: Unlike prior arts using similar approaches, BigGroum is efficient, being able to mine the patterns for the large-scale applications. Our solution is also effective in evaluating the precision and recall of the
mined patterns.


Q: What programming language is currently supported?

A: Our backend, the BigGroum project, currently support the **Java** programming language.

Q: What about duplications of errors?

A: The tool should not generate warnings for the same problems multiple times.


Q: What happened if a push from user fixed a particular problem?

A: The tool should close issues or pull requests if the problem no longer exists.
