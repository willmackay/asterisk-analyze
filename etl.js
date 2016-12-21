var promise=require("bluebird");
var asterisklog=require("./lib/asterisklog.js");
var nconf = require('nconf');
var fs=promise.promisifyAll(require("fs"));
var linebyline=require("line-by-line");
var Tail = require('always-tail2');
var log = require("bunyan").createLogger({"name":"asterisk-analyze-etl"});
var mysql = require("promise-mysql");
var moment = require("moment");
var redis = new (require("ioredis"))(); //promise.promisifyAll(require("redis"));


// Read the config
nconf
	.argv()
	.env()
	.file({ file: 'config.json' })
	.defaults({ "general" : { "input" : "full", "output" : "calls.json", "mode" : "follow" } });

// Create analyzer
var al=new asterisklog({queues: nconf.get('asterisk').queues});

// Ensure input file exists
if(!fs.existsSync(nconf.get('general').input)){

	log.error("Error - cannot read from input file '"+nconf.get('general').input+"'");
}

// Create Redis client
var redis

// Connect to the databsae
mysql
	.createConnection(nconf.get('mysql'))
	.then((c)=>{

		log.info("Connected to database");

		// A new call has been found
		al.on("start", (call) => {

			log.info("New call started");
			redis.publish("calls",JSON.stringify(call));
		})
		.on("enqueued", ()=>{

			log.info("Call in queue");
			redis.publish("calls",JSON.stringify(call));
		})
		.on("end", (call) => {

			log.info("Call ended");
			redis.publish("calls",JSON.stringify(call));


			// See if this record already exists
			c
				.query("SELECT id, data FROM calls WHERE start = ?", [moment(call.start).format('YYYY-MM-DD HH:mm:ss')])
				.then((rows) =>{


					for(n in rows) {

						var data=JSON.parse(rows[n].data);
						if (call.id == data.id){

							if(call.end) {

								// This is a match.  Call already listed as ended.  Do not insert.
								log.info("Existing call found.  Not saving in database");
								return promise.resolve(false);
							}
						}
					}

					// No matching call.  Insert
					log.info("Inserting new call into database");
					return promise.resolve(true);

				})
				.then((b)=>{

					if(b) c.query("INSERT INTO calls (start, data) VALUES ( ?, ?)",[moment(call.start).format('YYYY-MM-DD HH:mm:ss'),JSON.stringify(call)]);
				});		
		});	

		// Start watching
		if(reader instanceof Tail) reader.watch();
		return promise.resolve(true);
	})
	.catch((err) =>{

		log.error(err);
		if(reader instanceof Tail) reader.unwatch();
		log.error("Quitting");
		exit();
	});


// Select a reader
var reader = (nconf.get('gulp'))?(new linebyline(nconf.get('general').input)):(new Tail(nconf.get('general').input));

reader
	.on("line", (line)=>al.add(line))
	.on('error', (err) => {

		log.error("Error - "+err);
		log.error("Quitting");
		if(reader instanceof Tail) reader.unwatch();
		exit();
	})
	.on("end",()=>{

		if(reader instanceof linebyline) {
			
			process.exit();
		};
		exit();		
	});




