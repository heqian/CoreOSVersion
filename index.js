"use strict";

var https = require("https");
var nedb = require("nedb");
var async = require("async");
var twitter = require("twitter");
var config = require("./config.js");

var database = new nedb({
	filename: __dirname + "/versions.db",
	autoload: true
});

var client = new twitter(config.twitter);
var HTTPS_API_URLS = {
	MAIN: {
		hostname: "coreos.com",
		path: "/releases/releases.json",
		method: "GET"
	},
	ALPHA: {
		hostname: "coreos.com",
		path: "/dist/aws/aws-alpha.json",
		method: "GET"
	},
	BETA: {
		hostname: "coreos.com",
		path: "/dist/aws/aws-beta.json",
		method: "GET"
	},
	STABLE: {
		hostname: "coreos.com",
		path: "/dist/aws/aws-stable.json",
		method: "GET"
	}
}

function fetch(options, callback) {
	var request = https.request(options, function(response) {
		var output = "";

		response.on("data", function(chunk) {
			output += chunk;
		});

		response.on("end", function() {
			var json = JSON.parse(output.toString());
			callback(null, json);
		});

		response.on("error", function(error) {
			console.error(error);
			callback(error, null);
		});
	});

	request.end();
}

function update(text) {
	client.post(
		"statuses/update",
		{
			status: text
		},
		function(error, tweet, response) {
			if (error) console.error(error);
		});
}

function check() {
	async.parallel({
		"alpha": function(callback) {
			fetch(HTTPS_API_URLS.ALPHA, callback);
		},
		"beta": function(callback) {
			fetch(HTTPS_API_URLS.BETA, callback);
		},
		"stable": function(callback) {
			fetch(HTTPS_API_URLS.STABLE, callback);
		}
	}, function(error, result) {
		if (error) {
			console.error(error);
			return;
		}

		var versions = {
			"alpha": result.alpha.release_info,
			"beta": result.beta.release_info,
			"stable": result.stable.release_info
		};

		database.findOne(versions, function(error, document) {
			if (error) {
				console.error(error);
				return;
			}

			if (document === null) {
				database.insert(versions, function(error) {
					if (error) console.error(error);
				});

				update(
					"Stable: " + versions.stable.version + "\n" +
					"Beta: " + versions.beta.version + "\n" +
					"Alpha: " + versions.alpha.version
				);
			} else {
				console.log("[%s] No news is good news. :)", new Date().toString());
			}
		});
	});

	setTimeout(check, config.interval);
}

check();
