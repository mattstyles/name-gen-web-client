/**
 * moniker-mounted
 * ---
 *
 * Mounts moniker api and web client into one package
 */

var koa         = require( 'koa' );
var logger      = require( 'koa-logger' );
var serve       = require( 'koa-static' );
var mount       = require( 'koa-mount' );

var render      = require( './util/views' );
var api         = require( 'moniker-api' );
var client      = require( 'moniker-web-client' );


api.on( 'ready', event => {
    app.emit( 'ready' );
});


var app = koa();

app.use( logger() );


// Custom 404
app.use( function *( next ) {
    yield next;

    if ( this.body || !this.idempotent ) {
        return;
    }

    this.status = 404;
    this.body = yield render( '404' );
});

// Mount api
app.use( mount( '/api', api ) );


// Serve client
app.use( serve( client ) );


// Export composable app
module.exports = app;
