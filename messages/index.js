/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a complete walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder"); // require the botbuilder module
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

// build the connector
var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

// create the bot
var bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/

// start the dialog (chat session)
bot.dialog('/', intents);

intents.matches('greeting', '/greet');
intents.matches('requestNumber', '/numbers');
intents.matches('requestCounsel', '/counsel');

bot.dialog('/greet', [
  function(session, args, next) {
    if(!session.userData.name) {
      session.beginDialog('/profile');
    } else {
      session.send("Hi, %s. How are you doing?", session.userData.name);
    }
    session.endDialog();
  }
]);

bot.dialog('/profile', [
  function(session) {
    builder.Prompts.text(session, "Hey there! What is your name?");
  },
  function(session, results) {
    session.userData.name = results.response;
    session.send("Hi, %s. How are you doing?", session.userData.name);
    session.endDialog();
  }
]);

bot.dialog('/counsel', [
  function(session) {
    builder.Prompts.text(session, "Hey there! What is your name?");
    session.endDialog();
  }
]);

bot.dialog('/numbers', [
  function(session) {
    session.send("Here are some great 24/7 hotlines in the Waterloo region: \n-Supportive and Confidential Listening (519-745-1166), \n-Here 24/7: Addictions, Mental Health & Crisis Services (1-844-437-3247), \n-Good2Talk Support Line for Post-secondary Students (1-866-925-5454), \n-24-hour Support Line for Sexual Violence Survivors (519-741-8633), \n-Mental Health and Community Referral Information (519-744-5594).");
    session.send("I'm so glad you talked to me about this. Remember, being aware of how you're feeling is a huge first step. Keep going and don't give up, you got this!");
    session.endDialog();
  }]);

intents.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() }
}
