'use strict'

var sa = require('superagent')
var fs = require('fs')
var debug = require('debug')('openrefine')

// ES6 Promise plugin for superagent
function promise () {
  return function (req) {
    req.end = function () {
      return new Promise(function (resolve, reject) {
        Object.getPrototypeOf(req).end.call(req, function (err, res) {
          if (err) { return reject(err) }
          if (!res.ok) { return reject(res.text) }
          resolve(res)
        })
      })
    }
  }
}

class Project {
  constructor (project_name, endpoint) {
    this._name = project_name || 'abc'
    this._endpoint = endpoint
    this._upload_queue = []
    this._input_format = 'csv'
  }

  name () {
    if (arguments.length > 0) {
      this._name = arguments[0]
      return this
    }
    return this._name
  }

  id () {
    return this._project_id
  }

  accept () {
    if (arguments.length > 0) {
      this._input_format = arguments[0]
      return this
    }
    return this._input_format
  }

  expose () {
    if (arguments.length > 0) {
      this._output_format = arguments[0]
      return this
    }
    return this._output_format
  }

  _upload_data (endpoint, project_name, file_name) {
    return sa.post(endpoint + '/command/core/create-project-from-upload?options={"encoding":"UTF-8","separator":",","ignoreLines":-1,"headerLines":1,"skipDataLines":0,"limit":-1,"storeBlankRows":true,"guessCellValueTypes":false,"processQuotes":true,"storeBlankCellsAsNulls":true,"includeFileSources":false}')
      .use(promise())
      .redirects(0)
      .field('project-name', project_name)
      .attach('project-file', fs.readFileSync(file_name), file_name)
      .end()
      .catch(err => err.status === 302 ? err.response : Promise.reject(err))
  }

  _download_data (endpoint, project_id, format) {
    debug('download data in ' + project_id)
    return sa.post(endpoint + '/command/core/export-rows/' + project_id + '.' + format)
      .use(promise())
      .send('engine={"facets":[],"mode":"row-based"}')
      .send('project=' + project_id)
      .send('format=' + this._output_format)
      .end()
      .then(res => res.text)
  }

  _start_upload () {
    if (this._job !== undefined) {
      return this._job
    }
    if (this._upload_queue.length === 0) {
      return Promise.resolve()
    }
    var file_name = this._upload_queue.shift()
    debug('upload data in ' + file_name)
    this._job = this._upload_data(this._endpoint, this._name, file_name)
      .then(res => {
        this._project_id = +res.headers.location.replace(this._endpoint + '/project?project=', '')
        this._job = undefined
        return this._start_upload()
      })
      .catch(debug)
    return this._job
  }

  load (file_name) {
    debug('put ' + file_name + ' on queue')
    this._upload_queue.push(file_name)
    this._start_upload()
    return this
  }

  end (done) {
    return this._start_upload()
      .then(() => this._download_data(this._endpoint, this._project_id, 'csv'))
      .then(done)
  }

  apply (op_file_name) {
    this._promise.then(() => {
      debug('apply operations in ' + op_file_name + ' to project ' + this._project_id + '.')
      this._promise = sa.post(this._endpoint + '/command/core/apply-operations?project=' + this._project_id)
        .use(promise())
        .send('operations=' + fs.readFileSync(op_file_name))
        .end()
        .then(() => {
          return {
            project_id: this._project_id
          }
        })
    })
    return this
  }

  _export (format) {
    this._promise = this._promise.then(() => {
      debug('export data in project ' + this._project_id + ' into ' + format + '.')
      return sa.post(this._endpoint + '/command/core/export-rows/' + this._project_id + '.' + format)
        .use(promise())
        .send('engine={"facets":[],"mode":"row-based"}')
        .send('project=' + this._project_id)
        .send('format=' + format)
        .end()
        .then(res => res.text)
    })
  }

  pipe (out) {
    this._export('csv')
    this._promise.then(text => {
      out.write(text)
      out.end()
    })
    return out
  }

  destroy () {
    this._promise.then(() => {
      debug('delete project ' + this._project_id)
      return sa.post(this._endpoint + '/command/core/delete-project')
        .use(promise())
        .send('project=' + this._project_id)
        .end()
    })
    return this
  }
}

module.exports = function (endpoint) {
  var conf = {
    endpoint: endpoint || 'http://localhost:3333'
  }
  var server = {}

  server.create = function (project_name) {
    debug('create project ' + project_name)
    var p = new Project(project_name, conf.endpoint)
    p._promise = Promise.resolve({ project_id: undefined })
    return p
  }

  server.load = function (project_id) {
    return new Project(undefined, conf.endpoint)
      .id(project_id)
  }

  server.projects = function () {
    debug('get projects metadata')
    return sa.get(conf.endpoint + '/command/core/get-all-project-metadata')
      .use(promise())
      .end()
      .then(res => res.body)
  }

  server.delete = function (id) {
    debug('delete project ' + id)
    return sa.post(conf.endpoint + '/command/core/delete-project')
      .use(promise())
      .send('project=' + id)
      .end()
  }

  return server
}
