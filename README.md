
# node-openrefine

Node.js client library for controlling OpenRefine.
Currently is nothing but a fork.

Although there are many other ways to achieve these results using other applications I have yet to experience an application that can handle such a huge amount of data and transform it with insane speeds.

The main objective is to apply the necessary changes to OpenRefine to make it work as an API service. Where the transformations can occur at the original object level, without the need to start and define "Projects" imports and exports.

Simply put, think of it as every project is initiated as a Line-Based text file and all else happens as part of the transformations/operations. A set of operations is tied to a REST service where payload is sent and transformed data is received.
This would mean that you can send messy CSVs and receive back cleaned versions using the same operations.
Or post xPaths of HTML data directly from the console of your browser and retrieve structured data.

--My Project

Milestone 1
- Get projects to actively listen as a REST service to post requests.
> Send new row(s) to the buffer, validate cloumn/data structure matching
> Apply preset transformations and post reply back.
> Fully clear cache and buffer and return to the original listening state.
Potential integration with https://medialab.github.io/artoo/

Milestone 2
- Build conditional operations dependent on validations
> Start with CSV file > Apply transformation set to get column names > Post column names for comparison
> If column names match X pattern then apply transformation set Y
(think of a company who has to build so many reports everyday, your best bet would be to assign transformations based on filename imported, however transformations based on conditional specifications allow for a much faulty free and universal resource processing)

Milestone 3
- Extend useability of the UI experience of other additional features of the system
> Explore the possibility of using Facet's data results in other interfaces
> Could clusters or facets be used in ORM based systems?
> Would a full integration of Facets be possible for ng-grid or KendoUI, Infragistics or DHTMLX?

## Usage

``` javascript
var openrefine = require('openrefine')

// another server; same usage
var server = openrefine.server('http://localhost:3333')

// projects metadata
openrefine
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
var project = openrefine
  .create('data_cleanup_project')     // .create() auto-generates a project name
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
project.destroy()
```



## See also

* [Refine API](https://github.com/maxogden/refine-python/wiki/Refine-API) and implementations [in Python](https://github.com/maxogden/refine-python/) and [in Ruby](https://github.com/maxogden/refine-ruby).
