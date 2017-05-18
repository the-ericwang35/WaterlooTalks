/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a complete walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder"); // require the botbuilder module
var botbuilder_azure = require("botbuilder-azure");
var unirest = require('unirest');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
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
  function (session, args, next) {
    if (!session.userData.name) {
      session.beginDialog('/profile');
    } else {
      next();
    }
  },
  function (session, results) {
    session.send("Hi, %s. How are you doing?", session.userData.name);
    session.endDialog();
  }
]);

bot.dialog('/profile', [
  function (session) {
    builder.Prompts.text(session, "Hey there! What is your name?");
  },
  function (session, results) {
    session.userData.name = results.response;
    session.endDialog();
  }
]);

bot.dialog('/counsel', [
  function (session) {
    session.send("You can contact Waterloo Health Services at 519-888-4096 or you can visit https://uwaterloo.ca/health-services/mental-health-services for more info");
    session.send("Alternatively, the Delton Glebe Counselling Centre is near campus and can be reached at 519-884-3305 or at http://glebecounselling.ca/");
    session.endDialog();
  }
]);


bot.dialog('/feeling',
  function (session) {
    var res = session.message.text;
    unirest.post('https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment')
      .headers({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': '88d91d2cc28c48628da9256371be038e' })
      .send({ "documents": [{ "language": "en", "id": "bot", "text": res }] })
      .end(function (response) {
        if (Number(res) != res) {
          session.send(res);
          if (res === "Academic" || res === "Coop" || res === "Finance" || res === "Social Life") {
            session.beginDialog('/causes2');
          } else {
            if (response.body['documents'][0]['score'] < 0.4) {
              session.beginDialog('/promptSad');
            } else {
              session.beginDialog('/promptHappy');
            }
          }
        } else {
          session.beginDialog('/sadEmotions2');
        }
      });
    session.endDialog();
  });

bot.dialog('/promptSad', [
  function (session) {
    builder.Prompts.choice(session, "It seems like you are feeling down, is this true?", ["Yes", "No"]);
  },
  function (session, results) {
    if (results.response.entity === "Yes") {
      session.beginDialog('/sadEmotions');
    } else {
      session.beginDialog('/happyEnding');
    }
    session.endDialog();
  }
]);

bot.dialog('/promptHappy', [
  function (session) {
    builder.Prompts.choice(session, "It seems like you are doing alright, is that true?", ["Yes", "No"]);
  },
  function (session, results) {
    if (results.response.entity === "Yes") {
      session.beginDialog('/happyEnding');
    } else {
      session.beginDialog('/sadEmotions');
    }
    session.endDialog();
  }
]);

bot.dialog('/happyEnding', [
  function (session) {
    session.send("Happy to hear that! I will always be here if you need me");
    session.endDialog();
  }
]);

bot.dialog('/sadEmotions',
  function (session) {
    session.send("1 - Sad");
    session.send("2 - Tired");
    session.send("3 - Angry");
    session.send("4 - Scared");
    session.send("5 - Anxious");
    builder.Prompts.number(session, "Which feeling best describes you right now? Please enter the corresponding number.");
  });

bot.dialog('/sadEmotions2',
  function (session) {
    var res = session.message.text;
    if (res == 1) {
      session.send("I'm sorry to hear that. Please know that you're not alone in this world, and that there are many people who care about you and love you very much. I am not fully equipped to help you yet, sorry. If it's an emergency, please contact 911 or your local authorities. I also encourage you to contact a trained mental health professional who will be able to help you better than I can. Hang in there");
      session.beginDialog('/causes');
    } else if (res == 2) {
      session.send("Hey, hang in there. We all have times when we just want to call it a quit, but one will only grow through hardship. You will come out of this stronger, so don't give up!");
      session.beginDialog('/causes');
    } else if (res == 3) {
      session.send("Take a deep breath, and try to stop thinking about whatever is bothering you. We all feel angry sometimes, but it is important to deal with your anger in a healthy way. Perhaps you can go take a walk outside, and try to clear your head.");
      session.beginDialog('/causes');
    } else if (res == 4) {
      session.send("We all feel scared sometimes, so you are definitely not alone! Try to take your mind off of what is scaring you, and collect your thoughts. Persevere, and the fear will dissolve.");
      session.beginDialog('/causes');
    } else if (res == 5) {
      session.send("Hey, it's perfectly fine to feel anxious sometimes. Try to take a deep breath, and take your mind off of whatever is making you anxious. Try your best to prepare for whatever you are anxious about, and you will be fine. Hang in there!");
      session.beginDialog('/causes');
    }
    session.endDialog();
  }
);

bot.dialog('/causes', 
  function (session) {
    builder.Prompts.choice(session, "Could you tell me what is causing you to feel this way?", ["Academic", "Coop", "Finance", "Social Life"]);
  });
                                                           
bot.dialog('/causes2',                                                          
  function (session) {
    var res = session.message.text;                                                           
    if (res === "Academic") {
      session.send("If you are struggling with academics, it may be a great idea to see an academic advisor, as they can help you get through your problems. You can get more info here: https://uwaterloo.ca/registrar/current-students/advisors");
    } else if (res === "Coop") {
      session.send("Don't stress, finding a job is a difficult process for everyone. Be patient and keep on applying to jobs, and look for ways to improve your employable skills. If you are still concerned, check out https://uwaterloo.ca/co-operative-education/ for more information");
    } else if (res === "Finance") {
      session.send("There are government fundings, scholarships, and bursaries you can apply to, check out https://www.ontario.ca/page/osap-ontario-student-assistance-program and https://uwaterloo.ca/find-out-more/financing/scholarships for more details.");
    } else if (res === "Social Life") {
      session.send("It's never too late to make new friends! Try joining some clubs you're interested in, talking to classmates, and attending campus events. Get out there and be a social butterfly!");
    }
    session.endDialog();
  }
);

bot.dialog('/numbers', [
  function (session) {
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
  server.listen(3978, function () {
    console.log('test bot endpont at http://localhost:3978/api/messages');
  });
  server.post('/api/messages', connector.listen());
} else {
  module.exports = { default: connector.listen() }
}
