import { Application } from 'probot';
import { stringLiteral } from '@babel/types';
import { inspect } from 'util';
import { GitHubAPI } from 'probot/lib/github';
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

interface Pattern {
    search_results: any[],
    method_names: string[]
}

interface Example {
    example_code: string,
    user: string,
    repo: string,
    commit_hash: string,
    file_name: string,
    start_line_number: number,
    end_line_number: number
}

type Inspect = { tag: 'inspect', anomaly_number: number };
type Comment = { tag: 'comment', body: string };
type ShowPattern = { tag: 'pattern' };
type ShowExamples = { tag: 'example', max_number?: number };
type FixrbotCommand = Inspect | Comment | ShowPattern | ShowExamples;

function parse_command(cmd: string): FixrbotCommand | undefined {
    const strs = cmd.split(" ");
    if (strs[0] != "fixrbot") {
        return undefined;
    }

    switch(strs[1]) {
        case 'inspect': {
            const anomaly_number = parseInt(strs[2]);
            // TODO: proper error handling
            const command: Inspect = { tag: 'inspect', anomaly_number: anomaly_number };
            return command;
        }
        case 'pattern': {
            const command: ShowPattern = { tag: 'pattern' };
            return command;
        }
        case 'examples': {
            if (strs[2]) {
                const max_number = parseInt(strs[2]);
                const command: ShowExamples = { tag: 'example', max_number };
                return command;
            }
            else {
                const command: ShowExamples = { tag: 'example' };
                return command;
            }

        }
        default: {
            const comment: Comment = { tag: 'comment', body: `Fixrbot cannot understand command ${strs[1]}\n` };
            return comment;
        }
    }

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

function make_anomalies_msg(groums: Array<Groum>): string {
    let comment: string = '';
    for (let i = 0; i < groums.length; ++i) {
        const groum = groums[i];
        comment += (i + 1) + '. ';
        comment += `**[${groum.source_class_name}]** `;
        comment += `Incomplete pattern inside \`${groum.method_name}\` method\n`;
    }
    comment += '\n';
    comment += 'Comment \`fixrbot inspect <index of the method>\` to get detailed information about each method.\n';
    return comment;
}

function make_inspect_msg(method_name: string, anomaly_number: number,
    object_name: string, missing_method_name: string): string {
    return `\`\`\`diff
@@ -91,23 +91,26 @@
/**
 * List of all the users in database
 * @return ArrayList
 */
public ArrayList<String> userList() {
    ArrayList<String> user_list = new ArrayList<String>();
    try {
        mDatabase = mMyDatabaseHelper.getReadableDatabase();
        String[] columns = new String[]{DatabaseOpenHelper.USERNAME, DatabaseOpenHelper.PASSWORD};
        cursor = mDatabase.query(DatabaseOpenHelper.TABLE, columns, null, null, null, null, null);

        while (cursor.moveToNext()) {
            user_list.add(cursor.getString(cursor.getColumnIndex(DatabaseOpenHelper.USERNAME)));
        }
+++ // Insert cursor.close() in the following area {
+++ // cursor.close();
+++ // }
        mDatabase.close();
    } catch (Exception e) {
        e.printStackTrace();
    }
    Log.i("DE", "User List:");
    Log.i("DE", user_list.toString());

    return user_list;
}
\`\`\`

Interactions:

* \`fixrbot pattern\`: Gets the detailed information of the pattern
* \`fixrbot examples\`: Gets the example code of the pattern
`;
}

async function get_original_comment(owner: string, repo: string, payload: any, github: GitHubAPI) {
        let reply_to_id: number = payload.comment.in_reply_to_id;
        while (true) {
            const reply_to = await github.pullRequests.getComment({
                owner: owner,
                repo: repo,
                comment_id: reply_to_id
            });
            if (reply_to.data.in_reply_to_id) {
                reply_to_id = reply_to.data.in_reply_to_id;
            } else {
                return reply_to.data.body;
            }
        }
}

function reply_to_comment(repo_owner: string, repo_name: string, pull_number: number, reply_to_id: number, body: string, github: GitHubAPI) {
    github.pullRequests.createCommentReply({
        owner: repo_owner,
        repo: repo_name,
        number: pull_number,
        body: body,
        in_reply_to: reply_to_id
    });
}

function get_pattern() {
    return `\nMethods called in pattern:

\`\`\`java
cursor.close(),
cursor.getCount(),
cursor.getInt(), 
cursor.getString(), 
cursor.moveToFirst(), 
mMyDatabaseHelper.close(), 
mDatabase.rawQuery()
\`\`\``;
}

function show_examples() {
    const example_code: string = `@Override
public void bindView(View view, Context context, Cursor cursor) {
    Holder holder = (Holder)view.getTag();
    int position = cursor.getPosition();
    holder.textView.setText(String.valueOf(position));
    
    holder.progress.setVisibility(View.VISIBLE);
    holder.view.setVisibility(View.INVISIBLE); //TODO: look into if this causes flicker
    
    String path = cursor.getString(cursor.getColumnIndex(Images.Media.DATA));
    System.out.println(path);
    /*
     * The secret sauce
     */
//		holder.params.file = path;
//		holder.params.position = position;
    Log.d("Cache", "Binding: pos: " + position + "    >="+mListView.getFirstVisiblePosition()  + "    <="+mListView.getLastVisiblePosition());

    mAsyncLoader.load(position, path, holder);
}`
    const test_example: Example = {
        example_code: example_code,
        user: 'kaze0',
        repo: 'async-loader',
        commit_hash: '94f4c5e658d0d2027f645869ce1a8af066bb7b64',
        file_name: 'src/com/mikedg/android/asynclist/example/ExampleSimpleCachedImageCursorAdapter.java',
        start_line_number: 44,
        end_line_number: 63
    };

    const examples = [ test_example ];
    let markdown = '';
    for (let i = 0; i < examples.length; ++i) {
        const example = examples[i];
        const path = `https://github.com/${example.user}/${example.repo}/blob/${example.commit_hash}/${example.file_name}#L${example.start_line_number}-L${example.end_line_number}`;
        markdown += `${i + 1}. **${example.user}/${example.repo}/**[${example.file_name}](${path})\n`;
        markdown += '\n```java\n' + example.example_code + '\n```\n';    
    }

    return markdown;
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
                    const anomalies = [ ];

                    const userListMethod = groums.find((groum) => {
                        return groum.method_name == 'userList';
                    });

                    if (userListMethod) {
                        anomalies.push(userListMethod);
                    }
                    anomalies.push(groums[0]);
                    anomalies.push(groums[1]);

                    const comment = context.issue({
                        body: make_anomalies_msg(anomalies)
                    });
                    context.github.issues.createComment(comment);
                });
            });
    });

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
        const commit_id: string = pull_request.head.sha;

        const body: string = context.payload.comment.body;
        const command = parse_command(body);
        if ((<Inspect>command).tag == 'inspect') {
            const anomaly_number = (<Inspect>command).anomaly_number;
            //TODO: harcoded now instead of get_groums, waiting for anomaly method, then use REST API again
            // const groum_key = 'DevelopFreedom/logmein-android/418b37ffbafac3502b661d0918d1bc190e3c2dd1/org.developfreedom.logmein.DatabaseEngine.userList/95';
            const method_name = 'userList';
            const object_name = 'cursor';
            const missing_method_name = 'close';

            const markdown = make_inspect_msg(method_name,
                anomaly_number, object_name, missing_method_name);

            context.github.pullRequests.createComment({
                owner: repo_owner,
                repo: repo_name,
                number: pull_number,
                body: markdown,
                commit_id: commit_id,
                path: 'app/src/main/java/org/developfreedom/logmein/DatabaseEngine.java',
                position: 3,
            });

        } 
    });

    app.on('pull_request_review_comment', async (context) => {
        if (context.payload.action != 'created') {
            return;
        }

        const repo = context.payload.repository;
        const repo_owner: string = repo.owner.login;
        const repo_name: string = repo.name;

        const comment_id: number = context.payload.comment.id;

        const pull_request = context.payload.pull_request;
        const pull_number: number = pull_request.number;

        const body: string =  context.payload.comment.body;
        const command = parse_command(body);

        const original_comment: string = await get_original_comment(repo_owner, repo_name,
            context.payload, context.github);


        const regex = /> fixrbot inspect ([\d]+)/g;
        const matches = regex.exec(original_comment);
        if (!matches) {
            throw new Error("Cannot match `fixrbot inspect` from the comment fixrbot grab");
        }
        const method_number: number = parseInt(matches[1]);
        console.log(`Method number ${method_number}`);

        
        if ((<ShowPattern>command).tag == 'pattern') {
            const pattern = get_pattern();
            reply_to_comment(repo_owner, repo_name, pull_number, comment_id, pattern, context.github);
        }
        else if ((<ShowExamples>command).tag == 'example') {
            const examples = show_examples();
            reply_to_comment(repo_owner, repo_name, pull_number, comment_id, examples, context.github);

        }
    });
}
