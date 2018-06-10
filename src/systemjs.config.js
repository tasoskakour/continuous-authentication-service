/**
 * WEB ANGULAR VERSION
 * (based on systemjs.config.js in angular.io)
 * System configuration for Angular samples
 * Adjust as necessary for your application needs.
 */
(function (global) {
  System.config({
    // DEMO ONLY! REAL CODE SHOULD NOT TRANSPILE IN THE BROWSER
    transpiler: 'ts',
    typescriptOptions: {
      // Complete copy of compiler options in standard tsconfig.json
      "target": "es5",
      "module": "commonjs",
      "moduleResolution": "node",
      "sourceMap": true,
      "emitDecoratorMetadata": true,
      "experimentalDecorators": true,
      "lib": ["es2015", "dom"],
      "noImplicitAny": true,
      "suppressImplicitAnyIndexErrors": true,
    },
    meta: {
      'typescript': {
        "exports": "ts"
      }
    },
    paths: {
      // paths serve as alias
      'npm:': 'https://unpkg.com/'
    },
    // map tells the System loader where to look for things
    map: {
      // our app is within the app folder
      app: 'app',

      // angular bundles
      '@angular/common': 'npm:@angular/common@4.1.0/bundles/common.umd.js',
      '@angular/compiler': 'npm:@angular/compiler@4.1.0/bundles/compiler.umd.js',
      '@angular/core': 'npm:@angular/core@4.1.0/bundles/core.umd.js',
      '@angular/forms': 'npm:@angular/forms@4.1.0/bundles/forms.umd.js',
      '@angular/http': 'npm:@angular/http@4.1.0/bundles/http.umd.js',
      '@angular/http/testing': 'npm:@angular/http@4.1.0/bundles/http-testing.umd.js',
      '@angular/platform-browser': 'npm:@angular/platform-browser@4.1.0/bundles/platform-browser.umd.js',
      '@angular/platform-browser-dynamic': 'npm:@angular/platform-browser-dynamic@4.1.0/bundles/platform-browser-dynamic.umd.js',
      '@angular/router': 'npm:@angular/router@4.1.0/bundles/router.umd.js',

      // other libraries
      'rxjs':                      'npm:rxjs@5.0.1',
      'ts':                        'npm:plugin-typescript@5.2.7/lib/plugin.js',
      'typescript':                'npm:typescript@2.2.1/lib/typescript.js'
    },
    // packages tells the System loader how to load when no filename and/or no extension
    packages: {
      app: {
        main: './main.ts',
        defaultExtension: 'ts'
      },
      rxjs: {
        defaultExtension: 'js'
      }
    }
  });

  if (!global.noBootstrap) { bootstrap(); }

  // Bootstrap the `AppModule`(skip the `app/main.ts` that normally does this)
  function bootstrap() {

    // Stub out `app/main.ts` so System.import('app') doesn't fail if called in the index.html
    System.set(System.normalizeSync('app/main.ts'), System.newModule({ }));

    // bootstrap and launch the app (equivalent to standard main.ts)
    Promise.all([
      System.import('@angular/platform-browser-dynamic'),
      System.import('app/app.module')
    ])
    .then(function (imports) {
      var platform = imports[0];
      var app      = imports[1];
      platform.platformBrowserDynamic().bootstrapModule(app.AppModule);
    })
    .catch(function(err){ console.error(err); });
  }

})(this);