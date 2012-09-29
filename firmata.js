
var  firmata        = require('firmata')
    ,https          = require('https')
    ,http           = require('http')
    ,common         = require('common')
    ,querystring    = require('querystring')
    ,settings       = require('./config')
    ,request        = require('request')
    ,WarpCore       = require('warpcore');

console.log("connecting to board...");
var board = new firmata.Board( settings.arduino_device ,function(){
  //arduino is ready to communicate

    var inputListener = function ( pin, cb ) {

        console.log("Listing on pin " + pin );

        var  lastStatus = null;

        board.pinMode( pin, board.MODES.INPUT );
        board.digitalRead( pin, function( val ) {

            if( lastStatus === null ) {
                cb(val);
            } else if ( lastStatus != val ) {
                cb(val);    
            }

            lastStatus = val;
        });
    };

    console.log("connected!");
    var blocked = false;


    inputListener( 13, function( val ) {
       console.log("Pin taster changed to " + val ); 
    });

    inputListener( 12, function( val ) {
       console.log("Pin rahmen changed to " + val ); 
    });

    inputListener( 8, function( val ) {
       console.log("Pin schloss changed to " + val ); 
    });

    /////////////////////////////////////////////////////////////////
    // WARPCORE CODE

    var wc = new WarpCore( board, settings.snmp_host );

    wc.disable();

    var  speed_min      = 0.08
        ,speed_max      = 0.62
        ,pi_cur         = 0
        ,pi_2           = Math.PI*2
        ,member_status  = false;

    wc.on('update', function( val ) {
        pi_cur += common.map_range(val, 0.0, 1.0, speed_min, speed_max);
        pi_cur = pi_cur % pi_2;
    });

    wc.led_update( 5, function() {
        var tmp = Math.sin( pi_cur );
        return common.map_range( tmp, -1.0, 1.0, 0.0, 255.0 );
    });

    wc.led_update( 6, function() { 
        var tmp = Math.sin( pi_cur + Math.PI );
        return common.map_range( tmp, -1.0, 1.0, 0.0, 255.0 );
    });

    // Check API if members are present or not

    setInterval( function() {

        request( {url:settings.status_api, json:true}, function( err, response, body ) {
            if ( !err && response.statusCode == 200 ) {
                if( body.members == 0 ) {
                    if( member_status ) {
                        member_status = false;
                        console.log("no members are present -> disabling");
                        wc.disable();    
                    }    
                } else {
                    if( !member_status ) {
                        member_status = true;
                        console.log("Members are present -> enabling");
                        wc.enable();
                    }    
                }
            } 
        });

    }, 60 * 1000 ); // Check every minute


/*
    board.pinMode(13, board.MODES.INPUT)
    board.digitalRead(13, function( val ) {

        if( blocked ) {
            console.log("Switch blocked, cant do that dave.")
            return;    
        }

        if( val == 1 ) {

            blocked = true;

            console.log("Close door request detected, running in 3.. 2.. 1..");

            setTimeout(function() {

                blocked = false;
                console.log("Request fire!");

                var post_data = querystring.stringify({
                    'type':     'Close',
                    'password': door.pass
                });

                var post_options = {
                    host: door.host,
                    port: '443',
                    path: door.path,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': post_data.length
                    }
                };

                // Set up the request
                var post_req = https.request(post_options, function(res) {
                    res.setEncoding('utf8');
                    res.on('end', function () {
                        console.log("Door should be closed now!");
                    });
                });

                // post the data
                post_req.write(post_data);
                post_req.end();

            }, 3000 );
            
        }
    });
*/
});  
