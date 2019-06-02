import { Application } from 'probot';
//import { stringLiteral } from '@babel/types';
//import { inspect } from 'util';
import { GitHubAPI } from 'probot/lib/github';
//import { SSL_OP_LEGACY_SERVER_CONNECT } from 'constants';
const fetch = require('node-fetch');

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

        //const commit_hashes = commits.data.map(commit => commit.sha);

        //extract groums from backend
        //TODO: change from localhost once backend deployed, extract anomalies rather than
        //groums once method is available
        fetch('http://localhost:30072/get_apps', {
            method: 'get',
            headers: { 'Content-Type': 'application/json' },
        })
            .then((res: { json: () => void }) => res.json())
            .then((apps: Array<Fixrbot.App>) => {
                const app = Fixrbot.find_repository(apps, repo_owner, repo_name);
                const body = { app_key: app.app_key };
                fetch('http://localhost:30072/get_groums', {
                    method: 'post',
                    body: JSON.stringify(body),
                    headers: { 'Content-Type': 'application/json' },
                })
                    .then((res: { json: () => void }) => res.json())
                    .then((groums: Array<Fixrbot.Groum>) => {
                        const anomalies = [];

                        const userListMethod = groums.find((groum) => {
                            return groum.method_name == 'userList';
                        });

                        if (userListMethod) {
                            anomalies.push(userListMethod);
                        }
                        anomalies.push(groums[0]);
                        anomalies.push(groums[1]);

                        const comment = context.issue({
                            body: Fixrbot.make_anomalies_msg(anomalies)
                        });
                        context.github.issues.createComment(comment);
                    });
            });
    });

    //react to user comment
    app.on('issue_comment', async (context) => {
        if (context.payload.action != 'created') {
            return;
        }

        const pull_number: number = context.payload.issue.number;
        //const comment_id: number = context.payload.comment.id;

        const repo = context.payload.repository;
        const repo_owner: string = repo.owner.login;
        const repo_name: string = repo.name;


        const pull_request_respond = await context.github.pullRequests.get({
            owner: repo_owner,
            repo: repo_name,
            number: pull_number,
        });

        const pull_request = pull_request_respond.data;
        const commit_id: string = pull_request.head.sha;

        const body: string = context.payload.comment.body;
        const command = Fixrbot.parse_command(body);
        if ((<Fixrbot.Inspect>command).tag == 'inspect') {
            const anomaly_number = (<Fixrbot.Inspect>command).anomaly_number;
            //TODO: harcoded now instead of using method get_groums, waiting for anomaly method, then use REST API again
            // const groum_key = 'DevelopFreedom/logmein-android/418b37ffbafac3502b661d0918d1bc190e3c2dd1/org.developfreedom.logmein.DatabaseEngine.userList/95';
            const method_name = 'userList';
            const object_name = 'cursor';
            const missing_method_name = 'close';

            const markdown = Fixrbot.make_inspect_msg(method_name,
                anomaly_number, object_name, missing_method_name, body);

            Fixrbot.create_new_comment(repo_owner, repo_name, pull_number, commit_id, markdown, context.github)

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
            const pattern = Fixrbot.get_pattern();
            Fixrbot.reply_to_comment(repo_owner, repo_name, pull_n, reply_to_id, pattern, context.github);
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