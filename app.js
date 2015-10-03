Pot = new Mongo.Collection('summary');

if (Meteor.isClient) {

}


if (Meteor.isServer) {

  Meteor.startup(function () {

    if (Pot.find().count() === 0) {

      Pot.insert({
        balance: 0
      });

    }

  });

}

Router.route('/', function () {

  this.render('Home', {

    data: function () {

    }

  });

});

Router.map(function () {
  this.route('change', {path: '/change/',
    where: 'server',
    action: function(){

      if (this.request.method == 'POST') {

        var body = this.request.body;
        var response;
        var httpStatus;

        if (body.auth === Meteor.settings.auth) {



          httpStatus = 201;
          response = {

          };

        } else {

          httpStatus = 401;
          response = {
            error: 'not authed'
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
