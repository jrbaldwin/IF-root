'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectID = Schema.ObjectID;
var messageSchema = mongoose.Schema({
    id: Number, //to keep track of state index in redux
    incoming: { type: Boolean, default: true } , //if true, incoming message, if false, outgoing message
    msg: String, //raw incoming message (if applicable)
    tokens: [String], //broken up incoming message (if applicable)
    bucket: String,
    action: String,
    amazon: [Schema.Types.Mixed], //amazon search results
    dataModify: {
        type: {
            type: String
        },
        val: [Schema.Types.Mixed],
        param: String
    },
    source: {
        origin: String,
        channel: String,
        org: String,
        id: String
    },
    client_res: [Schema.Types.Mixed],
    ts: {
        type: Date,
        default: Date.now
    },
    resolved: {
        type: Boolean,
        default: false
    },
    parent: Boolean, //TODO: remove this use alyx's new prop
    flags: {
        toSupervisor: Boolean, //messages coming from cinna to supervisor
        toClient: Boolean, //messages going from supervisor to cinna to client
        toCinna: Boolean, // messages going from supervisor to cinna only (previewing search results)
        searchResults: Boolean, //messages coming from cinna to supervisor that are search preview result sets
        recalled: Boolean //flag to bypass history function in cinna
    },  
    thread: {
        id: String,
        sequence: Number, //calculated by Cinna, will use in supervisor to keep track of state index in redux
        isOpen: Boolean,
        ticket: {
            id: String, 
            isOpen: Boolean
        },
        parent: {
            isParent:Boolean,
            parentId:String
        }
    }
});

module.exports = mongoose.model('Message', messageSchema);