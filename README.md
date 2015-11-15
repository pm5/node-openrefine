
node-openrefine
===============

Node.js client library for controlling OpenRefine.

Features
--------

* [x] upload, apply operations, download results
* [ ] import from and export to buffer
* [ ] pipe
* [ ] CLI tool

Usage
-----

```
import {OpenRefine} from 'open-refine'

var server = OpenRefine()
// set API endpoint
//var server = OpenRefine('http://localhost:3333')

server.projects_metadata()
  .then(data => ...)

server.project('my_awesome_data_cleanup_project')
  .upload('upload.csv')
  .apply('operations.json')
  .download('csv', 'output.csv')
  .then(r => {
    server.delete(r.project_id)
    done()
  })

// load existing project by numeric project id
server.project()
  .id(project_id)
  .download('csv', 'output.csv')
  .then(done)
```

Project metadata format :

```
{
  "projects": {
    "[project_id]": {
      "name": "[project_name]",
      "created": "[project_creation_time]",
      "modified": "[project_modification_time]",
      "customMetadata": {}
    },
    ...[More projects]...
  }
}
```
