/**
 * name-gen-client
 */

var path        = require( 'path' );

var koa         = require( 'koa' );
var logger      = require( 'koa-logger' );
var serve       = require( 'koa-static' );
var route       = require( 'koa-route' );
var mount       = require( 'koa-mount' );

var render      = require( './util/views' );
var api         = require( 'name-gen-api' );

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


// Serve index
app.use( route.get( '/', function *() {
    this.status = 200;
    this.body = yield render( 'index' );
}));

// Serve assets
app.use( serve( path.join( __dirname, '../public' ) ) );


// Export composable app
module.exports = app;
