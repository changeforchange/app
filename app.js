Pot = new Mongo.Collection('summary'); // Single summary object
Credit = new Mongo.Collection('credit'); // Credit entries

if (Meteor.isClient) {

  Template.main.helpers({
    currentBalance: function() {

      // Get the current balance from the pot
      var balance = Pot.findOne({current: true}).balance;

      // Return the balance (pence) formatted in pounds
      return (balance / 100).toFixed(2);

    }
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

}

Router.route('/', function () {

  this.render('main', {

    data: function () {

    }

  });

});

Router.map(function () {
  this.route('change', {path: '/change/',
    where: 'server',
    action: function(){

      if (this.request.method == 'POST') {

        // If we receive a POST

        var body = this.request.body;
        var response;
        var httpStatus;

        if (body.auth === Meteor.settings.auth) {

          // If the recieved auth matches our auth

          // Get the current pot
          var pot = Pot.findOne({current: true});
          var newBalance;

          if (pot && body.hasOwnProperty('balance')) {

            if (body.balance <= pot.previousBalance) {

              // If the recieved balance is less than the current balance
              // add the received balance to the pot balance
              newBalance = pot.balance + Number(body.balance);

            } else {

              // If the received balance is greater than the current balance
              // find the difference between the received balance and the
              // previous balance, then add that
              newBalance = pot.balance + (body.balance - pot.previousBalance);

            }

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
