Pot = new Mongo.Collection('summary'); // Single summary object
Credit = new Mongo.Collection('credit'); // Credit entries

if (Meteor.isClient) {

  Meteor.subscribe('pot');
  Meteor.subscribe('credit');

  Template.main.helpers({

    currentBalance: function() {

      // Get the current balance from the pot
      var pot = Pot.findOne({current: true});

      // Return the balance (pence) formatted in pounds
      return pot ? (pot.balance / 100).toFixed(2) : 0.00;

    },

    recentCredits: function() {

      return Credit.find();

    },

    charities: function() {

      return Session.get('charities');

    },

    localCharities: function() {
      return Meteor.settings.public.localCharities;
    }

  });

  Meteor.autosubscribe(function() {
    Pot.find().observe({
      added: function() {

        if (Pot.findOne().balance === 0) {
          sweetAlert('Thanks!', 'Your donation has been sent!', 'success');
        }

      }
    });
  });


  Template.main.events({

    'keydown input#search': function(event, template) {

      if (event.which === 13) {

        var input = template.find('#search');
        var query = input.value;

        HTTP.call(
          'GET',
          'https://api.justgiving.com/' + Meteor.settings.jgAPI + '/v1/onesearch?i=charity&limit=3&q=' + query,
          {
            content: 'application/json',
            headers: {
              accept: 'application/json'
            }
          },
          function(err, res) {

            if (err) {
              console.log('Error querying Just Giving: ', err);
              return;
            }

            var results = JSON.parse(res.content).GroupedResults[0];

            var charities = results ? results.Results : [];

            Session.set('charities', charities);

            input.select();

          }

        );

      }

    }

  });

  Template.charity.events({
    'click .donate': function() {

      var pot = Pot.findOne({current: true});

      var amount = (pot.balance / 100).toFixed(2);

      var charityId = this.Id;

      if (amount < 2) {
        sweetAlert('Hang on', 'You can\'t donate less than £2', 'info');
      } else {

        sweetAlert({
          title: 'Donate £' + amount + ' to ' + this.Name + '?',
          type: 'info',
          showCancelButton: true,
          cancelButtonText: 'Close',
          confirmButtonText: 'Donate!',
          closeOnConfirm: true
        }, function(isConfirm) {

          if (isConfirm) {
            Meteor.call('donate', charityId, amount);
          }

        });

      }

    },
    'click .info': function() {

      sweetAlert({
        title: this.Name,
        text: this.Description,
        type: 'info',
        showCancelButton: true,
        cancelButtonText: 'Close',
        confirmButtonText: 'Donate!',
        closeOnConfirm: true
      }, function(isConfirm) {

        if (isConfirm) {

          var pot = Pot.findOne({current: true});

          var amount = (pot.balance / 100).toFixed(2);
          var charityId = this.Id;

          if (amount < 2) {
            sweetAlert('Hang on', 'You can\'t donate less than £2', 'info');
          } else {

            sweetAlert({
              title: 'Donate £' + amount + ' to ' + this.Name + '?',
              type: 'info',
              showCancelButton: true,
              cancelButtonText: 'Close',
              confirmButtonText: 'Donate!',
              closeOnConfirm: true
            }, function(isConfirm) {

              if (isConfirm) {
                Meteor.call('donate', charityId, amount);
              }

            });

          }

          return;

        }

      });

    },
  });


}

if (Meteor.isServer) {

  Meteor.startup(function () {

    if (Pot.find().count() !== 1) {

      // If we don't have a pot, create one,
      // or if we have more than one remove all documents
      // and then create one

      Pot.remove({});

      Pot.insert({
        balance: 0,
        previousBalance: 0,
        current: true
      });

    }

  });

  Meteor.publish('pot', function() {
    return Pot.find({current: true});
  });

  Meteor.publish('credit', function() {
    return Credit.find({}, {sort: {timestamp: -1}, limit: 5});
  });

  Meteor.methods({
    donate: function(charityId, amount) {

      var sys = Npm.require('sys');
      var exec = Npm.require('child_process').exec;

      var path = '/Users/joshfarrant/Projects/hackference/justgiving-donate/donate.js';

      var command = 'casperjs '+path+' --charity="'+charityId+'" --amount="'+amount+'"';
      console.log('Donating...');

      console.log('');
      console.log('command: ', command);
      console.log('');

      exec(command, function (error, stdout, stderr) {

        console.log(stdout);
        console.log(stderr);

        if (error) {
          console.log('exec error: ' + error);
          return;
        } else {
          console.log('Donation successful');
        }

      });

      Pot.remove({});

      Pot.insert({
        balance: 0,
        previousBalance: 0,
        current: true
      });

    }
  });


}

Router.route('/', function () {

  this.render('main', {

    data: function () {

    }

  });

});

Router.map(function () {
  this.route('credit', {path: '/credit/',
    where: 'server',
    action: function(){

      if (this.request.method == 'POST') {

        // If we receive a POST

        var body = this.request.body;
        var response, httpStatus;

        if (body.auth === Meteor.settings.auth) {

          // If the recieved auth matches our auth

          // Get the current pot
          var pot = Pot.findOne({current: true});
          var newBalance, addedBalance;

          if (pot && body.hasOwnProperty('balance')) {

            if (body.balance >= 0 && body.balance <= pot.previousBalance) {

              // If the recieved balance is less than the current balance
              // add the received balance to the pot balance
              addedBalance = Number(body.balance);

            } else {

              // If the received balance is greater than the current balance
              // find the difference between the received balance and the
              // previous balance, then add that
              addedBalance = (body.balance - pot.previousBalance);

            }

            newBalance = pot.balance + addedBalance;

            // Update the Pot in the db with the new balance,
            // as well as the previous balance received in the request
            Pot.update({
              current: true
            }, {
              $set: {
                balance: newBalance,
                previousBalance: body.balance
              }
            });

            Credit.insert({
              balance: addedBalance,
              timestamp: Math.floor(new Date().getTime() / 1000) // Current timestamp in seconds
            });

            // Return a 201, along with the new balance
            httpStatus = 201;
            response = {
              balance: newBalance
            };

          } else {

            // If a balance is not provided

            httpStatus = 400;
            response = {
              errors: [
                {
                  property: 'balance',
                  error: 'not provided'
                }
              ]
            };

          }

        } else {

          // If the received auth doesn't match our auth

          httpStatus = 401;
          response = {
            errors: [
              {
                property: 'auth',
                error: 'not valid'
              }
            ]
          };

        }

        // Write the response code and headers
        this.response.writeHead(httpStatus, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });

        // Send the stringified response
        this.response.end(JSON.stringify(response));

      }

    }
  });
});
