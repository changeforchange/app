Pot = new Mongo.Collection('summary');

if (Meteor.isClient) {

  Template.main.helpers({
    currentBalance: function() {

      var balance = Pot.findOne({current: true}).balance;

      return (balance / 100).toFixed(2);

    }
  });

}


if (Meteor.isServer) {

  Meteor.startup(function () {

    var potCount = Pot.find().count();

    if (potCount !== 1) {

      // If we don't have a pot, create one,
      // or if we have more than one remove all documents
      // and then create one

      Pot.remove({});

      Pot.insert({
        balance: 0,
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

          var potBalance = Pot.findOne({current: true}).balance;

          if (body.hasOwnProperty('balance')) {

            // Add the received balance to the pot balance
            potBalance += Number(body.balance);

            Pot.update({
              current: true
            }, {
              $set: {
                balance: potBalance
              }
            });

            httpStatus = 201;
            response = {
              balance: potBalance
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

        this.response.writeHead(httpStatus, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });

        this.response.end(JSON.stringify(response));

      }

    }
  });
});
