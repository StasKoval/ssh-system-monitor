/**
 * Created by mtford on 31/01/2014.
 */


exports.mergeOptions = function(defaultOpts, options){
    var mergedOptions = {};
    var attributeName;
    for (attributeName in defaultOpts) {
        //noinspection JSUnfilteredForInLoop
        mergedOptions[attributeName] = defaultOpts[attributeName];
    }
    for (attributeName in options) {
        //noinspection JSUnfilteredForInLoop
        mergedOptions[attributeName] = options[attributeName];
    }
    return mergedOptions;
};

exports.isFloat = function(n) {
    return typeof n === 'number' && n % 1 !== 0;
};

String.prototype.format = function() {
    var formatted = this;
    for( var arg in arguments ) {
        formatted = formatted.replace("{" + arg + "}", arguments[arg]);
    }
    return formatted;
};