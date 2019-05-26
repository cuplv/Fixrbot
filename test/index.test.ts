// import nock from 'nock';
// // Requiring our app implementation
// import myProbotApp from '../src';
// import { Probot } from 'probot';
// import { notStrictEqual } from 'assert';

// const { gimmeApp, loadConfig, loadDiff } = require('./helpers.js');
// const payload = require('./fixtures/pull_request.opened');

// let app: any, github: any
// const event1 = { name: 'pull_request', payload: payload }

// beforeEach(() => {
//   const gimme = gimmeApp()
//   app = gimme.app
//   github = gimme.github
// });

// it('comments on a pull request', async () => {
//   await app.receive(event1)
//   expect(github.issues.createComment).toHaveBeenCalledTimes(1)
//   expect(github.issues.createComment.mock.calls[0]).toMatchSnapshot()
// });


// // nock.disableNetConnect();

// describe('My Probot app', async () => {
//     let probot: any;

//     beforeEach(() => {
//         probot = new Probot({});
//         // Load our app into probot
//         const app = probot.load(myProbotApp);

//         // just return a test token
//         app.app = () => 'test';
//     });

//    test('creates a pull request', async () => {
//        // Test that we correctly return a test token
//        nock('https://api.github.com')
//        .post('/app/installations/31170/access_tokens')
//        .reply(200, { token: 'test' });       

//    });
//    // Receive a webhook event
//    await probot.receive({ name: 'pull_request', payload });

// });
