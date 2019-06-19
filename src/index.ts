const fetch = require("node-fetch");
import { Application } from "probot";

import { Fixrbot } from "./helper";

// main function of bot
export = (app: Application) => {
  app.on("pull_request", async context => {
    app.log("Processing pull request");
    const pullNumber: number = context.payload.pull_request.number;
    const repo = context.payload.pull_request.head.repo;
    const repoOwner: string = repo.owner.login;
    const repoName: string = repo.name;

    const commits = await context.github.pullRequests.listCommits({
      owner: repoOwner,
      repo: repoName,
      number: pullNumber
    });

    const jsonBody = {
      user: repoOwner,
      repo: repoName,
      commitHashes: commits,
      modifiedFiles: [],
      pullRequestId: pullNumber
    };

    // extract anomalies from backend
    fetch("http://localhost:30072/process_graphs_in_pull_request", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody)
    })
      .then((res: { json: () => void }) => {
        return res.json();
      })
      .then((anomalies: Fixrbot.Anomaly[]) => {
        const comment = context.issue({
          body: Fixrbot.make_anomalies_msg(anomalies)
        });
        context.github.issues.createComment(comment);
      });
  });

  // react to user comment
  app.on("issue_comment", async context => {
    app.log("Processing issue_comment");
    if (context.payload.action !== "created") {
      return;
    }

    const pullNumber: number = context.payload.issue.number;

    const repo = context.payload.repository;
    const repoOwner: string = repo.owner.login;
    const repoName: string = repo.name;

    const pullRequestRespond = await context.github.pullRequests.get({
      number: pullNumber,
      owner: repoOwner,
      repo: repoName
    });

    const pullRequest = pullRequestRespond.data;
    const pullRequestId = pullRequestRespond.data.number;
    const commitId: string = pullRequest.head.sha;

    const body: string = context.payload.comment.body;
    const command = Fixrbot.parse_command(body);
    if ((command as Fixrbot.Inspect).tag === "inspect") {
      app.log("Processing inspect");
      const anomalyNumber = (command as Fixrbot.Inspect).anomalyNumber;

      const serviceInput = {
        anomalyId: anomalyNumber,
        pullRequest: { user: repoOwner, repo: repoName, id: pullNumber }
      };

      app.log("Calling inspect anomaly...");
      fetch("http://localhost:30072/inspect_anomaly", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceInput)
      })
        .then((res: { json: () => void }) => {
          return res.json();
        })
        .then((info: Fixrbot.InspectInfo) => {
          const markdown = Fixrbot.make_inspect_msg(
            anomalyNumber,
            body,
            info.editText,
            info.lineNumber
          );
          Fixrbot.create_new_comment(
            repoOwner,
            repoName,
            pullNumber,
            commitId,
            markdown,
            info.fileName,
            context.github
          );
        });
    } else if ((command as Fixrbot.ShowPattern).tag == "pattern") {
      app.log("Processing pattern --- ass issue command");
      const body =
        "Fixrbot expects `inspect` command before `pattern` command\n";
      Fixrbot.create_new_comment(
        repoOwner,
        repoName,
        pullNumber,
        commitId,
        body,
        "",
        context.github
      );
    } else if ((command as Fixrbot.ShowExamples).tag == "example") {
      const body =
        "Fixrbot expects `inspect` command before `examples` command\n";
      Fixrbot.create_new_comment(
        repoOwner,
        repoName,
        pullNumber,
        commitId,
        body,
        "",
        context.github
      );
    } else if ((command as Fixrbot.Comment).tag == "comment") {
      const body = (command as Fixrbot.Comment).body;
      Fixrbot.create_new_comment(
        repoOwner,
        repoName,
        pullNumber,
        commitId,
        body,
        "",
        context.github
      );
    }
  });

  // react to user review comment
  app.on("pull_request_review_comment", async (context: any) => {
    app.log("Processing issue review comment");
    if (context.payload.action != "created") {
      app.log("Return...");
      return;
    }

    const repo = context.payload.repository;
    const repoOwner: string = repo.owner.login;
    const repoName: string = repo.name;

    // const comment_id: number = context.payload.comment.id;
    const replyToId: number = context.payload.comment.in_reply_to_id;

    // const pull_number: number = context.payload.issue.number;

    const pullRequest = context.payload.pull_request;

    const commitId: string = pullRequest.head.sha;

    const pullNumber: number = pullRequest.number;

    const body: string = context.payload.comment.body;
    const command = Fixrbot.parse_command(body);
    if (!command) {
      app.log("Not a fixrbot command!");
      app.log(body);
      return;
    }
    const originalComment: string = await Fixrbot.get_original_comment(
      repoOwner,
      repoName,
      context.payload,
      context.github
    );

    const regex = /> fixrbot inspect ([\d]+)/g;
    const matches = regex.exec(originalComment);
    if (!matches) {
      throw new Error(
        "Cannot match `fixrbot inspect` from the comment fixrbot grab"
      );
    }
    const methodNumber: number = parseInt(matches[1], 10);
    console.log(`Method number ${methodNumber}`);

    if ((command as Fixrbot.Inspect).tag == "inspect") {
      app.log("Found inspect.");

      const body =
        "Fixrbot cannot switch methods, did you mean `pattern` or `examples`?\n";

      Fixrbot.reply_to_comment(
        repoOwner,
        repoName,
        pullNumber,
        replyToId,
        body,
        context.github
      );
    } else if ((command as Fixrbot.ShowPattern).tag == "pattern") {
      app.log("Processing pattern.");
      const serviceInput = {
        anomalyId: methodNumber,
        pullRequest: { user: repoOwner, repo: repoName, id: pullNumber }
      };
      fetch("http://localhost:30072/explain_anomaly", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceInput)
      })
        .then((res: { json: () => void }) => {
          return res.json();
        })
        .then((info: Fixrbot.PatternInfo) => {
          console.log(info);
          const examples = Fixrbot.get_pattern(
            info.patternCode,
            info.numberOfExamples
          );
          Fixrbot.reply_to_comment(
            repoOwner,
            repoName,
            pullNumber,
            replyToId,
            examples,
            context.github
          );
        });
    } else if ((command as Fixrbot.ShowExamples).tag == "example") {
      const examples = Fixrbot.show_examples();
      Fixrbot.reply_to_comment(
        repoOwner,
        repoName,
        pullNumber,
        replyToId,
        examples,
        context.github
      );
    } else if ((command as Fixrbot.Comment).tag == "comment") {
      const body = (command as Fixrbot.Comment).body;
      Fixrbot.reply_to_comment(
        repoOwner,
        repoName,
        pullNumber,
        replyToId,
        body,
        context.github
      );
    }
  });
};
