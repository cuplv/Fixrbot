import { Application } from 'probot';
import fetch from 'node-fetch';

import { Fixrbot } from './helper';

//main function of bot
export = (app: Application) => {
    app.on('pull_request', async (context) => {
        const pull_number: number = context.payload.pull_request.number;

        const repo = context.payload.pull_request.head.repo;
        const repo_owner: string = repo.owner.login;
        const repo_name: string = repo.name;

        const commits = await context.github.pullRequests.listCommits({
            owner: repo_owner,
            repo: repo_name,
            number: pull_number
        });

        const json_body = {"user" : "mmcguinn",
        "repo" : "iSENSE-Hardware",
        "commitHashes" : ["0700782f9d3aa4cb3d4c86c3ccf9dcab13fa3aad"],
        "modifiedFiles" : [],
        "pullRequestId" : 1};

        //extract anomalies from backend
        fetch('http://localhost:30072/process_graphs_in_pull_request', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json_body),
        })
            .then((res) => {
                return res.json();
            })
            .then( (anomalies: Array<Fixrbot.Anomaly>) => {
                        const comment = context.issue({
                            body: Fixrbot.make_anomalies_msg(anomalies)
                        });
                        context.github.issues.createComment(comment);
                    });
            });

    //react to user comment
    app.on('issue_comment', async (context) => {
        if (context.payload.action != 'created') {
            return;
        }

        const pull_number: number = context.payload.issue.number;

        const repo = context.payload.repository;
        const repo_owner: string = repo.owner.login;
        const repo_name: string = repo.name;


        const pull_request_respond = await context.github.pullRequests.get({
            owner: repo_owner,
            repo: repo_name,
            number: pull_number,
        });

        const pull_request = pull_request_respond.data;
        const pull_request_id = pull_request_respond.data.number;
        const commit_id: string = pull_request.head.sha;

        const body: string = context.payload.comment.body;
        const command = Fixrbot.parse_command(body);
        if ((<Fixrbot.Inspect>command).tag == 'inspect') {
            const anomaly_number = (<Fixrbot.Inspect>command).anomaly_number;

            const json_body = {"user" : "mmcguinn",
                        "repo" : "iSENSE-Hardware",
                        "commitHashes" : ["0700782f9d3aa4cb3d4c86c3ccf9dcab13fa3aad"],
                        "modifiedFiles" : [],
                        "pullRequestId" : 1};

            fetch('http://localhost:30072/process_graphs_in_pull_request', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json_body),
        })
            .then((res) => {
                return res.json();
            })
            .then( (inspect: Array<Fixrbot.Anomaly>) => {
                        const desire_anomaly = inspect[anomaly_number];
                        const service_input = {
                            //"anomalyId" : desire_anomaly.id,
                            "anomalyId": 1,
                            "pullRequest" : {"user" : 'mmcguinn', "repo" : repo_name,
                                            "id" : 1}
                                  }
                        fetch('http://localhost:30072/inspect_anomaly', {
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(service_input),
                        })
                            .then((res) => {
                                return res.json();
                            })
                            .then( (info: Fixrbot.InspectInfo) => {
                                const markdown = Fixrbot.make_inspect_msg(anomaly_number, body, info.editText, info.lineNumber);
                                Fixrbot.create_new_comment(repo_owner, repo_name, pull_number, commit_id, markdown, context.github);
                            });
                        });

        } else if ((<Fixrbot.ShowPattern>command).tag == 'pattern') {

        const body = "Fixrbot expects \`inspect\` command before \`pattern\` command\n";
        Fixrbot.create_new_comment(repo_owner, repo_name, pull_number, commit_id, body, context.github);

        } else if ((<Fixrbot.ShowExamples>command).tag == 'example') {
            const body = "Fixrbot expects \`inspect\` command before \`examples\` command\n";
            Fixrbot.create_new_comment(repo_owner, repo_name, pull_number, commit_id, body, context.github);
        } else if ((<Fixrbot.Comment>command).tag == 'comment') {
            const body = (<Fixrbot.Comment>command).body
            Fixrbot.create_new_comment(repo_owner, repo_name, pull_number, commit_id, body, context.github);
        };
    });

    //react to user review comment
    app.on('pull_request_review_comment', async (context: any) => {
        if (context.payload.action != 'created') {
            return;
        }

        const repo = context.payload.repository;
        const repo_owner: string = repo.owner.login;
        const repo_name: string = repo.name;

        //const comment_id: number = context.payload.comment.id;
        const reply_to_id: number = context.payload.comment.in_reply_to_id;

        //const pull_number: number = context.payload.issue.number;

        const pull_request = context.payload.pull_request;

        const commit_id: string = pull_request.head.sha;


        const pull_n: number = pull_request.number;

        const body: string = context.payload.comment.body;
        const command = Fixrbot.parse_command(body);
        if (!command) {
            return;
        }
        const original_comment: string = await Fixrbot.get_original_comment(repo_owner, repo_name,
            context.payload, context.github);

        const regex = /> fixrbot inspect ([\d]+)/g;
        const matches = regex.exec(original_comment);
        if (!matches) {
            throw new Error("Cannot match `fixrbot inspect` from the comment fixrbot grab");
        }
        const method_number: number = parseInt(matches[1]);
        console.log(`Method number ${method_number}`);


        if ((<Fixrbot.Inspect>command).tag == 'inspect') {
            const body = 'Fixrbot cannot switch methods, did you mean \`pattern\` or \`examples\`?\n';

            Fixrbot.reply_to_comment(repo_owner, repo_name, pull_n, reply_to_id, body, context.github);
        }
        else if ((<Fixrbot.ShowPattern>command).tag == 'pattern') {
            const service_input = {
                "anomalyId" : method_number,
                "pullRequest" : {"user" : 'mmcguinn', "repo" : repo_name,
                                 "id" : 1}
              };
            fetch('http://localhost:30072/explain_anomaly', {
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(service_input),
                        })
                            .then((res) => {
                                return res.json();
                            })
                            .then((info: Fixrbot.PatternInfo) => {
                                console.log(info);
                                const examples = Fixrbot.get_pattern(info.patternCode, info.numberOfExamples);
                                Fixrbot.reply_to_comment(repo_owner, repo_name, pull_n, reply_to_id, examples, context.github);
                            });
        }
        else if ((<Fixrbot.ShowExamples>command).tag == 'example') {
            const examples = Fixrbot.show_examples();
            Fixrbot.reply_to_comment(repo_owner, repo_name, pull_n, reply_to_id, examples, context.github);
        } else if ((<Fixrbot.Comment>command).tag == 'comment') {
            const body = (<Fixrbot.Comment>command).body
            Fixrbot.reply_to_comment(repo_owner, repo_name, pull_n, reply_to_id, body, context.github);
        };
    });
}
