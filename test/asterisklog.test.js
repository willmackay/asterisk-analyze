var assert=require("assert");
var asterisklog=require("../lib/asterisklog.js");
var linebyline=require("line-by-line");


describe("Ingest sample call data",function(){

	this.slow(200);		// We are forcing timezone offsets, which is slower

	it("Direct log 1",(done)=>{

		var a=new asterisklog({queues: "299", force_utc_offset: "+00:00" });
		(new linebyline("./test/asterisk1.log"))
			.on("line", (line)=>a.add(line))
			.on("error", (err)=>{throw err})
			.on("end",()=>{

				var calls=a.get_calls();
				assert.equal(calls.length,1);
				assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),		// Conversion to/from JSON is to convert Date() objects to strings
					  {
					    "id": "SIP/fpbx-1-f04d84a7-0029dad8",
					    "start": "2016-12-01T07:10:46.000Z",
					    "end": "2016-12-01T07:18:01.000Z",
					    "enqueued": "2016-12-01T07:11:02.000Z",
					    "answered": "2016-12-01T07:11:04.000Z",
					    "answered_by": "Local/210",
					    "caller_id": "15555553333",
					    "rang": {
					      "Local/213": "2016-12-01T07:11:02.000Z",
					      "Local/210": "2016-12-01T07:11:02.000Z"
					    }
					  });
				done();
			});

	});

	it("Direct log 2",(done)=>{

		a=new asterisklog({queues: "510", force_utc_offset: "+00:00" });
		(new linebyline("./test/asterisk2.log"))
			.on("line", (line)=>a.add(line))
			.on("error", (err)=>{throw err})
			.on("end",()=>{

				var calls=a.get_calls();
				assert.equal(calls.length,1);
				assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),		// Conversion to/from JSON is to convert Date() objects to strings
				  {
				    "id": "SIP/5412202580-000000e9",
				    "start": "2017-01-31T16:48:08.000Z",
				    "end": "2017-01-31T16:48:58.000Z",
				    "enqueued": "2017-01-31T16:48:28.000Z",
				    "answered": "2017-01-31T16:48:53.000Z",
				    "answered_by": "Local/206",
				    "caller_id": "5412300555",
				    "rang": {}
				  });
				done();
			});

	});

	it("Asterisk 1.4.42 log sample",(done)=>{

		a=new asterisklog({queues: "299", force_utc_offset: "+00:00" });
		(new linebyline("./test/asterisk1.4.42.log"))
			.on("line", (line)=>a.add(line))
			.on("error", (err)=>{throw err})
			.on("end",()=>{

				var calls=a.get_calls();
				assert.equal(calls.length,1);
				assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),		// Conversion to/from JSON is to convert Date() objects to strings
				  {
				  "id": "SIP/fpbx-1-f04d84a7-00000032",
				  "start": "2017-02-23T15:03:12.000Z",
				  "end": "2017-02-23T15:03:34.000Z",
				  "enqueued": "2017-02-23T15:03:25.000Z",
				  "answered": "2017-02-23T15:03:27.000Z",
				  "answered_by": "SIP/212",
				  "caller_id": "15410001111",
				  "rang": {}
				});
				done();
			});

	});

	it("Remote syslog (no timestamps)",(done)=>{

		var a=new asterisklog({queues: "299", "require_timestamps" : false });
		(new linebyline("./test/syslog.log"))
			.on("line", (line)=>a.add(line))
			.on("error", (err)=>{throw err})
			.on("end",()=>{

				var calls=a.get_calls();
				assert.equal(calls.length,1);	
				assert.equal(calls[0].id, "SIP/fpbx-1-f04d84a7-002a75b6");	// Remote syslog does not have timestamps, so replaying the log results in incorrect times
				assert.equal(calls[0].caller_id, "15415559999");				
				assert.equal(calls[0].answered_by, "Local/213");				
				done();
			});
	});


	it("Throw if required timestamp is missing",(done)=>{

			var a=new asterisklog({queues: "299" });

			assert.throws(()=>{
					a.add("VERBOSE[12684]: pbx.c:4256 in pbx_extension_helper:     -- Executing [s@ext-did:1] ExecIf(\"SIP/fpbx-1-f04d84a7-002a75b6\", \"1?Set(__FROM_DID=s)\") in new stack ");
			}, Error);
			done();
	});

});
