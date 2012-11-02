
module.exports = {
  
   'door': {
       'host': 'door.bckspc.de',
       'path': '/verify_pw',
       'pass': ''
    },
    'arduino_device': '/dev/ttyACM0',
    'snmp_host': '10.1.20.1',
    'relais_host': 'https://webrelais.bckspc.de',
    'status_api': 'http://status.bckspc.de/status.php?response=json',
    'pin': {
        'taster':   8,
        'schloss':  12,
        'rahmen':   13
    },
    'relais': {
        'notleuchte_weiss': 3,
        'heizung':          6
    },
    'led': {
        'blau':     5,
        'cyan':     6
    },
    'db': {
        'host'     : 'le host',
        'database' : 'fun and profit',
        'user'     : 'removed',
        'password' : 'nope.'
    }
};
