// You can import your modules
// import index from '../src/index'

import nock = require('nock');
// Requiring our app implementation
import myProbotApp, {make_inspect_msg} from '../src';
import { Probot } from 'probot';
// Requiring our fixtures
import * as fs from 'fs';
import * as path from 'path';

nock.disableNetConnect();

const mockMethodNames = ['foo', 'bar', 'baz'];

const mockMethods = [{
    groum_key: "m1",
    method_line_number1: 1,
    package_name: "package",
    class_name: "Class",
    source_class_name: "class1",
    method_name: mockMethodNames[0]
}, {
    groum_key: "m2",
    method_line_number: 2,
    package_name: "package",
    class_name: "Class",
    source_class_name: "sssc",
    method_name: mockMethodNames[1]
}, {
    groum_key: "m3",
    method_line_number: 3,
    package_name: "package",
    class_name: "Class",
    source_class_name: "sssc",
    method_name: mockMethodNames[2]
}];

const pullRequestCommentBody = {
    body: `1. **[class1]** Incomplete pattern inside \`${mockMethodNames[0]}\` method
2. **[sssc]** Incomplete pattern inside \`${mockMethodNames[1]}\` method

Comment \`fixrbot inspect <index of the method>\` to get detailed information about each method.
`
};

describe('My Probot app', () => {
    let probot: any;
    let mockCert: string;

    beforeAll((done: Function) => {
        fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err: any, cert: any) => {
            if (err) return done(err);
            mockCert = cert;
            done();
        });
    });

    beforeEach(() => {
        probot = new Probot({ id: 123, cert: mockCert });
        // Load our app into probot
        probot.load(myProbotApp);

        nock('https://api.github.com')
        .post('/app/installations/1010584/access_tokens')
        .reply(200, { token: 'test' });
    });

    test('testing pull request', async (done) => {
        const payload = require('./fixtures/pull_request.opened.json');

        // Test that we correctly return a test token

        nock('https://api.github.com')
            .get('/repos/CompBioJasmine/logmein-android/pulls/1/commits', (body: any) => {
                return true;
            })
            .reply(200);

        nock('http://localhost:30072')
            .get('/get_apps').reply(200, [{
                url: 'https://github.com/DevelopFreedom/logmein-android',
                user_name: 'DevelopFreedom',
                app_key: 1,
                repo_name: 'logmein-android',
            }]);

        nock('http://localhost:30072').post('/get_groums').reply(200, mockMethods);

        // Test that a comment is posted
        nock('https://api.github.com')
            .post('/repos/CompBioJasmine/logmein-android/issues/1/comments', (body: any) => {
                done(expect(body).toMatchObject(pullRequestCommentBody));
                return true;
            })
            .reply(200);

        // Receive a webhook event
        await probot.receive({ name: 'pull_request', payload });
    });

    test('testing inspect comment', async (done) => {
        const payload = require('./fixtures/inspect_comment.json');
        const commit_sha = '123456';
        const method_name = 'userList';
        const anomaly_number = 1;
        const object_name = 'cursor';
        const missing_method_name = 'close';
        const message_body = 'fixrbot inspect 1';
                
        nock('https://api.github.com')
            .get('/repos/CompBioJasmine/logmein-android/pulls/1', (body: any) => {
                return true;
            })
            .reply(200, { head: { sha: commit_sha }});


        // Test that a comment is posted
        nock('https://api.github.com')
            .post('/repos/CompBioJasmine/logmein-android/pulls/1/comments', (body: any) => {
                const inspectCommentBody = { body: make_inspect_msg(method_name, anomaly_number,
                    object_name, missing_method_name, message_body) };
                done(expect(body).toMatchObject(inspectCommentBody));
                return true;
            })
            .reply(200);

        // Receive a webhook event
        await probot.receive({ name: 'issue_comment', payload });
    });
});
