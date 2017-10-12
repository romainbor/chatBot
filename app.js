var restify = require('restify');
var builder = require('botbuilder');


var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
   console.log('server name: ${server.name} | server url: ${server.url}');
});


var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});


server.post('/api/messages', connector.listen());


var bot = new builder.UniversalBot(connector, [

    function(session){
        session.send("Bienvenue dans l'assistant de reservation");
        session.beginDialog('mainMenu');
    }

]);

var menuItems = {
    "greetings" : {
        item: "greetings"
    },
    "reservation": {
        item: "reservation"
    }
};

bot.dialog('mainMenu', [
    function(session){
        builder.Prompts.choice(session, "Veuillez faire un choix :", menuItems, {listStyle: 3});
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog(menuItems[results.response.entity].item);
        } 
    }
])
.triggerAction({
    matches: /^main menu$/i,
    confirmPrompt: "This will cancel your request. Are you sure?"
})
.reloadAction(
    "restartRequest", "Ok let's start over.", {
        matches: /^start over$/i,
        confirmPrompt: "This will cancel your request. Are you sure?"
    }
)
.cancelAction(
    "cancelRequest", "Type 'Main Menu' to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel your request. Are you sure?"
    }
)

bot.dialog('greetings',[
    function (session) {
        session.beginDialog('askName');
    },
]);

bot.dialog('askName', [
    function (session) {
        builder.Prompts.text(session, 'Bonjour, quel est votre nom?');
    },
    function (session, results){
        session.privateConversationData.nomUser = results.response;
        session.send("Bonjour %s <br/> Si vous souhaitez effectuer une nouvelle action écrivez 'Main Menu'.", session.privateConversationData.nomUser);
        session.endDialog();
    }
]);

bot.dialog('reservation', [
    function (session, results) {
        builder.Prompts.time(session, "Quel jour ?");
    },
    function (session, results) {
        session.privateConversationData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
        builder.Prompts.number(session, "Combien de personnes ?");
    },
    function (session, results) {
        session.privateConversationData.reservationNb = results.response;
        builder.Prompts.text(session, "A quel nom ?");
    },
    function (session, results) {
        session.privateConversationData.reservationName = results.response;
        session.beginDialog('phonePrompt');
    },
    function (session, results) {
        session.send(`Reservation effectuée. <br/>Date: ${session.privateConversationData.reservationDate} <br/>Nombre de personnes: ${session.privateConversationData.reservationNb} <br/>Reservation : ${session.privateConversationData.reservationName } <br/>Numéro de téléphone : ${session.privateConversationData.phoneNumber }`);
        session.endDialog();
    }
]);

bot.dialog('phonePrompt', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, "Votre numéro doit être au format: '(555) 123-4567' ou '555-123-4567' ou '5551234567'")
        } else {
            builder.Prompts.text(session, "Quel est votre numéro ?");
        }
    },
    function (session, results) {
        var matched = results.response.match(/\d+/g);
        var number = matched ? matched.join('') : '';
        if (number.length == 10 || number.length == 11) {
            session.privateConversationData.phoneNumber = number;
            session.endDialog();
        } else {
            session.replaceDialog('phonePrompt', { reprompt: true });
        }
    }
]);