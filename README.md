
# node-openrefine

Node.js client library for controlling OpenRefine.

## TODO / Features

* [] upload, apply operations, download results, delete project
* [ ] pipe
* [ ] CLI tool

## Usage

``` javascript
const openrefine = require('openrefine')

// another server; same usage
const server = openrefine.server('http://localhost:3333')
const csrfToken = await server.getCsrfToken();

// projects metadata
server
  .projects()
  .then(project_metadata => ...)
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
const project = server.create('data_cleanup_project'); // .create() auto-generates a project name

project   
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
  ], csrfToken)
  .use(customCleanupAddress(), csrfToken)    // customCleanupAddress() returns an array of operations

project
  .load('input.csv', csrfToken)
  .end(function (data) {
    // ...
  }, csrfToken)
  .then(() => project.destroy())
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
project.destroy(csrfToken)
```



## See also

* [Refine API](https://github.com/maxogden/refine-python/wiki/Refine-API) and implementations [in Python](https://github.com/maxogden/refine-python/) and [in Ruby](https://github.com/maxogden/refine-ruby).
