'use strict'

var sa = require('superagent')
var fs = require('fs')
var debug = require('debug')('open-refine')

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

module.exports = function (endpoint) {
  var conf = {
    endpoint: endpoint || 'http://localhost:3333'
  }
  var server = {}

  server.create_project = function (project_name, file_name, done) {
    debug(file_name)
    sa.post(conf.endpoint + '/command/core/create-project-from-upload?options={"encoding":"UTF-8","separator":",","ignoreLines":-1,"headerLines":1,"skipDataLines":0,"limit":-1,"storeBlankRows":true,"guessCellValueTypes":false,"processQuotes":true,"storeBlankCellsAsNulls":true,"includeFileSources":false}')
      .redirects(0)
      .field('project-name', project_name)
      .field('encoding', 'UTF-8')
      .attach('project-file', fs.readFileSync(file_name), file_name)
      .end(function (err, res) {
        if (res.status === 302) {
          done(null, res.headers.location.replace('http://localhost:3333/project?project=', ''))
        } else {
          done(err)
        }
      })
  }

  server.apply_operations = function (project_id, file_name, done) {
    debug(fs.readFileSync(file_name).toString())
    sa.post(conf.endpoint + '/command/core/apply-operations?project=' + project_id)
      .send('operations=' + fs.readFileSync(file_name))
      .end(function (err, res) {
        done(err)
      })
  }

  server.delete_project = function (project_id, done) {
    debug(project_id)
    sa.post(conf.endpoint + '/command/core/delete-project')
      .send('project=' + project_id)
      .end(function (err, res) {
        if (err !== null) {
          done(err)
        } else if (res.body.code === 'error') {
          done(res.body)
        }
      })
  }

  server.export_rows = function (project_id, opts, done) {
    opts = opts || {}
    var format = opts['format'] || 'csv'
    sa.post(conf.endpoint + '/command/core/export-rows/' + project_id + '.' + format)
      .send('engine={"facets":[],"mode":"row-based"}')
      .send('project=' + project_id)
      .send('format=' + format)
      .end(function (err, res) {
        done(err, res.text)
      })
  }

  server.projects_metadata = function () {
    debug('get projects metadata')
    return sa.get(conf.endpoint + '/command/core/get-all-project-metadata')
      .use(promise())
      .end()
      .then(res => res.body)
  }

  return server
}
