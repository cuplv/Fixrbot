import { Application } from 'probot';

export = (app: Application) => {
    app.on('issues.opened', async (context) => {
        const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
        await context.github.issues.createComment(issueComment)
    });


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
    });
}
