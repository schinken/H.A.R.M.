
var  firmata        = require('./firmata-utils')
    ,common         = require('common')
    ,settings       = require('./config')
    ,StatusAPI      = require('bckspc-status')
    ,mysql          = require('mysql')
    ,querystring    = require('querystring')
    ,https          = require('https')
    ,webrelais      = require('./webrelais')

function log_contactors( contact, val, cb ) {

    var db_con = mysql.createConnection({
            host     : settings.db.host,
            database : settings.db.database,
            user     : settings.db.user,
            password : settings.db.password
        });

    db_con.connect();

    var post = { 'contact': contact, 'status': val, erfda: new Date() };
    var query = db_con.query('INSERT INTO contactors SET ?', post, function(err, result) {
        if( cb ) {
            process.nextTick( cb );
            db_con.end();
        }
    });
}

function log( str ) {
    console.log( (new Date()), str );
}

function door_control(action) {
    log("Request fire!");

    var post_data = querystring.stringify({
        'type':     action,
        'password': settings.door.pass
    });

    var post_options = {
        host: settings.door.host,
        port: '443',
        path: settings.door.path,
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
            log("Door should "+action+" now!");
        });
    });

    // post the data
    post_req.write(post_data);
    post_req.end();
}

log("connecting to board...");
var board = new firmata.Board( settings.arduino_device ,function(){
  //arduino is ready to communicate
    
    log("connected!");

    var door_open = false,
        door_locked = false,
        close_request = false,
        close_reset_timeout = false;
    
    var wr = new webrelais.Client( settings.relais_host );

    board.digitalDebounced( settings.pin.taster, function( val ) {
        log("Pin taster changed to " + val ); 
        log_contactors('TASTER', val );

        if( val == 1 ) {

            // if our door is locked, and in door frame, send open
            if( door_locked && !door_open ) {
                process.nextTick( function() {
                    door_control('Open');
                });
            } else {
                log("Request triggered, but door is not locked");    
            }

            if( door_open ) {
                // send a close request
                log("Taster pressed, door open, remebering close request!");
                close_request = true;

                // if door hasnt closed within 5 minutes, 
                // kill close request
                close_reset_timeout = setTimeout( function() {
                    close_request = false;
                    close_reset_timeout = false;
                }, 5*60*1000 );
            }

        } else {
            log("Taster released");    
        }
    });

    board.digitalDebounced( settings.pin.rahmen, function( val ) {
        log("Pin rahmen changed to " + val ); 
        log_contactors('RAHMEN', val );

        if( val == 0 ) {
            log("Door has been opened");
            door_open = true;

        } else if ( val == 1 ) {


            if( close_request ) {

                if( close_reset_timeout ) {
                    clearTimeout( close_reset_timeout );    
                    close_reset_timeout = false;
                }

                log("Processing close request");

                close_request = false;

                // fire close request    
                setTimeout( function() {
                    door_control('Close');
                }, 2000 );
            } 

            door_open = false;    
        }
    });

    board.digitalDebounced( settings.pin.schloss, function( val ) {
        log("Pin schloss changed to " + val ); 
        log_contactors('SCHLOSS', val );

        if( val == 1 ) {
            door_locked = true;
        } else {

            // if door was locked previously...
            if( door_locked ) {
                // ... let emergency sign illuminate the room for 3 minutes
                wr.set_port( settings.relais.notleuchte_weiss, 1, function() { 
                    log("At start, no has lyte. An Ceiling Cat sayz, i can haz lite? An lite wuz.");

                    setTimeout( function() {
                        log("Lite haz gone away!");
                        wr.set_port( settings.relais.notleuchte_weiss, 0, function() {} );
                    }, 5*60*1000 ); // 5 Minutes!
                });
                  
            }

            door_locked = false;
        }
    });


    // Use status api to switch the lights on or off
    // depending on members are present or not
    var status_api = new StatusAPI( settings.status_api, 120 );

    status_api.on('space_closed', function() {
        log("disabling lights");

        log("Schalte heizungsrelais...");
        wr.set_port( settings.relais.heizung, 1, function() { 
            log("Heizung ist ausgeschalten");
            log_contactors('HEATING', 0 );
        });
    });

    status_api.on('space_opened', function() {
        log("enabling lights");

        log("Schalte heizungsrelais...");
        wr.set_port( settings.relais.heizung, 0, function() { 
            log("Heizung ist angeschalten");
            log_contactors('HEATING', 1 );
        });
    });
        
});  
