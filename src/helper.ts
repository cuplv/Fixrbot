import { Application } from 'probot';
//import { stringLiteral } from '@babel/types';
//import { inspect } from 'util';
import { GitHubAPI } from 'probot/lib/github';
//import { SSL_OP_LEGACY_SERVER_CONNECT } from 'constants';
const fetch = require('node-fetch');

export namespace Fixrbot {

//user application for analysis
export interface App {
    url: string,
    user_name: string,
    app_key: string,
    repo_name: string
}

//groums produced by backend
export interface Groum {
    groum_key: string,
    method_line_number: number,
    package_name: string,
    class_name: string,
    source_class_name: string,
    method_name: string
}

//anomalies produced by backend
export interface Anomaly {
    methodName: string,
    packageName: string,
    fileName: string,
    className: string,
    error: string,
    line: number,
    id: number 
}

//inspect information produced by backend
export interface InspectInfo {
    editText: string,
    fileName: string,
    lineNumber: number
}

//patterns produced by backend
export interface Pattern {
    search_results: any[],
    method_names: string[],
    line_number: number
}

//examples produced by backend
export interface Example {
    example_code: string,
    user: string,
    repo: string,
    commit_hash: string,
    file_name: string,
    start_line_number: number,
    end_line_number: number
}

//types specified here to use with fixrbot commands
export type Inspect = { tag: 'inspect', anomaly_number: number };
export type Comment = { tag: 'comment', body: string };
export type ShowPattern = { tag: 'pattern' };
export type ShowExamples = { tag: 'example', max_number?: number };
export type FixrbotCommand = Inspect | Comment | ShowPattern | ShowExamples;


//preconditions: takes a command string, extracts the exact command
//postconditions: return a command type as specified above
export function parse_command(cmd: string): FixrbotCommand | undefined {
    const strs = cmd.split(" ");
    if (strs[0] != "fixrbot") { //user has made a comment that is not meant for fixrbot, ignore
        return undefined;
    }

    switch (strs[1]) {
        case 'inspect': {
            const anomaly_number = parseInt(strs[2]);
            if (isNaN(anomaly_number)) {
                const comment: Comment = {
                    tag: 'comment',
                    body: `Fixrbot cannot understand command ${strs[2]}\nInspect command must specify valid number.\n`
                };
                return comment;
            }
            const command: Inspect = {
                tag: 'inspect',
                anomaly_number: anomaly_number
            };
            return command;
        }
        case 'pattern': {
            const command: ShowPattern = { tag: 'pattern' };
            return command;
        }
        case 'examples': {
            if (strs[2]) {
                const max_number = parseInt(strs[2]);
                if (isNaN(max_number)) {
                    const comment: Comment = {
                        tag: 'comment',
                        body: `Fixrbot cannot understand command ${strs[2]}\nOptional max number must specify valid number.\n`
                    };
                    return comment;
                }
                const command: ShowExamples = {
                    tag: 'example',
                    max_number
                };
                return command;
            }
            else {
                const command: ShowExamples = { tag: 'example' };
                return command;
            }

        }
        default: {
            const comment: Comment = {
                tag: 'comment',
                body: `Fixrbot cannot understand command ${strs[1]}\nCommands use the form \`fixrbot\` followed by \`inspect\`, \`pattern\`, or \`examples {optional: max number}\`\n`
            };
            return comment;
        }
    }

}

//preconditions: takes list of apps, plus owner and string names to locate
//postconditions: returns proper app
export function find_repository(apps: Array<App>, owner: string, name: string): App {
    const app = apps.find((app: App) => {
        return app.repo_name == name;
    });
    if (app) {
        return app;
    } else {
        throw new Error("Cannot find the app " + owner + '/' + name);
    }
}

//precondtions: currently takes list of groums, later will take list of anomalies
//postconditions: returns comment string message specifying list of methods user 
//might want to inspect
export function make_anomalies_msg(anomalies: Array<Anomaly>): string {
    let comment: string = '';
    for (let i = 0; i < anomalies.length; ++i) {
        const anomaly = anomalies[i];
        comment += (i + 1) + '. ';
        comment += `**[${anomaly.className}]** `;
        comment += `Incomplete pattern inside \`${anomaly.methodName}\` method\n`;
    }
    comment += '\n';
    comment += 'Comment \`fixrbot inspect <index of the method>\` to get detailed information about each method.\n';
    return comment;
}

//preconditions: takes string specifying method name, number specifying anomaly number, string
//specifying object name, and string specifying missing method name
//postconditions: currently returns unchanging string
//TODO: make this dynamic based on diff provided by backend
export function make_inspect_msg(anomaly_number: number, body: string, editText: string, line_number: number): string {
    return `> ${body}
\`\`\`diff
@@ ${line_number} @@

${editText}
\`\`\`

Interactions:

* \`fixrbot pattern\`: Gets the detailed information of the pattern
* \`fixrbot examples\`: Gets the example code of the pattern
`;
}

//loops through comments to find initial method/anomaly number
//preconditions: takes strings specifying owner and repo, plus payload and github API object
//postconditions: returns body of original comment to extract method/anomaly number to pass
//to backend
export async function get_original_comment(owner: string, repo: string,
    payload: any, github: GitHubAPI) {
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

//creates comment reply
//preconditions: takes strings specifying owner, repo, and body, number specifying pull number and
//reply_to_id, and github API object
//postconditions: returns nothing, creates comment
export function reply_to_comment(repo_owner: string, repo_name: string,
    pull_number: number, reply_to_id: number,
    body: string, github: GitHubAPI) {
    github.pullRequests.createCommentReply({
        owner: repo_owner,
        repo: repo_name,
        number: pull_number,
        body: body,
        in_reply_to: reply_to_id,
    });
}

//creates new comment
//preconditions: takes strings specifying owner, repo, and body, number specifying pull number and
//commit_id, and github API object
//postconditions: returns nothing, creates comment
export function create_new_comment(repo_owner: string, repo_name: string, pull_number: number, commit_id: string, body: string, github: GitHubAPI){
    github.pullRequests.createComment({
        owner: repo_owner,
        repo: repo_name,
        number: pull_number,
        body: body,
        commit_id: commit_id,
        path: 'repos/mmcguinn/iSENSE-Hardware/RestAPIDbAdapter.java',
        position: 3,
    });
}

//creates string specifying pattern
//preconditions: none currently TODO: integrate with backend, needs to be passed methods
//postconditions: returns string specifying pattern
export function get_pattern() {
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

//creates string specifying examples
//preconditions: none currently TODO: integrate with backend, needs to be passed everything found in
//Example type field
//postconditions: returns string listing examples
export function show_examples() {
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

    const examples = [test_example];
    let markdown = '';
    for (let i = 0; i < examples.length; ++i) {
        const example = examples[i];
        const path = `https://github.com/${example.user}/${example.repo}/blob/${example.commit_hash}/${example.file_name}#L${example.start_line_number}-L${example.end_line_number}`;
        markdown += `${i + 1}. **${example.user}/${example.repo}/**[${example.file_name}](${path})\n`;
        markdown += '\n```java\n' + example.example_code + '\n```\n';
    }

    return markdown;
}

}