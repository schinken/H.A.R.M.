var firmata = require('firmata');

firmata.Board.prototype.digitalDebounced = function( pin, cb, sens ) {
    
    var  timeout     = false
        ,sensitivity = sens || 70
        ,last_sent   = null
        ,last_value  = null;

    this.pinMode( pin, this.MODES.INPUT );
    this.digitalRead( pin, function( val ) {

        if( timeout !== false ) {
            clearTimeout( timeout );
        }

        timeout = setTimeout( function() {
            timeout = false;
            
            if( last_value != last_sent ) {
                cb( last_value );
            }

            last_sent = last_value;
        }, sensitivity );

        last_value = val;
    });
};

module.exports = firmata;
