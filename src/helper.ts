import { GitHubAPI } from "probot/lib/github";

export namespace Fixrbot {
  // user application for analysis
  export interface App {
    url: string;
    user_name: string;
    app_key: string;
    repo_name: string;
  }

  // groums produced by backend
  export interface Groum {
    groum_key: string;
    method_line_number: number;
    package_name: string;
    class_name: string;
    source_class_name: string;
    method_name: string;
  }

  // anomalies produced by backend
  export interface Anomaly {
    methodName: string;
    packageName: string;
    fileName: string;
    className: string;
    error: string;
    line: number;
    id: number;
  }

  // inspect information produced by backend
  export interface InspectInfo {
    editText: string;
    fileName: string;
    lineNumber: number;
  }

  // examples information produced by backend
  export interface PatternInfo {
    patternCode: string;
    numberOfExamples: number;
  }

  // patterns produced by backend
  export interface Pattern {
    search_results: any[];
    method_names: string[];
    line_number: number;
  }

  // examples produced by backend
  export interface Example {
    example_code: string;
    user: string;
    repo: string;
    commit_hash: string;
    file_name: string;
    start_line_number: number;
    end_line_number: number;
  }

  // types specified here to use with fixrbot commands
  export interface Inspect {
    tag: "inspect";
    anomalyNumber: number;
  }
  export interface Comment {
    tag: "comment";
    body: string;
  }
  export interface ShowPattern {
    tag: "pattern";
  }
  export interface ShowExamples {
    tag: "example";
    maxNumber?: number;
  }
  export type FixrbotCommand = Inspect | Comment | ShowPattern | ShowExamples;

  // preconditions: takes a command string, extracts the exact command
  // postconditions: return a command type as specified above
  export function parse_command(cmd: string): FixrbotCommand | undefined {
    const strs = cmd.split(" ");
    if (strs[0] !== "fixrbot") {
      // user has made a comment that is not meant for fixrbot, ignore
      return undefined;
    }

    switch (strs[1]) {
      case "inspect": {
        const anomalyNumber = parseInt(strs[2], 10);
        if (isNaN(anomalyNumber)) {
          const comment: Comment = {
            tag: "comment",
            body: `Fixrbot cannot understand command ${strs[2]}\nInspect command must specify valid number.\n`
          };
          return comment;
        }
        const command: Inspect = {
          tag: "inspect",
          anomalyNumber
        };
        return command;
      }
      case "pattern": {
        const command: ShowPattern = { tag: "pattern" };
        return command;
      }
      case "examples": {
        if (strs[2]) {
          const maxNumber = parseInt(strs[2]);
          if (isNaN(maxNumber)) {
            const comment: Comment = {
              tag: "comment",
              body: `Fixrbot cannot understand command ${strs[2]}\nOptional max number must specify valid number.\n`
            };
            return comment;
          }
          const command: ShowExamples = {
            tag: "example",
            maxNumber
          };
          return command;
        } else {
          const command: ShowExamples = { tag: "example" };
          return command;
        }
      }
      default: {
        const comment: Comment = {
          tag: "comment",
          body: `Fixrbot cannot understand command ${strs[1]}\nCommands use the form \`fixrbot\` followed by \`inspect\`, \`pattern\`, or \`examples {optional: max number}\`\n`
        };
        return comment;
      }
    }
  }

  // preconditions: takes list of apps, plus owner and string names to locate
  // postconditions: returns proper app
  export function find_repository(
    apps: App[],
    owner: string,
    name: string
  ): App {
    const app = apps.find((app: App) => {
      return app.repo_name == name;
    });
    if (app) {
      return app;
    } else {
      throw new Error("Cannot find the app " + owner + "/" + name);
    }
  }

