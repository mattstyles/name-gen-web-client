/**
 * moniker-mounted
 * ---
 *
 * Mounts moniker api and web client into one package
 */

import koa from 'koa';
import logger from 'koa-logger';
import serve from 'koa-static';
import mount from 'koa-mount';

import render from './util/views';
import api from 'moniker-api';
import client from 'moniker-web-client';


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
export default app;
