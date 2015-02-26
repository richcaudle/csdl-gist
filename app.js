var fs = require('fs');
var restify = require('restify');
var github = require('octonode');

var ghgist = github.client().gist();
var server = restify.createServer();

var embedContent = fs.readFileSync('./resources/embed.js','utf8');

server.get(/\.html/, restify.serveStatic({
  directory: './public'
}));

server.get('/embed/:id', 
	function respond(req, res, next) {
  		ghgist.get(req.params.id, function(err, data, headers) {
  			
        res.contentType = 'javascript';

  			if(err)
  			{
  				console.log("Error accessing CSDL from GIST (" + req.params.id + "): " + err);
          res.send(embedContent.replace('%%CSDL%%', "null"));
  			}
  			else
  			{
  				var csdl = [];
  				var filename;

  				for (var file in data['files'])
  				{
  					csdl.push({
  						content: data['files'][file]['content'],
  						filename: file,
  						username: data['owner']['login'],
  						url: data['url']
  					});
  				}

  				res.send(embedContent.replace('%%CSDL%%', JSON.stringify(csdl)));
  			}

			 next();
		});
	});

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});


