import { Application } from 'probot';

export = (app: Application) => {
    app.on('issues.opened', async (context) => {
        const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
        await context.github.issues.createComment(issueComment)
    });


    app.on('push', async (context) => {
    });
}
