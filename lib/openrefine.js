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
    this._project_name = project_name
    this._endpoint = endpoint
    this._promise = undefined
  }

  id () {
    if (arguments.length > 0) {
      debug('set project id to ' + arguments[0])
      this._project_id = arguments[0]
      return this
    } else {
      return this._project_id
    }
  }

  then (done) {
    return this._promise.then(done)
  }

  upload (file_name) {
    debug('upload data in ' + file_name)
    this._promise = sa.post(this._endpoint + '/command/core/create-project-from-upload?options={"encoding":"UTF-8","separator":",","ignoreLines":-1,"headerLines":1,"skipDataLines":0,"limit":-1,"storeBlankRows":true,"guessCellValueTypes":false,"processQuotes":true,"storeBlankCellsAsNulls":true,"includeFileSources":false}')
      .use(promise())
      .redirects(0)
      .field('project-name', this._project_name)
      .attach('project-file', fs.readFileSync(file_name), file_name)
      .end()
      .catch(err => {
        if (err.status === 302) {
          return err.response
        }
        return err
      })
      .then(res => {
        this._project_id = +res.headers.location.replace(this._endpoint + '/project?project=', '')
        return {
          project_id: this._project_id
        }
      })
    return this
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

  download (format, output_file_name) {
    this._promise.then(() => {
      debug('download data in project ' + this._project_id + ' to ' + output_file_name + '.')
      return sa.post(this._endpoint + '/command/core/export-rows/' + this._project_id + '.' + format)
        .use(promise())
        .send('engine={"facets":[],"mode":"row-based"}')
        .send('project=' + this._project_id)
        .send('format=' + format)
        .end()
        .then(res => {
          fs.writeFileSync(output_file_name, res.text)
          return {
            project_id: this._project_id
          }
        })
    })
    return this
  }

  delete () {
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

  server.project = function (project_name) {
    debug('create project ' + project_name)
    server._project_name = project_name
    return new Project(project_name, conf.endpoint)
  }

  server.projects_metadata = function () {
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
