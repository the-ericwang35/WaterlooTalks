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
intents.matches('expressFeeling', '/feeling');
intents.matches('requestCounselling', '/counsel');

bot.dialog('/greet', [
  function(session, args, next) {
    if(session.userData.name) {
      session.beginDialog('/profile');
    } else {
      session.send("Hi, %s. How are you doing?", session.userData.name);
    }
    session.endDialog();
  }
]);

bot.dialog('/counsel', [
  function(session) {
    session.send("You can contact Waterloo Health Services at 519-888-4096 or you can visit https://uwaterloo.ca/health-services/mental-health-services for more info");
    session.send("Alternatively, the Delton Glebe Counselling Centre is near campus and can be reached at 519-884-3305 or at http://glebecounselling.ca/");
    session.endDialog();
  }
]);

bot.dialog('/profile', [
  function(session) {
    builder.Prompts.text(session, "Hey there! What is your name?");
  },
  function(session, results) {
    session.userData.name = results.responseText;
    session.send("Hi, %s. How are you doing?", session.userData.name);
    session.endDialog();
  }
]);

bot.dialog('/feeling', [
  function(session) {
    var ourRequest = new XMLHttpRequest();
    var res = session.message.text.replace(" ", "+");
    ourRequest.open('GET', 'https://api.datamarket.azure.com/data.ashx/amla/text-analytics/v1/GetSentiment?Text=' + res);
    ourRequest.onload = function(){
      if (ourRequest.status >= 200 & ourRequest.status < 400) { //check if connection was successful
        var data = JSON.parse(ourRequest.responseText);
        if(data.documents[0].score < 0.3){
          session.beginDialog('/promptSad');
        } else {
          session.beginDialog('/promptHappy');
        }
      } else {
        console.log("The server returned an error");
      }
    };
    ourRequest.onerror = function(){
      console.log("There was an error");
    };
    ourRequest.send();
    session.endDialog();
  }
]);

bot.dialog('/promptSad', [
  function(session) {
    builder.Prompts.choice(session, "It seems like you are sad, is that true?", ["Yes", "No"]);
  },
  function(session, results) {
    if(localeCompare(results.response, "Yes") === 0){
      session.beginDialog('/sadEmotions');
    } else {
      session.beginDialog('/happyEnding');
    }
    session.endDialog();
  }
]);

bot.dialog('/promptHappy', [
  function(session) {
    builder.Prompts.choice(session, "It seems like you are doing alright, is that true?", ["Yes", "No"]);
  },
  function(session, results) {
    if(localeCompare(results.response, "Yes") == 0){
      session.beginDialog('/happyEnding');
    } else {
      session.beginDialog('/sadEmotions');
    }
    session.endDialog();
  }
]);

bot.dialog('/happyEnding', [
  function(session) {
    builder.Prompts.text(session, "Happy to hear that! I will always be here if you need me");
    session.endDialog();
  }
]);

bot.dialog('/sadEmotions', [
  function(session) {
    builder.Prompts.choice(session, "What best describes you right now?", ["Sad", "Tired"]);
  },
  function(session, results) {
    if(localeCompare(results.response, "Sad") == 0){
      builder.Prompts.text(session, "I'm sorry to hear that. Please know that you're not alone in this world, there are many people that care about you and love you very much. I am not fully equipped to help you yet, sorry. If it's an emergency please contact 911 or your local authorities. I also encourage you to contact a trained mental health professional who will be able to help you better than I can. Hang in there");
      session.beginDialog('/causes');
    } else if (localeCompare(results.response, "Tired") == 0) {
      builder.Prompts.text(session, "Hey, hang in there. We all have times when we just want to call it a quit, but one will only grow through hardship so we mustn't give up");
      session.beginDialog('/causes');
    }
    session.endDialog();
  }
]);

bot.dialog('/causes', [
  function(session) {
    builder.Prompts.choice(session, "What best describes you right now?", ["Academic", "Coop", "Finance", "Social Life"]);
  },
  function(session, results) {
    if(localeCompare(results.response, "Academic") == 0){
      builder.Prompts.text(session, "If you are struggling with academics, maybe it's time to see an academic advisor, [insert info here]");
    } else if (localeCompare(results.response, "Coop") == 0) {
      builder.Prompts.text(session, "Finding a job can be hard sometimes, but pray to mr.goose and don't give up");
    } else if (localeCompare(results.response, "Finance") == 0) {
      builder.Prompts.text(session, "Bruh chill I am broke too");
    } else if (localeCompare(results.response, "Social Life") == 0) {
      builder.Prompts.text(session, "tfwnogf");
    }
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
    session.endDialog();
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
