'use strict'

var sa = require('superagent')
var fs = require('fs')
var csv = require('csv')
var debug = require('debug')('openrefine')

// ES6 Promise plugin for superagent
function promise () {
  return function (req) {
    req.run = function () {
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

// ignore HTTP 302 (promise-based) plugin for superagent
function ignore302 () {
  return req => {
    var prevRun = req.run
    req.run = () =>
      prevRun()
        .catch(err => {
          if (err.status === 302) {
            return err.response
          }
          return Promise.reject(err)
        })
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

  keep () {
    if (arguments.length > 0) {
      this._keep = arguments[0]
      return this
    }
    return this._keep
  }

  _upload_data (endpoint, project_name, file_name) {
    return sa.post(endpoint + '/command/core/create-project-from-upload?options={"encoding":"UTF-8","separator":",","ignoreLines":-1,"headerLines":1,"skipDataLines":0,"limit":-1,"storeBlankRows":true,"guessCellValueTypes":false,"processQuotes":true,"storeBlankCellsAsNulls":true,"includeFileSources":false}')
      .use(promise())
      .use(ignore302())
      .redirects(0)
      .field('project-name', project_name)
      .attach('project-file', fs.readFileSync(file_name), file_name)
  }

  _download_data (endpoint, project_id, format) {
    debug('download data in ' + project_id)
    return sa.post(endpoint + '/command/core/export-rows/' + project_id + '.' + format)
      .use(promise())
      .send('engine={"facets":[],"mode":"row-based"}')
      .send('project=' + project_id)
      .send('format=' + this._output_format)
      .run()
      .then(res => res.text)
  }

  _start_upload () {
    if (this._current_job !== undefined) {
      return this._current_job
    }
    if (this._upload_queue.length === 0) {
      return Promise.resolve()
    }
    this._current_job = this._upload_queue.shift().run()
      .then(res => {
        if (!this._project_id) {
          this._project_id = +res.headers.location.replace(this._endpoint + '/project?project=', '')
        }
        this._current_job = undefined
        return this._start_upload()
      })
      .catch(debug)
    return this._current_job
  }

  load (file_name) {
    debug('put ' + file_name + ' on queue')
    this._upload_queue.push(this._upload_data(this._endpoint, this._name, file_name))
    this._start_upload()
    return this
  }

  end (done) {
    var p = this._start_upload()
      .then(() => this._download_data(this._endpoint, this._project_id, 'csv'))
    if (this.expose() === undefined) {
      p = p.then(text =>
        new Promise((resolve, reject) => csv.parse(text, { delimiter: '\t',  columns: true }, (err, data) => {
          if (err) { return reject(err) }
          resolve(data)
        }))
      )
    }
    return p.then(done)
  }

  apply (op_file_name) {
    this._promise.then(() => {
      debug('apply operations in ' + op_file_name + ' to project ' + this._project_id + '.')
      this._promise = sa.post(this._endpoint + '/command/core/apply-operations?project=' + this._project_id)
        .use(promise())
        .send('operations=' + fs.readFileSync(op_file_name))
        .run()
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
        .run()
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
        .run()
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
      .run()
      .then(res => res.body)
  }

  server.delete = function (id) {
    debug('delete project ' + id)
    return sa.post(conf.endpoint + '/command/core/delete-project')
      .use(promise())
      .send('project=' + id)
      .run()
  }

  return server
}
