

# node-openrefine

Node.js client library for controlling OpenRefine.

## Features

* [x] upload, apply operations, download results, delete project
* [ ] import from and export to buffer
* [ ] pipe
* [ ] CLI tool

## Usage

``` javascript
var openrefine = require('openrefine')

// another server; same usage
var server = openrefine.server('http://localhost:3333')

// projects metadata
openrefine
  .projects()
  .then(data => ...)
```

Project metadata format:

``` javascript
{
  "[project_id]": {
    "name": "[project_name]",
    "created": "[project_creation_time]",
    "modified": "[project_modification_time]",
    "customMetadata": {}
  },
  ...[More projects]...
}
```

Create a project and clean up some data:

``` javascript
var project = openrefine
  .create('data_cleanup_project')     // .create() auto-generates a project name
  .encoding('utf-8')
  .accept('csv')
  .accept({
    separator: ',',
    ignoreLines: 1
  })
  .expose('csv')
  .keep(true)   // keep data after end() or pipe; default is not keeping
  .use([
    {
      "op": "core/column-split",
      "description": "Split column DATE by separator",
      "engineConfig": {
        "facets": [],
        "mode": "row-based"
      },
      "columnName": "DATE",
      "guessCellType": true,
      "removeOriginalColumn": true,
      "mode": "separator",
      "separator": "-",
      "regex": false,
      "maxColumns": 0
    }
  ])
  .use(customCleanupAddress())    // customCleanupAddress() returns an array of operations

project
  .load('input.csv')
  .end(function (data) {
    // ...
  })
```

Or use the stream interface:

``` javascript
fs.createStream('input.csv')
  .pipe(project)
  .pipe(fs.createWriteStream('output.csv'))
```

A project may have some internal states (project metadata such as name and ID, data imported previously, etc.)  To open an existing project, use numeric ID of OpenRefine:

``` javascript
server.open(1234567980)
```

Delete all data in a project:

``` javascript
project.clean()
```

Destroy a project after use:

``` javascript
project.destroy()
```



## See also

* [Refine API](https://github.com/maxogden/refine-python/wiki/Refine-API) and implementations [in Python](https://github.com/maxogden/refine-python/) and [in Ruby](https://github.com/maxogden/refine-ruby).
