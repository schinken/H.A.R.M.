
var  firmata        = require('./firmata-utils')
    ,common         = require('common')
    ,settings       = require('./config')
    ,WarpCore       = require('warpcore')
    ,StatusAPI      = require('bckspc-status')
    ,mysql          = require('mysql');

var db_con = mysql.createConnection({
    host     : settings.db.host,
    database : settings.db.database,
    user     : settings.db.user,
    password : settings.db.password
});

function log_contactors( contact, val, cb ) {

    var post = { 'contact': contact, 'status': val, erfda: new Date() };
    var query = db_con.query('INSERT INTO contactors SET ?', post, function(err, result) {
        if( cb ) {
            process.nextTick( cb );
        }
    });
}

console.log("connecting to board...");
var board = new firmata.Board( settings.arduino_device ,function(){
  //arduino is ready to communicate
    
    console.log("connected!");
    var blocked = false;

    board.digitalDebounced( settings.pin.taster, function( val ) {
       console.log("Pin taster changed to " + val ); 
       log_contactors('TASTER', val );
    });

    board.digitalDebounced( settings.pin.rahmen, function( val ) {
       console.log("Pin rahmen changed to " + val ); 
       log_contactors('RAHMEN', val );
    });

    board.digitalDebounced( settings.pin.schloss, function( val ) {
       console.log("Pin schloss changed to " + val ); 
       log_contactors('SCHLOSS', val );
    });

    /////////////////////////////////////////////////////////////////
    // WARPCORE CODE

    var wc = new WarpCore( board, settings.snmp_host, 100, 5000 );

    // Start disabled - if members are currently present
    // the lights get enabled by StatusAPI
    
    wc.disable();


    var  speed_min      = 0.08
        ,speed_max      = 0.62
        ,pi_cur         = 0
        ,pi_2           = Math.PI*2
        ,member_status  = true;

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

    // Use status api to switch the lights on or off
    // depending on members are present or not

    var status_api = new StatusAPI( settings.status_api, 120 );

    status_api.on('space_closed', function() {
        console.log("disabling lights");
        wc.disable();    
    });

    status_api.on('space_opened', function() {
        console.log("enabling lights");
        wc.enable(); 
    });


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
