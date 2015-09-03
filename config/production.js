'use strict';

// Production specific configuration
// =================================
module.exports = {
    isProduction: true,
    geoipURL: 'http://127.0.0.1:8080/json/',
    // geoipURL: 'http://www.freegeoip.net/json/',
    mongodb: {
        url: 'mongodb://flareon.internal.kipapp.co/foundry,jolteon.internal.kipapp.co/foundry,vaporeon.internal.kipapp.co/foundry',
        options: {
            replset: {
                rs_name: 'foundry'
            }
        }
        //url: 'mongodb://ifappuser:password@mongodb-r1.kipapp.co,mongodb-r2.kipapp.co/foundry'.replace('password', process.env.MONGOPW)
    },
    elasticsearch: {
        url: 'http://elasticsearch-cerulean.internal.kipapp.co:9200'
    },
    elasticsearchElk: {
        url: 'http://analytics-db-mew.internal.kipapp.co:9200'
    },
    redis: {
        port: 6379,
        url: 'redis-thunder.internal.kipapp.co',
        options: {}
    },

    neighborhoodServer: {
        url: 'http://localhost:9998'
    }
    // // Server IP
    // ip:       process.env.OPENSHIFT_NODEJS_IP ||
    //           process.env.IP ||
    //           undefined,

    // // Server port
    // port:     process.env.OPENSHIFT_NODEJS_PORT ||
    //           process.env.PORT ||
    //           8080,

// // MongoDB connection options
// mongo: {
//   uri:    process.env.MONGOLAB_URI ||
//           process.env.MONGOHQ_URL ||
//           process.env.OPENSHIFT_MONGODB_DB_URL+process.env.OPENSHIFT_APP_NAME ||
//           'mongodb://localhost/app'
// }
};