  // precondtions: currently takes list of groums, later will take list of anomalies
  // postconditions: returns comment string message specifying list of methods user
  // might want to inspect
  export function make_anomalies_msg(anomalies: Anomaly[]): string {
    let comment: string = "";
    for (let i = 0; i < anomalies.length; ++i) {
      const anomaly = anomalies[i];
      comment += i + 1 + ". ";
      comment += `**[${anomaly.className}]** `;
      comment += `Incomplete pattern inside \`${anomaly.methodName}\` method\n`;
    }
    comment += "\n";
    comment +=
      "Comment `fixrbot inspect <index of the method>` to get detailed information about each method.\n";
    return comment;
  }

  // preconditions: takes string specifying method name, number specifying anomaly number, string
  // specifying object name, and string specifying missing method name
  // postconditions: currently returns unchanging string
  // TODO: make this dynamic based on diff provided by backend
  export function make_inspect_msg(
    anomaly_number: number,
    body: string,
    editText: string,
    line_number: number
  ): string {
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

  // loops through comments to find initial method/anomaly number
  // preconditions: takes strings specifying owner and repo, plus payload and github API object
  // postconditions: returns body of original comment to extract method/anomaly number to pass
  // to backend
  export async function get_original_comment(
    owner: string,
    repo: string,
    payload: any,
    github: GitHubAPI
  ) {
    let replyToId: number = payload.comment.in_reply_to_id;
    while (true) {
      const replyTo = await github.pullRequests.getComment({
        owner,
        repo,
        comment_id: replyToId
      });
      if (replyTo.data.in_reply_to_id) {
        replyToId = replyTo.data.in_reply_to_id;
      } else {
        return replyTo.data.body;
      }
    }
  }

  // creates comment reply
  // preconditions: takes strings specifying owner, repo, and body, number specifying pull number and
  // reply_to_id, and github API object
  // postconditions: returns nothing, creates comment
  export function reply_to_comment(
    repoOwner: string,
    repoName: string,
    pullNumber: number,
    replyToId: number,
    body: string,
    github: GitHubAPI
  ) {
    github.pullRequests.createCommentReply({
      owner: repoOwner,
      repo: repoName,
      number: pullNumber,
      body,
      in_reply_to: replyToId
    });
  }

  // creates new comment
  // preconditions: takes strings specifying owner, repo, and body, number specifying pull number and
  // commit_id, and github API object
  // postconditions: returns nothing, creates comment
  export function create_new_comment(
    repoOwner: string,
    repoName: string,
    pullNumber: number,
    commitId: string,
    body: string,
    github: GitHubAPI
  ) {
    github.pullRequests.createComment({
      owner: repoOwner,
      repo: repoName,
      number: pullNumber,
      body,
      commit_id: commitId,
      path:
        "Android/iSenseDataWalk/src/edu/uml/cs/isense/comm/RestAPIDbAdapter.java",
      position: 3
    });
  }

  // creates string specifying pattern
  // preconditions: none currently TODO: integrate with backend, needs to be passed methods
  // postconditions: returns string specifying pattern
  export function get_pattern(pattern_code: string, numExamples: number) {
    return `\nPattern:

\`\`\`java
${pattern_code}
\`\`\`

Number of examples: ${numExamples}`;
  }

  // creates string specifying examples
  // preconditions: none currently TODO: integrate with backend, needs to be passed everything found in
  // Example type field
  // postconditions: returns string listing examples
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
}`;
    const test_example: Example = {
      example_code,
      user: "kaze0",
      repo: "async-loader",
      commit_hash: "94f4c5e658d0d2027f645869ce1a8af066bb7b64",
      file_name:
        "src/com/mikedg/android/asynclist/example/ExampleSimpleCachedImageCursorAdapter.java",
      start_line_number: 44,
      end_line_number: 63
    };

    const examples = [test_example];
    let markdown = "";
    for (let i = 0; i < examples.length; ++i) {
      const example = examples[i];
      const path = `https://github.com/${example.user}/${example.repo}/blob/${example.commit_hash}/${example.file_name}#L${example.start_line_number}-L${example.end_line_number}`;
      markdown += `${i + 1}. **${example.user}/${example.repo}/**[${
        example.file_name
      }](${path})\n`;
      markdown += "\n```java\n" + example.example_code + "\n```\n";
    }

    return markdown;
  }
}
