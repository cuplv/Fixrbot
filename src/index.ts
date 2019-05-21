import { Application } from 'probot';
const fetch = require('node-fetch');

const bot_name = 'fixrbotJasmineTest';

interface App {
    url: string,
    user_name: string,
    app_key: string,
    repo_name: string
}

interface Groum { groum_key: string,
   method_line_number: number,
   package_name: string,
   class_name: string,
   source_class_name: string,
   method_name: string
}

function find_repository(apps: Array<App>, owner: string, name: string): App {
    const app = apps.find((app: App) => {
        return app.repo_name == name;
    });
    if (app) {
        return app;
    } else {
        throw new Error("Cannot find the app " + owner + '/' + name);
    }
}

function markdown_from_groums(groums: Array<Groum>): string {
    let comment: string = '';
    for (let i = 0; i < groums.length; ++i) {
        const groum = groums[i];
        comment += i + '. ';
        comment += `**[${groum.source_class_name}]** `;
        comment += `Incomplete pattern inside \`${groum.method_name}\` method\n`;
    }
    comment += '\n';
    comment += 'Comment \`fixrbot inspect <index of the method>\` to get detailed information about each method.\n';
    return comment;
}

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

        const commit_hashes = commits.data.map(commit => commit.sha);
 
        fetch('http://localhost:30072/get_apps', {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
            })
            .then((res: { json: () => void }) => res.json())
            .then((apps: Array<App>) => {
                const app = find_repository(apps, repo_owner, repo_name);
                const body = { app_key: app.app_key };
                fetch('http://localhost:30072/get_groums', {
                    method: 'post',
                    body: JSON.stringify(body),
                    headers: { 'Content-Type': 'application/json' },
                })
                .then((res: { json: () => void }) => res.json())
                .then((groums: Array<Groum>) => {
                    // TODO: How to find the interesting groums
                    const interesting_groums = [ groums[0], groums[1] ];
                    const comment = context.issue({
                        body: markdown_from_groums(interesting_groums)
                    });
                    context.github.issues.createComment(comment);
                });
            });
    });
}
