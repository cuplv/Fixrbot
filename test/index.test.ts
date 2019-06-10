// You can import your modules
// import index from '../src/index'

import * as fs from "fs";
import nock = require("nock");
import * as path from "path";
import { Probot } from "probot";

import myProbotApp from "../src";
import { Fixrbot } from "../src/helper";

nock.disableNetConnect();

const mockMethodNames = ["foo", "bar", "baz"];

const mockAnomalies: Fixrbot.Anomaly[] = [
  {
    methodName: "mock",
    packageName: "mockpkg",
    fileName: "mockfile.java",
    className: "Mock",
    error: "Error",
    line: 10,
    id: 1
  }
];

function pull_request_review_mock() {
  const original_comment = "> fixrbot inspect 1";

  nock("https://api.github.com")
    .get(
      "/repos/CompBioJasmine/logmein-android/pulls/comments/287429829",
      (body: any) => {
        return true;
      }
    )
    .reply(200, { body: original_comment });
}

describe("Fixrbot/biggroum integration tests", () => {
  let probot: any;
  let mockCert: string;

  beforeAll(done => {
    fs.readFile(
      path.join(__dirname, "fixtures/mock-cert.pem"),
      (err: any, cert: any) => {
        if (err) {
          return done(err);
        }
        mockCert = cert;
        done();
      }
    );
  });

  beforeEach(() => {
    probot = new Probot({ id: 123, cert: mockCert });
    // Load our app into probot
    probot.load(myProbotApp);

    nock("https://api.github.com")
      .post("/app/installations/1131301/access_tokens")
      .reply(200, { token: "test" });
  });

  test("testing pull request", async done => {
    const payload = require("./fixtures/pull_request.opened.json");

    nock("https://api.github.com")
      .get("/repos/LesleyLai/iSENSE-Hardware/pulls/2/commits", (body: any) => {
        return true;
      })
      .reply(200);

    const jsonBody = {
      user: "mmcguinn",
      repo: "iSENSE-Hardware",
      commitHashes: ["0700782f9d3aa4cb3d4c86c3ccf9dcab13fa3aad"],
      modifiedFiles: [],
      pullRequestId: 2
    };

    nock("http://localhost:30072")
      .post("/process_graphs_in_pull_request", JSON.stringify(jsonBody))
      .reply(200, mockAnomalies);

    const pullRequestCommentBody = {
      body: Fixrbot.make_anomalies_msg(mockAnomalies)
    };

    // Test that a comment is posted
    nock("https://api.github.com")
      .post(
        "/repos/LesleyLai/iSENSE-Hardware/issues/2/comments",
        (body: any) => {
          done(expect(body).toMatchObject(pullRequestCommentBody));
          return true;
        }
      )
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "pull_request", payload });
  });

  /*
  test("testing inspect comment", async done => {
    const payload = require("./fixtures/inspect_comment.json");
    const commit_sha = "123456";
    const method_name = "userList";
    const anomaly_number = 1;
    const object_name = "cursor";
    const missing_method_name = "close";
    const line_number = 91;
    const message_body = "fixrbot inspect 1";
    const editText = "test string";

    nock("https://api.github.com")
      .get("/repos/CompBioJasmine/logmein-android/pulls/1", (body: any) => {
        return true;
      })
      .reply(200, { head: { sha: commit_sha } });

    // Test that a comment is posted
    nock("https://api.github.com")
      .post(
        "/repos/CompBioJasmine/logmein-android/pulls/1/comments",
        (body: any) => {
          const inspectCommentBody = {
            body: Fixrbot.make_inspect_msg(
              anomaly_number,
              message_body,
              editText,
              line_number
            )
          };
          done(expect(body).toMatchObject(inspectCommentBody));
          return true;
        }
      )
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "issue_comment", payload });
  });

  test("testing pattern comment", async done => {
    const payload = require("./fixtures/pull_request_review.json");

    pull_request_review_mock();

    // Test that a comment is posted
    nock("https://api.github.com")
      .post(
        "/repos/CompBioJasmine/logmein-android/pulls/4/comments",
        (body: any) => {
          //const patternCommentBody = { body: Fixrbot.get_pattern() };
          //done(expect(body).toMatchObject(patternCommentBody));
          return true;
        }
      )
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "pull_request_review_comment", payload });
  });

  test("testing examples comment", async done => {
    const payload = require("./fixtures/examples.json");

    pull_request_review_mock();

    // Test that a comment is posted
    nock("https://api.github.com")
      .post(
        "/repos/CompBioJasmine/logmein-android/pulls/4/comments",
        (body: any) => {
          const patternCommentBody = { body: Fixrbot.show_examples() };
          done(expect(body).toMatchObject(patternCommentBody));
          return true;
        }
      )
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "pull_request_review_comment", payload });
  });

  test("testing no command comment", async done => {
    const payload = require("./fixtures/no_command_error.json");

    pull_request_review_mock();

    // Test that a comment is posted
    nock("https://api.github.com")
      .post(
        "/repos/CompBioJasmine/logmein-android/pulls/4/comments",
        (body: any) => {
          const noCommandBody = {
            body: `Fixrbot cannot understand command aaa\nCommands use the form \`fixrbot\` followed by \`inspect\`, \`pattern\`, or \`examples {optional: max number}\`\n`
          };
          done(expect(body).toMatchObject(noCommandBody));
          return true;
        }
      )
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "pull_request_review_comment", payload });
  });
*/
});
